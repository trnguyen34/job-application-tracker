import { useState, type KeyboardEvent } from 'react'
import { preloadCities, searchCities } from '../../lib/usCities'

interface Props {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
}

/** Location field with US city suggestions ("City, ST"), filtering on
    city or state as you type. Free text stays allowed — suggestions,
    not validation. */
export default function LocationInput({
  value,
  onChange,
  placeholder = 'City, State',
  ariaLabel = 'Location',
}: Props) {
  const [matches, setMatches] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [highlight, setHighlight] = useState(0)

  const update = async (next: string) => {
    onChange(next)
    const results = await searchCities(next)
    setMatches(results)
    setHighlight(0)
    setOpen(results.length > 0)
  }

  const choose = (label: string) => {
    onChange(label)
    setOpen(false)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, matches.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault() // select, don't submit the surrounding form
      if (matches[highlight]) choose(matches[highlight])
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  return (
    <div className="combo">
      <input
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-autocomplete="list"
        placeholder={placeholder}
        value={value}
        onFocus={() => {
          preloadCities()
          if (matches.length) setOpen(true)
        }}
        onBlur={() => setOpen(false)}
        onChange={(e) => update(e.target.value)}
        onKeyDown={onKeyDown}
      />
      {open && (
        // mousedown is swallowed so clicking an option doesn't blur-close
        // the menu before the click lands.
        <div className="combo-menu" role="listbox" onMouseDown={(e) => e.preventDefault()}>
          {matches.map((label, i) => (
            <button
              type="button"
              role="option"
              aria-selected={i === highlight}
              key={label}
              className={`combo-option${i === highlight ? ' active' : ''}`}
              onMouseEnter={() => setHighlight(i)}
              onClick={() => choose(label)}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
