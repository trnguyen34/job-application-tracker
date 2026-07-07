import { NavLink, Route, Routes } from 'react-router-dom'
import BoardPage from './pages/BoardPage'
import ApplicationDetailPage from './pages/ApplicationDetailPage'
import DashboardPage from './pages/DashboardPage'

export default function App() {
  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand">
          track<em>record</em>
        </div>
        <nav>
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Board
          </NavLink>
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Dashboard
          </NavLink>
        </nav>
      </header>
      <main className="main">
        <Routes>
          <Route path="/" element={<BoardPage />} />
          <Route path="/applications/:id" element={<ApplicationDetailPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
        </Routes>
      </main>
    </div>
  )
}
