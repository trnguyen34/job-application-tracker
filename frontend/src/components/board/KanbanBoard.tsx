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
import {
  BOARD_COLUMNS,
  columnKeyForStatus,
  isTerminalStatus,
  STATUS_ORDER,
  type ColumnKey,
} from '../../lib/design'
import KanbanColumn from './KanbanColumn'
import { CardBody } from './ApplicationCard'

/** Translate a drag-end event into a column move, or null when nothing
    changed. Dropping on the grouped Closed column always produces a move —
    even from a closed status — because the caller opens the outcome picker
    rather than patching directly. Exported so tests can drive it without
    simulating pointers. */
export function dragEndToMove(event: DragEndEvent): { id: number; column: ColumnKey } | null {
  const { active, over } = event
  if (!over) return null
  const from = active.data.current?.status as Status | undefined
  const column = over.id as ColumnKey
  if (column !== 'closed' && from && columnKeyForStatus(from) === column) return null
  return { id: Number(active.id), column }
}

function columnCards(cards: CardData[], key: ColumnKey): CardData[] {
  return cards
    .filter((c) => columnKeyForStatus(c.status) === key)
    .sort(
      (a, b) =>
        STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) ||
        b.updated_at.localeCompare(a.updated_at),
    )
}

interface Props {
  cards: CardData[]
  onMove: (id: number, column: ColumnKey) => void
  onOpen: (id: number) => void
}

export default function KanbanBoard({ cards, onMove, onOpen }: Props) {
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
    if (move) onMove(move.id, move.column)
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="board" data-testid="board">
        {BOARD_COLUMNS.map((col) => (
          <KanbanColumn
            key={col.key}
            columnKey={col.key}
            label={col.label}
            cards={columnCards(cards, col.key)}
            onOpen={onOpen}
          />
        ))}
      </div>
      <DragOverlay>
        {activeCard && (
          <div className="card overlay-card">
            <CardBody card={activeCard} showClosedTag={isTerminalStatus(activeCard.status)} />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  )
}
