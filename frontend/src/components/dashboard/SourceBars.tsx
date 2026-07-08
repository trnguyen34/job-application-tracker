import type { Stats } from '../../api/types'

export default function SourceBars({ data }: { data: Stats['by_source'] }) {
  if (!data.length) return <div className="tab-empty">No applications yet.</div>
  const max = Math.max(1, ...data.map((row) => row.count))

  return (
    <div className="bar-rows">
      {data.map((row) => (
        <div key={row.source}>
          <div className="bar-row-head">
            <span>{row.source}</span>
            <span className="mono">{row.count}</span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill accent"
              style={{ width: `${Math.max(3, Math.round((row.count / max) * 100))}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
