"""Best-effort autofill from a pasted job-posting URL.

Two halves, both silent on failure by design (the form just stays as
typed): fetch_html downloads the page with tight caps, and parse_posting
reads what it can. Parsing leans on the schema.org JobPosting JSON-LD
that job pages embed for Google Jobs indexing — it names the employer,
title, location and salary exactly, where scraping the visible markup
would be guesswork. The only concessions to guesswork are an og:title
fallback for the role and mapping well-known job-board domains onto the
app's source options.
"""

import json
from html.parser import HTMLParser
from urllib.parse import urlsplit

import httpx

_FIELDS = (
    "company",
    "role",
    "location",
    "work_mode",
    "salary_min",
    "salary_max",
    "salary_currency",
    "source",
)

_MAX_BYTES = 2_000_000  # the JSON-LD we want lives in <head>
_TIMEOUT_SECONDS = 6.0
# Job boards turn away obvious non-browser clients; a stock browser UA is
# table stakes for fetching a page the user is already looking at.
_USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
)

# Domains that pin down the app's Source dropdown. ATS hosts count as the
# company's own posting; aggregators are Job Board.
_SOURCE_BY_DOMAIN = {
    "linkedin.com": "LinkedIn",
    "indeed.com": "Job Board",
    "glassdoor.com": "Job Board",
    "ziprecruiter.com": "Job Board",
    "wellfound.com": "Job Board",
    "dice.com": "Job Board",
    "monster.com": "Job Board",
    "builtin.com": "Job Board",
    "greenhouse.io": "Company Site",
    "lever.co": "Company Site",
    "ashbyhq.com": "Company Site",
    "myworkdayjobs.com": "Company Site",
    "smartrecruiters.com": "Company Site",
    "jobvite.com": "Company Site",
    "icims.com": "Company Site",
}


def fetch_html(url: str) -> str | None:
    """Download a page the user pasted; None for anything but readable HTML.

    Caps: http(s) only, 6s, 2 MB (truncation keeps the <head> we parse),
    HTML content types only. Any failure — DNS, bot wall, timeout — is an
    expected outcome here, not an error.
    """
    try:
        if urlsplit(url).scheme not in ("http", "https"):
            return None
        with httpx.Client(
            follow_redirects=True,
            max_redirects=5,
            timeout=_TIMEOUT_SECONDS,
            headers={
                "User-Agent": _USER_AGENT,
                "Accept": "text/html,application/xhtml+xml",
            },
        ) as client:
            with client.stream("GET", url) as response:
                if response.status_code != 200:
                    return None
                content_type = response.headers.get("content-type", "text/html")
                if "html" not in content_type:
                    return None
                body = bytearray()
                for chunk in response.iter_bytes():
                    body.extend(chunk)
                    if len(body) >= _MAX_BYTES:
                        break
                return bytes(body).decode(response.encoding or "utf-8", errors="replace")
    except Exception:
        return None


class _PageBits(HTMLParser):
    """One pass over the page for the three things we read: ld+json script
    bodies, og: meta tags, and the title text."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.ld_blocks: list[str] = []
        self.meta: dict[str, str] = {}
        self._in_ld = False

    def handle_starttag(self, tag, attrs):
        got = dict(attrs)
        if tag == "script" and (got.get("type") or "").strip().lower() == "application/ld+json":
            self._in_ld = True
            self.ld_blocks.append("")
        elif tag == "meta":
            key = got.get("property") or got.get("name")
            content = got.get("content")
            if key and content:
                self.meta.setdefault(key.strip().lower(), content)

    def handle_endtag(self, tag):
        if tag == "script":
            self._in_ld = False

    def handle_data(self, data):
        if self._in_ld and self.ld_blocks:
            self.ld_blocks[-1] += data


def _find_job_posting(blocks: list[str]) -> dict | None:
    """The JobPosting node, wherever a page buried it (top level, a list,
    an @graph, or nested inside another entity)."""
    for raw in blocks:
        try:
            doc = json.loads(raw)
        except ValueError:
            continue
        stack = [doc]
        while stack:
            node = stack.pop()
            if isinstance(node, list):
                stack.extend(node)
            elif isinstance(node, dict):
                declared = node.get("@type")
                types = declared if isinstance(declared, list) else [declared]
                if "JobPosting" in types:
                    return node
                stack.extend(node.values())
    return None


def _name_of(value) -> str | None:
    """schema.org values are a string or an object with a name, freely."""
    if isinstance(value, str):
        return value.strip() or None
    if isinstance(value, dict):
        return _name_of(value.get("name"))
    return None


def _location_of(job: dict) -> str | None:
    place = job.get("jobLocation")
    if isinstance(place, list):
        place = place[0] if place else None
    if not isinstance(place, dict):
        return None
    address = place.get("address")
    if isinstance(address, str):
        return address.strip() or None
    if not isinstance(address, dict):
        return None
    parts = [address.get("addressLocality"), address.get("addressRegion")]
    parts = [p.strip() for p in parts if isinstance(p, str) and p.strip()]
    if parts:
        return ", ".join(parts)
    return _name_of(address.get("addressCountry"))


def _work_mode_of(job: dict) -> str | None:
    declared = job.get("jobLocationType")
    types = declared if isinstance(declared, list) else [declared]
    if any(isinstance(t, str) and "TELECOMMUTE" in t.upper() for t in types):
        return "remote"
    return None  # never guess onsite/hybrid off a page


def _int_or_none(value) -> int | None:
    try:
        number = int(float(value))
    except (TypeError, ValueError):
        return None
    return number if number >= 0 else None


def _salary_of(job: dict) -> tuple[int | None, int | None, str | None]:
    amount = job.get("baseSalary")
    if not isinstance(amount, dict):
        return None, None, None
    currency = amount.get("currency")
    value = amount.get("value")
    if isinstance(value, dict):
        currency = currency or value.get("currency")
        unit = value.get("unitText")
        unit = unit.strip().upper() if isinstance(unit, str) else ""
        low = _int_or_none(value.get("minValue"))
        high = _int_or_none(value.get("maxValue"))
        if low is None and high is None:
            low = high = _int_or_none(value.get("value"))
    else:
        unit = ""
        low = high = _int_or_none(value)
    # The app's salary fields are annual. HOUR/WEEK/MONTH figures are real
    # data we can't represent; unitless numbers are trusted only when
    # they're too big to be anything but annual.
    if unit != "YEAR" and (unit or max(low or 0, high or 0) < 10_000):
        return None, None, None
    if low is not None and high is not None and low > high:
        low, high = high, low
    currency = currency.strip().upper() if isinstance(currency, str) and currency.strip() else None
    return low, high, currency


def _source_of(url: str) -> str | None:
    host = (urlsplit(url).hostname or "").lower()
    for domain, source in _SOURCE_BY_DOMAIN.items():
        if host == domain or host.endswith("." + domain):
            return source
    return None


def parse_posting(html: str | None, url: str) -> dict:
    """Everything the page (and failing that, the URL) tells us about the
    posting, in ApplicationCreate's field names. Never raises."""
    found: dict = dict.fromkeys(_FIELDS)
    found["source"] = _source_of(url)
    if not html:
        return found

    page = _PageBits()
    try:
        page.feed(html)
    except Exception:
        return found  # a page too mangled to tokenize is just a miss

    job = _find_job_posting(page.ld_blocks)
    if job:
        found["company"] = _name_of(job.get("hiringOrganization"))
        found["role"] = _name_of(job.get("title"))
        found["location"] = _location_of(job)
        found["work_mode"] = _work_mode_of(job)
        salary_min, salary_max, currency = _salary_of(job)
        found["salary_min"] = salary_min
        found["salary_max"] = salary_max
        found["salary_currency"] = currency
    if found["role"] is None:
        # og:title is usually "Role at Company" — noisy but an editable
        # draft beats an empty field. og:site_name is NOT trusted for the
        # company: on a job board it names the board.
        found["role"] = (page.meta.get("og:title") or "").strip() or None
    return found
