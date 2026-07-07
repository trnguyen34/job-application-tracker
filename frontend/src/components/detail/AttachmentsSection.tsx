import { useRef, useState } from 'react'
import { api, ApiError } from '../../api/client'
import type { Attachment, FileType } from '../../api/types'
import { shortDate } from '../../lib/dates'

interface Props {
  applicationId: number
  attachments: Attachment[]
  onChanged: () => void
}

const TYPE_LABELS: Record<FileType, string> = {
  resume: 'Resume',
  cover_letter: 'Cover letter',
  other: 'Other',
}

function formatSize(bytes: number | null): string {
  if (bytes === null) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function AttachmentsSection({ applicationId, attachments, onChanged }: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [fileType, setFileType] = useState<FileType>('resume')
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const upload = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('file_type', fileType)
    setUploading(true)
    setError(null)
    try {
      await api.upload(`/api/applications/${applicationId}/attachments`, formData)
      onChanged()
    } catch (err) {
      setError(
        err instanceof ApiError && typeof err.detail === 'string'
          ? err.detail
          : 'Upload failed.',
      )
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ''
    }
  }

  const remove = async (id: number) => {
    await api.del(`/api/attachments/${id}`)
    onChanged()
  }

  return (
    <div className="section-list">
      <div className="item-card">
        <div className="item-head">
          <select
            aria-label="File type"
            value={fileType}
            onChange={(e) => setFileType(e.target.value as FileType)}
          >
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            ref={fileInput}
            type="file"
            aria-label="Choose file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
          />
          {uploading && <span className="muted">Uploading…</span>}
        </div>
        <p className="muted">PDF or Word documents, up to 10 MB.</p>
        {error && (
          <p className="error-text" role="alert">
            {error}
          </p>
        )}
      </div>
      {attachments.length === 0 && <div className="empty-state">No attachments yet.</div>}
      {attachments.map((attachment) => (
        <div className="item-card" key={attachment.id}>
          <div className="item-head">
            <span className="title">{attachment.filename}</span>
            <span className="badge">{TYPE_LABELS[attachment.file_type]}</span>
            <span className="muted">
              {formatSize(attachment.size_bytes)} · {shortDate(attachment.uploaded_at)}
            </span>
            <span className="spacer">
              <a
                className="icon-btn"
                href={`/api/attachments/${attachment.id}/download`}
                download={attachment.filename}
              >
                Download
              </a>
              <button className="icon-btn danger" onClick={() => remove(attachment.id)}>
                Delete
              </button>
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
