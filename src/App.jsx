import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CabinetRouteSeo } from './seo/CabinetRouteSeo.jsx'
import { lazy, Suspense, useEffect } from 'react'
import './App.css'
import { PageLoadSpinner, TopNav } from './ui/components.jsx'
import DetailingOnboardingGate from './ui/DetailingOnboardingGate.jsx'
import FooterSupport from './ui/FooterSupport.jsx'
import { isAuthed } from './ui/auth.js'
import { refreshAllClientData } from './ui/useRepo.js'

const HomePage = lazy(() => import('./ui/pages/HomePage.jsx'))
const MarketPage = lazy(() => import('./ui/pages/MarketPage.jsx'))
const CarPage = lazy(() => import('./ui/pages/CarPage.jsx'))
const CarEditPage = lazy(() => import('./ui/pages/CarEditPage.jsx'))
const HistoryPage = lazy(() => import('./ui/pages/HistoryPage.jsx'))
const DocsPage = lazy(() => import('./ui/pages/DocsPage.jsx'))
const AuthPage = lazy(() => import('./ui/pages/AuthPage.jsx'))
const OwnerAuthPage = lazy(() => import('./ui/pages/OwnerAuthPage.jsx'))
const PartnerLoginPage = lazy(() => import('./ui/pages/PartnerLoginPage.jsx'))
const PartnerApplyPage = lazy(() => import('./ui/pages/PartnerApplyPage.jsx'))
const PublicCarPage = lazy(() => import('./ui/pages/PublicCarPage.jsx'))
const RequestsPage = lazy(() => import('./ui/pages/RequestsPage.jsx'))
const DetailingSettingsPage = lazy(() => import('./ui/pages/DetailingSettingsPage.jsx'))
const DetailingDashboardPage = lazy(() => import('./ui/pages/DetailingDashboardPage.jsx'))
const PublicDetailingPage = lazy(() => import('./ui/pages/PublicDetailingPage.jsx'))
const OwnerGaragePage = lazy(() => import('./ui/pages/OwnerGaragePage.jsx'))
const GarageSettingsPage = lazy(() => import('./ui/pages/GarageSettingsPage.jsx'))
const PublicGaragePage = lazy(() => import('./ui/pages/PublicGaragePage.jsx'))

function RouteFallback() {
  return (
    <div className="routeFallback muted">
      <PageLoadSpinner size="page" />
    </div>
  )
}

function RequireAuth({ children }) {
  const loc = useLocation()
  if (!isAuthed()) return <Navigate to="/auth" replace state={{ from: loc.pathname }} />
  return <DetailingOnboardingGate>{children}</DetailingOnboardingGate>
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

/** После возврата на вкладку — тот же сброс кэша, что раньше делала кнопка «Обновить данные» (с троттлингом). */
function SyncClientDataOnTabReturn() {
  useEffect(() => {
    let wasHidden = false
    let lastRun = 0
    const throttleMs = 45_000
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        wasHidden = true
        return
      }
      if (document.visibilityState !== 'visible' || !wasHidden) return
      wasHidden = false
      if (!isAuthed()) return
      const n = Date.now()
      if (n - lastRun < throttleMs) return
      lastRun = n
      refreshAllClientData()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])
  return null
}

export default function App() {
  return (
    <div className="app">
      <SyncClientDataOnTabReturn />
      <TopNav />
      <main className="main">
        <ScrollToTopOnRouteChange />
        <CabinetRouteSeo />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/about" element={<HomePage />} />
            <Route
              path="/cars"
              element={
                <RequireAuth>
                  <MarketPage />
                </RequireAuth>
              }
            />
            <Route
              path="/garage"
              element={
                <RequireAuth>
                  <OwnerGaragePage />
                </RequireAuth>
              }
            />
            <Route
              path="/garage/settings"
              element={
                <RequireAuth>
                  <GarageSettingsPage />
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
              path="/detailing/landing"
              element={
                <RequireAuth>
                  <DetailingSettingsPage />
                </RequireAuth>
              }
            />
            <Route path="/detailing/settings" element={<Navigate to="/detailing/landing" replace />} />
            <Route
              path="/detailing"
              element={
                <RequireAuth>
                  <DetailingDashboardPage />
                </RequireAuth>
              }
            />
            <Route path="/d/:id" element={<PublicDetailingPage />} />
            <Route path="/g/:slug" element={<PublicGaragePage />} />
            <Route path="/share/:token" element={<PublicCarPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/auth/owner" element={<OwnerAuthPage />} />
            <Route path="/auth/partner/apply" element={<PartnerApplyPage />} />
            <Route path="/auth/partner" element={<PartnerLoginPage />} />
            <Route path="*" element={<Navigate to="/auth" replace />} />
          </Routes>
        </Suspense>
      </main>
      <footer className="footer">
        <FooterSupport />
      </footer>
    </div>
  )
}
