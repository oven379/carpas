import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CabinetRouteSeo } from './seo/CabinetRouteSeo.jsx'
import { lazy, Suspense, useEffect } from 'react'
import './App.css'
import { PageLoadSpinner, TopNav } from './ui/components.jsx'
import AdminPanelGuard from './ui/AdminPanelGuard.jsx'
import DetailingOnboardingGate from './ui/DetailingOnboardingGate.jsx'
import FooterSupport from './ui/FooterSupport.jsx'
import DevHud from './ui/DevHud.jsx'
import { isAuthed } from './ui/auth.js'
import { refreshAllClientData } from './ui/useRepo.js'
import { isNativeApp } from './lib/nativePlatform.js'
import OwnerAuthPage from './ui/pages/OwnerAuthPage.jsx'
import CookieBanner from './ui/CookieBanner.jsx'

/** Гостевой маркетинг на `/about` и `/for-detailing` — без общей шапки приложения. */
function guestMarketingSoloPath(pathname) {
  return pathname === '/about' || pathname === '/for-detailing'
}

const AboutPage = lazy(() => import('./ui/pages/AboutPage.jsx'))
const OwnersSeoPage = lazy(() => import('./ui/pages/OwnersSeoPage.jsx'))
const BusinessSeoPage = lazy(() => import('./ui/pages/BusinessSeoPage.jsx'))
const NotificationsPage = lazy(() => import('./ui/pages/NotificationsPage.jsx'))
const CarPage = lazy(() => import('./ui/pages/CarPage.jsx'))
const CarEditPage = lazy(() => import('./ui/pages/CarEditPage.jsx'))
const HistoryPage = lazy(() => import('./ui/pages/HistoryPage.jsx'))
const DocsPage = lazy(() => import('./ui/pages/DocsPage.jsx'))
const AuthPage = lazy(() => import('./ui/pages/AuthPage.jsx'))
const PartnerLoginPage = lazy(() => import('./ui/pages/PartnerLoginPage.jsx'))
const PartnerApplyPage = lazy(() => import('./ui/pages/PartnerApplyPage.jsx'))
const PublicCarPage = lazy(() => import('./ui/pages/PublicCarPage.jsx'))
const RequestsPage = lazy(() => import('./ui/pages/RequestsPage.jsx'))
const DetailingSettingsPage = lazy(() => import('./ui/pages/DetailingSettingsPage.jsx'))
const DetailingClientsPage = lazy(() => import('./ui/pages/DetailingClientsPage.jsx'))
const PublicDetailingPage = lazy(() => import('./ui/pages/PublicDetailingPage.jsx'))
const OwnerGaragePage = lazy(() => import('./ui/pages/OwnerGaragePage.jsx'))
const GarageSettingsPage = lazy(() => import('./ui/pages/GarageSettingsPage.jsx'))
const AdminLoginPage = lazy(() => import('./ui/pages/AdminLoginPage.jsx'))
const AdminPanelPage = lazy(() => import('./ui/pages/AdminPanelPage.jsx'))
const PolicyPage = lazy(() => import('./ui/pages/PolicyPage.jsx'))
const TermsPage = lazy(() => import('./ui/pages/TermsPage.jsx'))
const DetOfferPage = lazy(() => import('./ui/pages/DetOfferPage.jsx'))

function RouteFallback() {
  return (
    <div className="routeFallback muted">
      <PageLoadSpinner size="page" />
    </div>
  )
}

function RequireAuth({ children }) {
  const loc = useLocation()
  if (!isAuthed()) {
    const from = `${loc.pathname}${loc.search}`
    const authPath = isNativeApp() ? '/auth/owner' : '/auth'
    return <Navigate to={authPath} replace state={{ from }} />
  }
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
  const loc = useLocation()
  const adminSolo =
    loc.pathname === '/admin/379team' || loc.pathname === '/admin/panel'
  const guestMarketingChrome = guestMarketingSoloPath(loc.pathname)
  const nativeAuthChrome = isNativeApp() && loc.pathname.startsWith('/auth')
  const soloChrome = guestMarketingChrome || adminSolo || nativeAuthChrome

  return (
    <div className={`app${adminSolo ? ' app--adminSolo' : ''}`}>
      <DevHud />
      <SyncClientDataOnTabReturn />
      {soloChrome ? null : <TopNav />}
      <main
        className={`main${guestMarketingChrome ? ' main--aboutLanding' : ''}${adminSolo ? ' main--adminSolo' : ''}${nativeAuthChrome ? ' main--nativeAuth' : ''}`}
      >
        <ScrollToTopOnRouteChange />
        <CabinetRouteSeo />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Navigate to="/auth" replace />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/owners" element={<OwnersSeoPage />} />
            <Route path="/business" element={<BusinessSeoPage />} />
            <Route path="/notifications" element={<NotificationsPage />} />
            <Route path="/admin/preview" element={<Navigate to="/admin/379team" replace />} />
            <Route path="/admin/379team" element={<AdminLoginPage />} />
            <Route
              path="/admin/panel"
              element={
                <AdminPanelGuard>
                  <AdminPanelPage />
                </AdminPanelGuard>
              }
            />
            <Route path="/cars" element={<Navigate to="/garage" replace />} />
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
            <Route path="/market" element={<Navigate to="/garage" replace />} />
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
              element={<Navigate to="/detailing/clients" replace />}
            />
            <Route
              path="/detailing/clients"
              element={
                <RequireAuth>
                  <DetailingClientsPage />
                </RequireAuth>
              }
            />
            <Route path="/d/:id" element={<PublicDetailingPage />} />
            <Route path="/g/:slug" element={<Navigate to="/" replace />} />
            <Route path="/share/:token" element={<PublicCarPage />} />
            <Route path="/for-detailing" element={<DetOfferPage />} />
            <Route path="/policy" element={<PolicyPage />} />
            <Route path="/terms" element={<TermsPage />} />
            <Route path="/auth" element={isNativeApp() ? <Navigate to="/auth/owner" replace /> : <AuthPage />} />
            <Route path="/auth/owner" element={<OwnerAuthPage />} />
            <Route path="/auth/partner/apply" element={<PartnerApplyPage />} />
            <Route path="/auth/partner" element={<PartnerLoginPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
      {soloChrome ? null : (
        <footer className="footer">
          <FooterSupport />
        </footer>
      )}
      {isNativeApp() ? null : <CookieBanner />}
    </div>
  )
}
