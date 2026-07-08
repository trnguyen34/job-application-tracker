import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { DragEndEvent } from '@dnd-kit/core'
import type { Status } from '../api/types'
import type { ColumnKey } from '../lib/design'
import { dragEndToMove } from '../components/board/KanbanBoard'
import BoardPage from '../pages/BoardPage'
import { api } from '../api/client'
import { cards } from './fixtures'

// Stub only `api`; keep ApiError/errorMessage real for components that use them.
vi.mock('../api/client', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/client')>()),
  api: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    del: vi.fn(),
    upload: vi.fn(),
  },
}))

// Pointer-based DnD doesn't work in jsdom (no layout), so the board is
// stubbed with buttons that trigger the same onMove contract DndContext
// would; dragEndToMove itself is unit-tested below.
vi.mock('../components/board/KanbanBoard', async (importOriginal) => {
  const original = await importOriginal<typeof import('../components/board/KanbanBoard')>()
  return {
    ...original,
    default: ({
      cards,
      onMove,
      onOpen,
    }: {
      cards: { id: number; company: string; status: string }[]
      onMove: (id: number, column: ColumnKey) => void
      onOpen: (id: number) => void
    }) => (
      <div>
        {cards.map((c) => (
          <div key={c.id} data-testid={`stub-card-${c.id}`} data-status={c.status}>
            {c.company}
          </div>
        ))}
        <button onClick={() => onMove(1, 'interview')}>drop card 1 on interview</button>
        <button onClick={() => onMove(1, 'closed')}>drop card 1 on closed</button>
        <button onClick={() => onOpen(1)}>open card 1</button>
      </div>
    ),
  }
})

const dragEvent = (id: number, fromStatus: string, overId: string | null): DragEndEvent =>
  ({
    active: { id, data: { current: { status: fromStatus as Status } } },
    over: overId ? { id: overId } : null,
  }) as unknown as DragEndEvent

describe('dragEndToMove', () => {
  it('maps a cross-column drop to a column move', () => {
    expect(dragEndToMove(dragEvent(1, 'applied', 'interview'))).toEqual({
      id: 1,
      column: 'interview',
    })
  })

  it('returns null when dropped on the same column', () => {
    expect(dragEndToMove(dragEvent(1, 'applied', 'applied'))).toBeNull()
  })

  it('returns null when dropped outside any column', () => {
    expect(dragEndToMove(dragEvent(1, 'applied', null))).toBeNull()
  })

  it('maps a drop on Closed to the closed column', () => {
    expect(dragEndToMove(dragEvent(1, 'applied', 'closed'))).toEqual({ id: 1, column: 'closed' })
  })

  it('re-offers the outcome picker when a closed card is dropped on Closed', () => {
    expect(dragEndToMove(dragEvent(4, 'rejected', 'closed'))).toEqual({ id: 4, column: 'closed' })
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

    await userEvent.click(screen.getByRole('button', { name: /drop card 1 on interview/ }))

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

    await userEvent.click(screen.getByRole('button', { name: /drop card 1 on interview/ }))

    await waitFor(() => {
      expect(screen.getByTestId('stub-card-1')).toHaveAttribute('data-status', 'applied')
    })
  })

  it('asks for the outcome when dropping on Closed, then PATCHes the choice', async () => {
    vi.mocked(api.patch).mockResolvedValue({})
    render(
      <MemoryRouter>
        <BoardPage />
      </MemoryRouter>,
    )
    await screen.findByTestId('stub-card-1')

    await userEvent.click(screen.getByRole('button', { name: /drop card 1 on closed/ }))
    expect(api.patch).not.toHaveBeenCalled()
    expect(screen.getByText('Move to Closed')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Rejected' }))
    expect(api.patch).toHaveBeenCalledWith('/api/applications/1/status', { status: 'rejected' })
    expect(screen.queryByText('Move to Closed')).not.toBeInTheDocument()
  })

  it('cancelling the outcome picker leaves the card untouched', async () => {
    render(
      <MemoryRouter>
        <BoardPage />
      </MemoryRouter>,
    )
    await screen.findByTestId('stub-card-1')

    await userEvent.click(screen.getByRole('button', { name: /drop card 1 on closed/ }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(api.patch).not.toHaveBeenCalled()
    expect(screen.getByTestId('stub-card-1')).toHaveAttribute('data-status', 'applied')
  })

  it('opens the detail modal over the board and closes back to it', async () => {
    vi.mocked(api.get).mockImplementation((path: string) =>
      path === '/api/applications'
        ? Promise.resolve(cards)
        : Promise.resolve({
            ...cards[0],
            contacts: [],
            interview_rounds: [],
            notes: [],
            attachments: [],
            reminders: [],
          }),
    )
    render(
      <MemoryRouter>
        <BoardPage />
      </MemoryRouter>,
    )
    await screen.findByTestId('stub-card-1')

    await userEvent.click(screen.getByRole('button', { name: 'open card 1' }))

    const dialog = await screen.findByRole('dialog', { name: 'Acme Corp' })
    expect(within(dialog).getByRole('heading', { name: 'Acme Corp' })).toBeInTheDocument()
    // board is still mounted behind the modal
    expect(screen.getByTestId('stub-card-1')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('dialog', { name: 'Acme Corp' })).not.toBeInTheDocument()
    expect(screen.getByTestId('stub-card-1')).toBeInTheDocument()
  })
})
