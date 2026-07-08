import { ymd } from '../../lib/dates'

const WEEKS = 53

function level(count: number): number {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count === 2) return 2
  if (count <= 4) return 3
  return 4
}

interface Props {
  perDay: { date: string; count: number }[]
}

/** GitHub-style applications-per-day grid: 53 week columns ending in the
    current week, Sunday-first rows, five accent-tinted levels (tokens.css
    provides the dark variants). */
export default function ActivityHeatmap({ perDay }: Props) {
  const counts = new Map(perDay.map((d) => [d.date, d.count]))

  const now = new Date()
  const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const gridEnd = new Date(endDate)
  gridEnd.setDate(gridEnd.getDate() + (6 - endDate.getDay()))
  const gridStart = new Date(gridEnd)
  gridStart.setDate(gridStart.getDate() - (WEEKS * 7 - 1))

  const cells: { key: string; title: string; background: string }[] = []
  const monthRow: { key: string; label: string }[] = []
  let lastMonth = -1
  let total = 0

  for (let w = 0; w < WEEKS; w += 1) {
    let weekLabel = ''
    for (let d = 0; d < 7; d += 1) {
      const dt = new Date(gridStart)
      dt.setDate(dt.getDate() + w * 7 + d)
      const iso = ymd(dt)
      const isFuture = dt > endDate
      const count = isFuture ? 0 : (counts.get(iso) ?? 0)
      if (!isFuture) total += count
      if (d === 0 && !isFuture && dt.getMonth() !== lastMonth) {
        lastMonth = dt.getMonth()
        weekLabel = dt.toLocaleDateString('en-US', { month: 'short' })
      }
      cells.push({
        key: `${iso}-${w}-${d}`,
        title: `${iso}: ${count} ${count === 1 ? 'application' : 'applications'}`,
        background: isFuture ? 'transparent' : `var(--contrib-${level(count)})`,
      })
    }
    monthRow.push({ key: `m${w}`, label: weekLabel })
  }

  const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

  return (
    <>
      <div className="contrib-summary">
        {total} {total === 1 ? 'application' : 'applications'} submitted in the last year
      </div>
      {/* One grid holds labels and cells: a max-content label column plus
          53 fluid week columns, so the squares stretch with the panel and
          the labels stay aligned at any width. */}
      <div className="contrib-scroller">
        <div className="contrib-grid" data-testid="activity-heatmap">
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
          {cells.map((cell, i) => (
            <div
              key={cell.key}
              className="contrib-cell"
              title={cell.title}
              style={{
                background: cell.background,
                gridRow: (i % 7) + 2,
                gridColumn: Math.floor(i / 7) + 2,
              }}
            />
          ))}
        </div>
      </div>
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
