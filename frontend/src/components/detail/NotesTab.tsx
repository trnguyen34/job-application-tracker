import { useState } from 'react'
import { api } from '../../api/client'
import type { Note } from '../../api/types'
import { formatDateTime, toDate } from '../../lib/dates'

interface Props {
  applicationId: number
  notes: Note[]
  act: (fn: () => Promise<void>) => void
  requestDelete: (kind: 'note', id: number, label: string) => void
  onChanged: () => void
}

export default function NotesTab({ applicationId, notes, act, requestDelete, onChanged }: Props) {
  const [draft, setDraft] = useState('')
  const [edit, setEdit] = useState<{ id: number; body: string } | null>(null)

  const add = () => {
    const body = draft.trim()
    if (!body) return
    act(async () => {
      await api.post(`/api/applications/${applicationId}/notes`, { body })
      setDraft('')
      onChanged()
    })
  }

  const saveEdit = () => {
    if (!edit || !edit.body.trim()) return
    const { id, body } = edit
    act(async () => {
      await api.patch(`/api/notes/${id}`, { body: body.trim() })
      setEdit(null)
      onChanged()
    })
  }

  const sorted = [...notes].sort(
    (a, b) => toDate(b.created_at).getTime() - toDate(a.created_at).getTime(),
  )

  return (
    <div>
      <div className="note-composer">
        <textarea
          placeholder="Add a note..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <button className="btn-accent" disabled={!draft.trim()} onClick={add}>
          Add
        </button>
      </div>

      <div className="item-list">
        {sorted.map((note) => {
          const isEditing = edit?.id === note.id
          return (
            <div className="item-card note-card" key={note.id}>
              {isEditing ? (
                <div className="note-edit">
                  <textarea
                    aria-label="Edit note"
                    value={edit.body}
                    onChange={(e) => setEdit({ id: note.id, body: e.target.value })}
                  />
                  <div className="tab-form-actions">
                    <button className="btn-ghost" onClick={() => setEdit(null)}>
                      Cancel
                    </button>
                    <button className="btn-accent" disabled={!edit.body.trim()} onClick={saveEdit}>
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="note-row">
                    <div className="note-body">{note.body}</div>
                    <div className="item-actions">
                      <button
                        className="item-edit"
                        onClick={() => setEdit({ id: note.id, body: note.body })}
                      >
                        Edit
                      </button>
                      <button
                        className="item-delete"
                        aria-label="Delete note"
                        onClick={() => requestDelete('note', note.id, 'this note')}
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="note-when mono">{formatDateTime(note.created_at)}</div>
                </>
              )}
            </div>
          )
        })}
        {notes.length === 0 && <div className="tab-empty">No notes yet.</div>}
      </div>
    </div>
  )
}
