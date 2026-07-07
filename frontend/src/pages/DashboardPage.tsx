import { useStats } from '../api/hooks'
import RemindersPanel from '../components/dashboard/RemindersPanel'
import FunnelChart from '../components/dashboard/FunnelChart'
import SourceChart from '../components/dashboard/SourceChart'
import StatTiles from '../components/dashboard/StatTiles'
import TimelineChart from '../components/dashboard/TimelineChart'
import '../styles/dashboard.css'

export default function DashboardPage() {
  const { data: stats, loading, error } = useStats()

  if (error) return <div className="empty-state">Couldn’t load stats: {error.message}</div>
  if (loading || !stats) return <div className="empty-state">Loading dashboard…</div>

  return (
    <>
      <div className="dash-header">
        <h1>Dashboard</h1>
      </div>
      <StatTiles stats={stats} />
      <div className="dash-grid">
        <div className="panel wide">
          <h2>Upcoming follow-ups</h2>
          <RemindersPanel />
        </div>
        <div className="panel wide">
          <h2>Applications per week</h2>
          <TimelineChart data={stats.applications_over_time} />
        </div>
        <div className="panel">
          <h2>Pipeline funnel</h2>
          <FunnelChart data={stats.status_funnel} />
        </div>
        <div className="panel">
          <h2>Applications by source</h2>
          <SourceChart data={stats.by_source} />
        </div>
      </div>
    </>
  )
}
