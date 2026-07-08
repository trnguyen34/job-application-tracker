import { useRef, useState } from 'react'
import { api } from '../../api/client'
import type { Attachment } from '../../api/types'
import { shortDate } from '../../lib/dates'

function extBadge(filename: string): string {
  const parts = filename.split('.')
  const ext = parts.length > 1 ? parts.pop()! : 'file'
  return ext.toUpperCase().slice(0, 4)
}

interface Props {
  applicationId: number
  attachments: Attachment[]
  act: (fn: () => Promise<void>) => void
  requestDelete: (kind: 'attachment', id: number, label: string) => void
  onChanged: () => void
}

export default function AttachmentsTab({
  applicationId,
  attachments,
  act,
  requestDelete,
  onChanged,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)

  const upload = (files: FileList) => {
    setUploading(true)
    act(async () => {
      try {
        // Sequential POSTs; the backend accepts one file per request and
        // defaults file_type to "other" (the design has no category).
        for (const file of Array.from(files)) {
          const formData = new FormData()
          formData.append('file', file)
          await api.upload(`/api/applications/${applicationId}/attachments`, formData)
        }
      } finally {
        setUploading(false)
        if (fileInput.current) fileInput.current.value = ''
        onChanged() // keep whatever uploaded before a failure
      }
    })
  }

  const sorted = [...attachments].sort((a, b) => b.uploaded_at.localeCompare(a.uploaded_at))

  return (
    <div>
      <input
        ref={fileInput}
        id="attach-file-input"
        type="file"
        multiple
        accept=".pdf,.doc,.docx"
        aria-label="Choose files"
        style={{ display: 'none' }}
        onChange={(e) => e.target.files?.length && upload(e.target.files)}
      />
      <div className="tab-add-row">
        <label htmlFor="attach-file-input" className="btn-dashed upload-label">
          {uploading ? 'Uploading…' : '+ Upload file'}
        </label>
      </div>

      <div className="item-list">
        {sorted.map((attachment) => (
          <div className="item-card attachment-card" key={attachment.id}>
            <div className="file-badge mono">{extBadge(attachment.filename)}</div>
            <a
              className="attachment-open"
              href={`/api/attachments/${attachment.id}/download`}
              download={attachment.filename}
            >
              <div className="attachment-name">{attachment.filename}</div>
              <div className="attachment-when">Uploaded {shortDate(attachment.uploaded_at)}</div>
            </a>
            <button
              className="item-delete"
              onClick={() => requestDelete('attachment', attachment.id, attachment.filename)}
            >
              Delete
            </button>
          </div>
        ))}
        {attachments.length === 0 && <div className="tab-empty">No attachments yet.</div>}
      </div>
    </div>
  )
}
