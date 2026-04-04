import { Link, Navigate, useLocation } from 'react-router-dom'
import { Card } from '../components.jsx'
import Logo from '../Logo.jsx'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'

export default function AuthPage() {
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
        <div className="authHub__brand authPage__head authPage__head--splitAside">
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <div className="brandTitle">
              <h1 className="h1 authHub__logoHeading" aria-label="КарПас" style={{ margin: 0 }}>
                <Logo size={34} />
              </h1>
              <div className="brandTagline">История Вашего автомобиля</div>
            </div>
          </div>
        </div>

        <div className="authHub__info authSplit__lede">
          <p className="authSplit__tagline">Вход в сервис</p>
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
              Выберите способ входа
            </p>
            <div className="authHub">
              <Link className="btn authHub__btn authHub__btn--neutral" to="/auth/owner" state={{ from }}>
                Мой гараж
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
    </div>
  )
}
