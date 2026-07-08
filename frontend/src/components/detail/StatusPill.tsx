import type { Status } from '../../api/types'
import { STATUS_LABELS } from '../../api/types'
import { STATUS_GROUPS, statusFg, statusTint } from '../../lib/design'
import { DropdownMenu, useAnchoredMenu } from '../ui/Select'

interface Props {
  status: Status
  onChoose: (status: Status) => void
}

/** Tinted status pill opening the shared grouped Active/Closed dropdown. */
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
        className="status-pill"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        style={{ background: statusTint(status), color: statusFg(status) }}
        onClick={menu.toggle}
      >
        {STATUS_LABELS[status]} ▾
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
