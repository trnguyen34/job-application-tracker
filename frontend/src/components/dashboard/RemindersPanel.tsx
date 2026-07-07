import { Link } from 'react-router-dom'
import { api } from '../../api/client'
import { useUpcomingReminders } from '../../api/hooks'
import { isOverdue, isToday, shortDate } from '../../lib/dates'

export default function RemindersPanel() {
  const { data: reminders, loading, refetch } = useUpcomingReminders(14)

  const markDone = async (id: number) => {
    await api.patch(`/api/reminders/${id}`, { done: true })
    refetch()
  }

  if (loading && !reminders) return <div className="empty-state">Loading reminders…</div>

  return (
    <ul className="reminder-list">
      {(reminders ?? []).map((reminder) => {
        const overdue = isOverdue(reminder.due_date)
        return (
          <li
            key={reminder.id}
            className={`reminder-row${overdue ? ' overdue' : ''}`}
            data-testid={`reminder-${reminder.id}`}
          >
            <button
              className="check"
              aria-label={`Mark "${reminder.description}" done`}
              onClick={() => markDone(reminder.id)}
            >
              ○
            </button>
            <div className="reminder-text">
              <span className="description">{reminder.description}</span>
              <Link to={`/applications/${reminder.application_id}`} className="context">
                {reminder.company} · {reminder.role}
              </Link>
            </div>
            <span className={`due${overdue ? ' overdue' : ''}`}>
              {overdue ? `Overdue · ${shortDate(reminder.due_date)}` : null}
              {!overdue && (isToday(reminder.due_date) ? 'Today' : shortDate(reminder.due_date))}
            </span>
          </li>
        )
      })}
      {reminders?.length === 0 && (
        <div className="empty-state">Nothing due in the next two weeks. 🎉</div>
      )}
    </ul>
  )
}
