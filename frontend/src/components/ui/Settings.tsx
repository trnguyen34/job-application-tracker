import { useEffect, useState, type ReactNode } from 'react'
import { api, errorMessage } from '../../api/client'
import type { ApplicationCard } from '../../api/types'
import { useTheme, type Theme } from '../../lib/theme'
import StaleApplicationsModal from '../board/StaleApplicationsModal'
import { useToast } from './Toast'

const THEME_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

interface Props {
  /** Called after settings actions that change board/dashboard data. */
  onMutated: () => void
}

/** Gear button + macOS-style settings modal: section list on the left,
    the selected section's controls on the right. New settings are meant
    to slot in as another entry in `sections` below. */
export default function Settings({ onMutated }: Props) {
  const [open, setOpen] = useState(false)
  const [section, setSection] = useState('appearance')
  const [staleList, setStaleList] = useState<ApplicationCard[] | null>(null)
  const [checking, setChecking] = useState(false)
  const { theme, set } = useTheme()
  const toast = useToast()

  // Esc closes the settings modal (the stale prompt on top handles itself).
  useEffect(() => {
    if (!open || staleList) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, staleList])

  const checkStale = async () => {
    if (checking) return
    setChecking(true)
    try {
      const list = await api.get<ApplicationCard[]>('/api/applications/stale')
      if (list.length === 0) {
        toast('Nothing has been sitting in Applied for 3+ months.')
      } else {
        setStaleList(list)
      }
    } catch (err) {
      toast(errorMessage(err))
    } finally {
      setChecking(false)
    }
  }

  const sections: { key: string; label: string; render: () => ReactNode }[] = [
    {
      key: 'appearance',
      label: 'Appearance',
      render: () => (
        <>
          <div className="settings-section-title">Appearance</div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Theme</div>
              <div className="settings-desc">How the tracker looks on this device.</div>
            </div>
            <div className="settings-seg" role="radiogroup" aria-label="Theme">
              {THEME_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={theme === option.value}
                  className={`settings-seg-opt${theme === option.value ? ' active' : ''}`}
                  onClick={() => set(option.value)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </>
      ),
    },
    {
      key: 'applications',
      label: 'Applications',
      render: () => (
        <>
          <div className="settings-section-title">Applications</div>
          <div className="settings-row">
            <div>
              <div className="settings-label">Stale applications</div>
              <div className="settings-desc">
                Anything sitting in Applied for 3+ months gets flagged at launch — or run
                the check right now.
              </div>
            </div>
            <button type="button" className="settings-action" onClick={checkStale}>
              {checking ? 'Checking…' : 'Check now'}
            </button>
          </div>
        </>
      ),
    },
  ]

  const active = sections.find((s) => s.key === section) ?? sections[0]

  return (
    <>
      <button
        type="button"
        className="settings-btn"
        title="Settings"
        aria-label="Settings"
        onClick={() => setOpen(true)}
      >
        {/* Inline gear: the ⚙ glyph renders tiny and off-center, an SVG
            sized to the 36px circle centers exactly and scales crisply. */}
        <svg
          width="19"
          height="19"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3.2" />
          <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.55-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.09a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87v.09a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1z" />
        </svg>
      </button>
      {open && (
        <div
          className="overlay top-aligned"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false)
          }}
        >
          <div className="modal-card settings-card" role="dialog" aria-label="Settings">
            <div className="settings-nav">
              <div className="settings-nav-title">Settings</div>
              {sections.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  className={`settings-nav-item${s.key === section ? ' active' : ''}`}
                  onClick={() => setSection(s.key)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="settings-pane">
              <button
                type="button"
                className="settings-close"
                aria-label="Close settings"
                onClick={() => setOpen(false)}
              >
                ✕
              </button>
              {active.render()}
            </div>
          </div>
        </div>
      )}
      {staleList && (
        <StaleApplicationsModal
          applications={staleList}
          onClose={() => setStaleList(null)}
          onMutated={onMutated}
        />
      )}
    </>
  )
}
