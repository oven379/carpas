import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CabinetRouteSeo } from './seo/CabinetRouteSeo.jsx'
import { useEffect } from 'react'
import { getApiBaseUrl } from './api/client.js'
import './App.css'
import { TopNav } from './ui/components.jsx'
import AdminPanelGuard from './ui/AdminPanelGuard.jsx'
import DetailingOnboardingGate from './ui/DetailingOnboardingGate.jsx'
import FooterSupport from './ui/FooterSupport.jsx'
import DevHud from './ui/DevHud.jsx'
import { isAuthed } from './ui/auth.js'
import { refreshAllClientData } from './ui/useRepo.js'
import { isNativeApp } from './lib/nativePlatform.js'
import CookieBanner from './ui/CookieBanner.jsx'
import { ToastProvider } from './ui/toast.jsx'
import AboutPage from './ui/pages/AboutPage.jsx'
import OwnersSeoPage from './ui/pages/OwnersSeoPage.jsx'
import BusinessSeoPage from './ui/pages/BusinessSeoPage.jsx'
import NotificationsPage from './ui/pages/NotificationsPage.jsx'
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
import DetailingClientsPage from './ui/pages/DetailingClientsPage.jsx'
import PublicDetailingPage from './ui/pages/PublicDetailingPage.jsx'
import OwnerGaragePage from './ui/pages/OwnerGaragePage.jsx'
import GarageSettingsPage from './ui/pages/GarageSettingsPage.jsx'
import AdminLoginPage from './ui/pages/AdminLoginPage.jsx'
import AdminPanelPage from './ui/pages/AdminPanelPage.jsx'
import PolicyPage from './ui/pages/PolicyPage.jsx'
import TermsPage from './ui/pages/TermsPage.jsx'
import DetOfferPage from './ui/pages/DetOfferPage.jsx'

/** Гостевой маркетинг на `/about` и `/for-detailing` — без общей шапки приложения. */
function guestMarketingSoloPath(pathname) {
  return pathname === '/about' || pathname === '/for-detailing'
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

function BackendHealthCheck() {
  useEffect(() => {
    const INTERVAL_MS = 30_000
    const TIMEOUT_MS = 5_000

    async function check() {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
      try {
        await fetch(`${getApiBaseUrl()}/health`, { signal: ctrl.signal })
      } catch {
        window.location.reload()
      } finally {
        clearTimeout(timer)
      }
    }

    check()
    const id = setInterval(check, INTERVAL_MS)
    return () => clearInterval(id)
  }, [])
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
    <ToastProvider>
    <div className={`app${adminSolo ? ' app--adminSolo' : ''}`}>
      <DevHud />
      <SyncClientDataOnTabReturn />
      <BackendHealthCheck />
      {soloChrome ? null : <TopNav />}
      <main
        className={`main${guestMarketingChrome ? ' main--aboutLanding' : ''}${adminSolo ? ' main--adminSolo' : ''}${nativeAuthChrome ? ' main--nativeAuth' : ''}`}
      >
        <ScrollToTopOnRouteChange />
        <CabinetRouteSeo />
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
      </main>
      {soloChrome ? null : (
        <footer className="footer">
          <FooterSupport />
        </footer>
      )}
      {isNativeApp() ? null : <CookieBanner />}
    </div>
    </ToastProvider>
  )
}
