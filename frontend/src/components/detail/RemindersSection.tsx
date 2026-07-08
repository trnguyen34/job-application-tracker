import { useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import { useApiAction } from '../../api/hooks'
import type { Reminder } from '../../api/types'
import { isOverdue, shortDate, todayISO } from '../../lib/dates'

interface Props {
  applicationId: number
  reminders: Reminder[]
  onChanged: () => void
}

export default function RemindersSection({ applicationId, reminders, onChanged }: Props) {
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState(todayISO())
  const { error, setError, run } = useApiAction()

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!description.trim()) {
      setError('Description is required.')
      return
    }
    run(async () => {
      await api.post(`/api/applications/${applicationId}/reminders`, {
        description: description.trim(),
        due_date: dueDate,
      })
      setDescription('')
      onChanged()
    })
  }

  const toggle = (reminder: Reminder) =>
    run(async () => {
      await api.patch(`/api/reminders/${reminder.id}`, { done: !reminder.done })
      onChanged()
    })

  const remove = (id: number) =>
    run(async () => {
      await api.del(`/api/reminders/${id}`)
      onChanged()
    })

  return (
    <div className="section-list">
      <form className="item-card" onSubmit={submit}>
        <div className="item-head">
          <input
            placeholder="Remind me to…"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <input
            type="date"
            aria-label="Due date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
          <span className="spacer">
            <button type="submit" className="btn primary">
              Add reminder
            </button>
          </span>
        </div>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </form>
      {reminders.length === 0 && <div className="empty-state">No reminders yet.</div>}
      {reminders.map((reminder) => {
        const overdue = !reminder.done && isOverdue(reminder.due_date)
        return (
          <div
            className={`item-card reminder-item${reminder.done ? ' done' : ''}${
              overdue ? ' overdue' : ''
            }`}
            key={reminder.id}
            data-testid={`reminder-item-${reminder.id}`}
          >
            <div className="item-head">
              <input
                type="checkbox"
                aria-label={`Done: ${reminder.description}`}
                checked={reminder.done}
                onChange={() => toggle(reminder)}
              />
              <span className={`title${reminder.done ? ' struck' : ''}`}>
                {reminder.description}
              </span>
              <span className={`muted due${overdue ? ' overdue' : ''}`}>
                {overdue ? 'Overdue · ' : ''}
                {shortDate(reminder.due_date)}
              </span>
              <span className="spacer">
                <button className="icon-btn danger" onClick={() => remove(reminder.id)}>
                  Delete
                </button>
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
