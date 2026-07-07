import { useDraggable } from '@dnd-kit/core'
import { Link } from 'react-router-dom'
import type { ApplicationCard as CardData } from '../../api/types'
import { ROUND_TYPE_LABELS } from '../../api/types'
import { isOverdue, shortDate } from '../../lib/dates'

export function CardBody({ card }: { card: CardData }) {
  return (
    <>
      <div className="company">{card.company}</div>
      <div className="role">{card.role}</div>
      <div className="card-meta">
        {card.days_since_applied !== null && <span>{card.days_since_applied}d ago</span>}
        {card.next_reminder && (
          <span
            className={`chip reminder${isOverdue(card.next_reminder.due_date) ? ' overdue' : ''}`}
            title={card.next_reminder.description}
          >
            ⏰ {shortDate(card.next_reminder.due_date)}
          </span>
        )}
        {card.next_interview && card.next_interview.scheduled_at && (
          <span className="chip interview">
            🎙 {ROUND_TYPE_LABELS[card.next_interview.round_type]} ·{' '}
            {shortDate(card.next_interview.scheduled_at)}
          </span>
        )}
        {card.priority !== 'medium' && (
          <span className={`priority-flag ${card.priority}`}>
            {card.priority === 'high' ? '▲ HIGH' : '▽ low'}
          </span>
        )}
      </div>
    </>
  )
}

export default function ApplicationCard({ card }: { card: CardData }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { status: card.status },
  })

  return (
    <div
      ref={setNodeRef}
      className={`card${isDragging ? ' dragging' : ''}`}
      data-testid={`card-${card.id}`}
      {...listeners}
      {...attributes}
    >
      <Link to={`/applications/${card.id}`} onClick={(e) => e.stopPropagation()}>
        <CardBody card={card} />
      </Link>
    </div>
  )
}
