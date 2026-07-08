import type { Stats } from '../../api/types'
import { STATUS_LABELS } from '../../api/types'
import { statusFg } from '../../lib/design'

export default function FunnelBars({ data }: { data: Stats['status_funnel'] }) {
  const max = Math.max(1, ...data.map((row) => row.count))

  return (
    <div className="bar-rows">
      {data.map((row) => (
        <div key={row.status}>
          <div className="bar-row-head">
            <span>{STATUS_LABELS[row.status]}</span>
            <span className="mono">{row.count}</span>
          </div>
          <div className="bar-track">
            <div
              className="bar-fill"
              style={{
                width: `${Math.max(row.count > 0 ? 3 : 0, Math.round((row.count / max) * 100))}%`,
                background: statusFg(row.status),
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
