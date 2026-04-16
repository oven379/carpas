import { useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthForgotPasswordBlock } from '../AuthForgotPasswordBlock.jsx'
import {
  AuthLegalConsent,
  BackNav,
  Button,
  Card,
  Field,
  Input,
  PasswordInput,
  PhoneRuInput,
  ServiceHint,
} from '../components.jsx'
import { useRepo, refreshAllClientData } from '../useRepo.js'
import {
  hasDetailingSession,
  hasOwnerSession,
  ownerToSessionSnapshot,
  safeAuthReturnPath,
  setSessionOwner,
} from '../auth.js'
import { formatPhoneRuInput, OWNER_PASSWORD_MIN_LEN } from '../../lib/format.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { formatHttpErrorMessage, HttpError } from '../../api/http.js'

export default function OwnerAuthPage() {
  const r = useRepo()
  const { detailing } = useDetailing()
  const [spQuery, setSpQuery] = useSearchParams()
  const [ownEmail, setOwnEmail] = useState('')
  const [ownPassword, setOwnPassword] = useState('')
  const [ownName, setOwnName] = useState('')
  const [ownPhone, setOwnPhone] = useState('')
  /** Вход: почта/пароль и «В гараж». Регистрация: те же поля + имя/телефон и только «Зарегистрироваться» → настройки гаража. */
  const [authMode, setAuthMode] = useState(() =>
    spQuery.get('register') === '1' || spQuery.get('mode') === 'register' ? 'register' : 'login',
  )
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const ownEmailRef = useRef(null)
  const ownPasswordRef = useRef(null)
  const nav = useNavigate()
  const loc = useLocation()
  const returnPath = safeAuthReturnPath(loc.state?.from)
  const nextAfterAuth =
    returnPath && !returnPath.startsWith('/auth')
      ? returnPath === '/'
        ? '/garage'
        : returnPath
      : '/garage'
  const authHubLinkState = returnPath ? { from: returnPath } : undefined

  /** После первой регистрации ведём в настройки гаража, если не было явного deep-link. */
  function resolveAfterRegister() {
    const d = String(nextAfterAuth || '/garage')
    if (d === '/garage' || d === '/') return '/garage/settings'
    return nextAfterAuth
  }

  if (hasOwnerSession()) {
    return <Navigate to={nextAfterAuth} replace />
  }
  if (hasDetailingSession()) {
    if (detailingOnboardingPending('detailing', detailing)) return <Navigate to="/detailing/landing" replace />
    return <Navigate to="/detailing" replace />
  }

  function readCreds() {
    const em = (ownEmail || ownEmailRef.current?.value || '').trim()
    const pwd = (ownPassword || ownPasswordRef.current?.value || '').trim()
    return { em, pwd }
  }

  /** Браузерный автозаполнитель часто меняет DOM без надёжного `change`; без этого controlled `value` затирает подставленный текст. */
  function onAutofillAnimation(e, setter) {
    if (e.animationName !== 'cp-autofill-sync') return
    const v = e.currentTarget.value
    if (typeof v === 'string') setter(v)
  }

  function requireConsent() {
    if (!agreedToTerms) {
      alert('Подтвердите согласие с политикой конфиденциальности и правилами использования сервиса.')
      return false
    }
    return true
  }

  function requireEmailPassword() {
    const { em, pwd } = readCreds()
    if (!em || !pwd) {
      alert('Укажите почту и пароль')
      return null
    }
    if (pwd.length < OWNER_PASSWORD_MIN_LEN) {
      alert(`Пароль слишком короткий: не менее ${OWNER_PASSWORD_MIN_LEN} символов.`)
      return null
    }
    return { em, pwd }
  }

  function requireNamePhoneForRegister() {
    const name = String(ownName || '').trim()
    const phone = formatPhoneRuInput(ownPhone).trim()
    if (!name) {
      alert('Укажите имя — так мы обратимся к вам в сервисе.')
      return null
    }
    if (!phone) {
      alert('Укажите телефон для связи.')
      return null
    }
    return { name, phone }
  }

  function setRegisterMode(next) {
    setAuthMode(next ? 'register' : 'login')
    if (!next) setAgreedToTerms(false)
    const nextParams = new URLSearchParams(spQuery)
    if (next) {
      nextParams.set('register', '1')
    } else {
      nextParams.delete('register')
      nextParams.delete('mode')
    }
    setSpQuery(nextParams, { replace: true })
  }

  async function onEnterGarage() {
    const creds = requireEmailPassword()
    if (!creds) return
    const { em, pwd } = creds
    try {
      const loginRes = await r.loginOwner({ email: em, password: pwd })
      if (loginRes?.ok) {
        const snap = ownerToSessionSnapshot(loginRes.owner)
        if (!snap) {
          alert('Не удалось сохранить сессию: нет почты в ответе сервера.')
          return
        }
        setSessionOwner(snap, loginRes.token)
        refreshAllClientData()
        nav(nextAfterAuth, { replace: true })
        return
      }
      const reason = loginRes?.reason
      if (reason === 'bad_password') {
        alert('Неверный пароль для этой почты.')
        return
      }
      if (reason === 'not_found') {
        alert(
          'Аккаунта с такой почтой нет. Переключитесь на «Регистрация», заполните имя и телефон и нажмите «Зарегистрироваться».',
        )
        return
      }
      if (reason === 'bad_credentials') alert('Укажите почту и пароль')
      else alert('Не удалось войти')
    } catch (e) {
      alert(formatHttpErrorMessage(e, 'Не удалось войти.'))
    }
  }

  async function onRegisterSubmit() {
    if (!requireConsent()) return
    const creds = requireEmailPassword()
    if (!creds) return
    const extra = requireNamePhoneForRegister()
    if (!extra) return
    const { em, pwd } = creds
    const { name, phone } = extra
    try {
      const reg = await r.registerOwner({
        email: em,
        password: pwd,
        name,
        phone,
      })
      const snap = ownerToSessionSnapshot(reg.owner)
      if (!snap) {
        alert('Не удалось сохранить сессию: нет почты в ответе сервера.')
        return
      }
      setSessionOwner(snap, reg.token)
      refreshAllClientData()
      const dest = resolveAfterRegister()
      nav(dest, { replace: true })
    } catch (e) {
      const base = formatHttpErrorMessage(e, 'Не удалось создать аккаунт.')
      const hint =
        e instanceof HttpError && e.status === 422 ? ' Если аккаунт уже есть, переключитесь на «Вход».' : ''
      alert(`${base}${hint}`)
    }
  }

  return (
    <div className="container authPage">
      <div className="authSplit">
        <aside className="authSplit__aside">
          <div className="authPage__head authPage__head--splitAside">
            <div className="row gap wrap" style={{ alignItems: 'center' }}>
              <BackNav to="/auth" title="К выбору входа" linkState={authHubLinkState} />
              <h1 className="h1" style={{ margin: 0 }}>
                Мой гараж
              </h1>
            </div>
            <div className="authSplit__lede">
              <p className="authSplit__tagline">Создавайте историю своего автомобиля</p>
              <ul className="authSplit__benefits">
                <li>Визиты, пробег и материалы — в одном месте, без разрозненных чеков и переписок.</li>
                <li>Фото и документы к работам, понятная хронология обслуживания.</li>
                <li>Публичная ссылка на историю — когда нужно показать авто партнёру или покупателю, без доступа к кабинету.</li>
              </ul>
              <div id="owner-auth-intro-hint" className="row gap wrap" style={{ alignItems: 'center', marginTop: 12 }}>
                <span className="muted small" style={{ margin: 0 }}>
                  Вход и регистрация
                </span>
                <ServiceHint scopeId="owner-auth-intro-hint" variant="compact" label="Справка: мой гараж">
                  <p className="serviceHint__panelText">
                    <strong>Вход</strong> — почта, пароль и «В гараж». <strong>Регистрация</strong> — те же поля плюс имя и телефон;
                    на форме одна кнопка <strong>«Зарегистрироваться»</strong> — после создания аккаунта откроются настройки: сначала настройте публичную страницу гаража.
                    Пароль не короче {OWNER_PASSWORD_MIN_LEN} символов.
                  </p>
                </ServiceHint>
              </div>
            </div>
          </div>
        </aside>

        <div className="authSplit__formCol">
          <Card className="card pad authSplit__formCard">
            <div className="formGrid authFormGrid authFormGrid--owner">
              <Field className="field--full" label="Почта">
                <Input
                  ref={ownEmailRef}
                  className="input"
                  type="email"
                  autoComplete="username"
                  value={ownEmail}
                  onChange={(e) => setOwnEmail(e.target.value)}
                  onInput={(e) => setOwnEmail(e.currentTarget.value)}
                  onBlur={(e) => setOwnEmail(e.currentTarget.value)}
                  onAnimationStart={(e) => onAutofillAnimation(e, setOwnEmail)}
                  placeholder="you@example.com"
                />
              </Field>
              <Field
                className="field--full"
                label="Пароль"
                hint={`Не короче ${OWNER_PASSWORD_MIN_LEN} символов — для входа и для нового аккаунта`}
              >
                <PasswordInput
                  ref={ownPasswordRef}
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  value={ownPassword}
                  onChange={(e) => setOwnPassword(e.target.value)}
                  onInput={(e) => setOwnPassword(e.currentTarget.value)}
                  onBlur={(e) => setOwnPassword(e.currentTarget.value)}
                  onAnimationStart={(e) => onAutofillAnimation(e, setOwnPassword)}
                  placeholder={`от ${OWNER_PASSWORD_MIN_LEN} символов`}
                />
              </Field>
              {authMode === 'register' ? (
                <>
                  <div className="field field--full serviceHint__fieldWrap" id="owner-auth-name">
                    <div className="field__top serviceHint__fieldTop">
                      <span className="field__label">Имя</span>
                      <ServiceHint scopeId="owner-auth-name" variant="compact" label="Справка: имя при регистрации">
                        <p className="serviceHint__panelText">Как к вам обращаться в сервисе. Обязательно при создании аккаунта.</p>
                      </ServiceHint>
                    </div>
                    <Input
                      className="input"
                      value={ownName}
                      onChange={(e) => setOwnName(e.target.value)}
                      placeholder="Например: Иван"
                      autoComplete="name"
                    />
                  </div>
                  <div className="field field--full serviceHint__fieldWrap" id="owner-auth-phone">
                    <div className="field__top serviceHint__fieldTop">
                      <span className="field__label">Телефон</span>
                      <ServiceHint scopeId="owner-auth-phone" variant="compact" label="Справка: телефон при регистрации">
                        <p className="serviceHint__panelText">Номер для связи. Обязателен при создании аккаунта.</p>
                      </ServiceHint>
                    </div>
                    <PhoneRuInput
                      value={ownPhone}
                      onChange={(e) => setOwnPhone(formatPhoneRuInput(e.target.value))}
                      onInput={(e) => setOwnPhone(formatPhoneRuInput(e.currentTarget.value))}
                      onBlur={() => setOwnPhone((p) => formatPhoneRuInput(p))}
                      onAnimationStart={(e) => onAutofillAnimation(e, (v) => setOwnPhone(formatPhoneRuInput(v)))}
                      autoComplete="tel"
                    />
                  </div>
                  <AuthLegalConsent inputId="owner-auth-consent" checked={agreedToTerms} onChange={setAgreedToTerms} />
                </>
              ) : null}
              {authMode === 'register' ? (
                <p className="muted small" style={{ margin: '8px 0 0', lineHeight: 1.45, maxWidth: '52ch' }}>
                  После регистрации откроются настройки гаража: сначала настройте публичную страницу (контакты и ссылка для гостей).
                </p>
              ) : null}
            </div>
            {authMode === 'login' ? (
              <AuthForgotPasswordBlock
                sendForgot={async (email) => {
                  return await r.forgotOwnerPassword({ email })
                }}
              />
            ) : null}
            <div className="row gap wrap authFormActions" style={{ marginTop: 14 }}>
              {authMode === 'login' ? (
                <>
                  <Button className="btn authOwner__submitGarage" variant="primary" type="button" onClick={() => onEnterGarage()}>
                    В гараж
                  </Button>
                  <button
                    type="button"
                    className="btn"
                    data-variant="outline"
                    onClick={() => setRegisterMode(true)}
                  >
                    Регистрация
                  </button>
                </>
              ) : (
                <>
                  <Button className="btn authOwner__submitGarage" variant="primary" type="button" onClick={() => onRegisterSubmit()}>
                    Зарегистрироваться
                  </Button>
                  <p className="muted small" style={{ margin: 0, width: '100%' }}>
                    <button
                      type="button"
                      className="link"
                      style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', font: 'inherit' }}
                      onClick={() => setRegisterMode(false)}
                    >
                      Уже есть аккаунт — войти
                    </button>
                  </p>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
