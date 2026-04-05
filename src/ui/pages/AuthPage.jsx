import { Link, Navigate, useLocation } from 'react-router-dom'
import { Card, ServiceHint } from '../components.jsx'
import { hasDetailingSession, hasOwnerSession } from '../auth.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'

export default function AuthPage() {
  const loc = useLocation()
  const from = loc.state?.from || '/'
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
            <p className="authSplit__tagline" style={{ margin: 0 }}>
              Вход в сервис
            </p>
            <ServiceHint scopeId="auth-hub-hint" variant="compact" label="Справка: вход и данные">
              <p className="serviceHint__panelText">
                Выберите роль: владелец или партнёр (детейлинг / СТО). Сессия хранится в браузере; выход и смена аккаунта — через меню в
                шапке после входа.
              </p>
            </ServiceHint>
          </div>
          <p className="muted authHub__intro">Выберите роль: владелец или партнёрская сеть (детейлинг / СТО).</p>
          <ul className="authSplit__benefits">
            <li>История работ и визитов по авто в одном месте — с пробегом, фото и документами.</li>
            <li>Гараж владельца и кабинет сервиса дополняют друг друга: прозрачность для клиента и порядок в работе.</li>
            <li>Публичная ссылка на историю — без выдачи доступа к личному кабинету.</li>
          </ul>
        </div>

        <div className="authHub__actions authSplit__formCol">
          <Card className="card pad authSplit__formCard authHub__card">
            <p className="muted small authHub__cardTitle" style={{ margin: '0 0 14px' }}>
              Выберите роль
            </p>
            <div className="authHub">
              <Link className="btn authHub__btn authHub__btn--neutral" to="/auth/owner" state={{ from }}>
                Мой гараж
              </Link>
              <Link className="btn authHub__btn authHub__btn--accent" to="/auth/partner" state={{ from }}>
                Войти в кабинет
              </Link>
            </div>
            <div id="auth-hub-card-hint" className="row gap wrap" style={{ alignItems: 'center', marginTop: 14 }}>
              <div className="cardTitle" style={{ margin: 0 }}>
                Дальше
              </div>
              <ServiceHint scopeId="auth-hub-card-hint" variant="compact" label="Справка: выбор роли">
                <p className="serviceHint__panelText">
                  Партнёрам: на следующем шаге — вход или регистрация. Услуги детейлинга и ТО задаются при первой настройке
                  лендинга.
                </p>
              </ServiceHint>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
