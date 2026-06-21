import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { isNativeApp } from './lib/nativePlatform.js'
import './index.css'
import './App.css'
import App from './App.jsx'

clearTimeout(window.__appLoadTimer)
window.__cpLog = (tag, ...args) => {
  try { console.log(`[CP:${tag}]`, ...args) } catch {}
}
window.addEventListener('error', (e) => {
  console.error('[CP:error]', e.message, e.filename, e.lineno, e.colno, e.error)
})
window.addEventListener('unhandledrejection', (e) => {
  const r = e.reason
  console.error('[CP:unhandledrejection]', r?.message ?? r, r?.stack ?? '')
})
window.__cpLog('init', 'native=' + isNativeApp(), 'url=' + location.href)
import RootErrorBoundary from './ui/RootErrorBoundary.jsx'
import { DetailingSessionProvider } from './ui/useDetailing.js'
import { SupportProvider } from './ui/support/SupportHub.jsx'
import NativePushBridge from './ui/NativePushBridge.jsx'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Элемент #root не найден в index.html')
}

/** В нативной WebView History API иногда ведёт себя иначе — HashRouter стабильнее. */
const appInner = (
  <DetailingSessionProvider>
    <SupportProvider>
      <RootErrorBoundary>
        <NativePushBridge />
        <App />
      </RootErrorBoundary>
    </SupportProvider>
  </DetailingSessionProvider>
)

createRoot(rootEl).render(
  <StrictMode>
    <HelmetProvider>
      {isNativeApp() ? (
        <HashRouter>{appInner}</HashRouter>
      ) : (
        <BrowserRouter>{appInner}</BrowserRouter>
      )}
    </HelmetProvider>
  </StrictMode>,
)
