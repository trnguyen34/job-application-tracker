import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import LocationInput from '../components/ui/LocationInput'
import { searchCities } from '../lib/usCities'

/** LocationInput is controlled; the harness feeds typed values back in. */
function Harness({ onChange }: { onChange: (v: string) => void }) {
  const [value, setValue] = useState('')
  return (
    <LocationInput
      value={value}
      onChange={(v) => {
        setValue(v)
        onChange(v)
      }}
    />
  )
}

describe('searchCities (real dataset)', () => {
  it('matches by city prefix', async () => {
    const results = await searchCities('san franc')
    expect(results[0]).toBe('San Francisco, CA')
  })

  it('matches by state abbreviation and full state name', async () => {
    const byAbbr = await searchCities('TX')
    expect(byAbbr.length).toBeGreaterThan(0)
    expect(byAbbr.some((r) => r.endsWith(', TX'))).toBe(true)

    const byName = await searchCities('texas')
    expect(byName.some((r) => r.endsWith(', TX'))).toBe(true)
  })

  it('matches "city, state" queries', async () => {
    const results = await searchCities('springfield, il')
    expect(results).toContain('Springfield, IL')
    expect(results.every((r) => r.endsWith(', IL'))).toBe(true)
  })

  it('includes consolidated-government cities under their common names', async () => {
    expect(await searchCities('nashville, tn')).toContain('Nashville, TN')
    expect(await searchCities('louisville, ky')).toContain('Louisville, KY')
  })

  it('caps the result count', async () => {
    expect((await searchCities('s')).length).toBeLessThanOrEqual(8)
  })
})

describe('LocationInput', () => {
  it('suggests as you type and fills the field on selection', async () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    const input = screen.getByRole('combobox', { name: 'Location' })
    await userEvent.type(input, 'boise')

    const option = await screen.findByRole('option', { name: 'Boise City, ID' })
    await userEvent.click(option)

    expect(onChange).toHaveBeenLastCalledWith('Boise City, ID')
    expect(screen.queryByRole('option')).not.toBeInTheDocument()
  })

  it('selects the highlighted match with Enter without submitting the form', async () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    const onChange = vi.fn()
    render(
      <form onSubmit={onSubmit}>
        <Harness onChange={onChange} />
      </form>,
    )

    const input = screen.getByRole('combobox', { name: 'Location' })
    await userEvent.type(input, 'denver, co')
    await screen.findAllByRole('option')
    await userEvent.keyboard('{Enter}')

    expect(onChange).toHaveBeenLastCalledWith('Denver, CO')
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
