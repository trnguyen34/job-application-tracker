/** URL helpers. job_url is free text (quick-add form, inline edit, CSV
    import), so anything here must tolerate arbitrary strings — a throwing
    parse in render would take down the whole page. */

/** Parse a user-entered URL, trying an https:// prefix for scheme-less
    values like "stripe.com/jobs". Returns null when it isn't a usable
    http(s) URL, so callers fall back to plain text. */
export function toHttpUrl(raw: string): URL | null {
  for (const candidate of [raw, `https://${raw}`]) {
    try {
      const url = new URL(candidate)
      if (url.protocol === 'http:' || url.protocol === 'https:') return url
    } catch {
      /* not parseable in this form */
    }
  }
  return null
}
