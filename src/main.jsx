import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import './App.css'
import App from './App.jsx'
import RootErrorBoundary from './ui/RootErrorBoundary.jsx'
import { DetailingSessionProvider } from './ui/useDetailing.js'
import { SupportProvider } from './ui/support/SupportHub.jsx'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Элемент #root не найден в index.html')
}

createRoot(rootEl).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <DetailingSessionProvider>
          <SupportProvider>
            <RootErrorBoundary>
              <App />
            </RootErrorBoundary>
          </SupportProvider>
        </DetailingSessionProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
