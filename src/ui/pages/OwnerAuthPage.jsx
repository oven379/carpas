import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { BackNav, Button, Card, Field, Input } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { clearSession, setSessionOwner } from '../auth.js'
import { OWNER_DEMO_PASSWORD } from '../../lib/format.js'

export default function OwnerAuthPage() {
  const r = useRepo()
  const [ownEmail, setOwnEmail] = useState('')
  const [ownPassword, setOwnPassword] = useState(OWNER_DEMO_PASSWORD)
  const [ownName, setOwnName] = useState('')
  const [ownPhone, setOwnPhone] = useState('')
  const ownEmailRef = useRef(null)
  const ownPasswordRef = useRef(null)
  const nav = useNavigate()
  const loc = useLocation()
  const f = loc.state?.from
  const nextAfterAuth =
    typeof f === 'string' && f.startsWith('/') && !f.startsWith('/auth') ? (f === '/' ? '/cars' : f) : '/cars'

  return (
    <div className="container authPage">
      <div className="row spread gap authPage__head">
        <div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav />
            <h1 className="h1" style={{ margin: 0 }}>
              Мой гараж
            </h1>
          </div>
          <p className="muted">
            Вход или регистрация владельца. В демо пароль для всех: <strong>{OWNER_DEMO_PASSWORD}</strong>. Данные — в этом
            браузере.
          </p>
        </div>
        <div className="row gap wrap" style={{ justifyContent: 'flex-end', alignItems: 'center' }}>
          <Link className="btn" data-variant="ghost" to="/">
            На главную
          </Link>
        </div>
      </div>

      <div className="authPage__single">
        <Card className="card pad">
          <div className="formGrid authFormGrid authFormGrid--owner">
            <Field className="field--full" label="Почта">
              <Input
                ref={ownEmailRef}
                className="input"
                type="email"
                autoComplete="username"
                value={ownEmail}
                onChange={(e) => setOwnEmail(e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field className="field--full" label="Пароль">
              <Input
                ref={ownPasswordRef}
                className="input mono"
                type="password"
                autoComplete="current-password"
                value={ownPassword}
                onChange={(e) => setOwnPassword(e.target.value)}
                placeholder={OWNER_DEMO_PASSWORD}
              />
            </Field>
            <Field className="field--full" label="Имя (необязательно)">
              <Input
                className="input"
                value={ownName}
                onChange={(e) => setOwnName(e.target.value)}
                placeholder="Например: Иван"
                autoComplete="name"
              />
            </Field>
            <Field className="field--full" label="Телефон (необязательно)">
              <Input
                className="input"
                value={ownPhone}
                onChange={(e) => setOwnPhone(e.target.value)}
                placeholder="+7 …"
                autoComplete="tel"
                inputMode="tel"
              />
            </Field>
          </div>
          <div className="row gap wrap authFormActions">
            <Button
              className="btn"
              variant="primary"
              onClick={() => {
                const em = (ownEmail || ownEmailRef.current?.value || '').trim()
                const pwd = (ownPassword || ownPasswordRef.current?.value || '').trim()
                if (!em || !pwd) {
                  alert('Укажите почту и пароль')
                  return
                }
                if (!r.loginOwner) {
                  alert('Вход владельца в этом режиме API не подключён. Используйте локальный демо-режим (без VITE_API_MODE=real).')
                  return
                }
                const res = r.loginOwner({ email: em, password: pwd })
                if (!res?.ok) {
                  const reason = res?.reason
                  if (reason === 'bad_password')
                    alert(`Неверный пароль. В демо для владельца всегда ${OWNER_DEMO_PASSWORD}.`)
                  else if (reason === 'not_found') alert('Нет учётной записи с такой почтой')
                  else if (reason === 'bad_credentials') alert('Укажите почту и пароль')
                  else alert('Не удалось войти')
                  return
                }
                setSessionOwner({ email: res.owner.email, name: res.owner.name, phone: res.owner.phone })
                invalidateRepo()
                nav(nextAfterAuth, { replace: true })
              }}
            >
              Войти
            </Button>
            <Button
              className="btn"
              variant="ghost"
              onClick={() => {
                const em = (ownEmail || ownEmailRef.current?.value || '').trim()
                const pwd = (ownPassword || ownPasswordRef.current?.value || '').trim()
                if (!em || !pwd) {
                  alert('Укажите почту и пароль')
                  return
                }
                if (!r.registerOwner) {
                  alert('Регистрация владельца в этом режиме API не подключена. Используйте локальный демо-режим.')
                  return
                }
                const res = r.registerOwner({ email: em, password: pwd, name: ownName, phone: ownPhone })
                if (!res?.ok) {
                  const reason = res?.reason
                  if (reason === 'email_taken') alert('Эта почта уже зарегистрирована')
                  else if (reason === 'bad_email') alert('Укажите почту')
                  else if (reason === 'bad_password')
                    alert(`В демо пароль владельца всегда ${OWNER_DEMO_PASSWORD}.`)
                  else alert('Не удалось зарегистрироваться')
                  return
                }
                setSessionOwner({ email: res.owner.email, name: res.owner.name, phone: res.owner.phone })
                invalidateRepo()
                nav(nextAfterAuth, { replace: true })
              }}
            >
              Зарегистрироваться
            </Button>
          </div>
        </Card>
      </div>

      <Card className="card pad authPage__single" style={{ marginTop: 16 }}>
        <h2 className="h2">Локальные данные в браузере</h2>
        <p className="muted small" style={{ marginBottom: 12 }}>
          Сброс удалит авто, историю, фото и заявки из локального хранилища и разлогинит. Полный сброс доступен и на экране{' '}
          <Link className="link" to="/auth">
            выбора входа
          </Link>
          .
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
