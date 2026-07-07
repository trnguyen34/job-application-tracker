import { useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import type { InterviewRound, Outcome, RoundType } from '../../api/types'
import { ROUND_TYPE_LABELS } from '../../api/types'
import { formatDateTime } from '../../lib/dates'

interface Props {
  applicationId: number
  rounds: InterviewRound[]
  onChanged: () => void
}

const OUTCOMES: Outcome[] = ['pending', 'passed', 'failed', 'cancelled']

export default function InterviewsSection({ applicationId, rounds, onChanged }: Props) {
  const [adding, setAdding] = useState(false)
  const [roundType, setRoundType] = useState<RoundType>('phone_screen')
  const [scheduledAt, setScheduledAt] = useState('')
  const [interviewers, setInterviewers] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    await api.post(`/api/applications/${applicationId}/interviews`, {
      round_type: roundType,
      scheduled_at: scheduledAt || null,
      interviewers: interviewers.trim() || null,
    })
    setAdding(false)
    setScheduledAt('')
    setInterviewers('')
    onChanged()
  }

  const setOutcome = async (id: number, outcome: Outcome) => {
    await api.patch(`/api/interviews/${id}`, { outcome })
    onChanged()
  }

  const remove = async (id: number) => {
    await api.del(`/api/interviews/${id}`)
    onChanged()
  }

  return (
    <div className="section-list">
      {rounds.length === 0 && !adding && (
        <div className="empty-state">No interview rounds yet.</div>
      )}
      {rounds.map((round) => (
        <div className="item-card" key={round.id}>
          <div className="item-head">
            <span className="title">{ROUND_TYPE_LABELS[round.round_type]}</span>
            {round.scheduled_at && (
              <span className="muted">{formatDateTime(round.scheduled_at)}</span>
            )}
            <span className="spacer">
              <select
                aria-label="Outcome"
                className={`outcome-${round.outcome}`}
                value={round.outcome}
                onChange={(e) => setOutcome(round.id, e.target.value as Outcome)}
              >
                {OUTCOMES.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
              <button className="icon-btn danger" onClick={() => remove(round.id)}>
                Delete
              </button>
            </span>
          </div>
          {round.interviewers && <div className="muted">With: {round.interviewers}</div>}
          {round.notes && <div className="body">{round.notes}</div>}
        </div>
      ))}
      {adding ? (
        <form className="item-card" onSubmit={submit}>
          <div className="item-head">
            <select
              aria-label="Round type"
              value={roundType}
              onChange={(e) => setRoundType(e.target.value as RoundType)}
            >
              {Object.entries(ROUND_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <input
              type="datetime-local"
              aria-label="Scheduled at"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <input
              placeholder="Interviewers"
              value={interviewers}
              onChange={(e) => setInterviewers(e.target.value)}
            />
          </div>
          <div className="item-head">
            <span className="spacer">
              <button type="button" className="btn" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button type="submit" className="btn primary">
                Add round
              </button>
            </span>
          </div>
        </form>
      ) : (
        <div className="add-row">
          <button className="btn" onClick={() => setAdding(true)}>
            + Add interview round
          </button>
        </div>
      )}
    </div>
  )
}
