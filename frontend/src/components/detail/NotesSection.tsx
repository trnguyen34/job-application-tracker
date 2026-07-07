import { useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import type { Note } from '../../api/types'
import { formatDateTime } from '../../lib/dates'

interface Props {
  applicationId: number
  notes: Note[]
  onChanged: () => void
}

export default function NotesSection({ applicationId, notes, onChanged }: Props) {
  const [body, setBody] = useState('')

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!body.trim()) return
    await api.post(`/api/applications/${applicationId}/notes`, { body: body.trim() })
    setBody('')
    onChanged()
  }

  const remove = async (id: number) => {
    await api.del(`/api/notes/${id}`)
    onChanged()
  }

  return (
    <div className="section-list">
      <form className="item-card" onSubmit={submit}>
        <textarea
          rows={3}
          placeholder="Write a note…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
        <div className="item-head">
          <span className="spacer">
            <button type="submit" className="btn primary" disabled={!body.trim()}>
              Add note
            </button>
          </span>
        </div>
      </form>
      {notes.length === 0 && <div className="empty-state">No notes yet.</div>}
      {notes.map((note) => (
        <div className="item-card" key={note.id}>
          <div className="item-head">
            <span className="muted">{formatDateTime(note.created_at)}</span>
            <span className="spacer">
              <button className="icon-btn danger" onClick={() => remove(note.id)}>
                Delete
              </button>
            </span>
          </div>
          <div className="body">{note.body}</div>
        </div>
      ))}
    </div>
  )
}
