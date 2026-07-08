import { useState, type MouseEvent } from 'react'
import { toDate, todayISO, ymd } from '../../lib/dates'
import { useAnchoredMenu } from './Select'

const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

function timePart(value: string): string {
  return value.length > 10 ? value.slice(11, 16) : ''
}

function label(value: string, withTime: boolean): string {
  if (!value) return ''
  const d = toDate(value)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric'
  const date = d.toLocaleDateString('en-US', opts)
  if (!withTime || !timePart(value)) return date
  return `${date}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

interface Props {
  /** '' or 'YYYY-MM-DD' (date mode) / 'YYYY-MM-DDTHH:mm' (withTime). */
  value: string
  onChange: (value: string) => void
  ariaLabel: string
  /** Smaller trigger metrics for dense forms. */
  compact?: boolean
  /** Datetime-local mode: calendar plus a time row; Done closes. */
  withTime?: boolean
  placeholder?: string
}

/** Date / date-time field in the app's shared dropdown design — native
    date inputs open unstylable browser calendars, this one opens the
    same anchored menu card as every other dropdown. */
export default function DateInput({
  value,
  onChange,
  ariaLabel,
  compact,
  withTime = false,
  placeholder = 'Select date',
}: Props) {
  const menu = useAnchoredMenu()
  const anchor = value ? toDate(value) : new Date()
  const [view, setView] = useState({ year: anchor.getFullYear(), month: anchor.getMonth() })

  const openTo = (e: MouseEvent<HTMLElement>) => {
    if (!menu.open) {
      const d = value ? toDate(value) : new Date()
      setView({ year: d.getFullYear(), month: d.getMonth() })
    }
    menu.toggle(e)
  }

  const move = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1)
    setView({ year: d.getFullYear(), month: d.getMonth() })
  }

  const pickDay = (iso: string) => {
    if (withTime) {
      onChange(`${iso}T${timePart(value) || '09:00'}`)
    } else {
      onChange(iso)
      menu.close()
    }
  }

  const selectedDate = value ? value.slice(0, 10) : ''
  const today = todayISO()
  const firstOffset = new Date(view.year, view.month, 1).getDay()
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(view.year, view.month, 1 - firstOffset + i)
    return { iso: ymd(d), day: d.getDate(), dim: d.getMonth() !== view.month }
  })

  return (
    <div
      className="dd-wrap"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) menu.close()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') menu.close()
      }}
    >
      <button
        type="button"
        className={`dd-trigger${compact ? ' compact' : ''}`}
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        aria-label={ariaLabel}
        onClick={openTo}
      >
        <span className={`dd-value${value ? '' : ' placeholder'}`}>
          {value ? label(value, withTime) : placeholder}
        </span>
        <span className="dd-caret">▼</span>
      </button>
      {menu.open && (
        <div
          className="dd-menu cal"
          role="dialog"
          aria-label={`${ariaLabel} calendar`}
          style={menu.style ?? undefined}
        >
          <div className="cal-head">
            <button type="button" className="cal-nav" aria-label="Previous month" onClick={() => move(-1)}>
              ‹
            </button>
            <span className="cal-title">
              {new Date(view.year, view.month, 1).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </span>
            <button type="button" className="cal-nav" aria-label="Next month" onClick={() => move(1)}>
              ›
            </button>
          </div>
          <div className="cal-grid">
            {DOW.map((d) => (
              <span key={d} className="cal-dow">
                {d}
              </span>
            ))}
            {cells.map((cell) => (
              <button
                key={cell.iso}
                type="button"
                aria-label={cell.iso}
                className={`cal-day${cell.dim ? ' dim' : ''}${
                  cell.iso === selectedDate ? ' selected' : ''
                }${cell.iso === today ? ' today' : ''}`}
                onClick={() => pickDay(cell.iso)}
              >
                {cell.day}
              </button>
            ))}
          </div>
          {withTime && (
            <div className="cal-time">
              Time
              <input
                type="time"
                aria-label="Time"
                value={timePart(value)}
                disabled={!value}
                onChange={(e) => onChange(`${value.slice(0, 10)}T${e.target.value || '09:00'}`)}
              />
            </div>
          )}
          <div className="cal-foot">
            <button type="button" className="cal-action" onClick={() => onChange('')}>
              Clear
            </button>
            {withTime ? (
              <button type="button" className="cal-action strong" onClick={menu.close}>
                Done
              </button>
            ) : (
              <button type="button" className="cal-action" onClick={() => pickDay(today)}>
                Today
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
