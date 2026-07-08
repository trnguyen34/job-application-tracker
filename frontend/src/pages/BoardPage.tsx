import { useEffect, useState } from 'react'
import { useMatch, useNavigate } from 'react-router-dom'
import { api, errorMessage } from '../api/client'
import { useApplications } from '../api/hooks'
import type { ApplicationCard, Status } from '../api/types'
import KanbanBoard from '../components/board/KanbanBoard'
import CloseOutcomeModal from '../components/board/CloseOutcomeModal'
import NewApplicationModal from '../components/board/NewApplicationModal'
import StaleApplicationsCheck from '../components/board/StaleApplicationsCheck'
import ApplicationDetailModal from '../components/detail/ApplicationDetailModal'
import Settings from '../components/ui/Settings'
import { useToast } from '../components/ui/Toast'
import type { ColumnKey } from '../lib/design'
import '../styles/board.css'

export default function BoardPage() {
  const { data, loading, error, refetch } = useApplications()
  const [cards, setCards] = useState<ApplicationCard[]>([])
  const [search, setSearch] = useState('')
  const [adding, setAdding] = useState(false)
  const [pendingCloseId, setPendingCloseId] = useState<number | null>(null)
  const navigate = useNavigate()
  const toast = useToast()
  // /applications/:id renders this same board with the detail modal open,
  // so deep links, refresh and the back button all behave.
  const detailMatch = useMatch('/applications/:id')
  const openId = detailMatch?.params.id ?? null

  useEffect(() => {
    if (data) setCards(data)
  }, [data])

  const moveCard = (id: number, status: Status) => {
    const previous = cards
    // Optimistic: move immediately, revert if the API rejects it.
    setCards((current) => current.map((c) => (c.id === id ? { ...c, status } : c)))
    api.patch(`/api/applications/${id}/status`, { status }).then(refetch, (err: unknown) => {
      setCards(previous)
      toast(errorMessage(err))
    })
  }

  const handleMove = (id: number, column: ColumnKey) => {
    if (column === 'closed') setPendingCloseId(id)
    else moveCard(id, column)
  }

  const query = search.trim().toLowerCase()
  const visible = query
    ? cards.filter((c) => `${c.company} ${c.role}`.toLowerCase().includes(query))
    : cards

  return (
    <div className="view">
      <div className="top-bar board-bar">
        <div className="crumbs">
          <span className="crumb-current">Board</span>
          <span className="crumb-sep">/</span>
          <button className="crumb-link" onClick={() => navigate('/dashboard')}>
            Dashboard
          </button>
        </div>
        <div className="bar-actions">
          <input
            type="text"
            className="search-input"
            placeholder="Search company or role"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button className="btn-new-app" onClick={() => setAdding(true)}>
            <span className="plus">+</span> New Application
          </button>
          <Settings onMutated={refetch} />
        </div>
      </div>

      {error ? (
        <div className="empty-state">Couldn’t load applications: {error.message}</div>
      ) : loading && !cards.length ? (
        <div className="empty-state">Loading board…</div>
      ) : (
        <KanbanBoard
          cards={visible}
          onMove={handleMove}
          onOpen={(id) => navigate(`/applications/${id}`)}
        />
      )}

      {adding && (
        <NewApplicationModal
          onClose={() => setAdding(false)}
          onCreated={(application) => {
            setAdding(false)
            refetch()
            navigate(`/applications/${application.id}`)
          }}
        />
      )}
      <CloseOutcomeModal
        open={pendingCloseId !== null}
        onCancel={() => setPendingCloseId(null)}
        onChoose={(status) => {
          const id = pendingCloseId!
          setPendingCloseId(null)
          moveCard(id, status)
        }}
      />
      {openId && (
        <ApplicationDetailModal id={openId} onClose={() => navigate('/')} onMutated={refetch} />
      )}
      <StaleApplicationsCheck onMutated={refetch} />
    </div>
  )
}
