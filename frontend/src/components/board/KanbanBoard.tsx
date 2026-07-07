import { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import type { ApplicationCard as CardData, Status } from '../../api/types'
import { STATUSES } from '../../api/types'
import KanbanColumn from './KanbanColumn'
import { CardBody } from './ApplicationCard'

/** Translate a drag-end event into a move, or null when nothing changed.
    Exported separately so tests can drive it without simulating pointers. */
export function dragEndToMove(event: DragEndEvent): { id: number; status: Status } | null {
  const { active, over } = event
  if (!over) return null
  const from = active.data.current?.status as Status | undefined
  const to = over.id as Status
  if (from === to) return null
  return { id: Number(active.id), status: to }
}

interface Props {
  cards: CardData[]
  onMove: (id: number, status: Status) => void
}

export default function KanbanBoard({ cards, onMove }: Props) {
  const [activeCard, setActiveCard] = useState<CardData | null>(null)
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor),
  )

  const handleDragStart = (event: DragStartEvent) => {
    setActiveCard(cards.find((c) => c.id === Number(event.active.id)) ?? null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveCard(null)
    const move = dragEndToMove(event)
    if (move) onMove(move.id, move.status)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="board" data-testid="board">
        {STATUSES.map((status) => (
          <KanbanColumn
            key={status}
            status={status}
            cards={cards.filter((c) => c.status === status)}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard && (
          <div className="card overlay">
            <CardBody card={activeCard} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
