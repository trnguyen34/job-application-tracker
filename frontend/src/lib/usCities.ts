/** US city autocomplete data ("City, ST", from the Census place gazetteer).
    The ~500KB JSON is code-split and loaded on first use, so it never
    weighs down the initial bundle. */

const STATE_NAMES: Record<string, string> = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  PR: 'Puerto Rico',
  GU: 'Guam',
  VI: 'U.S. Virgin Islands',
  AS: 'American Samoa',
  MP: 'Northern Mariana Islands',
}

interface Entry {
  label: string // "San Francisco, CA"
  city: string // lowercase city
  abbr: string // lowercase state abbreviation
  stateName: string // lowercase full state name
}

let entries: Entry[] | null = null
let loading: Promise<void> | null = null

function ensureLoaded(): Promise<void> {
  if (entries) return Promise.resolve()
  loading ??= import('./us-cities.json').then((mod) => {
    entries = (mod.default as string[]).map((label) => {
      const split = label.lastIndexOf(', ')
      const abbr = label.slice(split + 2)
      return {
        label,
        city: label.slice(0, split).toLowerCase(),
        abbr: abbr.toLowerCase(),
        stateName: (STATE_NAMES[abbr] ?? '').toLowerCase(),
      }
    })
  })
  return loading
}

/** Kick off the data fetch (call on focus so the list is ready by the
    first keystroke). */
export function preloadCities(): void {
  void ensureLoaded()
}

/** Country spellings job postings put after the state; anything here is
    dropped before matching. */
const COUNTRY_TOKENS = new Set([
  'us',
  'usa',
  'u.s.',
  'u.s.a.',
  'united states',
  'united states of america',
])

/** The autocomplete's own "City, ST" label for however a job posting
    spelled the place — "San Francisco, California, United States" →
    "San Francisco, CA" — or null when unsure (unknown place, or a bare
    city name that several states share), so the caller keeps the raw
    text instead of a guess. */
export async function canonicalCity(location: string): Promise<string | null> {
  const parts = location
    .split(',')
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean)
  while (parts.length > 1 && COUNTRY_TOKENS.has(parts[parts.length - 1])) parts.pop()
  if (!parts.length) return null
  const [cityQ, stateQ] = parts

  await ensureLoaded()
  const candidates = entries!.filter((e) => e.city === cityQ)
  if (!candidates.length) return null
  if (stateQ) {
    return candidates.find((e) => e.abbr === stateQ || e.stateName === stateQ)?.label ?? null
  }
  // Bare city: only trust it when it names one place.
  return candidates.length === 1 ? candidates[0].label : null
}

/** Match on city or state: "san fr" → San Francisco; "TX" / "texas" →
    Texas cities; "spring, il" → Springfield, IL. Returns "City, ST"
    labels, capped. */
export async function searchCities(query: string, limit = 8): Promise<string[]> {
  const q = query.trim().toLowerCase()
  if (!q) return []
  await ensureLoaded()
  const all = entries!

  const comma = q.indexOf(',')
  if (comma !== -1) {
    const cityQ = q.slice(0, comma).trim()
    const stateQ = q.slice(comma + 1).trim()
    const results: string[] = []
    for (const e of all) {
      if (!e.city.startsWith(cityQ)) continue
      if (stateQ && !e.abbr.startsWith(stateQ) && !e.stateName.startsWith(stateQ)) continue
      results.push(e.label)
      if (results.length >= limit) break
    }
    return results
  }

  const cityStarts: string[] = []
  const stateMatches: string[] = []
  const cityContains: string[] = []
  for (const e of all) {
    if (cityStarts.length >= limit) break
    if (e.city.startsWith(q)) {
      cityStarts.push(e.label)
    } else if (stateMatches.length < limit && (e.abbr === q || e.stateName.startsWith(q))) {
      stateMatches.push(e.label)
    } else if (cityContains.length < limit && e.city.includes(q)) {
      cityContains.push(e.label)
    }
  }
  return [...cityStarts, ...stateMatches, ...cityContains].slice(0, limit)
}
