import { useState } from 'react'
import { api } from '../../api/client'
import type { InterviewRound, Outcome, RoundType } from '../../api/types'
import { ROUND_TYPE_LABELS } from '../../api/types'
import { formatDateTime, toDate } from '../../lib/dates'

/** The design's round-type choices; legacy values (behavioral,
    system_design) stay selectable when editing a round that has one. */
const DESIGN_ROUND_TYPES: RoundType[] = ['phone_screen', 'technical', 'onsite', 'final', 'other']
const OUTCOMES: Outcome[] = ['pending', 'passed', 'failed', 'cancelled']
const OUTCOME_LABELS: Record<Outcome, string> = {
  pending: 'Pending',
  passed: 'Passed',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

interface RoundForm {
  id?: number
  type: RoundType
  scheduledAt: string
  interviewers: string
  outcome: Outcome
  notes: string
}

const blank: RoundForm = {
  type: 'phone_screen',
  scheduledAt: '',
  interviewers: '',
  outcome: 'pending',
  notes: '',
}

interface Props {
  applicationId: number
  rounds: InterviewRound[]
  act: (fn: () => Promise<void>) => void
  requestDelete: (kind: 'round', id: number, label: string) => void
  onChanged: () => void
}

export default function RoundsTab({ applicationId, rounds, act, requestDelete, onChanged }: Props) {
  const [form, setForm] = useState<RoundForm | null>(null)

  const typeOptions =
    form && !DESIGN_ROUND_TYPES.includes(form.type)
      ? [...DESIGN_ROUND_TYPES, form.type]
      : DESIGN_ROUND_TYPES

  const save = () => {
    if (!form) return
    const payload = {
      round_type: form.type,
      scheduled_at: form.scheduledAt || null,
      interviewers: form.interviewers.trim() || null,
      outcome: form.outcome,
      notes: form.notes.trim() || null,
    }
    act(async () => {
      if (form.id) await api.patch(`/api/interviews/${form.id}`, payload)
      else await api.post(`/api/applications/${applicationId}/interviews`, payload)
      setForm(null)
      onChanged()
    })
  }

  const sorted = [...rounds].sort(
    (a, b) =>
      toDate(a.scheduled_at || '2100-01-01').getTime() -
      toDate(b.scheduled_at || '2100-01-01').getTime(),
  )

  return (
    <div>
      {form && (
        <div className="tab-form">
          <div className="tab-form-title">{form.id ? 'Edit round' : 'Add round'}</div>
          <div className="tab-form-grid">
            <select
              aria-label="Round type"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as RoundType })}
            >
              {typeOptions.map((t) => (
                <option key={t} value={t}>
                  {ROUND_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
            <select
              aria-label="Outcome"
              value={form.outcome}
              onChange={(e) => setForm({ ...form, outcome: e.target.value as Outcome })}
            >
              {OUTCOMES.map((o) => (
                <option key={o} value={o}>
                  {OUTCOME_LABELS[o]}
                </option>
              ))}
            </select>
            <input
              className="span-2"
              type="datetime-local"
              aria-label="Scheduled at"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
            <input
              className="span-2"
              placeholder="Interviewer(s)"
              value={form.interviewers}
              onChange={(e) => setForm({ ...form, interviewers: e.target.value })}
            />
            <textarea
              className="span-2"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <div className="tab-form-actions">
            <button className="btn-ghost" onClick={() => setForm(null)}>
              Cancel
            </button>
            <button className="save-pill" onClick={save}>
              Save round
            </button>
          </div>
        </div>
      )}

      <div className="tab-add-row">
        <button className="btn-dashed" onClick={() => setForm(blank)}>
          + Add round
        </button>
      </div>

      <div className="item-list">
        {sorted.map((round) => (
          <div className="item-card" key={round.id}>
            <div className="item-main">
              <div className="round-head">
                <span className="item-title">{ROUND_TYPE_LABELS[round.round_type]}</span>
                <span className={`outcome-badge ${round.outcome}`}>
                  {OUTCOME_LABELS[round.outcome]}
                </span>
              </div>
              <div className="round-when mono">
                {round.scheduled_at ? formatDateTime(round.scheduled_at) : 'Not scheduled'}
              </div>
              {round.interviewers && <div className="item-notes">With {round.interviewers}</div>}
              {round.notes && <div className="item-notes">{round.notes}</div>}
            </div>
            <div className="item-actions">
              <button
                className="item-edit"
                onClick={() =>
                  setForm({
                    id: round.id,
                    type: round.round_type,
                    scheduledAt: round.scheduled_at ?? '',
                    interviewers: round.interviewers ?? '',
                    outcome: round.outcome,
                    notes: round.notes ?? '',
                  })
                }
              >
                Edit
              </button>
              <button
                className="item-delete"
                onClick={() =>
                  requestDelete('round', round.id, `${ROUND_TYPE_LABELS[round.round_type]} round`)
                }
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {rounds.length === 0 && <div className="tab-empty">No interview rounds yet.</div>}
      </div>
    </div>
  )
}
