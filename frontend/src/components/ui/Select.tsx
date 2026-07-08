import { Fragment, useState, type CSSProperties, type MouseEvent } from 'react'

/** The app's one dropdown design (ported from the detail modal's status
    menu): pill/field triggers opening a rounded surface card of options,
    optionally grouped and tinted. Menus are position: fixed anchored to
    the trigger — the modal cards scroll (overflow-y), which would clip an
    absolutely positioned menu — and flip upward near the viewport edge. */

export interface SelectOption {
  value: string
  label: string
  /** Status-style color for the dot + label (e.g. statusFg(s)). */
  color?: string
}

export interface SelectGroup {
  label?: string
  options: SelectOption[]
}

export function useAnchoredMenu() {
  const [style, setStyle] = useState<CSSProperties | null>(null)

  const toggle = (e: MouseEvent<HTMLElement>) => {
    if (style) {
      setStyle(null)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    const below = window.innerHeight - rect.bottom
    const pos: CSSProperties = {
      position: 'fixed',
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 228)),
    }
    if (below < 320 && rect.top > below) {
      pos.bottom = window.innerHeight - rect.top + 6
      pos.maxHeight = rect.top - 16
    } else {
      pos.top = rect.bottom + 6
      pos.maxHeight = below - 16
    }
    setStyle(pos)
  }

  return { open: style !== null, style, toggle, close: () => setStyle(null) }
}

interface MenuProps {
  groups: SelectGroup[]
  onChoose: (value: string) => void
  style?: CSSProperties
  /** Lay groups out side by side (e.g. the 9-status menu) so every option
      is visible at once without scrolling. */
  columns?: boolean
}

export function DropdownMenu({ groups, onChoose, style, columns }: MenuProps) {
  const option = (o: SelectOption) => (
    <button
      key={o.value}
      type="button"
      role="menuitem"
      className={`dd-option${o.color ? ' tinted' : ''}`}
      style={o.color ? { color: o.color } : undefined}
      onClick={() => onChoose(o.value)}
    >
      {o.color ? '● ' : ''}
      {o.label}
    </button>
  )

  if (columns) {
    return (
      <div className="dd-menu columns" role="menu" style={style ?? undefined}>
        {groups.map((group, index) => (
          <div className="dd-col" key={group.label ?? index}>
            {group.label && <div className="dd-group">{group.label}</div>}
            {group.options.map(option)}
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="dd-menu" role="menu" style={style ?? undefined}>
      {groups.map((group, index) => (
        <Fragment key={group.label ?? index}>
          {group.label && (
            <div className={`dd-group${index > 0 ? ' divided' : ''}`}>{group.label}</div>
          )}
          {group.options.map(option)}
        </Fragment>
      ))}
    </div>
  )
}

interface SelectProps {
  value: string
  groups: SelectGroup[]
  onChange: (value: string) => void
  ariaLabel: string
  /** Smaller trigger metrics for dense forms (details edit, tab forms). */
  compact?: boolean
  /** Side-by-side group columns — see DropdownMenu. */
  menuColumns?: boolean
}

export default function Select({
  value,
  groups,
  onChange,
  ariaLabel,
  compact,
  menuColumns,
}: SelectProps) {
  const menu = useAnchoredMenu()
  const current = groups.flatMap((g) => g.options).find((o) => o.value === value)

  return (
    <div
      className="dd-wrap"
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) menu.close()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Escape') menu.close()
      }}
    >
      <button
        type="button"
        className={`dd-trigger${compact ? ' compact' : ''}`}
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={ariaLabel}
        onClick={menu.toggle}
      >
        <span
          className="dd-value"
          style={current?.color ? { color: current.color } : undefined}
        >
          {current?.color ? '● ' : ''}
          {current?.label ?? ''}
        </span>
        <span className="dd-caret">▼</span>
      </button>
      {menu.open && (
        <DropdownMenu
          groups={groups}
          columns={menuColumns}
          style={menu.style ?? undefined}
          onChoose={(next) => {
            menu.close()
            onChange(next)
          }}
        />
      )}
    </div>
  )
}
