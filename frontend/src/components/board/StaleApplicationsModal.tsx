import { useState } from 'react'
import { api, errorMessage } from '../../api/client'
import type { ApplicationCard } from '../../api/types'
import { addDaysISO, shortDate } from '../../lib/dates'
import ConfirmDialog from '../ui/ConfirmDialog'
import { DropdownMenu, useAnchoredMenu } from '../ui/Select'
import { useToast } from '../ui/Toast'

const SNOOZE_GROUP = [
  {
    options: [
      { value: '7', label: '1 week' },
      { value: '30', label: '1 month' },
      { value: '90', label: '3 months' },
    ],
  },
]

interface Props {
  applications: ApplicationCard[]
  onClose: () => void
  /** Called after a change that affects the host page (ghosted / deleted). */
  onMutated: () => void
}

interface RowProps {
  card: ApplicationCard
  onGhost: () => void
  onSnooze: (days: number) => void
  onDelete: () => void
}

function StaleRow({ card, onGhost, onSnooze, onDelete }: RowProps) {
  const menu = useAnchoredMenu()

  return (
    <div className="stale-row">
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
        <button type="button" className="stale-ghost" onClick={onGhost}>
          Move to Ghosted
        </button>
        <div
          className="dd-wrap"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null)) menu.close()
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') menu.close()
          }}
        >
          <button
            type="button"
            className="stale-snooze"
            aria-haspopup="menu"
            aria-expanded={menu.open}
            aria-label={`Ignore ${card.company} for`}
            onClick={menu.toggle}
          >
            Ignore for… ▾
          </button>
          {menu.open && (
            <DropdownMenu
              groups={SNOOZE_GROUP}
              style={menu.style ?? undefined}
              onChoose={(days) => {
                menu.close()
                onSnooze(Number(days))
              }}
            />
          )}
        </div>
        <button type="button" className="stale-delete" onClick={onDelete}>
          Delete
        </button>
      </div>
    </div>
  )
}

/** Triage prompt for applications stuck in Applied: move to Ghosted,
    delete, or ignore for a chosen duration. Rows leave the list as they
    are handled; the modal closes itself after the last one. */
export default function StaleApplicationsModal({ applications, onClose, onMutated }: Props) {
  const [stale, setStale] = useState<ApplicationCard[]>(applications)
  const [deleting, setDeleting] = useState<ApplicationCard | null>(null)
  const toast = useToast()

  const remove = (id: number) => {
    const next = stale.filter((c) => c.id !== id)
    setStale(next)
    if (next.length === 0) onClose()
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
          <StaleRow
            key={card.id}
            card={card}
            onGhost={() => ghost(card)}
            onSnooze={(days) => snooze(card, days)}
            onDelete={() => setDeleting(card)}
          />
        ))}
        <div className="modal-actions">
          <button
            type="button"
            className="btn-ghost"
            style={{ fontSize: 13, padding: '9px 6px' }}
            onClick={onClose}
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
