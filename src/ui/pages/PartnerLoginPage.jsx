import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthForgotPasswordBlock } from '../AuthForgotPasswordBlock.jsx'
import { BackNav, Button, Card, Field, Input, PasswordInput, Pill, ServiceHint } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import {
  getSessionDetailingId,
  hasDetailingSession,
  hasOwnerSession,
  safeAuthReturnPath,
  setSessionDetailingId,
} from '../auth.js'
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
  const detEmailRef = useRef(null)
  const detPasswordRef = useRef(null)
  const nav = useNavigate()
  const loc = useLocation()
  const from = safeAuthReturnPath(loc.state?.from) || ''
  const authHubLinkState = from ? { from } : undefined

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
              <BackNav to="/auth" title="К выбору входа" linkState={authHubLinkState} />
              <h1 className="h1" style={{ margin: 0 }}>
                Вход партнёра
              </h1>
            </div>
            <div className="authSplit__lede">
              <p className="authSplit__tagline">Кабинет детейлинга и СТО в КарПас</p>
              <ul className="authSplit__benefits">
                <li>Заявки и статусы по авто на обслуживании — в одном окне.</li>
                <li>Профиль организации, визиты и материалы к работам для прозрачности к клиенту.</li>
                <li>После входа отображаются актуальные данные из кабинета.</li>
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
            <div id="partner-login-hint" className="row gap wrap" style={{ alignItems: 'center', marginBottom: 14 }}>
              <div className="cardTitle" style={{ margin: 0 }}>
                Вход
              </div>
              <ServiceHint scopeId="partner-login-hint" variant="compact" label="Справка: вход партнёра">
                <p className="serviceHint__panelText">
                  При первом входе после регистрации откроется настройка страницы для клиентов, затем — кабинет и список авто.
                  Если забыли пароль, на этом экране воспользуйтесь ссылкой «Забыли пароль?».
                </p>
              </ServiceHint>
            </div>
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
                <PasswordInput
                  ref={detPasswordRef}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </Field>
            </div>
            <AuthForgotPasswordBlock
              sendForgot={async (email) => {
                return await r.forgotDetailingPassword({ email })
              }}
            />
            <div className="row gap wrap authFormActions authFormActions--dual" style={{ marginTop: 14 }}>
              <Button
                className="btn"
                variant="primary"
                type="button"
                onClick={async () => {
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
                    alert('Не удалось войти. Проверьте логин и пароль, попробуйте позже.')
                  }
                }}
              >
                Войти
              </Button>
              <Link className="btn" data-variant="outline" to="/auth/partner/apply" state={from ? { from } : undefined}>
                Регистрация
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
