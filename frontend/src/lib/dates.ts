/** Date helpers. Overdue/day math is done in local time on date strings
    (YYYY-MM-DD) to avoid timezone off-by-one against the SQLite dates. */

export function todayISO(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

export function isOverdue(dueDate: string): boolean {
  return dueDate.slice(0, 10) < todayISO()
}

export function isToday(dueDate: string): boolean {
  return dueDate.slice(0, 10) === todayISO()
}

export function shortDate(iso: string): string {
  const [year, month, day] = iso.slice(0, 10).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
