import { useState } from 'react'
import { api } from '../../api/client'
import type { Contact } from '../../api/types'

interface ContactForm {
  id?: number
  name: string
  role: string
  email: string
  phone: string
  linkedinUrl: string
  notes: string
}

const blank: ContactForm = { name: '', role: '', email: '', phone: '', linkedinUrl: '', notes: '' }

interface Props {
  applicationId: number
  contacts: Contact[]
  act: (fn: () => Promise<void>) => void
  requestDelete: (kind: 'contact', id: number, label: string) => void
  onChanged: () => void
}

export default function ContactsTab({ applicationId, contacts, act, requestDelete, onChanged }: Props) {
  const [form, setForm] = useState<ContactForm | null>(null)

  const set = (field: keyof ContactForm) => (value: string) =>
    setForm((f) => (f ? { ...f, [field]: value } : f))

  const save = () => {
    if (!form || !form.name.trim()) return
    const payload = {
      name: form.name.trim(),
      role: form.role.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      linkedin_url: form.linkedinUrl.trim() || null,
      notes: form.notes.trim() || null,
    }
    act(async () => {
      if (form.id) await api.patch(`/api/contacts/${form.id}`, payload)
      else await api.post(`/api/applications/${applicationId}/contacts`, payload)
      setForm(null)
      onChanged()
    })
  }

  return (
    <div>
      {form && (
        <div className="tab-form">
          <div className="tab-form-title">{form.id ? 'Edit contact' : 'Add contact'}</div>
          <div className="tab-form-grid">
            <input placeholder="Name" value={form.name} onChange={(e) => set('name')(e.target.value)} />
            <input placeholder="Role / title" value={form.role} onChange={(e) => set('role')(e.target.value)} />
            <input placeholder="Email" value={form.email} onChange={(e) => set('email')(e.target.value)} />
            <input placeholder="Phone" value={form.phone} onChange={(e) => set('phone')(e.target.value)} />
            <input
              className="span-2"
              placeholder="LinkedIn URL"
              value={form.linkedinUrl}
              onChange={(e) => set('linkedinUrl')(e.target.value)}
            />
            <textarea
              className="span-2"
              placeholder="Notes"
              value={form.notes}
              onChange={(e) => set('notes')(e.target.value)}
            />
          </div>
          <div className="tab-form-actions">
            <button className="btn-ghost" onClick={() => setForm(null)}>
              Cancel
            </button>
            <button className="save-pill" disabled={!form.name.trim()} onClick={save}>
              Save contact
            </button>
          </div>
        </div>
      )}

      <div className="tab-add-row">
        <button className="btn-dashed" onClick={() => setForm(blank)}>
          + Add contact
        </button>
      </div>

      <div className="item-list">
        {contacts.map((contact) => (
          <div className="item-card contact-card" key={contact.id}>
            <div className="item-main">
              <div className="item-title">{contact.name}</div>
              {contact.role && <div className="item-subtitle">{contact.role}</div>}
              <div className="contact-channels">
                {contact.email && <span>{contact.email}</span>}
                {contact.phone && <span>{contact.phone}</span>}
                {contact.linkedin_url && (
                  <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer">
                    LinkedIn ↗
                  </a>
                )}
              </div>
              {contact.notes && <div className="item-notes">{contact.notes}</div>}
            </div>
            <div className="item-actions">
              <button
                className="item-edit"
                onClick={() =>
                  setForm({
                    id: contact.id,
                    name: contact.name,
                    role: contact.role ?? '',
                    email: contact.email ?? '',
                    phone: contact.phone ?? '',
                    linkedinUrl: contact.linkedin_url ?? '',
                    notes: contact.notes ?? '',
                  })
                }
              >
                Edit
              </button>
              <button
                className="item-delete"
                onClick={() => requestDelete('contact', contact.id, contact.name)}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
        {contacts.length === 0 && <div className="tab-empty">No contacts yet.</div>}
      </div>
    </div>
  )
}
