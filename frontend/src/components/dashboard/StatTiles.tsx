import type { Stats } from '../../api/types'

export default function StatTiles({ stats }: { stats: Stats }) {
  const tiles = [
    { label: 'Total applications', value: stats.totals.total },
    { label: 'Active pipeline', value: stats.totals.active },
    { label: 'Offers', value: stats.totals.offers },
    { label: 'Rejected', value: stats.totals.rejected },
    {
      label: 'Avg. days to first interview',
      value: stats.avg_response_time_days ?? '—',
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
