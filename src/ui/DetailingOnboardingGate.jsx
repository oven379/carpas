import { Navigate, useLocation } from 'react-router-dom'
import { PageLoadSpinner } from './components.jsx'
import { useDetailing } from './useDetailing.js'

const LANDING_PATH = '/detailing/landing'

/**
 * Партнёр с profileCompleted === false не попадает в кабинет и к авто, пока не сохранит лендинг.
 * Владельцы и гости не затрагиваются.
 */
export default function DetailingOnboardingGate({ children }) {
  const loc = useLocation()
  const { mode, detailing, loading } = useDetailing()
  const path = loc.pathname

  if (mode !== 'detailing') return children
  if (path === LANDING_PATH || path.startsWith(`${LANDING_PATH}/`)) return children

  if (loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }

  if (detailing && detailing.profileCompleted === false) {
    return <Navigate to={LANDING_PATH} replace state={{ from: path }} />
  }

  return children
}
