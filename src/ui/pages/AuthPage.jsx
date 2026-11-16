import { Link, Navigate, useLocation } from 'react-router-dom'
import { PartnerAuthLink } from '../../about-landing/PartnerAuthLink.tsx'
import { BackNav, Card } from '../components.jsx'
import { hasDetailingSession, hasOwnerSession, safeAuthReturnPath } from '../auth.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'

export default function AuthPage() {
  const loc = useLocation()
  const from = safeAuthReturnPath(loc.state?.from) || '/'
  const { detailing } = useDetailing()

  if (hasOwnerSession()) return <Navigate to="/garage" replace />
  if (hasDetailingSession()) {
    if (detailingOnboardingPending('detailing', detailing)) return <Navigate to="/detailing/landing" replace />
    return <Navigate to="/detailing" replace />
  }

  return (
    <div className="container authPage">
      <div className="authSplit authSplit--hub">
        <div className="authHub__info authSplit__lede">
          <div id="auth-hub-hint" className="row gap wrap" style={{ alignItems: 'center', marginBottom: 8 }}>
            <BackNav to="/" title="На главную" />
            <p className="authSplit__tagline" style={{ margin: 0 }}>
              Вход в сервис
            </p>
          </div>
          <p className="muted authHub__intro">
            Выберите роль ниже: владелец или сервис (детейлинг / СТО). У каждой роли — свой кабинет.
          </p>
          <ul className="authSplit__benefits">
            <li>История работ и визитов по авто в одном месте — с пробегом, фото и документами.</li>
            <li>Гараж владельца и кабинет сервиса дополняют друг друга: прозрачность для клиента и порядок в работе.</li>
            <li>Публичная ссылка на историю — без выдачи доступа к личному кабинету.</li>
          </ul>
        </div>

        <div className="authHub__actions authSplit__formCol">
          <Card className="card pad authSplit__formCard authHub__card">
            <p className="muted small authHub__cardTitle" style={{ margin: '0 0 14px' }}>
              Кто входит
            </p>
            <div className="authHub authHub--roleRows">
              <div className="authHub__roleRow">
                <Link className="btn authHub__btn authHub__btn--neutral authHub__btn--role" to="/auth/owner" state={{ from }}>
                  Я владелец авто
                </Link>
              </div>
              <div className="authHub__roleRow">
                <PartnerAuthLink className="btn authHub__btn authHub__btn--accent authHub__btn--role" to="/auth/partner" state={{ from }}>
                  Сервис (детейлинг / СТО)
                </PartnerAuthLink>
              </div>
            </div>
            <p className="muted small" style={{ margin: '14px 0 0', lineHeight: 1.45 }}>
              Забыли пароль — на экране входа владельца или партнёра откройте «Забыли пароль?» и укажите почту аккаунта. Смена пароля
              из кабинета — в настройках гаража или лендинга.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
