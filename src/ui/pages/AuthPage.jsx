import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { LandingAuthDialog } from '../../about-landing/LandingAuthDialog.jsx'
import { LandingAuthModal } from '../../about-landing/LandingAuthModal.jsx'
import { PartnerAuthLink } from '../../about-landing/PartnerAuthLink.tsx'
import { hasDetailingSession, hasOwnerSession, safeAuthReturnPath } from '../auth.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'

export default function AuthPage() {
  const loc = useLocation()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const from = safeAuthReturnPath(loc.state?.from)
  const { detailing } = useDetailing()
  const ownerEntry = /^\/auth\/owner\/?$/i.test(loc.pathname)

  if (hasOwnerSession()) {
    return <Navigate to={ownerEntry && from && !from.startsWith('/auth') ? from : '/garage'} replace />
  }
  if (hasDetailingSession()) {
    return <Navigate to={detailingOnboardingPending('detailing', detailing) ? '/detailing/landing' : '/detailing'} replace />
  }

  if (ownerEntry) {
    const mode = params.get('register') === '1' || params.get('mode') === 'register' ? 'register' : 'login'
    return (
      <LandingAuthDialog
        key={mode}
        initialMode={mode}
        routeManaged
        onClose={() => navigate(loc.state?.roleChosen ? '/auth' : '/', { replace: true, state: { from } })}
      />
    )
  }

  return (
    <LandingAuthModal
      title="Вход в КарПас"
      description="Выберите, в какой кабинет хотите войти."
      onClose={() => navigate('/', { replace: true })}
    >
      <div className="landingAuthDialog__form">
        <Link className="btn" data-variant="primary" to="/auth/owner" replace state={{ from, roleChosen: true }}>
          Я владелец авто
        </Link>
        <PartnerAuthLink className="btn" data-variant="outline" to="/auth/partner" state={{ from }}>
          Сервис / детейлинг / СТО
        </PartnerAuthLink>
      </div>
    </LandingAuthModal>
  )
}
