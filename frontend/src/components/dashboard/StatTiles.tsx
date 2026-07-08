import type { Stats } from '../../api/types'

export default function StatTiles({ stats }: { stats: Stats }) {
  const tiles = [
    { label: 'Total applications', value: String(stats.totals.total) },
    { label: 'Active pipeline', value: String(stats.totals.active) },
    { label: 'Offers', value: String(stats.totals.offers) },
    { label: 'Rejected', value: String(stats.totals.rejected) },
    {
      label: 'Avg. days to first interview',
      value:
        stats.avg_response_time_days === null
          ? '—'
          : String(Math.round(stats.avg_response_time_days)),
    },
  ]

  return (
    <div className="stat-tiles">
      {tiles.map(({ label, value }) => (
        <div className="stat-tile" key={label}>
          <div className="stat-value">{value}</div>
          <div className="stat-label">{label}</div>
        </div>
      ))}
    </div>
  )
}
