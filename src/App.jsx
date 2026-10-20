import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { CabinetRouteSeo } from './seo/CabinetRouteSeo.jsx'
import { lazy, Suspense, useEffect, useRef } from 'react'
import { getApiBaseUrl } from './api/client.js'
import './App.css'
import { PageLoadSpinner, TopNav } from './ui/components.jsx'
import AdminPanelGuard from './ui/AdminPanelGuard.jsx'
import DetailingOnboardingGate from './ui/DetailingOnboardingGate.jsx'
import FooterSupport from './ui/FooterSupport.jsx'
import DevHud from './ui/DevHud.jsx'
import { isAuthed } from './ui/auth.js'
import { refreshAllClientData } from './ui/useRepo.js'
import { isNativeApp } from './lib/nativePlatform.js'
import CookieBanner from './ui/CookieBanner.jsx'
import { ToastProvider } from './ui/toast.jsx'
import HomePage from './ui/pages/HomePage.jsx'
import OwnersPage from './ui/pages/OwnersPage.jsx'
import BusinessSeoPage from './ui/pages/BusinessSeoPage.jsx'
import BusinessGeoPage from './ui/pages/BusinessGeoPage.jsx'
const PitchPage = lazyRetry(() => import('./ui/pages/PitchPage.jsx'))
const BlogIndexPage = lazyRetry(() => import('./blog/BlogIndexPage.jsx'))
const BlogArticlePage = lazyRetry(() => import('./blog/BlogArticlePage.jsx'))
const NotificationsPage = lazyRetry(() => import('./ui/pages/NotificationsPage.jsx'))
const CarPage = lazyRetry(() => import('./ui/pages/CarPage.jsx'))
const CarEditPage = lazyRetry(() => import('./ui/pages/CarEditPage.jsx'))
const HistoryPage = lazyRetry(() => import('./ui/pages/HistoryPage.jsx'))
const DocsPage = lazyRetry(() => import('./ui/pages/DocsPage.jsx'))
const AuthPage = lazyRetry(() => import('./ui/pages/AuthPage.jsx'))
const OwnerAuthPage = lazyRetry(() => import('./ui/pages/OwnerAuthPage.jsx'))
const PartnerLoginPage = lazyRetry(() => import('./ui/pages/PartnerLoginPage.jsx'))
const PartnerApplyPage = lazyRetry(() => import('./ui/pages/PartnerApplyPage.jsx'))
const PublicCarPage = lazyRetry(() => import('./ui/pages/PublicCarPage.jsx'))
const RequestsPage = lazyRetry(() => import('./ui/pages/RequestsPage.jsx'))
const DetailingSettingsPage = lazyRetry(() => import('./ui/pages/DetailingSettingsPage.jsx'))
const DetailingClientsPage = lazyRetry(() => import('./ui/pages/DetailingClientsPage.jsx'))
const TechCardsPage = lazyRetry(() => import('./detailing/TechCardsPage.jsx'))
const TechCardPage = lazyRetry(() => import('./detailing/TechCardPage.jsx'))
const PublicDetailingPage = lazyRetry(() => import('./ui/pages/PublicDetailingPage.jsx'))
const OwnerGaragePage = lazyRetry(() => import('./ui/pages/OwnerGaragePage.jsx'))
const GarageSettingsPage = lazyRetry(() => import('./ui/pages/GarageSettingsPage.jsx'))
const AdminLoginPage = lazyRetry(() => import('./ui/pages/AdminLoginPage.jsx'))
const AdminPanelPage = lazyRetry(() => import('./ui/pages/AdminPanelPage.jsx'))
const PolicyPage = lazyRetry(() => import('./ui/pages/PolicyPage.jsx'))
const TermsPage = lazyRetry(() => import('./ui/pages/TermsPage.jsx'))

/**
 * React.lazy с повтором: после деплоя старые хэшированные чанки исчезают с сервера, и открытая вкладка
 * падает на ChunkLoadError. Раз в 10 секунд перезагружаем страницу за свежим index.html; если не помогло — ошибка
 * уходит в RootErrorBoundary.
 */
function lazyRetry(factory) {
  return lazy(() =>
    factory().catch((err) => {
      try {
        const KEY = 'carpas.chunkReloadAt'
        const last = Number(sessionStorage.getItem(KEY) || 0)
        if (Date.now() - last > 10_000) {
          sessionStorage.setItem(KEY, String(Date.now()))
          window.location.reload()
          return new Promise(() => {})
        }
      } catch {
        /* sessionStorage недоступен (приватный режим) — просто пробрасываем ошибку */
      }
      throw err
    }),
  )
}

/** Заглушка на время подгрузки чанка страницы. */
function RouteFallback() {
  return (
    <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
      <PageLoadSpinner />
    </div>
  )
}

/** Гостевой маркетинг на `/`, `/owners`, `/business` и `/pitch` — без общей шапки приложения. */
function guestMarketingSoloPath(pathname) {
  return (
    pathname === '/' ||
    pathname === '/owners' ||
    pathname === '/business' ||
    pathname.startsWith('/business/') ||
    pathname === '/pitch' ||
    pathname === '/blog' ||
    pathname.startsWith('/blog/')
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

/** ID счётчика Яндекс.Метрики (счётчик подключён в index.html). */
const YM_COUNTER_ID = 113104738

/** SPA-переходы: базовый счётчик считает только первую загрузку, поэтому на смену маршрута шлём hit. */
function MetrikaRouteTracker() {
  const loc = useLocation()
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    if (typeof window.ym === 'function') {
      window.ym(YM_COUNTER_ID, 'hit', window.location.href, { referer: document.referrer })
    }
  }, [loc.pathname, loc.search])
  return null
}

function BackendHealthCheck() {
  useEffect(() => {
    // В нативном приложении перезагрузка вебвью даёт чёрный экран — восстановление связи там на стороне приложения.
    if (isNativeApp()) return undefined

    const INTERVAL_MS = 30_000
    const TIMEOUT_MS = 10_000
    const MAX_FAILURES = 3
    let failures = 0
    let stopped = false

    /** Пользователь что-то вводит — перезагрузку откладываем, чтобы не стереть заполняемую форму. */
    const isEditing = () => {
      const el = document.activeElement
      if (!el) return false
      const tag = el.tagName
      return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable === true
    }

    async function check() {
      if (stopped || document.visibilityState === 'hidden') return
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
      let ok = false
      try {
        const res = await fetch(`${getApiBaseUrl()}/health`, { signal: ctrl.signal, cache: 'no-store' })
        ok = res.ok
      } catch {
        ok = false
      } finally {
        clearTimeout(timer)
      }
      if (ok) {
        failures = 0
        return
      }
      failures += 1
      // Перезагружаем только после нескольких неудач ПОДРЯД и только когда пользователь ничего не вводит,
      // чтобы случайный сбой мобильной сети не стирал форму и не показывал чёрный экран.
      if (failures >= MAX_FAILURES && !isEditing()) {
        failures = 0
        window.location.reload()
      }
    }

    // Первую проверку не делаем сразу при открытии (на медленной сети это вызывало мгновенную перезагрузку).
    const id = setInterval(check, INTERVAL_MS)
    return () => {
      stopped = true
      clearInterval(id)
    }
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
        <MetrikaRouteTracker />
        <CabinetRouteSeo />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={isNativeApp() ? <Navigate to="/auth/owner" replace /> : <HomePage />} />
            <Route path="/owners" element={<OwnersPage />} />
            <Route path="/about" element={<Navigate to="/" replace />} />
            <Route path="/business" element={<BusinessSeoPage />} />
            <Route path="/business/:city" element={<BusinessGeoPage />} />
            <Route path="/pitch" element={<PitchPage />} />
            <Route path="/blog" element={<BlogIndexPage />} />
            <Route path="/blog/:slug" element={<BlogArticlePage />} />
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
            <Route
              path="/detailing/tech-cards"
              element={
                <RequireAuth>
                  <TechCardsPage />
                </RequireAuth>
              }
            />
            <Route
              path="/detailing/tech-cards/:slug"
              element={
                <RequireAuth>
                  <TechCardPage />
                </RequireAuth>
              }
            />
            <Route path="/d/:id" element={<PublicDetailingPage />} />
            <Route path="/g/:slug" element={<Navigate to="/" replace />} />
            <Route path="/share/:token" element={<PublicCarPage />} />
            <Route path="/for-detailing" element={<Navigate to="/business" replace />} />
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
    </ToastProvider>
  )
}
