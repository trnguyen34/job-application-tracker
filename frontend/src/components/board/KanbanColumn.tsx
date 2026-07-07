import { useDroppable } from '@dnd-kit/core'
import type { ApplicationCard as CardData, Status } from '../../api/types'
import { STATUS_LABELS } from '../../api/types'
import ApplicationCard from './ApplicationCard'

interface Props {
  status: Status
  cards: CardData[]
}

export default function KanbanColumn({ status, cards }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: status })

  return (
    <section
      ref={setNodeRef}
      className={`column${isOver ? ' drop-target' : ''}`}
      style={{ ['--column-hue' as string]: `var(--status-${status})` }}
      data-testid={`column-${status}`}
    >
      <div className="column-head">
        <span className="dot" />
        <h2>{STATUS_LABELS[status]}</h2>
        <span className="count">{cards.length}</span>
      </div>
      <div className="column-cards">
        {cards.map((card) => (
          <ApplicationCard key={card.id} card={card} />
        ))}
        {cards.length === 0 && <div className="empty-state">—</div>}
      </div>
    </section>
  )
}
