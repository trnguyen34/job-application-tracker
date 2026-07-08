import { useState, type FormEvent } from 'react'
import { api, errorMessage } from '../../api/client'
import type { Application, Priority, Status, WorkMode } from '../../api/types'
import { STATUS_LABELS } from '../../api/types'
import { SOURCE_OPTIONS, STATUS_GROUPS, WORK_MODE_LABELS } from '../../lib/design'
import { todayISO } from '../../lib/dates'
import LocationInput from '../ui/LocationInput'
import Select from '../ui/Select'
import { useToast } from '../ui/Toast'

const WORK_MODE_GROUP = [
  {
    options: (['remote', 'hybrid', 'onsite'] as const).map((m) => ({
      value: m,
      label: WORK_MODE_LABELS[m],
    })),
  },
]

const SOURCE_GROUP = [{ options: SOURCE_OPTIONS.map((s) => ({ value: s, label: s })) }]

const PRIORITY_GROUP = [
  {
    options: [
      { value: 'low', label: 'Low priority' },
      { value: 'medium', label: 'Medium priority' },
      { value: 'high', label: 'High priority' },
    ],
  },
]

/* Contacts and interview rounds are disabled in this modal for now.
   Uncomment the blocks marked "contacts & rounds" (plus these imports)
   to restore them; both can still be managed from the detail modal.

import type { RoundType } from '../../api/types'
import { ROUND_TYPE_LABELS } from '../../api/types'
import { formatDateTime } from '../../lib/dates'

interface ContactDraft {
  name: string
  role: string
  email: string
  phone: string
  linkedinUrl: string
  notes: string
}

interface RoundDraft {
  type: RoundType
  scheduledAt: string
  interviewers: string
  notes: string
}

const blankContact: ContactDraft = {
  name: '',
  role: '',
  email: '',
  phone: '',
  linkedinUrl: '',
  notes: '',
}

const blankRound: RoundDraft = {
  type: 'phone_screen',
  scheduledAt: '',
  interviewers: '',
  notes: '',
}

const ROUND_TYPES: RoundType[] = ['phone_screen', 'technical', 'onsite', 'final', 'other']
*/

interface Props {
  onClose: () => void
  onCreated: (application: Application) => void
}

export default function NewApplicationModal({ onClose, onCreated }: Props) {
  const [company, setCompany] = useState('')
  const [role, setRole] = useState('')
  const [status, setStatus] = useState<Status>('applied')
  const [location, setLocation] = useState('')
  const [workMode, setWorkMode] = useState<WorkMode>('onsite')
  const [source, setSource] = useState('LinkedIn')
  const [priority, setPriority] = useState<Priority>('high')
  const [jobUrl, setJobUrl] = useState('')
  const [salaryMin, setSalaryMin] = useState('')
  const [salaryMax, setSalaryMax] = useState('')
  /* contacts & rounds
  const [contacts, setContacts] = useState<ContactDraft[]>([])
  const [contactForm, setContactForm] = useState<ContactDraft | null>(null)
  const [rounds, setRounds] = useState<RoundDraft[]>([])
  const [roundForm, setRoundForm] = useState<RoundDraft | null>(null)
  */
  const [saving, setSaving] = useState(false)
  const toast = useToast()

  const invalid = !company.trim() || !role.trim()
  /* contacts & rounds
  // Rounds only make sense once the process has started; drafts are kept in
  // state (and restored) if the status flips back, but never submitted for
  // other statuses.
  const showRounds = status === 'phone_screen' || status === 'interview'
  */

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (invalid || saving) return
    setSaving(true)

    let created: Application
    try {
      created = await api.post<Application>('/api/applications', {
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
    } catch (err) {
      toast(errorMessage(err))
      setSaving(false)
      return
    }

    /* contacts & rounds
    try {
      for (const contact of contacts) {
        await api.post(`/api/applications/${created.id}/contacts`, {
          name: contact.name.trim(),
          role: contact.role.trim() || null,
          email: contact.email.trim() || null,
          phone: contact.phone.trim() || null,
          linkedin_url: contact.linkedinUrl.trim() || null,
          notes: contact.notes.trim() || null,
        })
      }
      if (showRounds) {
        for (const round of rounds) {
          await api.post(`/api/applications/${created.id}/interviews`, {
            round_type: round.type,
            scheduled_at: round.scheduledAt || null,
            interviewers: round.interviewers.trim() || null,
            notes: round.notes.trim() || null,
          })
        }
      }
    } catch (err) {
      // The application itself exists at this point — surface what failed
      // and continue into the detail modal where it can be retried.
      toast(errorMessage(err))
    }
    */
    onCreated(created)
  }

  return (
    <div className="overlay top-aligned">
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
          {/* All dropdowns share the detail modal's grouped menu design —
              native select popups can't match the app. */}
          <div className="field-label span-2">
            Status
            <Select
              ariaLabel="Status"
              value={status}
              groups={STATUS_GROUPS}
              menuColumns
              onChange={(s) => setStatus(s as Status)}
            />
          </div>
          <LocationInput value={location} onChange={setLocation} placeholder="Location" />
          <Select
            ariaLabel="Work mode"
            value={workMode}
            groups={WORK_MODE_GROUP}
            onChange={(m) => setWorkMode(m as WorkMode)}
          />
          <Select
            ariaLabel="Source"
            value={source}
            groups={SOURCE_GROUP}
            onChange={setSource}
          />
          <Select
            ariaLabel="Priority"
            value={priority}
            groups={PRIORITY_GROUP}
            onChange={(p) => setPriority(p as Priority)}
          />
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

        {/* contacts & rounds
        <div className="modal-section">
          <div className="modal-section-head">
            <span className="field-label">Contacts</span>
            {!contactForm && (
              <button type="button" className="btn-dashed" onClick={() => setContactForm(blankContact)}>
                + Add contact
              </button>
            )}
          </div>
          {contacts.map((contact, index) => (
            <div className="draft-row" key={`${contact.name}-${index}`}>
              <span className="draft-main">
                {contact.name}
                {contact.role && <span className="draft-sub"> — {contact.role}</span>}
              </span>
              <button
                type="button"
                className="item-delete"
                aria-label={`Remove contact ${contact.name}`}
                onClick={() => setContacts(contacts.filter((_, i) => i !== index))}
              >
                ✕
              </button>
            </div>
          ))}
          {contactForm && (
            <div className="tab-form">
              <div className="tab-form-title">Add contact</div>
              <div className="tab-form-grid">
                <input
                  placeholder="Name"
                  value={contactForm.name}
                  onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                />
                <input
                  placeholder="Role / title"
                  value={contactForm.role}
                  onChange={(e) => setContactForm({ ...contactForm, role: e.target.value })}
                />
                <input
                  placeholder="Email"
                  value={contactForm.email}
                  onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                />
                <input
                  placeholder="Phone"
                  value={contactForm.phone}
                  onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                />
                <input
                  className="span-2"
                  placeholder="LinkedIn URL"
                  value={contactForm.linkedinUrl}
                  onChange={(e) => setContactForm({ ...contactForm, linkedinUrl: e.target.value })}
                />
                <textarea
                  className="span-2"
                  placeholder="Notes"
                  value={contactForm.notes}
                  onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                />
              </div>
              <div className="tab-form-actions">
                <button type="button" className="btn-ghost" onClick={() => setContactForm(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="save-pill"
                  disabled={!contactForm.name.trim()}
                  onClick={() => {
                    setContacts([...contacts, contactForm])
                    setContactForm(null)
                  }}
                >
                  Add contact
                </button>
              </div>
            </div>
          )}
        </div>

        {showRounds && (
          <div className="modal-section">
            <div className="modal-section-head">
              <span className="field-label">Interview rounds</span>
              {!roundForm && (
                <button type="button" className="btn-dashed" onClick={() => setRoundForm(blankRound)}>
                  + Add interview round
                </button>
              )}
            </div>
            {rounds.map((round, index) => (
              <div className="draft-row" key={`${round.type}-${index}`}>
                <span className="draft-main">
                  {ROUND_TYPE_LABELS[round.type]}
                  {round.scheduledAt && (
                    <span className="draft-sub"> — {formatDateTime(round.scheduledAt)}</span>
                  )}
                </span>
                <button
                  type="button"
                  className="item-delete"
                  aria-label={`Remove round ${ROUND_TYPE_LABELS[round.type]}`}
                  onClick={() => setRounds(rounds.filter((_, i) => i !== index))}
                >
                  ✕
                </button>
              </div>
            ))}
            {roundForm && (
              <div className="tab-form">
                <div className="tab-form-title">Add round</div>
                <div className="tab-form-grid">
                  <select
                    aria-label="Round type"
                    value={roundForm.type}
                    onChange={(e) => setRoundForm({ ...roundForm, type: e.target.value as RoundType })}
                  >
                    {ROUND_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {ROUND_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="datetime-local"
                    aria-label="Scheduled at"
                    value={roundForm.scheduledAt}
                    onChange={(e) => setRoundForm({ ...roundForm, scheduledAt: e.target.value })}
                  />
                  <input
                    className="span-2"
                    placeholder="Interviewer(s)"
                    value={roundForm.interviewers}
                    onChange={(e) => setRoundForm({ ...roundForm, interviewers: e.target.value })}
                  />
                  <textarea
                    className="span-2"
                    placeholder="Notes"
                    value={roundForm.notes}
                    onChange={(e) => setRoundForm({ ...roundForm, notes: e.target.value })}
                  />
                </div>
                <div className="tab-form-actions">
                  <button type="button" className="btn-ghost" onClick={() => setRoundForm(null)}>
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="save-pill"
                    onClick={() => {
                      setRounds([...rounds, roundForm])
                      setRoundForm(null)
                    }}
                  >
                    Add round
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
        */}

        <div className="modal-actions">
          <button
            type="button"
            className="btn-ghost"
           
            onClick={onClose}
          >
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
