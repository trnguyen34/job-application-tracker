import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import ApplicationDetailPage from '../pages/ApplicationDetailPage'
import { ToastProvider } from '../components/ui/Toast'
import { api } from '../api/client'
import { baseCard } from './fixtures'
import type { ApplicationDetail } from '../api/types'

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

const detail: ApplicationDetail = {
  ...baseCard,
  contacts: [],
  interview_rounds: [],
  notes: [],
  attachments: [],
  reminders: [],
}

const renderDetail = () =>
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/applications/1']}>
        <Routes>
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          <Route path="/" element={<div>BOARD HOME</div>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  )

describe('ApplicationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue(detail)
    vi.mocked(api.patch).mockResolvedValue({})
    vi.mocked(api.del).mockResolvedValue(undefined)
  })

  it('renders the application header and facts', async () => {
    renderDetail()
    expect(await screen.findByRole('heading', { name: 'Acme Corp' })).toBeInTheDocument()
    expect(screen.getByText('Backend Engineer')).toBeInTheDocument()
    expect(screen.getByText('$150k–$190k')).toBeInTheDocument()
  })

  it('saves the Details edit form in a single PATCH', async () => {
    renderDetail()
    await screen.findByRole('heading', { name: 'Acme Corp' })

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    const company = screen.getByLabelText('Company')
    await userEvent.clear(company)
    await userEvent.type(company, 'Acme Holdings')
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(api.patch).toHaveBeenCalledTimes(1)
    expect(api.patch).toHaveBeenCalledWith(
      '/api/applications/1',
      expect.objectContaining({
        company: 'Acme Holdings',
        role: 'Backend Engineer',
        salary_min: 150000,
        salary_max: 190000,
        salary_currency: 'USD',
      }),
    )
  })

  it('changes status through the pill menu via the /status endpoint', async () => {
    renderDetail()
    await screen.findByRole('heading', { name: 'Acme Corp' })

    await userEvent.click(screen.getByRole('button', { name: /Applied ▾/ }))
    await userEvent.click(screen.getByRole('menuitem', { name: '● Interview' }))

    expect(api.patch).toHaveBeenCalledWith('/api/applications/1/status', {
      status: 'interview',
    })
  })

  it('sets priority from the segmented control', async () => {
    renderDetail()
    await screen.findByRole('heading', { name: 'Acme Corp' })
    await userEvent.click(screen.getByRole('button', { name: 'Med' }))
    expect(api.patch).toHaveBeenCalledWith('/api/applications/1', { priority: 'medium' })
  })

  it('shows a toast and stays in edit mode when saving fails', async () => {
    vi.mocked(api.patch).mockRejectedValue(new Error('salary_min must be <= salary_max'))
    renderDetail()
    await screen.findByRole('heading', { name: 'Acme Corp' })

    await userEvent.click(screen.getByRole('button', { name: 'Edit' }))
    await userEvent.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByRole('status')).toHaveTextContent(
      'salary_min must be <= salary_max',
    )
    expect(screen.getByLabelText('Company')).toBeInTheDocument()
  })

  it('deletes the application after confirmation and returns to the board', async () => {
    renderDetail()
    await screen.findByRole('heading', { name: 'Acme Corp' })

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Delete Acme Corp — Backend Engineer?')
    expect(dialog).toHaveTextContent(/removes all of its contacts/)

    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete' }))

    expect(api.del).toHaveBeenCalledWith('/api/applications/1')
    expect(await screen.findByText('BOARD HOME')).toBeInTheDocument()
  })

  it('cancelling the delete dialog makes no request', async () => {
    renderDetail()
    await screen.findByRole('heading', { name: 'Acme Corp' })

    await userEvent.click(screen.getByRole('button', { name: 'Delete' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(api.del).not.toHaveBeenCalled()
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })
})
