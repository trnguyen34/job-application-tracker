import type { Status } from '../api/types'
import { STATUS_LABELS } from '../api/types'

/** Structural constants ported from the Job Tracker design. Colors live in
    tokens.css; components reference them via the var helpers below so the
    palette has one home. */

export const STATUS_ORDER: Status[] = [
  'wishlist',
  'applied',
  'phone_screen',
  'interview',
  'offer',
  'accepted',
  'rejected',
  'withdrawn',
  'ghosted',
]

const CLOSED = new Set<Status>(['accepted', 'rejected', 'withdrawn', 'ghosted'])

export const isTerminalStatus = (status: Status) => CLOSED.has(status)

export type ColumnKey = Status | 'closed'

/** The board groups the four terminal statuses into one Closed column. */
export const columnKeyForStatus = (status: Status): ColumnKey =>
  isTerminalStatus(status) ? 'closed' : status

export const BOARD_COLUMNS: { key: ColumnKey; label: string }[] = [
  { key: 'wishlist', label: STATUS_LABELS.wishlist },
  { key: 'applied', label: STATUS_LABELS.applied },
  { key: 'phone_screen', label: STATUS_LABELS.phone_screen },
  { key: 'interview', label: STATUS_LABELS.interview },
  { key: 'offer', label: STATUS_LABELS.offer },
  { key: 'closed', label: 'Closed' },
]

export const ACTIVE_STATUSES = STATUS_ORDER.filter((s) => !isTerminalStatus(s))
export const CLOSED_STATUSES = STATUS_ORDER.filter(isTerminalStatus)

export const statusFg = (status: Status) => `var(--status-${status}-fg)`
export const statusTint = (status: Status) => `var(--status-${status}-tint)`

export const WORK_MODE_LABELS = { remote: 'Remote', hybrid: 'Hybrid', onsite: 'Onsite' } as const

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: '$',
  EUR: '€',
  GBP: '£',
  CAD: 'C$',
  AUD: 'A$',
}

export const CURRENCY_OPTIONS = ['USD', 'EUR', 'GBP', 'CAD', 'AUD']

export const SOURCE_OPTIONS = [
  'LinkedIn',
  'Referral',
  'Company Site',
  'Job Board',
  'Networking',
  'Recruiter',
  'Other',
]

/** "$95k–$115k" per the design's fmtSalary. */
export function fmtSalary(
  min: number | null,
  max: number | null,
  currency: string | null,
): string {
  if (!min && !max) return 'Not specified'
  const sym = CURRENCY_SYMBOLS[currency ?? ''] ?? `${currency ?? ''} `
  const f = (n: number) => (n >= 1000 ? `${Math.round(n / 1000)}k` : String(n))
  if (min && max) return `${sym}${f(min)}–${sym}${f(max)}`
  return `${sym}${f((min || max)!)}`
}
