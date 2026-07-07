import { useState, type ReactNode } from 'react'

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

  const start = () => {
    setDraft(value === null ? '' : String(value))
    setError(null)
    setEditing(true)
  }

  const commit = async () => {
    const problem = validate?.(draft) ?? null
    if (problem) {
      setError(problem)
      return
    }
    await onSave(draft)
    setEditing(false)
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
