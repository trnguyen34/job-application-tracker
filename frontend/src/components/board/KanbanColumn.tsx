import { useDroppable } from '@dnd-kit/core'
import type { ApplicationCard as CardData } from '../../api/types'
import type { ColumnKey } from '../../lib/design'
import ApplicationCard from './ApplicationCard'

interface Props {
  columnKey: ColumnKey
  label: string
  cards: CardData[]
  onOpen: (id: number) => void
}

export default function KanbanColumn({ columnKey, label, cards, onOpen }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: columnKey })

  return (
    <section
      ref={setNodeRef}
      className={`column${isOver ? ' drop-target' : ''}`}
      style={{ ['--col-bg' as string]: `var(--column-${columnKey})` }}
      data-testid={`column-${columnKey}`}
    >
      <div className="column-head">
        <span className="column-label">{label}</span>
        <span className="count mono">{cards.length}</span>
      </div>
      <div className="column-cards">
        {cards.map((card) => (
          <ApplicationCard
            key={card.id}
            card={card}
            showClosedTag={columnKey === 'closed'}
            onOpen={onOpen}
          />
        ))}
      </div>
    </section>
  )
}
