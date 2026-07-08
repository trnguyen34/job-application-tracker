import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import RemindersPanel from '../components/dashboard/RemindersPanel'
import RemindersSection from '../components/detail/RemindersSection'
import { api } from '../api/client'
import { todayISO } from '../lib/dates'
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
    id: 1,
    application_id: 1,
    due_date: '2020-01-01', // long past — always overdue
    description: 'Chase the recruiter',
    done: false,
    created_at: '2020-01-01T00:00:00',
    company: 'Acme Corp',
    role: 'Backend Engineer',
  },
  {
    id: 2,
    application_id: 2,
    due_date: '2999-12-31', // far future — never overdue
    description: 'Send thank-you note',
    done: false,
    created_at: '2020-01-01T00:00:00',
    company: 'Figma',
    role: 'Full Stack Engineer',
  },
]

describe('RemindersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue(upcoming)
    vi.mocked(api.patch).mockResolvedValue({})
  })

  it('highlights overdue reminders and not future ones', async () => {
    render(
      <MemoryRouter>
        <RemindersPanel />
      </MemoryRouter>,
    )
    const overdueRow = await screen.findByTestId('reminder-1')
    expect(overdueRow).toHaveClass('overdue')
    expect(within(overdueRow).getByText(/Overdue/)).toBeInTheDocument()

    const futureRow = screen.getByTestId('reminder-2')
    expect(futureRow).not.toHaveClass('overdue')
    expect(within(futureRow).queryByText(/Overdue/)).not.toBeInTheDocument()
  })

  it('marks a reminder done via PATCH', async () => {
    render(
      <MemoryRouter>
        <RemindersPanel />
      </MemoryRouter>,
    )
    await screen.findByTestId('reminder-1')
    await userEvent.click(
      screen.getByRole('button', { name: 'Mark "Chase the recruiter" done' }),
    )
    expect(api.patch).toHaveBeenCalledWith('/api/reminders/1', { done: true })
  })

  it('shows an error when marking done fails', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('Request failed with status 500'))
    render(
      <MemoryRouter>
        <RemindersPanel />
      </MemoryRouter>,
    )
    await screen.findByTestId('reminder-1')
    await userEvent.click(
      screen.getByRole('button', { name: 'Mark "Chase the recruiter" done' }),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Request failed with status 500',
    )
  })
})

describe('RemindersSection', () => {
  const reminders: Reminder[] = [
    {
      id: 5,
      application_id: 1,
      due_date: '2020-01-01',
      description: 'Old task',
      done: false,
      created_at: '2020-01-01T00:00:00',
    },
    {
      id: 6,
      application_id: 1,
      due_date: '2020-01-02',
      description: 'Finished task',
      done: true,
      created_at: '2020-01-01T00:00:00',
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.patch).mockResolvedValue({})
    vi.mocked(api.post).mockResolvedValue({})
  })

  it('styles overdue and done reminders distinctly', () => {
    render(
      <RemindersSection applicationId={1} reminders={reminders} onChanged={vi.fn()} />,
    )
    expect(screen.getByTestId('reminder-item-5')).toHaveClass('overdue')
    expect(screen.getByTestId('reminder-item-6')).toHaveClass('done')
    expect(screen.getByText('Finished task')).toHaveClass('struck')
  })

  it('toggles done state via PATCH', async () => {
    const onChanged = vi.fn()
    render(<RemindersSection applicationId={1} reminders={reminders} onChanged={onChanged} />)
    await userEvent.click(screen.getByLabelText('Done: Old task'))
    expect(api.patch).toHaveBeenCalledWith('/api/reminders/5', { done: true })
    await userEvent.click(screen.getByLabelText('Done: Finished task'))
    expect(api.patch).toHaveBeenCalledWith('/api/reminders/6', { done: false })
  })

  it('creates a reminder with today as the default due date', async () => {
    const onChanged = vi.fn()
    render(<RemindersSection applicationId={1} reminders={[]} onChanged={onChanged} />)
    await userEvent.type(screen.getByPlaceholderText('Remind me to…'), 'Ping recruiter')
    await userEvent.click(screen.getByRole('button', { name: 'Add reminder' }))
    expect(api.post).toHaveBeenCalledWith('/api/applications/1/reminders', {
      description: 'Ping recruiter',
      due_date: todayISO(),
    })
  })

  it('requires a description', async () => {
    render(<RemindersSection applicationId={1} reminders={[]} onChanged={vi.fn()} />)
    await userEvent.click(screen.getByRole('button', { name: 'Add reminder' }))
    expect(screen.getByRole('alert')).toHaveTextContent('Description is required.')
    expect(api.post).not.toHaveBeenCalled()
  })
})
