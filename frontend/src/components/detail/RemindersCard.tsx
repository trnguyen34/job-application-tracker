import { useState } from 'react'
import { api } from '../../api/client'
import type { Reminder } from '../../api/types'
import { isOverdue, relativeDayLabel, shortDate, toDate } from '../../lib/dates'
import DateInput from '../ui/DateInput'

interface Props {
  applicationId: number
  reminders: Reminder[]
  act: (fn: () => Promise<void>) => void
  requestDelete: (kind: 'reminder', id: number, label: string) => void
  onChanged: () => void
}

export default function RemindersCard({
  applicationId,
  reminders,
  act,
  requestDelete,
  onChanged,
}: Props) {
  const [form, setForm] = useState<{ description: string; dueDate: string } | null>(null)

  const save = () => {
    if (!form || !form.description.trim() || !form.dueDate) return
    act(async () => {
      await api.post(`/api/applications/${applicationId}/reminders`, {
        description: form.description.trim(),
        due_date: form.dueDate,
      })
      setForm(null)
      onChanged()
    })
  }

  const toggle = (reminder: Reminder) =>
    act(async () => {
      await api.patch(`/api/reminders/${reminder.id}`, { done: !reminder.done })
      onChanged()
    })

  const sorted = [...reminders].sort(
    (a, b) => toDate(a.due_date).getTime() - toDate(b.due_date).getTime(),
  )

  return (
    <div className="side-card reminders-card">
      <div className="side-card-head">
        <span className="side-card-label">Reminders</span>
        <button className="link-accent" onClick={() => setForm({ description: '', dueDate: '' })}>
          + Add
        </button>
      </div>

      {form && (
        <div className="reminder-form">
          <input
            placeholder="What do you need to do?"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <DateInput
            ariaLabel="Due date"
            compact
            value={form.dueDate}
            onChange={(dueDate) => setForm({ ...form, dueDate })}
          />
          <div className="tab-form-actions">
            <button className="btn-ghost" onClick={() => setForm(null)}>
              Cancel
            </button>
            <button
              className="save-pill"
              disabled={!form.description.trim() || !form.dueDate}
              onClick={save}
            >
              Save
            </button>
          </div>
        </div>
      )}

      <div className="reminder-rows">
        {sorted.map((reminder) => {
          const overdue = !reminder.done && isOverdue(reminder.due_date)
          return (
            <div
              className={`reminder-row${reminder.done ? ' done' : ''}`}
              key={reminder.id}
              data-testid={`reminder-item-${reminder.id}`}
            >
              <input
                type="checkbox"
                aria-label={`Done: ${reminder.description}`}
                checked={reminder.done}
                onChange={() => toggle(reminder)}
              />
              <div className="reminder-text">
                <div className={`reminder-desc${reminder.done ? ' struck' : ''}`}>
                  {reminder.description}
                </div>
                <div className={`reminder-due${overdue ? ' overdue' : ''}`}>
                  {shortDate(reminder.due_date)} · {relativeDayLabel(reminder.due_date)}
                </div>
              </div>
              <button
                className="item-delete"
                aria-label={`Delete reminder: ${reminder.description}`}
                onClick={() => requestDelete('reminder', reminder.id, reminder.description)}
              >
                ✕
              </button>
            </div>
          )
        })}
        {reminders.length === 0 && <div className="tab-empty small">No reminders yet.</div>}
      </div>
    </div>
  )
}
