interface Props {
  open: boolean
  label: string
  detail: string
  onCancel: () => void
  onConfirm: () => void
}

/** Design's delete confirmation modal — replaces window.confirm. The
    backdrop intentionally doesn't dismiss (matching the prototype);
    Cancel is the only way out. */
export default function ConfirmDialog({ open, label, detail, onCancel, onConfirm }: Props) {
  if (!open) return null
  return (
    <div className="overlay">
      <div className="modal-card" style={{ width: 380 }} role="alertdialog" aria-label={`Delete ${label}?`}>
        <div className="modal-title">Delete {label}?</div>
        <div className="confirm-detail">{detail}</div>
        <div className="modal-actions">
          <button className="btn-ghost" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-delete" onClick={onConfirm}>
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
