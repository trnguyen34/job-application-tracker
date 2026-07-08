import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from '../components/ui/Settings'
import { ToastProvider } from '../components/ui/Toast'
import { ThemeProvider } from '../lib/theme'
import { api } from '../api/client'
import { baseCard, daysAgo } from './fixtures'

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

const renderSettings = (onMutated = vi.fn()) => {
  render(
    <ThemeProvider>
      <ToastProvider>
        <Settings onMutated={onMutated} />
      </ToastProvider>
    </ThemeProvider>,
  )
  return onMutated
}

const openSettings = async () => {
  await userEvent.click(screen.getByRole('button', { name: 'Settings' }))
  return screen.getByRole('dialog', { name: 'Settings' })
}

describe('Settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorage.clear()
    document.documentElement.dataset.theme = ''
  })

  it('opens the modal from the gear button with Appearance selected', async () => {
    renderSettings()
    await openSettings()

    expect(screen.getByRole('button', { name: 'Appearance' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Applications' })).toBeInTheDocument()
    expect(screen.getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Close settings' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('switches and persists the theme', async () => {
    renderSettings()
    await openSettings()

    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('radio', { name: 'Dark' })).toHaveAttribute('aria-checked', 'true')
    expect(JSON.parse(localStorage.getItem('job-tracker-ui-prefs-v1')!)).toEqual({
      theme: 'dark',
    })

    await userEvent.click(screen.getByRole('radio', { name: 'Light' }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })

  it('reports a clean stale check with a toast', async () => {
    vi.mocked(api.get).mockResolvedValue([])
    renderSettings()
    await openSettings()

    await userEvent.click(screen.getByRole('button', { name: 'Applications' }))
    await userEvent.click(screen.getByRole('button', { name: 'Check now' }))

    expect(api.get).toHaveBeenCalledWith('/api/applications/stale')
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Nothing has been sitting in Applied for 3+ months.',
    )
    expect(screen.queryByRole('dialog', { name: 'Stale applications' })).not.toBeInTheDocument()
  })

  it('opens the stale prompt when the check finds applications', async () => {
    vi.mocked(api.get).mockResolvedValue([
      { ...baseCard, applied_date: daysAgo(120), days_since_applied: 120 },
    ])
    renderSettings()
    await openSettings()

    await userEvent.click(screen.getByRole('button', { name: 'Applications' }))
    await userEvent.click(screen.getByRole('button', { name: 'Check now' }))

    const prompt = await screen.findByRole('dialog', { name: 'Stale applications' })
    expect(prompt).toBeInTheDocument()
    expect(screen.getByText('Acme Corp')).toBeInTheDocument()

    // Handling the row closes the prompt but keeps Settings open behind it.
    await userEvent.click(screen.getByRole('button', { name: 'Move to Ghosted' }))
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: 'Stale applications' })).not.toBeInTheDocument(),
    )
    expect(screen.getByRole('dialog', { name: 'Settings' })).toBeInTheDocument()
  })
})
