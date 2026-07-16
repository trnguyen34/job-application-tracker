import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { ymd } from '../../lib/dates'

const WEEKS = 53
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

/** One formatter for the whole grid — constructing it per square is what
    makes date formatting expensive. */
const DAY_DATE = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  month: 'long',
  day: 'numeric',
  year: 'numeric',
})

function level(count: number): number {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

function countText(count: number): string {
  if (count === 0) return 'No applications'
  return `${count} ${count === 1 ? 'application' : 'applications'}`
}

interface Cell {
  key: string
  count: number
  /** "Wednesday, January 15, 2026"; empty for the blanks. */
  dateLabel: string
  /** Days after today: blanks that keep the last week square, not data. */
  future: boolean
}

interface Props {
  perDay: { date: string; count: number }[]
}

/** The hovered square, in viewport coordinates: x is its centre, y its top. */
interface Tip {
  index: number
  x: number
  y: number
}

/** GitHub-style applications-per-day grid: 53 week columns ending in the
    current week, Sunday-first rows, five accent-tinted levels (tokens.css
    provides the dark variants). */
export default function ActivityHeatmap({ perDay }: Props) {
  const { cells, monthRow, total } = useMemo(() => {
    const counts = new Map(perDay.map((d) => [d.date, d.count]))

    const now = new Date()
    const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const gridEnd = new Date(endDate)
    gridEnd.setDate(gridEnd.getDate() + (6 - endDate.getDay()))
    const gridStart = new Date(gridEnd)
    gridStart.setDate(gridStart.getDate() - (WEEKS * 7 - 1))

    const cells: Cell[] = []
    const monthRow: { key: string; label: string }[] = []
    let lastMonth = -1
    let total = 0

    for (let w = 0; w < WEEKS; w += 1) {
      let weekLabel = ''
      for (let d = 0; d < 7; d += 1) {
        const dt = new Date(gridStart)
        dt.setDate(dt.getDate() + w * 7 + d)
        const iso = ymd(dt)
        const future = dt > endDate
        const count = future ? 0 : (counts.get(iso) ?? 0)
        if (!future) total += count
        if (d === 0 && !future && dt.getMonth() !== lastMonth) {
          lastMonth = dt.getMonth()
          weekLabel = dt.toLocaleDateString('en-US', { month: 'short' })
        }
        cells.push({
          key: `${iso}-${w}-${d}`,
          count,
          future,
          dateLabel: future ? '' : DAY_DATE.format(dt),
        })
      }
      monthRow.push({ key: `m${w}`, label: weekLabel })
    }

    return { cells, monthRow, total }
  }, [perDay])

  const [tip, setTip] = useState<Tip | null>(null)
  const tipRef = useRef<HTMLDivElement>(null)

  // Keep the tip on screen at the ends of the year: clamp the box to the
  // viewport, then slide the caret back over the square it belongs to.
  useLayoutEffect(() => {
    const el = tipRef.current
    if (!el || !tip) return
    const half = el.offsetWidth / 2
    const left = Math.min(Math.max(tip.x, half + 8), window.innerWidth - half - 8)
    el.style.left = `${left}px`
    el.style.setProperty('--caret-x', `${tip.x - left + half}px`)
  }, [tip])

  // A fixed tip would drift away from its square once anything scrolls
  // (the grid itself scrolls sideways on narrow screens).
  useEffect(() => {
    const drop = () => setTip(null)
    window.addEventListener('scroll', drop, true)
    return () => window.removeEventListener('scroll', drop, true)
  }, [])

  // One listener for 371 squares. Only real days carry data-index, so the
  // gaps between squares hold the tip steady and the trailing blanks in
  // the last week don't raise one.
  const onOver = (e: MouseEvent<HTMLDivElement>) => {
    const square = (e.target as HTMLElement).closest<HTMLElement>('.contrib-cell')
    if (!square) return
    const index = square.dataset.index
    if (index === undefined) {
      setTip(null)
      return
    }
    const rect = square.getBoundingClientRect()
    setTip({ index: Number(index), x: rect.left + rect.width / 2, y: rect.top })
  }

  const hovered = tip ? cells[tip.index] : null

  return (
    <>
      <div className="contrib-summary">
        {total} {total === 1 ? 'application' : 'applications'} submitted in the last year
      </div>
      {/* One grid holds labels and cells: a max-content label column plus
          53 fluid week columns, so the squares stretch with the panel and
          the labels stay aligned at any width. */}
      <div className="contrib-scroller">
        <div
          className="contrib-grid"
          data-testid="activity-heatmap"
          onMouseOver={onOver}
          onMouseLeave={() => setTip(null)}
        >
          {DAY_LABELS.map(
            (label, d) =>
              label && (
                <span
                  key={`day-${label}`}
                  className="contrib-day"
                  style={{ gridRow: d + 2, gridColumn: 1 }}
                >
                  {label}
                </span>
              ),
          )}
          {monthRow.map(
            (m, w) =>
              m.label && (
                <span
                  key={m.key}
                  className="contrib-month"
                  style={{ gridRow: 1, gridColumn: w + 2 }}
                >
                  {m.label}
                </span>
              ),
          )}
          {cells.map((cell, i) => {
            const place = { gridRow: (i % 7) + 2, gridColumn: Math.floor(i / 7) + 2 }
            if (cell.future) return <div key={cell.key} className="contrib-cell" style={place} />
            return (
              <div
                key={cell.key}
                className="contrib-cell"
                data-index={i}
                role="img"
                aria-label={`${countText(cell.count)} on ${cell.dateLabel}`}
                style={{ background: `var(--contrib-${level(cell.count)})`, ...place }}
              />
            )
          })}
        </div>
      </div>
      {hovered && tip && (
        <div
          className="contrib-tip"
          role="tooltip"
          ref={tipRef}
          style={{ left: tip.x, top: tip.y - 10 }}
        >
          <span className="contrib-tip-count">{countText(hovered.count)}</span> on{' '}
          <span className="contrib-tip-date">{hovered.dateLabel}</span>
        </div>
      )}
      <div className="contrib-legend">
        <span>Less</span>
        {[0, 1, 2, 3, 4].map((lvl) => (
          <div key={lvl} style={{ background: `var(--contrib-${lvl})` }} />
        ))}
        <span>More</span>
      </div>
    </>
  )
}
