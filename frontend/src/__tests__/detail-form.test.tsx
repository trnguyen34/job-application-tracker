import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import ApplicationDetailPage from '../pages/ApplicationDetailPage'
import InlineField from '../components/detail/InlineField'
import { api } from '../api/client'
import { baseCard } from './fixtures'
import type { ApplicationDetail } from '../api/types'

vi.mock('../api/client', () => ({
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
    <MemoryRouter initialEntries={['/applications/1']}>
      <Routes>
        <Route path="/applications/:id" element={<ApplicationDetailPage />} />
      </Routes>
    </MemoryRouter>,
  )

describe('InlineField validation', () => {
  it('blocks saving an invalid value and shows the message', async () => {
    const onSave = vi.fn()
    render(
      <InlineField
        value="Acme"
        validate={(raw) => (raw.trim() ? null : 'Company is required.')}
        onSave={onSave}
      />,
    )
    await userEvent.click(screen.getByRole('button'))
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.keyboard('{Enter}')

    expect(screen.getByRole('alert')).toHaveTextContent('Company is required.')
    expect(onSave).not.toHaveBeenCalled()
  })

  it('saves a valid value on Enter', async () => {
    const onSave = vi.fn()
    render(<InlineField value="Acme" onSave={onSave} />)
    await userEvent.click(screen.getByRole('button'))
    await userEvent.clear(screen.getByRole('textbox'))
    await userEvent.type(screen.getByRole('textbox'), 'New Co{Enter}')
    expect(onSave).toHaveBeenCalledWith('New Co')
  })
})

describe('ApplicationDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockResolvedValue(detail)
    vi.mocked(api.patch).mockResolvedValue({})
  })

  it('renders the application and PATCHes an inline company edit', async () => {
    renderDetail()
    expect(await screen.findByText('Acme Corp')).toBeInTheDocument()

    await userEvent.click(screen.getByText('Acme Corp'))
    const input = screen.getByDisplayValue('Acme Corp')
    await userEvent.clear(input)
    await userEvent.type(input, 'Acme Holdings{Enter}')

    expect(api.patch).toHaveBeenCalledWith('/api/applications/1', {
      company: 'Acme Holdings',
    })
  })

  it('rejects an inverted salary range', async () => {
    renderDetail()
    await screen.findByText('Acme Corp')

    await userEvent.click(screen.getByText(/150,000/))
    const input = screen.getByRole('textbox')
    await userEvent.clear(input)
    await userEvent.type(input, '200000-100000{Enter}')

    expect(screen.getByRole('alert')).toHaveTextContent('Min must be ≤ max.')
    expect(api.patch).not.toHaveBeenCalled()
  })

  it('PATCHes a status change from the select', async () => {
    renderDetail()
    await screen.findByText('Acme Corp')
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'interview')
    expect(api.patch).toHaveBeenCalledWith('/api/applications/1', { status: 'interview' })
  })
})
