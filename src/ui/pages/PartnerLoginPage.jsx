import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BackNav, Button, Card, Field, Input, Pill } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { getSessionDetailingId, hasDetailingSession, hasOwnerSession, setSessionDetailingId } from '../auth.js'
import { partnerLoginErrorMessage } from '../authPartnerMessages.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'

export default function PartnerLoginPage() {
  const r = useRepo()
  const { detailing } = useDetailing()
  const currentId = getSessionDetailingId()
  const current =
    currentId && detailing && String(detailing.id) === String(currentId) ? detailing : null
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const detEmailRef = useRef(null)
  const detPasswordRef = useRef(null)
  const nav = useNavigate()
  const loc = useLocation()
  const from = loc.state?.from || '/'

  if (hasOwnerSession()) return <Navigate to="/cars" replace />
  if (hasDetailingSession()) {
    if (detailingOnboardingPending('detailing', detailing)) return <Navigate to="/detailing/landing" replace />
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
                <li>После входа данные подгружаются с сервера.</li>
              </ul>
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
                  placeholder="studio@example.com"
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
                  placeholder="••••••••"
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
                onClick={async () => {
                  if (!agreedToTerms) {
                    alert('Подтвердите согласие с политикой конфиденциальности и правилами использования сервиса.')
                    return
                  }
                  const em = (email || detEmailRef.current?.value || '').trim()
                  const pwd = (password || detPasswordRef.current?.value || '').trim()
                  try {
                    const res = await r.loginDetailing({ email: em, password: pwd })
                    if (!res?.ok) {
                      alert(partnerLoginErrorMessage(res?.reason))
                      return
                    }
                    setSessionDetailingId(String(res.detailing.id), res.token)
                    invalidateRepo()
                    if (res.detailing.profileCompleted === false) {
                      nav('/detailing/landing', { replace: true })
                    } else {
                      const fromStr = typeof from === 'string' ? from : ''
                      const okFrom =
                        fromStr.startsWith('/detailing') ||
                        fromStr.startsWith('/car/') ||
                        fromStr.startsWith('/requests')
                      nav(okFrom ? fromStr : '/detailing')
                    }
                  } catch {
                    alert('Не удалось войти. Проверьте данные, что бэкенд запущен и VITE_API_BASE_URL указан верно.')
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
