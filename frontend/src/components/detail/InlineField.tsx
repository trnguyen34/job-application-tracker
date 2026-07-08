import { useState, type ReactNode } from 'react'
import { errorMessage } from '../../api/client'

interface Props {
  value: string | number | null
  placeholder?: string
  type?: 'text' | 'number' | 'date'
  display?: ReactNode
  validate?: (raw: string) => string | null
  onSave: (raw: string) => Promise<void> | void
}

/** Click-to-edit field: shows the value, becomes an input on click,
    saves on Enter/blur, cancels on Escape. */
export default function InlineField({
  value,
  placeholder = 'Add…',
  type = 'text',
  display,
  validate,
  onSave,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const start = () => {
    setDraft(value === null ? '' : String(value))
    setError(null)
    setEditing(true)
  }

  const commit = async () => {
    if (saving) return // Enter already committed; ignore the follow-up blur
    const problem = validate?.(draft) ?? null
    if (problem) {
      setError(problem)
      return
    }
    setSaving(true)
    try {
      await onSave(draft)
      setEditing(false)
    } catch (err) {
      // Stay in edit mode so the draft isn't lost; Escape still cancels.
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="inline-field">
        <span
          className={`value${value === null || value === '' ? ' empty' : ''}`}
          role="button"
          tabIndex={0}
          onClick={start}
          onKeyDown={(e) => e.key === 'Enter' && start()}
        >
          {display ?? (value === null || value === '' ? placeholder : String(value))}
        </span>
      </div>
    )
  }

  return (
    <div className="inline-field">
      <input
        autoFocus
        type={type}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
      />
      {error && (
        <span className="error-text" role="alert">
          {error}
        </span>
      )}
    </div>
  )
}
