import { useEffect, useState } from 'react'
import { api } from '../../api/client'
import type { ApplicationCard } from '../../api/types'
import StaleApplicationsModal from './StaleApplicationsModal'

// One check per app launch: module state survives route changes but resets
// on a full page load — "every time the user opens the app". Whichever page
// mounts first claims the check; later mounts (and StrictMode's double
// effect) see the flag and stay quiet.
let checkedThisLaunch = false

export function resetStaleCheckForTests() {
  checkedThisLaunch = false
}

interface Props {
  /** Called after a change that affects the host page (ghosted / deleted). */
  onMutated: () => void
}

/** Launch wrapper: asks the API for applications stuck in Applied for 3+
    months and opens the triage prompt when there are any. The same prompt
    can be opened on demand from Settings. */
export default function StaleApplicationsCheck({ onMutated }: Props) {
  const [stale, setStale] = useState<ApplicationCard[] | null>(null)

  useEffect(() => {
    if (checkedThisLaunch) return
    checkedThisLaunch = true
    api
      .get<ApplicationCard[]>('/api/applications/stale')
      .then((list) => {
        if (list.length > 0) setStale(list)
      })
      .catch(() => {
        // A failed launch check must never block using the app.
      })
  }, [])

  if (!stale) return null
  return (
    <StaleApplicationsModal
      applications={stale}
      onClose={() => setStale(null)}
      onMutated={onMutated}
    />
  )
}
