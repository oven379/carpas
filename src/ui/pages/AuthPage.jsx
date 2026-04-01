import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, Field, Input, Pill } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { clearSession, getSessionDetailingId, setSessionDetailingId, setSessionOwner } from '../auth.js'

function loginErrorMessage(reason) {
  if (reason === 'bad_password') return 'Неверный пароль'
  if (reason === 'not_found') return 'Нет учётной записи с такой почтой'
  if (reason === 'bad_credentials') return 'Укажите почту и пароль'
  return 'Не удалось войти'
}

function registerErrorMessage(code) {
  if (code === 'bad_email') return 'Укажите почту'
  if (code === 'bad_name') return 'Укажите название'
  if (code === 'bad_phone') return 'Укажите телефон'
  if (code === 'bad_password') return 'Укажите пароль'
  if (code === 'email_taken') return 'Эта почта уже зарегистрирована'
  return 'Не удалось зарегистрировать'
}

export default function AuthPage() {
  const r = useRepo()
  const currentId = getSessionDetailingId()
  const current = currentId ? r.getDetailing?.(currentId) : null
  const [ownEmail, setOwnEmail] = useState('')
  const [ownPassword, setOwnPassword] = useState('')

  const [email, setEmail] = useState('test@test')
  const [password, setPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')

  // На некоторых браузерах автозаполнение не триггерит onChange, поэтому держим refs.
  const ownEmailRef = useRef(null)
  const ownPasswordRef = useRef(null)
  const detEmailRef = useRef(null)
  const detPasswordRef = useRef(null)
  const nav = useNavigate()
  const loc = useLocation()
  const from = loc.state?.from || '/'

  return (
    <div className="container authPage">
      <div className="row spread gap authPage__head">
        <div>
          <h1 className="h1">Вход</h1>
          <p className="muted">
            Выберите роль: владелец (личный гараж) или партнёр‑детейлинг (ведение истории клиентов).
          </p>
        </div>
        <Link className="btn" data-variant="ghost" to="/">
          На главную
        </Link>
      </div>

      <div className="split authPage__split">
        <Card className="card pad">
          <h2 className="h2">Мой гараж</h2>
          <p className="muted small" style={{ marginBottom: 14 }}>
            Для владельцев: добавляйте свои авто и ведите личную историю. В прототипе пароль не
            проверяется — укажите почту и любой пароль (минимум 4 символа для регистрации).
          </p>
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
                placeholder="минимум 4 символа"
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
                setSessionOwner({ email: em.toLowerCase() })
                invalidateRepo()
                nav('/cars', { replace: true })
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
                if (pwd.length < 4) {
                  alert('Пароль: минимум 4 символа')
                  return
                }
                setSessionOwner({ email: em.toLowerCase() })
                invalidateRepo()
                nav('/cars', { replace: true })
              }}
            >
              Зарегистрироваться
            </Button>
          </div>
        </Card>

        <Card className="card pad">
          <h2 className="h2">Стать партнёром</h2>
          <p className="muted small" style={{ marginBottom: 10 }}>
            Для детейлингов/СТО: создавайте авто клиентов и добавляйте подтверждённую историю обслуживания.
            Вход демо: <strong>test@test</strong> / <strong>1111</strong>.
          </p>
          <div className="row gap wrap">
            {current?.name ? <Pill>Сейчас: {current.name}</Pill> : null}
          </div>

          <div className="topBorder" style={{ marginTop: 10 }}>
            <h3 className="h2" style={{ marginBottom: 10 }}>
              Вход партнёра
            </h3>
            <div className="formGrid authFormGrid">
              <Field label="Почта">
                <Input
                  ref={detEmailRef}
                  className="input"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test@test"
                />
              </Field>
              <Field label="Пароль">
                <Input
                  ref={detPasswordRef}
                  className="input mono"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••"
                />
              </Field>
            </div>
            <div className="row gap wrap authFormActions">
              <Button
                className="btn"
                variant="primary"
                onClick={() => {
                  const em = (email || detEmailRef.current?.value || '').trim()
                  const pwd = (password || detPasswordRef.current?.value || '').trim()
                  const res = r.loginDetailing({ email: em, password: pwd })
                  if (!res?.ok) {
                    alert(loginErrorMessage(res?.reason))
                    return
                  }
                  setSessionDetailingId(res.detailing.id)
                  invalidateRepo()
                  nav(from === '/' ? '/cars' : from)
                }}
              >
                Войти
              </Button>
            </div>
          </div>

          <div className="topBorder" style={{ marginTop: 14 }}>
            <h3 className="h2" style={{ marginBottom: 10 }}>
              Заявка на подключение
            </h3>
            <p className="muted small" style={{ marginBottom: 10 }}>
              Название студии или СТО, контактная почта и телефон — пароль для входа в прототипе задаётся
              автоматически (<strong>1111</strong>).
            </p>
            <div className="formGrid authFormGrid">
              <Field label="Название">
                <Input
                  className="input"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Not. Moiko."
                  autoComplete="organization"
                />
              </Field>
              <Field label="Почта">
                <Input
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="studio@example.com"
                />
              </Field>
              <div className="partnerApplyRow">
                <Field label="Телефон" className="partnerApplyRow__phone">
                  <Input
                    className="input"
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="+7 …"
                  />
                </Field>
                <div className="partnerApplyRow__submit">
                  <Button
                    className="btn"
                    variant="primary"
                    onClick={() => {
                      const d = r.registerDetailing({
                        name: regName,
                        email: regEmail,
                        phone: regPhone,
                      })
                      if (d?.error) {
                        alert(registerErrorMessage(d.error))
                        return
                      }
                      setSessionDetailingId(d.id)
                      invalidateRepo()
                      nav('/cars')
                    }}
                  >
                    Подать заявку
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <Card className="card pad" style={{ marginTop: 16 }}>
        <h2 className="h2">Локальные данные в браузере</h2>
        <p className="muted small" style={{ marginBottom: 12 }}>
          В демо-режиме всё хранится в этом браузере. Сброс удалит авто, историю, фото и заявки из
          локального хранилища, затем снова подгрузит стартовый набор демо. Сессия входа будет сброшена.
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
