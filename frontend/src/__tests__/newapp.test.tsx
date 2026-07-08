import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import NewApplicationModal from '../components/board/NewApplicationModal'
import { api } from '../api/client'
import { todayISO } from '../lib/dates'

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

describe('NewApplicationModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.post).mockResolvedValue({ id: 9 })
  })

  it('defaults the status to Applied and stamps today as the applied date', async () => {
    const onCreated = vi.fn()
    render(<NewApplicationModal onClose={vi.fn()} onCreated={onCreated} />)

    const submit = screen.getByRole('button', { name: 'Add to Applied' })
    expect(submit).toBeDisabled()

    await userEvent.type(screen.getByPlaceholderText('Company *'), 'Acme')
    await userEvent.type(screen.getByPlaceholderText('Role / title *'), 'Engineer')
    expect(submit).toBeEnabled()
    await userEvent.click(submit)

    expect(api.post).toHaveBeenCalledWith(
      '/api/applications',
      expect.objectContaining({ status: 'applied', applied_date: todayISO() }),
    )
    expect(onCreated).toHaveBeenCalledWith({ id: 9 })
  })

  it('sends no applied date when the status is set back to Wishlist', async () => {
    render(<NewApplicationModal onClose={vi.fn()} onCreated={vi.fn()} />)

    await userEvent.type(screen.getByPlaceholderText('Company *'), 'Acme')
    await userEvent.type(screen.getByPlaceholderText('Role / title *'), 'Engineer')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'wishlist')
    await userEvent.click(screen.getByRole('button', { name: 'Add to Wishlist' }))

    expect(api.post).toHaveBeenCalledWith(
      '/api/applications',
      expect.objectContaining({ status: 'wishlist', applied_date: null }),
    )
  })
})
