import type { ApplicationCard } from '../api/types'

export const baseCard: ApplicationCard = {
  id: 1,
  company: 'Acme Corp',
  role: 'Backend Engineer',
  status: 'applied',
  applied_date: '2026-06-25',
  job_url: null,
  location: 'San Francisco, CA',
  work_mode: 'hybrid',
  salary_min: 150000,
  salary_max: 190000,
  salary_currency: 'USD',
  source: 'LinkedIn',
  priority: 'high',
  created_at: '2026-06-25T12:00:00',
  updated_at: '2026-06-25T12:00:00',
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
    days_since_applied: 5,
    next_reminder: { id: 11, due_date: '2026-07-09', description: 'Prep for onsite' },
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
  },
]
