import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import FollowUps from '../components/dashboard/FollowUps'
import RemindersCard from '../components/detail/RemindersCard'
import { api } from '../api/client'
import { todayISO } from '../lib/dates'
import { daysAgo, daysAhead } from './fixtures'
import type { Reminder, ReminderWithApplication } from '../api/types'

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

const upcoming: ReminderWithApplication[] = [
  {
    id: 2,
    application_id: 2,
    due_date: daysAhead(3),
    description: 'Send thank-you note',
    done: false,
    created_at: '2020-01-01T00:00:00',
    company: 'Figma',
    role: 'Full Stack Engineer',
  },
  {
    id: 1,
    application_id: 1,
    due_date: daysAgo(2),
    description: 'Chase the recruiter',
    done: false,
    created_at: '2020-01-01T00:00:00',
    company: 'Acme Corp',
    role: 'Backend Engineer',
  },
]

describe('FollowUps', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue(upcoming)
  })

  const renderPanel = () =>
    render(
      <MemoryRouter>
        <Routes>
          <Route path="/" element={<FollowUps />} />
          <Route path="/applications/:id" element={<div>DETAIL 1</div>} />
        </Routes>
      </MemoryRouter>,
    )

  it('lists overdue reminders first with an Overdue label', async () => {
    renderPanel()
    const overdueRow = await screen.findByTestId('followup-1')
    expect(within(overdueRow).getByText(/Overdue ·/)).toBeInTheDocument()

    const rows = screen.getAllByTestId(/followup-/)
    expect(rows[0]).toHaveAttribute('data-testid', 'followup-1')
    expect(rows[1]).toHaveAttribute('data-testid', 'followup-2')
    expect(within(rows[1]).getByText(/Due /)).toBeInTheDocument()
  })

  it('opens the application when a row is clicked', async () => {
    renderPanel()
    await userEvent.click(await screen.findByTestId('followup-1'))
    expect(await screen.findByText('DETAIL 1')).toBeInTheDocument()
  })

  it('shows the empty message when nothing is due', async () => {
    vi.mocked(api.get).mockResolvedValue([])
    renderPanel()
    expect(await screen.findByText('Nothing due in the next two weeks.')).toBeInTheDocument()
  })
})

describe('RemindersCard', () => {
  const reminders: Reminder[] = [
    {
      id: 5,
      application_id: 1,
      due_date: daysAgo(3),
      description: 'Old task',
      done: false,
      created_at: `${daysAgo(4)}T00:00:00`,
    },
    {
      id: 6,
      application_id: 1,
      due_date: daysAhead(1),
      description: 'Finished task',
      done: true,
      created_at: `${daysAgo(4)}T00:00:00`,
    },
  ]

  const act = (fn: () => Promise<void>) => {
    void fn().catch(() => {})
  }

  const renderCard = (requestDelete = vi.fn(), onChanged = vi.fn()) =>
    render(
      <RemindersCard
        applicationId={1}
        reminders={reminders}
        act={act}
        requestDelete={requestDelete}
        onChanged={onChanged}
      />,
    )

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.patch).mockResolvedValue({})
    vi.mocked(api.post).mockResolvedValue({})
  })

  it('marks overdue and done reminders distinctly', () => {
    renderCard()
    expect(within(screen.getByTestId('reminder-item-5')).getByText(/overdue/)).toBeInTheDocument()
    expect(screen.getByTestId('reminder-item-6')).toHaveClass('done')
    expect(screen.getByText('Finished task')).toHaveClass('struck')
  })

  it('toggles done state via PATCH', async () => {
    renderCard()
    await userEvent.click(screen.getByLabelText('Done: Old task'))
    expect(api.patch).toHaveBeenCalledWith('/api/reminders/5', { done: true })
    await userEvent.click(screen.getByLabelText('Done: Finished task'))
    expect(api.patch).toHaveBeenCalledWith('/api/reminders/6', { done: false })
  })

  it('creates a reminder once description and date are filled', async () => {
    renderCard()
    await userEvent.click(screen.getByRole('button', { name: '+ Add' }))

    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()

    await userEvent.type(screen.getByPlaceholderText('What do you need to do?'), 'Ping recruiter')
    expect(save).toBeDisabled() // still no due date

    await userEvent.type(screen.getByLabelText('Due date'), todayISO())
    expect(save).toBeEnabled()

    await userEvent.click(save)
    expect(api.post).toHaveBeenCalledWith('/api/applications/1/reminders', {
      description: 'Ping recruiter',
      due_date: todayISO(),
    })
  })

  it('routes deletion through the confirm flow', async () => {
    const requestDelete = vi.fn()
    renderCard(requestDelete)
    await userEvent.click(screen.getByLabelText('Delete reminder: Old task'))
    expect(requestDelete).toHaveBeenCalledWith('reminder', 5, 'Old task')
    expect(api.del).not.toHaveBeenCalled()
  })
})
