import { useState, type FormEvent } from 'react'
import { api, errorMessage } from '../../api/client'
import type { Application, Priority, Status, WorkMode } from '../../api/types'
import { STATUS_LABELS } from '../../api/types'
import { ACTIVE_STATUSES, CLOSED_STATUSES, SOURCE_OPTIONS } from '../../lib/design'
import { todayISO } from '../../lib/dates'
import { useToast } from '../ui/Toast'

interface Props {
  onClose: () => void
  onCreated: (application: Application) => void
}

export default function NewApplicationModal({ onClose, onCreated }: Props) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState<Status>('wishlist')
  const [location, setLocation] = useState('')
  const [workMode, setWorkMode] = useState<WorkMode>('remote')
  const [source, setSource] = useState('LinkedIn')
  const [priority, setPriority] = useState<Priority>('medium')
  const [jobUrl, setJobUrl] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const invalid = !company.trim() || !role.trim()

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (invalid || saving) return
    setSaving(true)
    try {
      const created = await api.post<Application>('/api/applications', {
        company: company.trim(),
        role: role.trim(),
        status,
        applied_date: status !== 'wishlist' ? todayISO() : null,
        location: location.trim() || null,
        work_mode: workMode,
        source,
        priority,
        job_url: jobUrl.trim() || null,
        salary_min: salaryMin === '' ? null : Number(salaryMin),
        salary_max: salaryMax === '' ? null : Number(salaryMax),
        salary_currency: 'USD',
      })
      onCreated(created)
    } catch (err) {
      toast(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <div className="overlay">
      <form
        className="modal-card new-app-card"
        role="dialog"
        aria-label="New application"
        onSubmit={submit}
      >
        <div className="new-app-title">New application</div>
        <div className="new-app-grid">
          <input
            autoFocus
            className="span-2"
            placeholder="Company *"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
          <input
            className="span-2"
            placeholder="Role / title *"
            value={role}
            onChange={(e) => setRole(e.target.value)}
          />
          <label className="field-label span-2">
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              <optgroup label="Active">
                {ACTIVE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </optgroup>
              <optgroup label="Closed">
                {CLOSED_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </optgroup>
            </select>
          </label>
          <input
            placeholder="Location"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
          />
          <select
            aria-label="Work mode"
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value as WorkMode)}
          >
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
          <select
            aria-label="Source"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          >
            {SOURCE_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            aria-label="Priority"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="low">Low priority</option>
            <option value="medium">Medium priority</option>
            <option value="high">High priority</option>
          </select>
          <input
            className="span-2"
            placeholder="Job posting URL"
            value={jobUrl}
            onChange={(e) => setJobUrl(e.target.value)}
          />
          <input
            type="number"
            min="0"
            placeholder="Min salary"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
          />
          <input
            type="number"
            min="0"
            placeholder="Max salary"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button type="button" className="btn-ghost" style={{ fontSize: 13, padding: '9px 6px' }} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-accent" disabled={invalid || saving}>
            {saving ? 'Adding…' : `Add to ${STATUS_LABELS[status]}`}
          </button>
        </div>
      </form>
    </div>
  )
}
