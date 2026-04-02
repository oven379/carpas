import { useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { safeSyncRepo } from '../../lib/syncRepoCall.js'
import { BackNav, Button, Card, Field, Input, Pill } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { getSessionDetailingId, setSessionDetailingId } from '../auth.js'
import { partnerLoginErrorMessage } from '../authPartnerMessages.js'

export default function PartnerLoginPage() {
  const r = useRepo()
  const currentId = getSessionDetailingId()
  const current =
    currentId && r.getDetailing
      ? (() => {
          const res = safeSyncRepo(() => r.getDetailing(currentId))
          return res.ok ? res.value ?? null : null
        })()
      : null
  const [email, setEmail] = useState('test@test')
  const [password, setPassword] = useState('')
  const detEmailRef = useRef(null)
  const detPasswordRef = useRef(null)
  const nav = useNavigate()
  const loc = useLocation()
  const from = loc.state?.from || '/'

  return (
    <div className="container authPage">
      <div className="row spread gap authPage__head">
        <div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav to="/auth" title="К выбору входа" />
            <h1 className="h1" style={{ margin: 0 }}>
              Вход партнёра
            </h1>
          </div>
          <p className="muted">
            Кабинет детейлинга / СТО. При первом входе откроется заполнение профиля, затем — список авто на обслуживании.
            Демо: <strong>test@test</strong> / <strong>1111</strong>.
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
          {current?.name ? (
            <div className="row gap wrap" style={{ marginBottom: 12 }}>
              <Pill>Сейчас в сессии: {current.name}</Pill>
            </div>
          ) : null}
          <div className="formGrid authFormGrid authFormGrid--owner">
            <Field className="field--full" label="Почта">
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
            <Field className="field--full" label="Пароль">
              <Input
                ref={detPasswordRef}
                className="input mono"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="1111"
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
                  alert(partnerLoginErrorMessage(res?.reason))
                  return
                }
                setSessionDetailingId(res.detailing.id)
                invalidateRepo()
                const det = r.getDetailing?.(res.detailing.id)
                if (det && det.profileCompleted === false) {
                  nav('/detailing/settings', { replace: true })
                } else {
                  const fromStr = typeof from === 'string' ? from : ''
                  const okFrom =
                    fromStr.startsWith('/detailing') ||
                    fromStr.startsWith('/car/') ||
                    fromStr.startsWith('/requests')
                  nav(okFrom ? fromStr : '/detailing')
                }
              }}
            >
              Войти
            </Button>
          </div>
          <p className="muted small" style={{ marginTop: 16 }}>
            Ещё нет аккаунта?{' '}
            <Link className="link" to="/auth/partner/apply" state={{ from }}>
              Подать заявку — стать партнёром
            </Link>
          </p>
        </Card>
      </div>
    </div>
  )
}
