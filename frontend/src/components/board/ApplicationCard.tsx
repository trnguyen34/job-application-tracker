import { useDraggable } from '@dnd-kit/core'
import type { ApplicationCard as CardData } from '../../api/types'
import { ROUND_TYPE_LABELS, STATUS_LABELS } from '../../api/types'
import { statusFg, statusTint, WORK_MODE_LABELS } from '../../lib/design'
import { appliedLabel, formatDateTime, relativeDayLabel, toDate, todayISO } from '../../lib/dates'

/** The card's footer event, per the design: an overdue reminder always
    wins; otherwise the earliest of the next reminder and the next pending
    interview. Exported for tests. */
export function nextEventFor(
  card: CardData,
): { label: string; overdue: boolean } | null {
  const today = todayISO()
  const reminder = card.next_reminder
  if (reminder && reminder.due_date < today) {
    return { label: `Overdue — ${reminder.description}`, overdue: true }
  }
  const candidates: { when: string; label: string }[] = []
  if (reminder) {
    candidates.push({
      when: reminder.due_date,
      label: `${reminder.description} · ${relativeDayLabel(reminder.due_date)}`,
    })
  }
  if (card.next_interview?.scheduled_at) {
    candidates.push({
      when: card.next_interview.scheduled_at,
      label: `${ROUND_TYPE_LABELS[card.next_interview.round_type]} interview · ${formatDateTime(card.next_interview.scheduled_at)}`,
    })
  }
  candidates.sort((a, b) => toDate(a.when).getTime() - toDate(b.when).getTime())
  return candidates.length ? { label: candidates[0].label, overdue: false } : null
}

export function CardBody({ card, showClosedTag }: { card: CardData; showClosedTag: boolean }) {
  const meta = [
    card.work_mode ? WORK_MODE_LABELS[card.work_mode] : null,
    card.location,
    appliedLabel(card.applied_date, card.created_at),
  ].filter(Boolean)
  const next = nextEventFor(card)

  return (
    <>
      {showClosedTag && (
        <span
          className="closed-tag"
          style={{ background: statusTint(card.status), color: statusFg(card.status) }}
        >
          {STATUS_LABELS[card.status]}
        </span>
      )}
      <div className="card-top">
        <span className="company">{card.company}</span>
        {card.priority === 'high' && (
          <span className="priority-dot high" title="High priority">
            ●
          </span>
        )}
        {card.priority === 'medium' && (
          <span className="priority-dot medium" title="Medium priority">
            ●
          </span>
        )}
      </div>
      <div className="role">{card.role}</div>
      <div className="card-meta mono">{meta.join(' · ')}</div>
      {next && <div className={`next-chip${next.overdue ? ' overdue' : ''}`}>{next.label}</div>}
    </>
  )
}

interface Props {
  card: CardData
  showClosedTag: boolean
  onOpen: (id: number) => void
}

export default function ApplicationCard({ card, showClosedTag, onOpen }: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: card.id,
    data: { status: card.status },
  })

  return (
    <div
      ref={setNodeRef}
      className={`card${isDragging ? ' dragging' : ''}`}
      data-testid={`card-${card.id}`}
      onClick={() => onOpen(card.id)}
      {...listeners}
      {...attributes}
    >
      <CardBody card={card} showClosedTag={showClosedTag} />
    </div>
  )
}
