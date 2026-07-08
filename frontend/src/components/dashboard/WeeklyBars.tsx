import { ymd } from '../../lib/dates'

interface Props {
  perDay: { date: string; count: number }[]
}

/** Applications per week for the last 12 Sunday-start weeks, derived
    client-side from the per-day series (zero weeks included). */
export default function WeeklyBars({ perDay }: Props) {
  const now = new Date()
  const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())

  const buckets: { label: string; count: number; start: string; end: string }[] = []
  for (let i = 11; i >= 0; i -= 1) {
    const ws = new Date(weekStart)
    ws.setDate(ws.getDate() - i * 7)
    const we = new Date(ws)
    we.setDate(we.getDate() + 7)
    buckets.push({
      label: ws.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      count: 0,
      start: ymd(ws),
      end: ymd(we),
    })
  }
  for (const day of perDay) {
    const bucket = buckets.find((b) => day.date >= b.start && day.date < b.end)
    if (bucket) bucket.count += day.count
  }
  const max = Math.max(1, ...buckets.map((b) => b.count))

  return (
    <div className="weekly-bars" data-testid="weekly-bars">
      {buckets.map((bucket) => (
        <div className="weekly-col" key={bucket.start}>
          <span className="weekly-count mono">{bucket.count}</span>
          <div
            className="weekly-bar"
            style={{
              height: `${Math.round((bucket.count / max) * 100)}%`,
              minHeight: bucket.count > 0 ? 4 : 0,
            }}
          />
          <span className="weekly-label">{bucket.label}</span>
        </div>
      ))}
    </div>
  )
}
