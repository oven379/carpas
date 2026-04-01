import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button, Card, Field, Input, Pill } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { clearSession, getSessionDetailingId, getSessionOwner, isAuthed, setSessionDetailingId, setSessionOwner } from '../auth.js'

function loginErrorMessage(reason) {
  if (reason === 'bad_password') return 'Неверный пароль'
  if (reason === 'not_found') return 'Нет учётной записи с такой почтой'
  if (reason === 'bad_credentials') return 'Укажите почту и пароль'
  return 'Не удалось войти'
}

function registerErrorMessage(code) {
  if (code === 'bad_email') return 'Укажите почту'
  if (code === 'bad_password') return 'Укажите пароль'
  if (code === 'email_taken') return 'Эта почта уже зарегистрирована'
  return 'Не удалось зарегистрировать'
}

export default function AuthPage() {
  const r = useRepo()
  const currentId = getSessionDetailingId()
  const current = currentId ? r.getDetailing?.(currentId) : null
  const owner = getSessionOwner()

  const [ownEmail, setOwnEmail] = useState('')
  const [ownPassword, setOwnPassword] = useState('')
  const [ownRegEmail, setOwnRegEmail] = useState('')
  const [ownRegPassword, setOwnRegPassword] = useState('')

  const [email, setEmail] = useState('test@test')
  const [password, setPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')

  // На некоторых браузерах автозаполнение не триггерит onChange, поэтому держим refs.
  const ownEmailRef = useRef(null)
  const ownPasswordRef = useRef(null)
  const ownRegEmailRef = useRef(null)
  const ownRegPasswordRef = useRef(null)
  const detEmailRef = useRef(null)
  const detPasswordRef = useRef(null)
  const nav = useNavigate()
  const loc = useLocation()
  const from = loc.state?.from || '/'

  const authed = isAuthed()

  return (
    <div className="container">
      <div className="row spread gap">
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

      <div className="split">
        <Card className="card pad">
          <h2 className="h2">Мой гараж</h2>
          <p className="muted small" style={{ marginBottom: 10 }}>
            Для владельцев: добавляйте свои авто и ведите личную историю.
          </p>
          <div className="row gap wrap">
            <Pill tone={authed ? 'accent' : 'neutral'}>
              {authed ? 'Вы вошли' : 'Вы не вошли'}
            </Pill>
            {owner ? <Pill>Роль: владелец</Pill> : null}
          </div>
          <div className="formGrid authFormGrid" style={{ marginTop: 10 }}>
            <Field label="Почта">
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
            <Field label="Пароль">
              <Input
                ref={ownPasswordRef}
                className="input mono"
                type="password"
                autoComplete="current-password"
                value={ownPassword}
                onChange={(e) => setOwnPassword(e.target.value)}
                placeholder="••••"
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
                const em = (ownRegEmail || ownRegEmailRef.current?.value || '').trim()
                const pwd = (ownRegPassword || ownRegPasswordRef.current?.value || '').trim()
                if (!em || !pwd) {
                  alert('Укажите почту и пароль')
                  return
                }
                setSessionOwner({ email: em.toLowerCase() })
                invalidateRepo()
                nav('/cars', { replace: true })
              }}
            >
              Зарегистрироваться
            </Button>
            <button
              className="btn"
              data-variant="ghost"
              onClick={() => {
                clearSession()
                invalidateRepo()
              }}
            >
              Выйти
            </button>
          </div>

          <div className="topBorder">
            <div className="muted small" style={{ marginBottom: 10 }}>
              Быстрая регистрация
            </div>
            <div className="formGrid authFormGrid">
              <Field label="Почта">
                <Input
                  ref={ownRegEmailRef}
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={ownRegEmail}
                  onChange={(e) => setOwnRegEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </Field>
              <Field label="Пароль">
                <Input
                  ref={ownRegPasswordRef}
                  className="input mono"
                  type="password"
                  autoComplete="new-password"
                  value={ownRegPassword}
                  onChange={(e) => setOwnRegPassword(e.target.value)}
                  placeholder="минимум 4 символа"
                />
              </Field>
            </div>
          </div>
        </Card>

        <Card className="card pad">
          <h2 className="h2">Стать партнёром</h2>
          <p className="muted small" style={{ marginBottom: 10 }}>
            Для детейлингов/СТО: создавайте авто клиентов и добавляйте подтверждённую историю обслуживания.
            Демо: <strong>test@test</strong> / <strong>1111</strong>.
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

          <div className="formGrid authFormGrid">
            <Field label="Название детейлинга">
              <Input
                className="input"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                placeholder="Not. Moiko."
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
            <Field label="Пароль">
              <Input
                className="input mono"
                type="password"
                autoComplete="new-password"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                placeholder="минимум 4 символа"
              />
            </Field>
          </div>
          <div className="row gap wrap authFormActions">
            <Button
              className="btn"
              variant="primary"
              onClick={() => {
                const d = r.registerDetailing({
                  name: regName,
                  email: regEmail,
                  password: regPassword,
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
              Подать заявку / создать кабинет
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
