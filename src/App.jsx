import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import './App.css'
import { TopNav } from './ui/components.jsx'
import FooterSupport from './ui/FooterSupport.jsx'
import { isAuthed } from './ui/auth.js'
import HomePage from './ui/pages/HomePage.jsx'
import MarketPage from './ui/pages/MarketPage.jsx'
import CarPage from './ui/pages/CarPage.jsx'
import CarEditPage from './ui/pages/CarEditPage.jsx'
import HistoryPage from './ui/pages/HistoryPage.jsx'
import DocsPage from './ui/pages/DocsPage.jsx'
import AuthPage from './ui/pages/AuthPage.jsx'
import OwnerAuthPage from './ui/pages/OwnerAuthPage.jsx'
import PartnerLoginPage from './ui/pages/PartnerLoginPage.jsx'
import PartnerApplyPage from './ui/pages/PartnerApplyPage.jsx'
import PublicCarPage from './ui/pages/PublicCarPage.jsx'
import RequestsPage from './ui/pages/RequestsPage.jsx'
import DetailingSettingsPage from './ui/pages/DetailingSettingsPage.jsx'
import DetailingDashboardPage from './ui/pages/DetailingDashboardPage.jsx'

function RequireAuth({ children }) {
  const loc = useLocation()
  if (isAuthed()) return children
  return <Navigate to="/auth" replace state={{ from: loc.pathname }} />
}

function ScrollToTopOnRouteChange() {
  const loc = useLocation()
  useEffect(() => {
    try {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    } catch {
      window.scrollTo(0, 0)
    }
  }, [loc.pathname])
  return null
}

export default function App() {
  return (
    <div className="app">
      <TopNav />
      <main className="main">
        <ScrollToTopOnRouteChange />
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
          <Route
            path="/detailing/settings"
            element={
              <RequireAuth>
                <DetailingSettingsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/detailing"
            element={
              <RequireAuth>
                <DetailingDashboardPage />
              </RequireAuth>
            }
          />
          <Route path="/share/:token" element={<PublicCarPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/owner" element={<OwnerAuthPage />} />
          <Route path="/auth/partner/apply" element={<PartnerApplyPage />} />
          <Route path="/auth/partner" element={<PartnerLoginPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <footer className="footer">
        <span className="footer__note">Прототип. Данные хранятся локально в браузере.</span>
        <FooterSupport />
      </footer>
    </div>
  )
}
