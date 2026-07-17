import { describe, expect, it } from 'vitest'
import { canonicalCity } from '../lib/usCities'

/** canonicalCity turns whatever a job posting called the location into the
    autocomplete's own "City, ST" label — or null when it can't be sure,
    so the caller keeps the raw text rather than guessing. */
describe('canonicalCity', () => {
  it('accepts the canonical form itself, case-insensitively', async () => {
    expect(await canonicalCity('San Francisco, CA')).toBe('San Francisco, CA')
    expect(await canonicalCity('seattle, wa')).toBe('Seattle, WA')
  })

  it('resolves full state names to the abbreviation', async () => {
    expect(await canonicalCity('San Francisco, California')).toBe('San Francisco, CA')
    expect(await canonicalCity('Springfield, Illinois')).toBe('Springfield, IL')
  })

  it('ignores a trailing country', async () => {
    expect(await canonicalCity('Seattle, WA, US')).toBe('Seattle, WA')
    expect(await canonicalCity('Seattle, Washington, United States')).toBe('Seattle, WA')
  })

  it('takes a bare city only when one state has it', async () => {
    expect(await canonicalCity('San Francisco')).toBe('San Francisco, CA')
    expect(await canonicalCity('Springfield')).toBeNull() // 22 states have one
  })

  it('gives up on places it does not know', async () => {
    expect(await canonicalCity('London, UK')).toBeNull()
    expect(await canonicalCity('Remote - US East')).toBeNull()
    expect(await canonicalCity('')).toBeNull()
  })
})
