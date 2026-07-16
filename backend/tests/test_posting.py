"""Posting-preview autofill: parsing is exercised on saved HTML snippets
(never the network), and the endpoint with fetch_html monkeypatched out.

The parser's contract is best-effort: every field it can't establish is
None, and nothing here may ever raise — the feature fails silently."""

from app.services import posting


def parse(html, url="https://jobs.example.com/openings/123"):
    return posting.parse_posting(html, url)


# The shape job boards embed for Google Jobs; the first block being junk
# mirrors real pages, which often carry several ld+json scripts.
JSONLD_PAGE = """<!doctype html><html><head>
<title>Job Application for Senior Backend Engineer at Anthropic</title>
<script type="application/ld+json">{"@type": "BreadcrumbList", oops not json</script>
<script type="application/ld+json">
{
  "@context": "https://schema.org/",
  "@type": "JobPosting",
  "title": "Senior Backend Engineer",
  "hiringOrganization": {"@type": "Organization", "name": "Anthropic"},
  "jobLocation": {
    "@type": "Place",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "San Francisco",
      "addressRegion": "CA",
      "addressCountry": "US"
    }
  },
  "baseSalary": {
    "@type": "MonetaryAmount",
    "currency": "USD",
    "value": {
      "@type": "QuantitativeValue",
      "minValue": 170000,
      "maxValue": 210000,
      "unitText": "YEAR"
    }
  }
}
</script></head><body>content</body></html>"""

REMOTE_GRAPH_PAGE = """<html><head><script type="application/ld+json">
{"@context": "https://schema.org", "@graph": [
  {"@type": "WebSite", "name": "Acme Careers"},
  {"@type": "JobPosting",
   "title": "Staff Engineer",
   "hiringOrganization": {"name": "Acme"},
   "jobLocationType": "TELECOMMUTE"}
]}
</script></head></html>"""

HOURLY_PAGE = """<html><head><script type="application/ld+json">
{"@type": "JobPosting",
 "title": "Warehouse Associate",
 "hiringOrganization": {"name": "Acme Retail"},
 "baseSalary": {"@type": "MonetaryAmount", "currency": "USD",
   "value": {"minValue": 22, "maxValue": 31, "unitText": "HOUR"}}}
</script></head></html>"""

SINGLE_SALARY_PAGE = """<html><head><script type="application/ld+json">
{"@type": "JobPosting", "title": "Data Engineer",
 "hiringOrganization": {"name": "Acme"},
 "baseSalary": {"currency": "USD",
   "value": {"value": 185000, "unitText": "YEAR"}}}
</script></head></html>"""

OG_ONLY_PAGE = """<html><head>
<meta property="og:title" content="Product Designer at Figma" />
<meta property="og:site_name" content="Figma" />
</head><body>everything else renders client-side</body></html>"""


def test_parses_the_json_ld_job_posting():
    got = parse(JSONLD_PAGE)
    assert got["company"] == "Anthropic"
    assert got["role"] == "Senior Backend Engineer"
    assert got["location"] == "San Francisco, CA"
    assert got["salary_min"] == 170000
    assert got["salary_max"] == 210000
    assert got["salary_currency"] == "USD"
    assert got["work_mode"] is None  # nothing marked it remote


def test_finds_the_posting_inside_graph_and_maps_telecommute_to_remote():
    got = parse(REMOTE_GRAPH_PAGE)
    assert got["company"] == "Acme"
    assert got["role"] == "Staff Engineer"
    assert got["work_mode"] == "remote"


def test_hourly_salary_is_not_mistaken_for_annual():
    got = parse(HOURLY_PAGE)
    assert got["company"] == "Acme Retail"
    assert got["salary_min"] is None
    assert got["salary_max"] is None


def test_single_value_salary_fills_both_ends():
    got = parse(SINGLE_SALARY_PAGE)
    assert got["salary_min"] == 185000
    assert got["salary_max"] == 185000


def test_salary_without_a_unit_is_trusted_only_when_clearly_annual():
    def page(lo, hi):
        return (
            '<html><head><script type="application/ld+json">'
            '{"@type": "JobPosting", "title": "X",'
            f' "baseSalary": {{"currency": "USD", "value": {{"minValue": {lo}, "maxValue": {hi}}}}}}}'
            "</script></head></html>"
        )

    annual = parse(page(90000, 120000))
    assert (annual["salary_min"], annual["salary_max"]) == (90000, 120000)

    ambiguous = parse(page(45, 60))  # unitless small numbers: probably hourly
    assert ambiguous["salary_min"] is None
    assert ambiguous["salary_max"] is None


def test_og_title_is_a_last_resort_for_the_role_only():
    got = parse(OG_ONLY_PAGE)
    assert got["role"] == "Product Designer at Figma"
    # og:site_name is the board's name as often as the employer's — never
    # trust it for the company.
    assert got["company"] is None


def test_a_page_with_nothing_to_offer_yields_nothing():
    got = parse("<html><body><h1>Sign in to view this job</h1></body></html>")
    assert all(value is None for value in got.values())


def test_source_is_inferred_from_the_domain_even_without_html():
    linkedin = parse(None, "https://www.linkedin.com/jobs/view/4012345678")
    assert linkedin["source"] == "LinkedIn"
    assert linkedin["company"] is None

    greenhouse = parse(None, "https://boards.greenhouse.io/anthropic/jobs/123")
    assert greenhouse["source"] == "Company Site"

    indeed = parse(None, "https://www.indeed.com/viewjob?jk=abc")
    assert indeed["source"] == "Job Board"

    assert parse(None, "https://careers.example.com/123")["source"] is None


def test_fetch_refuses_non_http_urls():
    assert posting.fetch_html("file:///etc/passwd") is None
    assert posting.fetch_html("ftp://example.com/jobs") is None
    assert posting.fetch_html("not a url at all") is None


def test_preview_endpoint_returns_parsed_fields(client, monkeypatch):
    monkeypatch.setattr(posting, "fetch_html", lambda url: JSONLD_PAGE)
    response = client.post(
        "/api/posting-preview", json={"url": "https://jobs.example.com/1"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["company"] == "Anthropic"
    assert body["role"] == "Senior Backend Engineer"
    assert body["salary_min"] == 170000


def test_preview_endpoint_fails_silently_when_the_fetch_does(client, monkeypatch):
    monkeypatch.setattr(posting, "fetch_html", lambda url: None)
    response = client.post(
        "/api/posting-preview", json={"url": "https://www.linkedin.com/jobs/view/1"}
    )
    assert response.status_code == 200
    body = response.json()
    assert body["source"] == "LinkedIn"  # the URL alone still tells us this
    assert body["company"] is None
    assert body["role"] is None
