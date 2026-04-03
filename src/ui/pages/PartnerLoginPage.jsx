import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { safeSyncRepo } from '../../lib/syncRepoCall.js'
import { BackNav, Button, Card, Field, Input, Pill } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { getSessionDetailingId, setSessionDetailingId } from '../auth.js'
import { partnerLoginErrorMessage } from '../authPartnerMessages.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'

export default function PartnerLoginPage() {
  const r = useRepo()
  const { mode, detailing, owner } = useDetailing()
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
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const detEmailRef = useRef(null)
  const detPasswordRef = useRef(null)
  const nav = useNavigate()
  const loc = useLocation()
  const from = loc.state?.from || '/'

  if (mode === 'owner' && owner?.email) return <Navigate to="/cars" replace />
  if (mode === 'detailing') {
    if (detailingOnboardingPending(mode, detailing)) return <Navigate to="/detailing/landing" replace />
    return <Navigate to="/detailing" replace />
  }

  return (
    <div className="container authPage">
      <div className="authSplit">
        <aside className="authSplit__aside">
          <div className="authPage__head authPage__head--splitAside">
            <div className="row gap wrap" style={{ alignItems: 'center' }}>
              <BackNav to="/auth" title="К выбору входа" />
              <h1 className="h1" style={{ margin: 0 }}>
                Вход партнёра
              </h1>
            </div>
            <div className="authSplit__lede">
              <p className="authSplit__tagline">Кабинет детейлинга и СТО в КарПас</p>
              <ul className="authSplit__benefits">
                <li>Заявки и статусы по авто на обслуживании — в одном окне.</li>
                <li>Профиль организации, визиты и материалы к работам для прозрачности к клиенту.</li>
                <li>После входа — список авто и заявки; кабинет использует данные, сохранённые в браузере на этом устройстве.</li>
              </ul>
              <p className="muted small authSplit__note">
                При первом входе откроется настройка лендинга, затем — кабинет и авто. Примеры:{' '}
                <strong>test@test</strong> / <strong>1111</strong> (стартовый набор), кабинет с 10 тестовыми авто:{' '}
                <strong>qa@car.local</strong> / <strong>1111</strong>.
              </p>
            </div>
          </div>
        </aside>

        <div className="authSplit__formCol">
          <Card className="card pad authSplit__formCard">
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
              <label className="authConsent field--full">
                <input
                  type="checkbox"
                  className="authConsent__input"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                />
                <span className="authConsent__text">
                  Я соглашаюсь с{' '}
                  <Link className="authConsent__legalLink" to="/about">
                    политикой конфиденциальности
                  </Link>{' '}
                  и{' '}
                  <Link className="authConsent__legalLink" to="/about">
                    правилами использования сервиса
                  </Link>
                  .
                </span>
              </label>
            </div>
            <div className="row gap wrap authFormActions">
              <Button
                className="btn"
                variant="primary"
                onClick={() => {
                  if (!agreedToTerms) {
                    alert('Подтвердите согласие с политикой конфиденциальности и правилами использования сервиса.')
                    return
                  }
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
                    nav('/detailing/landing', { replace: true })
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
    </div>
  )
}
