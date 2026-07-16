import { render, screen, waitFor } from '@testing-library/react'
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
    vi.mocked(api.post).mockImplementation((path: string) =>
      path === '/api/applications' ? Promise.resolve({ id: 9 }) : Promise.resolve({}),
    )
  })

  it('defaults to Applied / Onsite / High priority and stamps today as the applied date', async () => {
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
      expect.objectContaining({
        status: 'applied',
        applied_date: todayISO(),
        work_mode: 'onsite',
        priority: 'high',
      }),
    )
    expect(onCreated).toHaveBeenCalledWith({ id: 9 })
  })

  it('autofills only the fields the posting could provide, then submits them', async () => {
    vi.mocked(api.post).mockImplementation((path: string) =>
      path === '/api/posting-preview'
        ? Promise.resolve({
            company: 'Anthropic',
            role: 'Senior Backend Engineer',
            // verbose posting form — must land as the autocomplete's own label
            location: 'San Francisco, California, United States',
            work_mode: 'remote',
            salary_min: 170000,
            salary_max: 210000,
            salary_currency: 'EUR',
            source: 'Company Site',
          })
        : Promise.resolve({ id: 9 }),
    )
    render(<NewApplicationModal onClose={vi.fn()} onCreated={vi.fn()} />)

    const url = 'https://boards.greenhouse.io/anthropic/jobs/123'
    await userEvent.type(screen.getByPlaceholderText('Job posting URL'), url)
    await userEvent.click(screen.getByRole('button', { name: 'Autofill' }))

    expect(api.post).toHaveBeenCalledWith('/api/posting-preview', { url })
    expect(screen.getByPlaceholderText('Company *')).toHaveValue('Anthropic')
    expect(screen.getByPlaceholderText('Role / title *')).toHaveValue('Senior Backend Engineer')
    await waitFor(() =>
      expect(screen.getByPlaceholderText('Location')).toHaveValue('San Francisco, CA'),
    )
    expect(screen.getByRole('button', { name: 'Work mode' })).toHaveTextContent('Remote')
    expect(screen.getByRole('button', { name: 'Source' })).toHaveTextContent('Company Site')
    expect(screen.getByPlaceholderText('Min salary')).toHaveValue(170000)
    expect(screen.getByPlaceholderText('Max salary')).toHaveValue(210000)

    await userEvent.click(screen.getByRole('button', { name: 'Add to Applied' }))
    expect(api.post).toHaveBeenCalledWith(
      '/api/applications',
      expect.objectContaining({
        company: 'Anthropic',
        work_mode: 'remote',
        source: 'Company Site',
        salary_min: 170000,
        salary_max: 210000,
        salary_currency: 'EUR',
      }),
    )
  })

  it('never overwrites what the user already chose', async () => {
    vi.mocked(api.post).mockImplementation((path: string) =>
      path === '/api/posting-preview'
        ? Promise.resolve({
            company: 'Wrong Corp',
            role: 'Fetched Role',
            location: null,
            work_mode: 'remote',
            salary_min: null,
            salary_max: null,
            salary_currency: null,
            source: 'Job Board',
          })
        : Promise.resolve({ id: 9 }),
    )
    render(<NewApplicationModal onClose={vi.fn()} onCreated={vi.fn()} />)

    await userEvent.type(screen.getByPlaceholderText('Company *'), 'Hand-Typed Inc')
    await userEvent.click(screen.getByRole('button', { name: 'Source' }))
    await userEvent.click(screen.getByRole('menuitem', { name: 'Referral' }))

    await userEvent.type(screen.getByPlaceholderText('Job posting URL'), 'https://example.com/j/1')
    await userEvent.click(screen.getByRole('button', { name: 'Autofill' }))

    expect(screen.getByPlaceholderText('Company *')).toHaveValue('Hand-Typed Inc')
    expect(screen.getByRole('button', { name: 'Source' })).toHaveTextContent('Referral')
    // the untouched empty field still benefits
    expect(screen.getByPlaceholderText('Role / title *')).toHaveValue('Fetched Role')
  })

  it('fails silently when the preview request does', async () => {
    vi.mocked(api.post).mockRejectedValue(new Error('network down'))
    render(<NewApplicationModal onClose={vi.fn()} onCreated={vi.fn()} />)

    await userEvent.type(screen.getByPlaceholderText('Job posting URL'), 'https://example.com/j/1')
    await userEvent.click(screen.getByRole('button', { name: 'Autofill' }))

    expect(screen.getByPlaceholderText('Company *')).toHaveValue('')
    expect(screen.getByRole('button', { name: 'Autofill' })).toBeEnabled()
    // silent means silent: no toast, no error text
    expect(document.querySelector('.toast')).not.toBeInTheDocument()
  })

  it('sends no applied date when the status is set back to Wishlist', async () => {
    render(<NewApplicationModal onClose={vi.fn()} onCreated={vi.fn()} />)

    await userEvent.type(screen.getByPlaceholderText('Company *'), 'Acme')
    await userEvent.type(screen.getByPlaceholderText('Role / title *'), 'Engineer')
    await userEvent.click(screen.getByRole('button', { name: 'Status' }))
    await userEvent.click(screen.getByRole('menuitem', { name: '● Wishlist' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add to Wishlist' }))

    expect(api.post).toHaveBeenCalledWith(
      '/api/applications',
      expect.objectContaining({ status: 'wishlist', applied_date: null }),
    )
  })

  /* Contacts & interview rounds are commented out in the modal for now;
     restore these tests alongside them.

  it('creates added contacts after the application', async () => {
    const onCreated = vi.fn()
    render(<NewApplicationModal onClose={vi.fn()} onCreated={onCreated} />)

    await userEvent.click(screen.getByRole('button', { name: '+ Add contact' }))
    const addContact = screen.getByRole('button', { name: 'Add contact' })
    expect(addContact).toBeDisabled()
    await userEvent.type(screen.getByPlaceholderText('Name'), 'Priya Nair')
    await userEvent.type(screen.getByPlaceholderText('Email'), 'priya@acme.example')
    await userEvent.click(addContact)

    expect(screen.getByText('Priya Nair')).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText('Company *'), 'Acme')
    await userEvent.type(screen.getByPlaceholderText('Role / title *'), 'Engineer')
    await userEvent.click(screen.getByRole('button', { name: 'Add to Applied' }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/api/applications/9/contacts',
        expect.objectContaining({ name: 'Priya Nair', email: 'priya@acme.example' }),
      ),
    )
    await waitFor(() => expect(onCreated).toHaveBeenCalledWith({ id: 9 }))
  })

  it('offers interview rounds only for Phone Screen and Interview statuses', async () => {
    render(<NewApplicationModal onClose={vi.fn()} onCreated={vi.fn()} />)

    expect(screen.queryByText('Interview rounds')).not.toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'phone_screen')
    expect(screen.getByText('Interview rounds')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'interview')
    expect(screen.getByText('Interview rounds')).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'applied')
    expect(screen.queryByText('Interview rounds')).not.toBeInTheDocument()
  })

  it('creates added rounds when the status is Phone Screen', async () => {
    render(<NewApplicationModal onClose={vi.fn()} onCreated={vi.fn()} />)

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'phone_screen')
    await userEvent.click(screen.getByRole('button', { name: '+ Add interview round' }))
    await userEvent.selectOptions(screen.getByLabelText('Round type'), 'technical')
    await userEvent.type(screen.getByPlaceholderText('Interviewer(s)'), 'Dev Patel')
    await userEvent.click(screen.getByRole('button', { name: 'Add round' }))

    expect(screen.getByText('Technical')).toBeInTheDocument()

    await userEvent.type(screen.getByPlaceholderText('Company *'), 'Acme')
    await userEvent.type(screen.getByPlaceholderText('Role / title *'), 'Engineer')
    await userEvent.click(screen.getByRole('button', { name: 'Add to Phone Screen' }))

    await waitFor(() =>
      expect(api.post).toHaveBeenCalledWith(
        '/api/applications/9/interviews',
        expect.objectContaining({ round_type: 'technical', interviewers: 'Dev Patel' }),
      ),
    )
  })

  it('does not create rounds when the status no longer allows them', async () => {
    render(<NewApplicationModal onClose={vi.fn()} onCreated={vi.fn()} />)

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'phone_screen')
    await userEvent.click(screen.getByRole('button', { name: '+ Add interview round' }))
    await userEvent.click(screen.getByRole('button', { name: 'Add round' }))

    await userEvent.selectOptions(screen.getByLabelText('Status'), 'applied')

    await userEvent.type(screen.getByPlaceholderText('Company *'), 'Acme')
    await userEvent.type(screen.getByPlaceholderText('Role / title *'), 'Engineer')
    await userEvent.click(screen.getByRole('button', { name: 'Add to Applied' }))

    await waitFor(() => expect(api.post).toHaveBeenCalledWith('/api/applications', expect.anything()))
    const interviewCalls = vi
      .mocked(api.post)
      .mock.calls.filter(([path]) => String(path).includes('/interviews'))
    expect(interviewCalls).toHaveLength(0)
  })
  */
})
