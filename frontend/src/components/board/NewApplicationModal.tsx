import { useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import type { Application, ApplicationInput, Priority, Status, WorkMode } from '../../api/types'
import { STATUSES, STATUS_LABELS } from '../../api/types'
import { todayISO } from '../../lib/dates'
import Modal from '../ui/Modal'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function NewApplicationModal({ onClose, onCreated }: Props) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState<Status>('wishlist')
  const [jobUrl, setJobUrl] = useState('')
  const [location, setLocation] = useState('')
  const [workMode, setWorkMode] = useState<WorkMode | ''>('')
  const [source, setSource] = useState('')
  const [priority, setPriority] = useState<Priority>('medium')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  const [errors, setErrors] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const validate = (): string[] => {
    const problems: string[] = []
    if (!company.trim()) problems.push('Company is required.')
    if (!role.trim()) problems.push('Role is required.')
    if (salaryMin && salaryMax && Number(salaryMin) > Number(salaryMax))
      problems.push('Salary min must be less than or equal to salary max.')
    return problems
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const problems = validate()
    setErrors(problems)
    if (problems.length) return

    const payload: ApplicationInput = {
      company: company.trim(),
      role: role.trim(),
      status,
      applied_date: status === 'wishlist' ? null : todayISO(),
      job_url: jobUrl.trim() || null,
      location: location.trim() || null,
      work_mode: workMode || null,
      source: source.trim() || null,
      priority,
      salary_min: salaryMin ? Number(salaryMin) : null,
      salary_max: salaryMax ? Number(salaryMax) : null,
    }
    setSaving(true)
    try {
      await api.post<Application>('/api/applications', payload)
      onCreated()
      onClose()
    } catch (err) {
      setErrors([(err as Error).message])
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="New application" onClose={onClose}>
      <form className="form-grid" onSubmit={submit}>
        <label>
          Company *
          <input value={company} onChange={(e) => setCompany(e.target.value)} autoFocus />
        </label>
        <label>
          Role *
          <input value={role} onChange={(e) => setRole(e.target.value)} />
        </label>
        <label>
          Status
          <select value={status} onChange={(e) => setStatus(e.target.value as Status)}>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Priority
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
          </select>
        </label>
        <label>
          Location
          <input value={location} onChange={(e) => setLocation(e.target.value)} />
        </label>
        <label>
          Work mode
          <select value={workMode} onChange={(e) => setWorkMode(e.target.value as WorkMode | '')}>
            <option value="">—</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
            <option value="onsite">Onsite</option>
          </select>
        </label>
        <label>
          Salary min
          <input
            type="number"
            min="0"
            value={salaryMin}
            onChange={(e) => setSalaryMin(e.target.value)}
          />
        </label>
        <label>
          Salary max
          <input
            type="number"
            min="0"
            value={salaryMax}
            onChange={(e) => setSalaryMax(e.target.value)}
          />
        </label>
        <label className="span-2">
          Job posting URL
          <input value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} />
        </label>
        <label className="span-2">
          Source
          <input
            placeholder="LinkedIn, referral, company site…"
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
        </label>
        {errors.length > 0 && (
          <div className="span-2">
            {errors.map((error) => (
              <p key={error} className="error-text" role="alert">
                {error}
              </p>
            ))}
          </div>
        )}
        <div className="modal-actions span-2">
          <button type="button" className="btn" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add application'}
          </button>
        </div>
      </form>
    </Modal>
  )
}
