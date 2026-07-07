import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import KanbanBoard from '../components/board/KanbanBoard'
import { cards } from './fixtures'

const renderBoard = (onMove = vi.fn()) =>
  render(
    <MemoryRouter>
      <KanbanBoard cards={cards} onMove={onMove} />
    </MemoryRouter>,
  )

describe('KanbanBoard', () => {
  it('renders one column per pipeline status', () => {
    renderBoard()
    for (const label of [
      'Wishlist',
      'Applied',
      'Phone Screen',
      'Interview',
      'Offer',
      'Accepted',
      'Rejected',
      'Withdrawn',
      'Ghosted',
    ]) {
      expect(screen.getByRole('heading', { name: label })).toBeInTheDocument()
    }
  })

  it('places cards in their status column with company, role and age', () => {
    renderBoard()
    const applied = within(screen.getByTestId('column-applied'))
    expect(applied.getByText('Acme Corp')).toBeInTheDocument()
    expect(applied.getByText('Backend Engineer')).toBeInTheDocument()
    expect(applied.getByText('12d ago')).toBeInTheDocument()

    const interview = within(screen.getByTestId('column-interview'))
    expect(interview.getByText('Figma')).toBeInTheDocument()

    const wishlist = within(screen.getByTestId('column-wishlist'))
    expect(wishlist.getByText('Linear')).toBeInTheDocument()
    expect(wishlist.queryByText(/d ago/)).not.toBeInTheDocument()
  })

  it('shows the next reminder chip on a card', () => {
    renderBoard()
    const chip = screen.getByTitle('Prep for onsite')
    expect(chip).toHaveClass('reminder')
  })

  it('shows column counts', () => {
    renderBoard()
    expect(within(screen.getByTestId('column-applied')).getByText('1')).toBeInTheDocument()
    expect(within(screen.getByTestId('column-offer')).getByText('0')).toBeInTheDocument()
  })
})
