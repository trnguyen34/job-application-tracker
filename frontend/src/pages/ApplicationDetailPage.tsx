import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import { useApplication } from '../api/hooks'
import type { Priority, Status, WorkMode } from '../api/types'
import { STATUSES, STATUS_LABELS } from '../api/types'
import ContactsSection from '../components/detail/ContactsSection'
import InterviewsSection from '../components/detail/InterviewsSection'
import NotesSection from '../components/detail/NotesSection'
import InlineField from '../components/detail/InlineField'
import '../styles/detail.css'

type Tab = 'interviews' | 'contacts' | 'notes'

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { data: application, error, refetch } = useApplication(id!)
  const [tab, setTab] = useState<Tab>('interviews')

  if (error) return <div className="empty-state">Couldn’t load application: {error.message}</div>
  if (!application) return <div className="empty-state">Loading…</div>

  const patch = async (fields: Record<string, unknown>) => {
    await api.patch(`/api/applications/${application.id}`, fields)
    refetch()
  }

  const remove = async () => {
    if (!window.confirm(`Delete the ${application.company} application and all its data?`)) return
    await api.del(`/api/applications/${application.id}`)
    navigate('/')
  }

  const salaryDisplay =
    application.salary_min || application.salary_max
      ? `${application.salary_min?.toLocaleString() ?? '?'} – ${
          application.salary_max?.toLocaleString() ?? '?'
        } ${application.salary_currency}`
      : null

  const tabs: { key: Tab; label: string; count: number }[] = [
    { key: 'interviews', label: 'Interviews', count: application.interview_rounds.length },
    { key: 'contacts', label: 'Contacts', count: application.contacts.length },
    { key: 'notes', label: 'Notes', count: application.notes.length },
  ]

  return (
    <>
      <div className="detail-header">
        <div className="titles">
          <Link to="/" className="muted">
            ← Board
          </Link>
          <h1>
            <InlineField
              value={application.company}
              validate={(raw) => (raw.trim() ? null : 'Company is required.')}
              onSave={(raw) => patch({ company: raw.trim() })}
            />
          </h1>
          <div className="role">
            <InlineField
              value={application.role}
              validate={(raw) => (raw.trim() ? null : 'Role is required.')}
              onSave={(raw) => patch({ role: raw.trim() })}
            />
          </div>
          <div className="status-row">
            <select
              aria-label="Status"
              className="status-select"
              style={{ ['--status-hue' as string]: `var(--status-${application.status})` }}
              value={application.status}
              onChange={(e) => patch({ status: e.target.value as Status })}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
            <select
              aria-label="Priority"
              value={application.priority}
              onChange={(e) => patch({ priority: e.target.value as Priority })}
            >
              <option value="low">Low priority</option>
              <option value="medium">Medium priority</option>
              <option value="high">High priority</option>
            </select>
          </div>
        </div>
        <button className="btn danger" onClick={remove}>
          Delete
        </button>
      </div>

      <div className="detail-grid">
        <aside className="facts">
          <h3>Details</h3>
          <div className="fact">
            <span className="label">Applied</span>
            <InlineField
              type="date"
              value={application.applied_date}
              placeholder="Set date"
              onSave={(raw) => patch({ applied_date: raw || null })}
            />
          </div>
          <div className="fact">
            <span className="label">Location</span>
            <InlineField
              value={application.location}
              onSave={(raw) => patch({ location: raw.trim() || null })}
            />
          </div>
          <div className="fact">
            <span className="label">Work mode</span>
            <select
              aria-label="Work mode"
              value={application.work_mode ?? ''}
              onChange={(e) => patch({ work_mode: (e.target.value || null) as WorkMode | null })}
            >
              <option value="">—</option>
              <option value="remote">Remote</option>
              <option value="hybrid">Hybrid</option>
              <option value="onsite">Onsite</option>
            </select>
          </div>
          <div className="fact">
            <span className="label">Salary range</span>
            <InlineField
              value={salaryDisplay}
              placeholder="e.g. 150000-190000"
              validate={(raw) => {
                if (!raw.trim()) return null
                const parts = raw.split(/[-–]/).map((p) => Number(p.replace(/[^\d]/g, '')))
                if (parts.length !== 2 || parts.some(Number.isNaN))
                  return 'Use the form min-max, e.g. 150000-190000.'
                if (parts[0] > parts[1]) return 'Min must be ≤ max.'
                return null
              }}
              onSave={(raw) => {
                if (!raw.trim()) return patch({ salary_min: null, salary_max: null })
                const [min, max] = raw
                  .split(/[-–]/)
                  .map((p) => Number(p.replace(/[^\d]/g, '')))
                return patch({ salary_min: min, salary_max: max })
              }}
            />
          </div>
          <div className="fact">
            <span className="label">Source</span>
            <InlineField
              value={application.source}
              onSave={(raw) => patch({ source: raw.trim() || null })}
            />
          </div>
          <div className="fact">
            <span className="label">Job posting</span>
            <InlineField
              value={application.job_url}
              display={
                application.job_url ? (
                  <a href={application.job_url} target="_blank" rel="noreferrer">
                    {new URL(application.job_url).hostname} ↗
                  </a>
                ) : undefined
              }
              onSave={(raw) => patch({ job_url: raw.trim() || null })}
            />
          </div>
        </aside>

        <section>
          <div className="tabs" role="tablist">
            {tabs.map(({ key, label, count }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                className={`tab${tab === key ? ' active' : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
                <span className="count">{count}</span>
              </button>
            ))}
          </div>
          {tab === 'interviews' && (
            <InterviewsSection
              applicationId={application.id}
              rounds={application.interview_rounds}
              onChanged={refetch}
            />
          )}
          {tab === 'contacts' && (
            <ContactsSection
              applicationId={application.id}
              contacts={application.contacts}
              onChanged={refetch}
            />
          )}
          {tab === 'notes' && (
            <NotesSection
              applicationId={application.id}
              notes={application.notes}
              onChanged={refetch}
            />
          )}
        </section>
      </div>
    </>
  )
}
