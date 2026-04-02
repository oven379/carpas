import { Link, useLocation } from 'react-router-dom'
import { BackNav, Card } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { clearSession } from '../auth.js'

export default function AuthPage() {
  const r = useRepo()
  const loc = useLocation()
  const from = loc.state?.from || '/'

  return (
    <div className="container authPage">
      <div className="row spread gap authPage__head">
        <div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav />
            <h1 className="h1" style={{ margin: 0 }}>
              Вход
            </h1>
          </div>
          <p className="muted">Выберите, как вы заходите в КарПас.</p>
        </div>
        <Link className="btn" data-variant="ghost" to="/">
          На главную
        </Link>
      </div>

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

      <Card className="card pad authPage__single" style={{ marginTop: 28 }}>
        <h2 className="h2">Локальные данные в браузере</h2>
        <p className="muted small" style={{ marginBottom: 12 }}>
          В демо-режиме всё хранится в этом браузере. Сброс удалит авто, историю, фото и заявки из локального хранилища,
          затем снова подгрузит стартовый набор демо. Сессия входа будет сброшена.
        </p>
        <button
          type="button"
          className="btn"
          data-variant="danger"
          onClick={() => {
            if (r.mode !== 'mock') {
              alert('Подключён режим API: локальные демо-данные в браузере не используются.')
              return
            }
            const ok = confirm(
              'Удалить все данные КарПас из этого браузера и загрузить демо заново?\n\nВы будете разлогинены.',
            )
            if (!ok) return
            r.resetLocalDemo()
            clearSession()
            invalidateRepo()
            window.location.assign('/')
          }}
        >
          Сбросить демо-данные
        </button>
      </Card>
    </div>
  )
}
