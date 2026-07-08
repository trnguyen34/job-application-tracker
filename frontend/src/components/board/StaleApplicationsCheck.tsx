import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../api/client'
import type { ApplicationCard } from '../../api/types'
import { addDaysISO, shortDate } from '../../lib/dates'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useToast } from '../ui/Toast'

const SNOOZE_OPTIONS = [
  { label: '1 week', days: 7 },
  { label: '1 month', days: 30 },
  { label: '3 months', days: 90 },
]

// One check per app launch: module state survives route changes but resets
// on a full page load — "every time the user opens the app". Whichever page
// mounts first claims the check; later mounts (and StrictMode's double
// effect) see the flag and stay quiet.
let checkedThisLaunch = false

export function resetStaleCheckForTests() {
  checkedThisLaunch = false
}

interface Props {
  /** Called after a change that affects the host page (ghosted / deleted). */
  onMutated: () => void
}

/** Launch prompt listing applications stuck in Applied for 3+ months
    (per the /api/applications/stale check), with per-row triage:
    move to Ghosted, delete, or ignore for a chosen duration. */
export default function StaleApplicationsCheck({ onMutated }: Props) {
  const [stale, setStale] = useState<ApplicationCard[]>([])
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState<ApplicationCard | null>(null)
  const [menuFor, setMenuFor] = useState<number | null>(null)
  const toast = useToast()

  useEffect(() => {
    if (checkedThisLaunch) return
    checkedThisLaunch = true
    api
      .get<ApplicationCard[]>('/api/applications/stale')
      .then((list) => {
        if (list.length > 0) {
          setStale(list)
          setOpen(true)
        }
      })
      .catch(() => {
        // A failed launch check must never block using the app.
      })
  }, [])

  if (!open) return null

  const remove = (id: number) => {
    const next = stale.filter((c) => c.id !== id)
    setStale(next)
    if (next.length === 0) setOpen(false)
  }

  const ghost = async (card: ApplicationCard) => {
    try {
      await api.patch(`/api/applications/${card.id}/status`, { status: 'ghosted' })
      remove(card.id)
      onMutated()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  const snooze = async (card: ApplicationCard, days: number) => {
    try {
      await api.patch(`/api/applications/${card.id}`, {
        stale_snoozed_until: addDaysISO(days),
      })
      remove(card.id)
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    const card = deleting
    setDeleting(null)
    try {
      await api.del(`/api/applications/${card.id}`)
      remove(card.id)
      onMutated()
    } catch (err) {
      toast(errorMessage(err))
    }
  }

  return (
    <div className="overlay top-aligned">
      <div className="modal-card stale-card" role="dialog" aria-label="Stale applications">
        <div className="modal-title">Still waiting to hear back?</div>
        <div className="stale-intro">
          {stale.length === 1
            ? 'This application has'
            : `These ${stale.length} applications have`}{' '}
          been sitting in Applied for 3+ months. Close them out, or keep waiting.
        </div>
        {stale.map((card) => (
          <div className="stale-row" key={card.id}>
            <div className="stale-main">
              <span className="stale-company">{card.company}</span>
              <span className="stale-role">{card.role}</span>
              {card.applied_date && (
                <span className="stale-meta">
                  Applied {shortDate(card.applied_date)} · {card.days_since_applied}d ago
                </span>
              )}
            </div>
            <div className="stale-actions">
              <button type="button" className="stale-ghost" onClick={() => ghost(card)}>
                Move to Ghosted
              </button>
              {/* Custom menu (same recipe as the detail modal's status pill) —
                  the native select popup can't be styled to match the app. */}
              <div
                className="stale-snooze-wrap"
                onBlur={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                    setMenuFor((m) => (m === card.id ? null : m))
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') setMenuFor(null)
                }}
              >
                <button
                  type="button"
                  className="stale-snooze"
                  aria-haspopup="menu"
                  aria-expanded={menuFor === card.id}
                  aria-label={`Ignore ${card.company} for`}
                  onClick={() => setMenuFor((m) => (m === card.id ? null : card.id))}
                >
                  Ignore for… ▾
                </button>
                {menuFor === card.id && (
                  <div className="stale-snooze-menu" role="menu">
                    {SNOOZE_OPTIONS.map((option) => (
                      <button
                        key={option.days}
                        type="button"
                        role="menuitem"
                        className="stale-snooze-option"
                        onClick={() => {
                          setMenuFor(null)
                          snooze(card, option.days)
                        }}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                className="stale-delete"
                onClick={() => setDeleting(card)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        <div className="modal-actions">
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 13, padding: '9px 6px' }}
            onClick={() => setOpen(false)}
          >
            Decide later
          </button>
        </div>
        <ConfirmDialog
          open={deleting !== null}
          label={deleting ? `${deleting.company} — ${deleting.role}` : ''}
          detail="This permanently removes the application along with its contacts, interview rounds, notes, attachments and reminders."
          onCancel={() => setDeleting(null)}
          onConfirm={confirmDelete}
        />
      </div>
    </div>
  )
}
