import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StaleApplicationsCheck, {
  resetStaleCheckForTests,
} from '../components/board/StaleApplicationsCheck'
import { api } from '../api/client'
import { addDaysISO } from '../lib/dates'
import { baseCard, daysAgo } from './fixtures'
import type { ApplicationCard } from '../api/types'

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

const staleCards: ApplicationCard[] = [
  { ...baseCard, id: 1, applied_date: daysAgo(120), days_since_applied: 120 },
  {
    ...baseCard,
    id: 2,
    company: 'Globex',
    role: 'Platform Engineer',
    applied_date: daysAgo(200),
    days_since_applied: 200,
  },
]

describe('StaleApplicationsCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetStaleCheckForTests()
    vi.mocked(api.get).mockResolvedValue(staleCards)
    vi.mocked(api.patch).mockResolvedValue({})
    vi.mocked(api.del).mockResolvedValue(undefined)
  })

  const renderCheck = (onMutated = vi.fn()) => {
    render(<StaleApplicationsCheck onMutated={onMutated} />)
    return onMutated
  }

  it('lists applications stuck in Applied on launch', async () => {
    renderCheck()
    expect(await screen.findByRole('dialog', { name: 'Stale applications' })).toBeInTheDocument()
    expect(api.get).toHaveBeenCalledWith('/api/applications/stale')
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()
    expect(screen.getByText('Globex')).toBeInTheDocument()
    expect(screen.getByText(/These 2 applications have/)).toBeInTheDocument()
  })

  it('stays hidden when nothing is stale', async () => {
    vi.mocked(api.get).mockResolvedValue([])
    renderCheck()
    await waitFor(() => expect(api.get).toHaveBeenCalled())
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('runs only once per launch', async () => {
    renderCheck()
    await screen.findByRole('dialog', { name: 'Stale applications' })
    render(<StaleApplicationsCheck onMutated={vi.fn()} />)
    expect(vi.mocked(api.get).mock.calls.filter(([p]) => p === '/api/applications/stale')).toHaveLength(1)
  })

  it('moves an application to Ghosted and notifies the host page', async () => {
    const onMutated = renderCheck()
    await screen.findByRole('dialog', { name: 'Stale applications' })

    await userEvent.click(screen.getAllByRole('button', { name: 'Move to Ghosted' })[0])

    expect(api.patch).toHaveBeenCalledWith('/api/applications/1/status', { status: 'ghosted' })
    await waitFor(() => expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument())
    expect(screen.getByText('Globex')).toBeInTheDocument()
    expect(onMutated).toHaveBeenCalled()
  })

  it('deletes an application after confirmation', async () => {
    const onMutated = renderCheck()
    await screen.findByRole('dialog', { name: 'Stale applications' })

    await userEvent.click(screen.getAllByRole('button', { name: 'Delete' })[0])
    const confirm = screen.getByRole('alertdialog')
    await userEvent.click(within(confirm).getByRole('button', { name: 'Delete' }))

    expect(api.del).toHaveBeenCalledWith('/api/applications/1')
    await waitFor(() => expect(screen.queryByText('Acme Corp')).not.toBeInTheDocument())
    expect(onMutated).toHaveBeenCalled()
  })

  it('snoozes an application for the chosen duration without touching the board', async () => {
    const onMutated = renderCheck()
    await screen.findByRole('dialog', { name: 'Stale applications' })

    await userEvent.click(screen.getByRole('button', { name: 'Ignore Globex for' }))
    await userEvent.click(screen.getByRole('menuitem', { name: '1 month' }))

    expect(api.patch).toHaveBeenCalledWith('/api/applications/2', {
      stale_snoozed_until: addDaysISO(30),
    })
    await waitFor(() => expect(screen.queryByText('Globex')).not.toBeInTheDocument())
    expect(onMutated).not.toHaveBeenCalled()
  })

  it('closes once every application has been handled', async () => {
    renderCheck()
    await screen.findByRole('dialog', { name: 'Stale applications' })

    await userEvent.click(screen.getAllByRole('button', { name: 'Move to Ghosted' })[0])
    await userEvent.click(screen.getAllByRole('button', { name: 'Move to Ghosted' })[0])

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
  })
})
