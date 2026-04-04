import { Link, Navigate, useLocation } from 'react-router-dom'
import { Card, ServiceHint } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { clearSession } from '../auth.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'

export default function AuthPage() {
  const r = useRepo()
  const loc = useLocation()
  const from = loc.state?.from || '/'
  const { mode, detailing, owner } = useDetailing()

  if (mode === 'owner' && owner?.email) return <Navigate to="/garage" replace />
  if (mode === 'detailing') {
    if (detailingOnboardingPending(mode, detailing)) return <Navigate to="/detailing/landing" replace />
    return <Navigate to="/detailing" replace />
  }

  return (
    <div className="container authPage">
      <div className="authSplit authSplit--hub">
        <div className="authHub__info authSplit__lede">
          <div id="auth-hub-hint" className="row gap wrap" style={{ alignItems: 'center', marginBottom: 8 }}>
            <h1 className="authSplit__tagline" style={{ margin: 0 }}>
              Вход в сервис
            </h1>
            <ServiceHint scopeId="auth-hub-hint" variant="compact" label="Справка: вход и данные">
              <p className="serviceHint__panelText">
                Выберите роль: владелец или партнёр (детейлинг / СТО). Данные этого устройства хранятся в браузере; при необходимости их
                можно сбросить — блок внизу страницы.
              </p>
            </ServiceHint>
          </div>
          <ul className="authSplit__benefits">
            <li>История работ и визитов по авто в одном месте — с пробегом, фото и документами.</li>
            <li>Гараж владельца и кабинет сервиса дополняют друг друга: прозрачность для клиента и порядок в работе.</li>
            <li>Публичная ссылка на историю — без выдачи доступа к личному кабинету.</li>
          </ul>
        </div>

        <div className="authHub__actions authSplit__formCol">
          <Card className="card pad authSplit__formCard authHub__card">
            <p className="muted small authHub__cardTitle" style={{ margin: '0 0 14px' }}>
              Выберите способ входа
            </p>
            <div className="authHub">
              <Link className="btn authHub__btn authHub__btn--neutral" to="/auth/owner" state={{ from }}>
                Гараж
              </Link>
              <Link className="btn authHub__btn authHub__btn--accent" to="/auth/partner" state={{ from }}>
                Партнёр
              </Link>
              <Link className="btn authHub__btn authHub__btn--cta" to="/auth/partner/apply" state={{ from }}>
                Стать партнёром
              </Link>
            </div>
          </Card>
        </div>
      </div>

      <Card className="card pad authPage__single" style={{ marginTop: 28 }}>
        <div id="auth-reset-hint" className="row gap wrap" style={{ alignItems: 'center', marginBottom: 12 }}>
          <h2 className="h2" style={{ margin: 0 }}>
            Локальные данные в браузере
          </h2>
          <ServiceHint scopeId="auth-reset-hint" variant="compact" label="Справка: сброс данных">
            <p className="serviceHint__panelText">
              Сброс удалит авто, историю, фото и заявки из памяти браузера на этом устройстве, подгрузит стартовый набор данных и завершит
              сессию входа.
            </p>
          </ServiceHint>
        </div>
        <button
          type="button"
          className="btn"
          data-variant="danger"
          onClick={() => {
            if (r.mode !== 'mock') {
              alert('Включён режим API: сброс локальных данных в браузере недоступен.')
              return
            }
            const ok = confirm(
              'Удалить все данные КарПас из этого браузера и восстановить начальный набор?\n\nСессия будет завершена.',
            )
            if (!ok) return
            r.resetLocalDemo()
            clearSession()
            invalidateRepo()
            window.location.assign('/about')
          }}
        >
          Сбросить локальные данные
        </button>
      </Card>
    </div>
  )
}
