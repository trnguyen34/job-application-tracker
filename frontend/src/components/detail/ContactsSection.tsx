import { useState, type FormEvent } from 'react'
import { api } from '../../api/client'
import type { Contact } from '../../api/types'

interface Props {
  applicationId: number
  contacts: Contact[]
  onChanged: () => void
}

export default function ContactsSection({ applicationId, contacts, onChanged }: Props) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [role, setRole] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Name is required.')
      return
    }
    await api.post(`/api/applications/${applicationId}/contacts`, {
      name: name.trim(),
      role: role.trim() || null,
      email: email.trim() || null,
    })
    setName('')
    setRole('')
    setEmail('')
    setAdding(false)
    setError(null)
    onChanged()
  }

  const remove = async (id: number) => {
    await api.del(`/api/contacts/${id}`)
    onChanged()
  }

  return (
    <div className="section-list">
      {contacts.length === 0 && !adding && (
        <div className="empty-state">No contacts yet.</div>
      )}
      {contacts.map((contact) => (
        <div className="item-card" key={contact.id}>
          <div className="item-head">
            <span className="title">{contact.name}</span>
            {contact.role && <span className="muted">{contact.role}</span>}
            <span className="spacer">
              <button className="icon-btn danger" onClick={() => remove(contact.id)}>
                Delete
              </button>
            </span>
          </div>
          <div className="muted">
            {[contact.email, contact.phone, contact.linkedin_url].filter(Boolean).join(' · ')}
          </div>
          {contact.notes && <div className="body">{contact.notes}</div>}
        </div>
      ))}
      {adding ? (
        <form className="item-card" onSubmit={submit}>
          <div className="item-head">
            <input
              autoFocus
              placeholder="Name *"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input placeholder="Role" value={role} onChange={(e) => setRole(e.target.value)} />
            <input placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          {error && (
            <p className="error-text" role="alert">
              {error}
            </p>
          )}
          <div className="item-head">
            <span className="spacer">
              <button type="button" className="btn" onClick={() => setAdding(false)}>
                Cancel
              </button>
              <button type="submit" className="btn primary">
                Add contact
              </button>
            </span>
          </div>
        </form>
      ) : (
        <div className="add-row">
          <button className="btn" onClick={() => setAdding(true)}>
            + Add contact
          </button>
        </div>
      )}
    </div>
  )
}
