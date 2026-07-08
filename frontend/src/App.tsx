import { Route, Routes } from 'react-router-dom'
import BoardPage from './pages/BoardPage'
import DashboardPage from './pages/DashboardPage'
import { ToastProvider } from './components/ui/Toast'

/** Each view renders its own 56px top bar (the design has no shared
    chrome), so App is just routing plus app-wide providers. The board
    owns the catch-all: /applications/:id renders the board with the
    detail modal on top, so deep links and refresh keep working. */
export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/*" element={<BoardPage />} />
      </Routes>
    </ToastProvider>
  )
}
