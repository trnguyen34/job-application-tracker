import type { ApplicationCard } from '../api/types'
import { ymd } from '../lib/dates'

/** Card labels ("Applied 12d ago", "in 2d") are computed client-side from
    real dates, so fixtures anchor to the machine's today. */
export const daysAgo = (n: number): string => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return ymd(d)
}
export const daysAhead = (n: number): string => daysAgo(-n)

export const baseCard: ApplicationCard = {
  id: 1,
  company: 'Acme Corp',
  role: 'Backend Engineer',
  status: 'applied',
  applied_date: daysAgo(12),
  job_url: null,
  location: 'San Francisco, CA',
  work_mode: 'hybrid',
  salary_min: 150000,
  salary_max: 190000,
  salary_currency: 'USD',
  source: 'LinkedIn',
  priority: 'high',
  stale_snoozed_until: null,
  created_at: `${daysAgo(12)}T12:00:00`,
  updated_at: `${daysAgo(1)}T12:00:00`,
  days_since_applied: 12,
  next_reminder: null,
  next_interview: null,
}

export const cards: ApplicationCard[] = [
  baseCard,
  {
    ...baseCard,
    id: 2,
    company: 'Figma',
    role: 'Full Stack Engineer',
    status: 'interview',
    priority: 'medium',
    applied_date: daysAgo(5),
    days_since_applied: 5,
    next_reminder: { id: 11, due_date: daysAhead(2), description: 'Prep for onsite' },
  },
  {
    ...baseCard,
    id: 3,
    company: 'Linear',
    role: 'Product Engineer',
    status: 'wishlist',
    applied_date: null,
    priority: 'low',
    days_since_applied: null,
    created_at: `${daysAgo(2)}T09:00:00`,
  },
  {
    ...baseCard,
    id: 4,
    company: 'Netflix',
    role: 'Platform Engineer',
    status: 'rejected',
    priority: 'medium',
    applied_date: daysAgo(30),
    days_since_applied: 30,
  },
]
