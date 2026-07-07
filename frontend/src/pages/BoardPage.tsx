import { useEffect, useState } from 'react'
import { api } from '../api/client'
import { useApplications } from '../api/hooks'
import type { ApplicationCard, Status } from '../api/types'
import KanbanBoard from '../components/board/KanbanBoard'
import NewApplicationModal from '../components/board/NewApplicationModal'
import '../styles/board.css'

export default function BoardPage() {
  const { data, loading, error, refetch } = useApplications()
  const [cards, setCards] = useState<ApplicationCard[]>([])
  const [adding, setAdding] = useState(false)

  useEffect(() => {
    if (data) setCards(data)
  }, [data])

  const moveCard = (id: number, status: Status) => {
    const previous = cards
    // Optimistic: move immediately, revert if the API rejects it.
    setCards((current) => current.map((c) => (c.id === id ? { ...c, status } : c)))
    api.patch(`/api/applications/${id}/status`, { status }).then(refetch, () => {
      setCards(previous)
    })
  }

  if (loading && !cards.length) return <div className="empty-state">Loading board…</div>
  if (error) return <div className="empty-state">Couldn’t load applications: {error.message}</div>

  return (
    <>
      <div className="board-header">
        <h1>Pipeline</h1>
        <button className="btn primary" onClick={() => setAdding(true)}>
          + New application
        </button>
      </div>
      <KanbanBoard cards={cards} onMove={moveCard} />
      {adding && <NewApplicationModal onClose={() => setAdding(false)} onCreated={refetch} />}
    </>
  )
}
