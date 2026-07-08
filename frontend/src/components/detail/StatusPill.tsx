import type { Status } from '../../api/types'
import { STATUS_LABELS } from '../../api/types'
import { STATUS_GROUPS, statusFg } from '../../lib/design'
import { DropdownMenu, useAnchoredMenu } from '../ui/Select'

interface Props {
  status: Status
  onChoose: (status: Status) => void
}

/** Status dropdown trigger (dot + tinted label per button-design.jpg)
    opening the shared grouped Active/Closed menu. */
export default function StatusPill({ status, onChoose }: Props) {
  const menu = useAnchoredMenu()

  return (
    <div
      className="status-pill-wrap"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) menu.close()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') menu.close()
      }}
    >
      <button
        className="dd-trigger status-trigger"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        onClick={menu.toggle}
      >
        <span className="dd-value" style={{ color: statusFg(status) }}>
          ● {STATUS_LABELS[status]}
        </span>
        <span className="dd-caret">▼</span>
      </button>
      {menu.open && (
        <DropdownMenu
          groups={STATUS_GROUPS}
          columns
          style={menu.style ?? undefined}
          onChoose={(next) => {
            menu.close()
            onChoose(next as Status)
          }}
        />
      )}
    </div>
  )
}
