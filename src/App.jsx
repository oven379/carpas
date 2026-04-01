import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './App.css'
import { TopNav } from './ui/components.jsx'
import { useRepo } from './ui/useRepo.js'
import { isAuthed } from './ui/auth.js'
import HomePage from './ui/pages/HomePage.jsx'
import MarketPage from './ui/pages/MarketPage.jsx'
import CarPage from './ui/pages/CarPage.jsx'
import CarEditPage from './ui/pages/CarEditPage.jsx'
import HistoryPage from './ui/pages/HistoryPage.jsx'
import DocsPage from './ui/pages/DocsPage.jsx'
import AuthPage from './ui/pages/AuthPage.jsx'
import PublicCarPage from './ui/pages/PublicCarPage.jsx'
import RequestsPage from './ui/pages/RequestsPage.jsx'

function RequireAuth({ children }) {
  const loc = useLocation()
  if (isAuthed()) return children
  return <Navigate to="/auth" replace state={{ from: loc.pathname }} />
}

export default function App() {
  return (
    <div className="app">
      <TopNav />
      <main className="main">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route
            path="/cars"
            element={
              <RequireAuth>
                <MarketPage />
              </RequireAuth>
            }
          />
          <Route path="/market" element={<Navigate to="/cars" replace />} />
          <Route
            path="/create"
            element={
              <RequireAuth>
                <CarEditPage mode="create" />
              </RequireAuth>
            }
          />
          <Route
            path="/car/:id"
            element={
              <RequireAuth>
                <CarPage />
              </RequireAuth>
            }
          />
          <Route
            path="/car/:id/edit"
            element={
              <RequireAuth>
                <CarEditPage mode="edit" />
              </RequireAuth>
            }
          />
          <Route
            path="/car/:id/history"
            element={
              <RequireAuth>
                <HistoryPage />
              </RequireAuth>
            }
          />
          <Route
            path="/car/:id/docs"
            element={
              <RequireAuth>
                <DocsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/requests"
            element={
              <RequireAuth>
                <RequestsPage />
              </RequireAuth>
            }
          />
          <Route path="/share/:token" element={<PublicCarPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer">
        <span>Прототип. Данные хранятся локально в браузере.</span>
      </footer>
    </div>
  )
}
