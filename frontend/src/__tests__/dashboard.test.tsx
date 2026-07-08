import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import DashboardPage from '../pages/DashboardPage'
import { api } from '../api/client'
import { daysAgo } from './fixtures'
import type { Stats } from '../api/types'

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

const stats: Stats = {
  totals: { total: 12, active: 6, offers: 2, rejected: 1 },
  applications_over_time: [],
  applications_per_day: [
    { date: daysAgo(1), count: 2 },
    { date: daysAgo(8), count: 1 },
  ],
  status_funnel: [
    { status: 'wishlist', count: 2 },
    { status: 'applied', count: 4 },
    { status: 'phone_screen', count: 1 },
    { status: 'interview', count: 1 },
    { status: 'offer', count: 2 },
    { status: 'accepted', count: 1 },
    { status: 'rejected', count: 1 },
    { status: 'withdrawn', count: 0 },
    { status: 'ghosted', count: 0 },
  ],
  by_source: [
    { source: 'LinkedIn', count: 7 },
    { source: 'Referral', count: 5 },
  ],
  avg_response_time_days: 5.4,
}

describe('DashboardPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(api.get).mockImplementation((path: string) =>
      path.startsWith('/api/stats') ? Promise.resolve(stats) : Promise.resolve([]),
    )
  })

  const renderPage = () =>
    render(
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>,
    )

  it('renders the five stat tiles with a rounded response time', async () => {
    renderPage()
    expect(await screen.findByText('Total applications')).toBeInTheDocument()
    expect(screen.getByText('12')).toBeInTheDocument()

    const avgTile = screen.getByText('Avg. days to first interview').closest('.stat-tile')!
    expect(within(avgTile as HTMLElement).getByText('5')).toBeInTheDocument() // 5.4 rounded
  })

  it('renders the 53-week activity heatmap from applications_per_day', async () => {
    renderPage()
    const grid = await screen.findByTestId('activity-heatmap')
    expect(grid.children).toHaveLength(53 * 7)
    expect(screen.getByText('3 applications submitted in the last year')).toBeInTheDocument()
    const busy = within(grid).getByTitle(`${daysAgo(1)}: 2 applications`)
    expect(busy).toBeInTheDocument()
  })

  it('renders weekly bars, funnel and source charts without a chart library', async () => {
    renderPage()
    const bars = await screen.findByTestId('weekly-bars')
    expect(bars.children).toHaveLength(12)
    expect(screen.getByText('Pipeline funnel')).toBeInTheDocument()
    expect(screen.getByText('Wishlist')).toBeInTheDocument()
    expect(screen.getByText('Applications by source')).toBeInTheDocument()
    expect(screen.getByText('LinkedIn')).toBeInTheDocument()
  })
})
