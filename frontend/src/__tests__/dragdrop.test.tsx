import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { DragEndEvent } from '@dnd-kit/core'
import type { Status } from '../api/types'
import { dragEndToMove } from '../components/board/KanbanBoard'
import BoardPage from '../pages/BoardPage'
import { api } from '../api/client'
import { cards } from './fixtures'

vi.mock('../api/client', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
    upload: vi.fn(),
  },
}))

// Pointer-based DnD doesn't work in jsdom (no layout), so the board is
// stubbed with a button that triggers the same onMove contract DndContext
// would; dragEndToMove itself is unit-tested below.
vi.mock('../components/board/KanbanBoard', async (importOriginal) => {
  const original = await importOriginal<typeof import('../components/board/KanbanBoard')>()
  return {
    ...original,
    default: ({
      cards,
      onMove,
    }: {
      cards: { id: number; company: string; status: string }[]
      onMove: (id: number, status: Status) => void
    }) => (
      <div>
        {cards.map((c) => (
          <div key={c.id} data-testid={`stub-card-${c.id}`} data-status={c.status}>
            {c.company}
          </div>
        ))}
        <button onClick={() => onMove(1, 'interview')}>drop card 1 on interview</button>
      </div>
    ),
  }
})

const dragEvent = (id: number, fromStatus: string, overId: string | null): DragEndEvent =>
  ({
    active: { id, data: { current: { status: fromStatus } } },
    over: overId ? { id: overId } : null,
  }) as unknown as DragEndEvent

describe('dragEndToMove', () => {
  it('maps a cross-column drop to a status move', () => {
    expect(dragEndToMove(dragEvent(1, 'applied', 'interview'))).toEqual({
      id: 1,
      status: 'interview',
    })
  })

  it('returns null when dropped on the same column', () => {
    expect(dragEndToMove(dragEvent(1, 'applied', 'applied'))).toBeNull()
  })

  it('returns null when dropped outside any column', () => {
    expect(dragEndToMove(dragEvent(1, 'applied', null))).toBeNull()
  })
})

describe('BoardPage drag-and-drop wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue(cards)
  })

  it('moves the card optimistically and PATCHes the status endpoint', async () => {
    vi.mocked(api.patch).mockResolvedValue({})
    render(
      <MemoryRouter>
        <BoardPage />
      </MemoryRouter>,
    )
    const card = await screen.findByTestId('stub-card-1')
    expect(card).toHaveAttribute('data-status', 'applied')

    await userEvent.click(screen.getByRole('button', { name: /drop card 1/ }))

    // optimistic: the card's status changes before the server responds
    expect(screen.getByTestId('stub-card-1')).toHaveAttribute('data-status', 'interview')
    expect(api.patch).toHaveBeenCalledWith('/api/applications/1/status', {
      status: 'interview',
    })
  })

  it('reverts the optimistic move when the API rejects it', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('boom'))
    render(
      <MemoryRouter>
        <BoardPage />
      </MemoryRouter>,
    )
    await screen.findByTestId('stub-card-1')

    await userEvent.click(screen.getByRole('button', { name: /drop card 1/ }))

    await waitFor(() => {
      expect(screen.getByTestId('stub-card-1')).toHaveAttribute('data-status', 'applied')
    })
  })
})
