import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import './index.css'
import './App.css'
import App from './App.jsx'
import RootErrorBoundary from './ui/RootErrorBoundary.jsx'
import { DetailingSessionProvider } from './ui/useDetailing.js'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Элемент #root не найден в index.html')
}

createRoot(rootEl).render(
  <StrictMode>
    <HelmetProvider>
      <BrowserRouter>
        <DetailingSessionProvider>
          <RootErrorBoundary>
            <App />
          </RootErrorBoundary>
        </DetailingSessionProvider>
      </BrowserRouter>
    </HelmetProvider>
  </StrictMode>,
)
