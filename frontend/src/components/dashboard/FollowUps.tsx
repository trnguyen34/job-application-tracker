import { useNavigate } from 'react-router-dom'
import { useUpcomingReminders } from '../../api/hooks'
import { isOverdue, shortDate } from '../../lib/dates'

/** Undone reminders due in the next two weeks (overdue included and
    listed first, top 8); clicking a row opens its application. */
export default function FollowUps() {
  const { data: reminders, loading } = useUpcomingReminders(14)
  const navigate = useNavigate()

  if (loading && !reminders) return <div className="tab-empty">Loading reminders…</div>

  const rows = [...(reminders ?? [])]
    .sort((a, b) => {
      const ao = isOverdue(a.due_date)
      const bo = isOverdue(b.due_date)
      return ao === bo ? 0 : ao ? -1 : 1
    })
    .slice(0, 8)

  return (
    <div>
      {rows.map((reminder) => {
        const overdue = isOverdue(reminder.due_date)
        return (
          <div
            key={reminder.id}
            className="followup-row"
            data-testid={`followup-${reminder.id}`}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/applications/${reminder.application_id}`)}
            onKeyDown={(e) =>
              e.key === 'Enter' && navigate(`/applications/${reminder.application_id}`)
            }
          >
            <div>
              <div className="followup-desc">{reminder.description}</div>
              <div className="followup-company">{reminder.company}</div>
            </div>
            <div className={`followup-due mono${overdue ? ' overdue' : ''}`}>
              {overdue ? 'Overdue · ' : 'Due '}
              {shortDate(reminder.due_date)}
            </div>
          </div>
        )
      })}
      {rows.length === 0 && (
        <div className="followups-empty">Nothing due in the next two weeks.</div>
      )}
    </div>
  )
}
