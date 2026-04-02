import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './App.css'
import App from './App.jsx'
import RootErrorBoundary from './ui/RootErrorBoundary.jsx'

const rootEl = document.getElementById('root')
if (!rootEl) {
  throw new Error('Элемент #root не найден в index.html')
}

createRoot(rootEl).render(
  <StrictMode>
    <BrowserRouter>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </BrowserRouter>
  </StrictMode>,
)
