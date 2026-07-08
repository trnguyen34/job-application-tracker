import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { useApplication } from '../api/hooks'
import type { Priority, Status } from '../api/types'
import ContactsTab from '../components/detail/ContactsTab'
import RoundsTab from '../components/detail/RoundsTab'
import NotesTab from '../components/detail/NotesTab'
import AttachmentsTab from '../components/detail/AttachmentsTab'
import DetailsCard, { draftFrom, type DetailsDraft } from '../components/detail/DetailsCard'
import RemindersCard from '../components/detail/RemindersCard'
import StatusPill from '../components/detail/StatusPill'
import ConfirmDialog from '../components/ui/ConfirmDialog'
import ThemeToggle from '../components/ui/ThemeToggle'
import { useToast } from '../components/ui/Toast'
import { toHttpUrl } from '../lib/urls'
import { formatDateTime } from '../lib/dates'
import '../styles/detail.css'

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

export default function ApplicationDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const toast = useToast()
  const { data: application, error, refetch } = useApplication(id!)
  const [tab, setTab] = useState<Tab>('contacts')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState<DetailsDraft | null>(null)
  const [confirm, setConfirm] = useState<{ kind: DeleteKind; id: number; label: string } | null>(
    null,
  )

  if (error) return <div className="empty-state">Couldn’t load application: {error.message}</div>
  if (!application) return <div className="empty-state">Loading…</div>

  /** Run a mutation; failures surface as a toast (the design has no inline
      error areas outside form validation). */
  const act = (fn: () => Promise<void>) => {
    fn().catch((err: unknown) => toast(errorMessage(err)))
  }

  const setStatus = (status: Status) =>
    act(async () => {
      await api.patch(`/api/applications/${application.id}/status`, { status })
      refetch()
    })

  const setPriority = (priority: Priority) =>
    act(async () => {
      await api.patch(`/api/applications/${application.id}`, { priority })
      refetch()
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
      refetch()
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
        navigate('/')
        return
      }
      await api.del(`${DELETE_URLS[target.kind]}/${target.id}`)
      refetch()
    })
  }

  const jobUrl = application.job_url ? toHttpUrl(application.job_url) : null

  return (
    <div className="view">
      <div className="top-bar">
        <button className="crumb-link" onClick={() => navigate('/')}>
          ← Board
        </button>
        <span className="crumb-sep">/</span>
        <span className="crumb-current">{application.company}</span>
        <div className="spacer" />
        <ThemeToggle />
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
                onChanged={refetch}
              />
            )}
            {tab === 'rounds' && (
              <RoundsTab
                applicationId={application.id}
                rounds={application.interview_rounds}
                act={act}
                requestDelete={requestDelete}
                onChanged={refetch}
              />
            )}
            {tab === 'notes' && (
              <NotesTab
                applicationId={application.id}
                notes={application.notes}
                act={act}
                requestDelete={requestDelete}
                onChanged={refetch}
              />
            )}
            {tab === 'attachments' && (
              <AttachmentsTab
                applicationId={application.id}
                attachments={application.attachments}
                act={act}
                requestDelete={requestDelete}
                onChanged={refetch}
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
            onChanged={refetch}
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
    </div>
  )
}
