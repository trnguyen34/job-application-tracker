import { useNavigate } from 'react-router-dom'
import { useStats } from '../api/hooks'
import ActivityHeatmap from '../components/dashboard/ActivityHeatmap'
import FollowUps from '../components/dashboard/FollowUps'
import FunnelBars from '../components/dashboard/FunnelBars'
import SourceBars from '../components/dashboard/SourceBars'
import StatTiles from '../components/dashboard/StatTiles'
import WeeklyBars from '../components/dashboard/WeeklyBars'
import ThemeToggle from '../components/ui/ThemeToggle'
import '../styles/dashboard.css'

export default function DashboardPage() {
  const { data: stats, loading, error } = useStats()
  const navigate = useNavigate()

  return (
    <div className="view">
      <div className="top-bar">
        <button className="crumb-link" onClick={() => navigate('/')}>
          Board
        </button>
        <span className="crumb-sep">/</span>
        <span className="crumb-current">Dashboard</span>
        <div className="spacer" />
        <ThemeToggle />
      </div>

      {error ? (
        <div className="empty-state">Couldn’t load stats: {error.message}</div>
      ) : loading || !stats ? (
        <div className="empty-state">Loading dashboard…</div>
      ) : (
        <div className="dash-scroll">
          <div className="dash-content">
            <StatTiles stats={stats} />

            <div className="panel">
              <div className="panel-title">Upcoming follow-ups</div>
              <FollowUps />
            </div>

            <div className="panel">
              <div className="panel-title">Application activity</div>
              <ActivityHeatmap perDay={stats.applications_per_day} />
            </div>

            <div className="panel">
              <div className="panel-title spaced">Applications per week</div>
              <WeeklyBars perDay={stats.applications_per_day} />
            </div>

            <div className="dash-grid-2">
              <div className="panel">
                <div className="panel-title spaced">Pipeline funnel</div>
                <FunnelBars data={stats.status_funnel} />
              </div>
              <div className="panel">
                <div className="panel-title spaced">Applications by source</div>
                <SourceBars data={stats.by_source} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
