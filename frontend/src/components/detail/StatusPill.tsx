import { useState } from 'react'
import type { Status } from '../../api/types'
import { STATUS_LABELS } from '../../api/types'
import { ACTIVE_STATUSES, CLOSED_STATUSES, statusFg, statusTint } from '../../lib/design'

interface Props {
  status: Status
  onChoose: (status: Status) => void
}

/** Tinted status pill opening the grouped Active/Closed menu. */
export default function StatusPill({ status, onChoose }: Props) {
  const [open, setOpen] = useState(false)

  const choose = (next: Status) => {
    setOpen(false)
    onChoose(next)
  }

  return (
    <div className="status-pill-wrap">
      <button
        className="status-pill"
        style={{ background: statusTint(status), color: statusFg(status) }}
        onClick={() => setOpen((o) => !o)}
      >
        {STATUS_LABELS[status]} ▾
      </button>
      {open && (
        <div className="status-menu" role="menu">
          <div className="status-menu-group">Active</div>
          {ACTIVE_STATUSES.map((s) => (
            <button
              key={s}
              role="menuitem"
              className="status-menu-item"
              style={{ color: statusFg(s) }}
              onClick={() => choose(s)}
            >
              ● {STATUS_LABELS[s]}
            </button>
          ))}
          <div className="status-menu-group closed">Closed</div>
          {CLOSED_STATUSES.map((s) => (
            <button
              key={s}
              role="menuitem"
              className="status-menu-item"
              style={{ color: statusFg(s) }}
              onClick={() => choose(s)}
            >
              ● {STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
