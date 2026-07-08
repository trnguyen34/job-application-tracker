import { useEffect, useState } from 'react'
import { api, errorMessage } from '../../api/client'
import { useApplication } from '../../api/hooks'
import type { Priority, Status } from '../../api/types'
import ContactsTab from './ContactsTab'
import RoundsTab from './RoundsTab'
import NotesTab from './NotesTab'
import AttachmentsTab from './AttachmentsTab'
import DetailsCard, { draftFrom, type DetailsDraft } from './DetailsCard'
import RemindersCard from './RemindersCard'
import StatusPill from './StatusPill'
import ConfirmDialog from '../ui/ConfirmDialog'
import { useToast } from '../ui/Toast'
import { toHttpUrl } from '../../lib/urls'
import { formatDateTime } from '../../lib/dates'
import '../../styles/detail.css'

type Tab = 'contacts' | 'rounds' | 'notes' | 'attachments'

type DeleteKind = 'application' | 'contact' | 'round' | 'note' | 'attachment' | 'reminder'

const DELETE_URLS: Record<Exclude<DeleteKind, 'application'>, string> = {
  contact: '/api/contacts',
  round: '/api/interviews',
  note: '/api/notes',
  attachment: '/api/attachments',
  reminder: '/api/reminders',
}

const TABS: { key: Tab; label: string }[] = [
  { key: 'contacts', label: 'Contacts' },
  { key: 'rounds', label: 'Interview Rounds' },
  { key: 'notes', label: 'Notes' },
  { key: 'attachments', label: 'Attachments' },
]

interface Props {
  id: string
  onClose: () => void
  /** Called after any mutation so the board behind the modal stays fresh. */
  onMutated: () => void
}

export default function ApplicationDetailModal({ id, onClose, onMutated }: Props) {
  const toast = useToast()
  const { data: application, error, refetch } = useApplication(id)
  const [tab, setTab] = useState<Tab>('contacts')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DetailsDraft | null>(null)
  const [confirm, setConfirm] = useState<{ kind: DeleteKind; id: number; label: string } | null>(
    null,
  )

  // Escape closes the top-most layer: the confirm dialog first, then the modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      setConfirm((current) => {
        if (current) return null
        onClose()
        return current
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const shell = (content: React.ReactNode) => (
    <div className="overlay detail-overlay" onClick={onClose}>
      <div
        className="modal-card detail-modal"
        role="dialog"
        aria-label={application ? application.company : 'Application'}
        onClick={(e) => e.stopPropagation()}
      >
        {content}
      </div>
    </div>
  )

  if (error)
    return shell(
      <>
        <div className="detail-modal-bar">
          <button className="modal-close-btn" aria-label="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="empty-state">Couldn’t load application: {error.message}</div>
      </>,
    )
  if (!application)
    return shell(
      <>
        <div className="detail-modal-bar" />
        <div className="empty-state">Loading…</div>
      </>,
    )

  /** Refresh both the modal's data and the board behind it. */
  const refresh = () => {
    refetch()
    onMutated()
  }

  /** Run a mutation; failures surface as a toast (the design has no inline
      error areas outside form validation). */
  const act = (fn: () => Promise<void>) => {
    fn().catch((err: unknown) => toast(errorMessage(err)))
  }

  const setStatus = (status: Status) =>
    act(async () => {
      await api.patch(`/api/applications/${application.id}/status`, { status })
      refresh()
    })

  const setPriority = (priority: Priority) =>
    act(async () => {
      await api.patch(`/api/applications/${application.id}`, { priority })
      refresh()
    })

  const startEdit = () => {
    setDraft(draftFrom(application))
    setEditing(true)
  }

  const saveEdit = () => {
    if (!draft) return
    act(async () => {
      await api.patch(`/api/applications/${application.id}`, {
        company: draft.company.trim() || application.company,
        role: draft.role.trim() || application.role,
        job_url: draft.jobUrl.trim() || null,
        applied_date: draft.appliedDate || null,
        location: draft.location.trim() || null,
        work_mode: draft.workMode,
        source: draft.source || null,
        salary_min: draft.salaryMin === '' ? null : Number(draft.salaryMin),
        salary_max: draft.salaryMax === '' ? null : Number(draft.salaryMax),
        salary_currency: draft.currency,
      })
      setEditing(false)
      refresh()
    })
  }

  const requestDelete = (kind: DeleteKind, targetId: number, label: string) =>
    setConfirm({ kind, id: targetId, label })

  const performDelete = () => {
    if (!confirm) return
    const target = confirm
    setConfirm(null)
    act(async () => {
      if (target.kind === 'application') {
        await api.del(`/api/applications/${target.id}`)
        onMutated()
        onClose()
        return
      }
      await api.del(`${DELETE_URLS[target.kind]}/${target.id}`)
      refresh()
    })
  }

  const jobUrl = application.job_url ? toHttpUrl(application.job_url) : null

  return shell(
    <>
      <div className="detail-modal-bar">
        {jobUrl && (
          <a className="pill-link" href={jobUrl.href} target="_blank" rel="noopener noreferrer">
            Job posting ↗
          </a>
        )}
        <button
          className="btn-danger-pill"
          onClick={() =>
            requestDelete(
              'application',
              application.id,
              `${application.company} — ${application.role}`,
            )
          }
        >
          Delete
        </button>
        <button className="modal-close-btn" aria-label="Close" onClick={onClose}>
          ✕
        </button>
      </div>

      <div className="detail-layout">
        <div className="detail-main">
          {editing && draft ? (
            <div className="detail-header-edit">
              <input
                aria-label="Company"
                className="edit-company"
                value={draft.company}
                onChange={(e) => setDraft({ ...draft, company: e.target.value })}
              />
              <input
                aria-label="Role"
                className="edit-role"
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value })}
              />
            </div>
          ) : (
            <>
              <h1 className="detail-company">{application.company}</h1>
              <div className="detail-role">{application.role}</div>
            </>
          )}

          <div className="detail-controls">
            <StatusPill status={application.status} onChoose={setStatus} />
            <div className="priority-seg" role="group" aria-label="Priority">
              {(['low', 'medium', 'high'] as Priority[]).map((p) => (
                <button
                  key={p}
                  className={`priority-opt ${p}${application.priority === p ? ' active' : ''}`}
                  onClick={() => setPriority(p)}
                >
                  {p === 'low' ? 'Low' : p === 'medium' ? 'Med' : 'High'}
                </button>
              ))}
            </div>
          </div>

          <div className="detail-tabs" role="tablist">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                className={`detail-tab${tab === key ? ' active' : ''}`}
                onClick={() => setTab(key)}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="detail-tab-body">
            {tab === 'contacts' && (
              <ContactsTab
                applicationId={application.id}
                contacts={application.contacts}
                act={act}
                requestDelete={requestDelete}
                onChanged={refresh}
              />
            )}
            {tab === 'rounds' && (
              <RoundsTab
                applicationId={application.id}
                rounds={application.interview_rounds}
                act={act}
                requestDelete={requestDelete}
                onChanged={refresh}
              />
            )}
            {tab === 'notes' && (
              <NotesTab
                applicationId={application.id}
                notes={application.notes}
                act={act}
                requestDelete={requestDelete}
                onChanged={refresh}
              />
            )}
            {tab === 'attachments' && (
              <AttachmentsTab
                applicationId={application.id}
                attachments={application.attachments}
                act={act}
                requestDelete={requestDelete}
                onChanged={refresh}
              />
            )}
          </div>
        </div>

        <aside className="detail-side">
          <DetailsCard
            application={application}
            editing={editing}
            draft={draft}
            onDraftChange={setDraft}
            onStartEdit={startEdit}
            onCancelEdit={() => setEditing(false)}
            onSaveEdit={saveEdit}
          />
          <RemindersCard
            applicationId={application.id}
            reminders={application.reminders}
            act={act}
            requestDelete={requestDelete}
            onChanged={refresh}
          />
          <div className="detail-meta mono">
            <span>Created {formatDateTime(application.created_at)}</span>
            <span>Updated {formatDateTime(application.updated_at)}</span>
          </div>
        </aside>
      </div>

      <ConfirmDialog
        open={confirm !== null}
        label={confirm?.label ?? ''}
        detail={
          confirm?.kind === 'application'
            ? 'This removes all of its contacts, interview rounds, notes, reminders, and attachments too.'
            : 'This can’t be undone.'
        }
        onCancel={() => setConfirm(null)}
        onConfirm={performDelete}
      />
    </>,
  )
}
