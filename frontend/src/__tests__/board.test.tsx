import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import KanbanBoard from '../components/board/KanbanBoard'
import { nextEventFor } from '../components/board/ApplicationCard'
import { cards, daysAgo, daysAhead, baseCard } from './fixtures'

const renderBoard = (onMove = vi.fn(), onOpen = vi.fn()) =>
  render(
    <MemoryRouter>
      <KanbanBoard cards={cards} onMove={onMove} onOpen={onOpen} />
    </MemoryRouter>,
  )

describe('KanbanBoard', () => {
  it('renders five active columns plus the grouped Closed column', () => {
    renderBoard()
    for (const key of ['wishlist', 'applied', 'phone_screen', 'interview', 'offer', 'closed']) {
      expect(screen.getByTestId(`column-${key}`)).toBeInTheDocument()
    }
    expect(screen.getByText('Closed')).toBeInTheDocument()
  })

  it('places cards in their status column with company, role and meta line', () => {
    renderBoard()
    const applied = within(screen.getByTestId('column-applied'))
    expect(applied.getByText('Acme Corp')).toBeInTheDocument()
    expect(applied.getByText('Backend Engineer')).toBeInTheDocument()
    expect(applied.getByText(/Applied 12d ago/)).toBeInTheDocument()

    const interview = within(screen.getByTestId('column-interview'))
    expect(interview.getByText('Figma')).toBeInTheDocument()

    const wishlist = within(screen.getByTestId('column-wishlist'))
    expect(wishlist.getByText('Linear')).toBeInTheDocument()
    expect(wishlist.getByText(/Saved 2d ago/)).toBeInTheDocument()
  })

  it('groups terminal statuses into Closed with a status tag', () => {
    renderBoard()
    const closed = within(screen.getByTestId('column-closed'))
    expect(closed.getByText('Netflix')).toBeInTheDocument()
    expect(closed.getByText('Rejected')).toBeInTheDocument()
  })

  it('shows the next-event chip from the earliest upcoming reminder', () => {
    renderBoard()
    expect(screen.getByText(/Prep for onsite · in 2d/)).toBeInTheDocument()
  })

  it('shows column counts', () => {
    renderBoard()
    expect(within(screen.getByTestId('column-applied')).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByTestId('column-offer')).getByText('0')).toBeInTheDocument()
  })

  it('sorts the Applied column by applied date, newest first', () => {
    const applied = (id: number, appliedDate: string | null, updatedAt: string) => ({
      ...baseCard,
      id,
      status: 'applied' as const,
      applied_date: appliedDate,
      updated_at: updatedAt,
    })
    render(
      <MemoryRouter>
        <KanbanBoard
          cards={[
            applied(1, daysAgo(20), `${daysAgo(0)}T09:00:00`), // oldest date, touched today
            applied(2, daysAgo(2), `${daysAgo(10)}T09:00:00`),
            applied(3, null, `${daysAgo(0)}T12:00:00`), // no date -> last
            applied(4, daysAgo(7), `${daysAgo(9)}T09:00:00`),
          ]}
          onMove={vi.fn()}
          onOpen={vi.fn()}
        />
      </MemoryRouter>,
    )
    const ids = within(screen.getByTestId('column-applied'))
      .getAllByTestId(/^card-/)
      .map((el) => el.getAttribute('data-testid'))
    expect(ids).toEqual(['card-2', 'card-4', 'card-1', 'card-3'])
  })
})

describe('nextEventFor', () => {
  it('prefers an overdue reminder over everything else', () => {
    const event = nextEventFor({
      ...baseCard,
      next_reminder: { id: 1, due_date: daysAgo(3), description: 'Chase recruiter' },
      next_interview: { id: 2, round_type: 'technical', scheduled_at: `${daysAhead(1)}T10:00:00` },
    })
    expect(event).toEqual({ label: 'Overdue — Chase recruiter', overdue: true })
  })

  it('picks the earliest of reminder and interview when nothing is overdue', () => {
    const event = nextEventFor({
      ...baseCard,
      next_reminder: { id: 1, due_date: daysAhead(5), description: 'Follow up' },
      next_interview: { id: 2, round_type: 'technical', scheduled_at: `${daysAhead(1)}T10:00:00` },
    })
    expect(event?.overdue).toBe(false)
    expect(event?.label).toMatch(/^Technical interview · /)
  })

  it('returns null when there is nothing upcoming', () => {
    expect(nextEventFor(baseCard)).toBeNull()
  })
})
