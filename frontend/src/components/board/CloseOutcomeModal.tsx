import type { Status } from '../../api/types'
import { STATUS_LABELS } from '../../api/types'
import { CLOSED_STATUSES } from '../../lib/design'

interface Props {
  open: boolean
  onChoose: (status: Status) => void
  onCancel: () => void
}

/** Dropping a card on the grouped Closed column asks which terminal
    status it actually reached. */
export default function CloseOutcomeModal({ open, onChoose, onCancel }: Props) {
  if (!open) return null
  return (
    <div className="overlay">
      <div className="modal-card" style={{ width: 360 }} role="dialog" aria-label="Move to Closed">
        <div className="modal-title">Move to Closed</div>
        <div className="confirm-detail" style={{ marginBottom: 16 }}>
          Pick the outcome for this application.
        </div>
        <div className="close-choices">
          {CLOSED_STATUSES.map((status) => (
            <button key={status} className={`close-choice ${status}`} onClick={() => onChoose(status)}>
              {STATUS_LABELS[status]}
            </button>
          ))}
        </div>
        <button className="btn-ghost close-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  )
}
