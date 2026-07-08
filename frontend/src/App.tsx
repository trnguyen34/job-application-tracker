import { Route, Routes } from 'react-router-dom'
import BoardPage from './pages/BoardPage'
import ApplicationDetailPage from './pages/ApplicationDetailPage'
import DashboardPage from './pages/DashboardPage'
import { ToastProvider } from './components/ui/Toast'

/** Each view renders its own 56px top bar (the design has no shared
    chrome), so App is just routing plus app-wide providers. */
export default function App() {
  return (
    <ToastProvider>
      <Routes>
        <Route path="/" element={<BoardPage />} />
        <Route path="/applications/:id" element={<ApplicationDetailPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
      </Routes>
    </ToastProvider>
  )
}
