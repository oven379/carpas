import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, HashRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { Capacitor } from '@capacitor/core'
import './index.css'
import './App.css'
import App from './App.jsx'
import RootErrorBoundary from './ui/RootErrorBoundary.jsx'
import { DetailingSessionProvider } from './ui/useDetailing.js'
import { SupportProvider } from './ui/support/SupportHub.jsx'
import NativePushBridge from './ui/NativePushBridge.jsx'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Элемент #root не найден в index.html')
}

/** В WebView Capacitor History API иногда ведёт себя иначе — HashRouter стабильнее. */
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
      {Capacitor.isNativePlatform() ? (
        <HashRouter>{appInner}</HashRouter>
      ) : (
        <BrowserRouter>{appInner}</BrowserRouter>
      )}
    </HelmetProvider>
  </StrictMode>,
)
