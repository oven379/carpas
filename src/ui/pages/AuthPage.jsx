import { Link, Navigate, useLocation } from 'react-router-dom'
import { Card, ServiceHint } from '../components.jsx'
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
            <p className="authSplit__tagline" style={{ margin: 0 }}>
              Вход в сервис
            </p>
            <ServiceHint scopeId="auth-hub-hint" variant="compact" label="Справка: вход и данные">
              <p className="serviceHint__panelText">
                Здесь выбирается роль перед входом. На этом устройстве вы остаётесь в аккаунте, пока не выйдете; смена
                аккаунта — через меню в шапке после входа.
              </p>
            </ServiceHint>
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
                <ServiceHint
                  scopeId="auth-role-owner-hint"
                  variant="compact"
                  label="Справка: кабинет владельца"
                >
                  <p className="serviceHint__panelText">
                    Гараж и карточки авто, своя история и документы, публичная ссылка на машину. Записи можно добавлять
                    самостоятельно; записи сервиса отображаются отдельно в общей ленте.
                  </p>
                </ServiceHint>
              </div>
              <div className="authHub__roleRow">
                <Link className="btn authHub__btn authHub__btn--accent authHub__btn--role" to="/auth/partner" state={{ from }}>
                  Сервис (детейлинг / СТО)
                </Link>
                <ServiceHint
                  scopeId="auth-role-partner-hint"
                  variant="compact"
                  label="Справка: кабинет сервиса"
                >
                  <p className="serviceHint__panelText">
                    Автомобили клиентов, визиты и фото, лендинг с услугами и контактами. Первый вход — настройка страницы
                    для клиентов; далее вход или регистрация партнёра.
                  </p>
                </ServiceHint>
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
