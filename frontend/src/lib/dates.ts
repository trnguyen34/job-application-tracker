/** Date helpers ported from the Job Tracker design. All math happens on
    local wall-clock time (matching the backend's storage convention);
    date-only strings are anchored to local midnight to avoid timezone
    off-by-one against the SQLite dates. Labels use en-US like the design. */

export function toDate(s: string): Date {
  return s.length <= 10 ? new Date(`${s}T00:00:00`) : new Date(s)
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

export function ymd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

export function todayISO(): string {
  return ymd(new Date())
}

/** ISO date `days` from today (local) — e.g. snooze-until dates. */
export function addDaysISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return ymd(d)
}

/** Whole days from `fromStr` to now; positive = in the past. */
export function daysBetween(fromStr: string, now: Date = new Date()): number {
  return Math.round((startOfDay(now).getTime() - startOfDay(toDate(fromStr)).getTime()) / 86400000)
}

export function isOverdue(dueDate: string): boolean {
  return dueDate.slice(0, 10) < todayISO()
}

/** "Jul 3", with the year appended when it isn't the current year. */
export function shortDate(iso: string): string {
  const d = toDate(iso)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  if (d.getFullYear() !== new Date().getFullYear()) opts.year = 'numeric'
  return d.toLocaleDateString('en-US', opts)
}

/** "Jul 3, 1:00 PM" */
export function formatDateTime(iso: string): string {
  const d = toDate(iso)
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`
}

/** "today" / "tomorrow" / "yesterday" / "in 3d" / "3d overdue" */
export function relativeDayLabel(s: string): string {
  const n = daysBetween(s)
  if (n === 0) return 'today'
  if (n === -1) return 'tomorrow'
  if (n === 1) return 'yesterday'
  if (n < -1) return `in ${Math.abs(n)}d`
  return `${n}d overdue`
}

/** Card meta label: "Applied 3d ago", or "Saved 2d ago" pre-application. */
export function appliedLabel(appliedDate: string | null, createdAt: string): string {
  if (!appliedDate) return `Saved ${daysBetween(createdAt)}d ago`
  const n = daysBetween(appliedDate)
  if (n === 0) return 'Applied today'
  return `Applied ${n}d ago`
}
