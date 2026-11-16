import { useRef, useState } from 'react'
import { PartnerAuthLink } from '../../about-landing/PartnerAuthLink.tsx'
import { Navigate, useSearchParams } from 'react-router-dom'
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
} from '../components.jsx'
import { useOwnerAuth } from '../useOwnerAuth.js'
import { hasDetailingSession, hasOwnerSession } from '../auth.js'
import { formatPhoneRuInput, OWNER_PASSWORD_MIN_LEN } from '../../lib/format.js'
import { isNativeApp } from '../../lib/nativePlatform.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import Logo from '../Logo.jsx'
import { IOS_APP_URL, androidApkUrl } from '../../lib/appLinks.js'

export default function OwnerAuthPage() {
  const { login, register, forgotPassword, returnPath, nextAfterAuth } = useOwnerAuth()
  const { detailing } = useDetailing()
  const [hadOwnerSession] = useState(hasOwnerSession)
  const [spQuery, setSpQuery] = useSearchParams()
  const [ownEmail, setOwnEmail] = useState('')
  const [ownPassword, setOwnPassword] = useState('')
  const [ownName, setOwnName] = useState('')
  const [ownPhone, setOwnPhone] = useState('')
  /** Вход: почта/пароль и «В гараж». Регистрация: те же поля + имя, телефон можно добавить позже. */
  const [authMode, setAuthMode] = useState(() =>
    spQuery.get('register') === '1' || spQuery.get('mode') === 'register' ? 'register' : 'login',
  )
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const ownEmailRef = useRef(null)
  const ownPasswordRef = useRef(null)
  const authHubLinkState = returnPath ? { from: returnPath } : undefined
  const nativeApp = isNativeApp()

  if (hadOwnerSession) {
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

  function requireEmailPassword({ enforceMin = false } = {}) {
    const { em, pwd } = readCreds()
    if (!em || !pwd) {
      alert('Укажите почту и пароль')
      return null
    }
    if (enforceMin && pwd.length < OWNER_PASSWORD_MIN_LEN) {
      alert(`Пароль слишком короткий: не менее ${OWNER_PASSWORD_MIN_LEN} символов.`)
      return null
    }
    return { em, pwd }
  }

  function readRegisterProfile() {
    const name = String(ownName || '').trim()
    const phone = formatPhoneRuInput(ownPhone).trim()
    if (!name) {
      alert('Укажите имя — так мы обратимся к вам в сервисе.')
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
    const error = await login({ email: creds.em, password: creds.pwd })
    if (error) alert(error)
  }

  async function onRegisterSubmit() {
    if (!requireConsent()) return
    const creds = requireEmailPassword({ enforceMin: true })
    if (!creds) return
    const extra = readRegisterProfile()
    if (!extra) return
    const error = await register({ email: creds.em, password: creds.pwd, ...extra })
    if (error) alert(error)
  }

  return (
    <div className="container authPage">
      <div className="authSplit ownerAuthSplit">
        <aside className="authSplit__aside">
          <div className="authPage__head authPage__head--splitAside">
            <div className="ownerAuthBrand">
              <Logo size={70} className="ownerAuthBrand__logo" tagline={false} />
              <p className="ownerAuthBrand__caption">
                История авто в вашем телефоне, для тех кто действительно любит свою машину
              </p>
            </div>
            <div className="row gap wrap" style={{ alignItems: 'center' }}>
              {nativeApp ? null : <BackNav to="/auth" title="К выбору входа" linkState={authHubLinkState} />}
              <h1 className="h1" style={{ margin: 0 }}>
                Мой гараж
              </h1>
            </div>
            <div className="authSplit__lede">
              <ul className="authSplit__benefits">
                <li>Визиты, пробег и материалы — в одном месте, без разрозненных чеков и переписок.</li>
                <li>Фото и документы к работам, понятная хронология обслуживания.</li>
                <li>Публичная ссылка на историю — когда нужно показать авто партнёру или покупателю, без доступа к кабинету.</li>
              </ul>
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
                />
              </Field>
              <Field
                className="field--full"
                label="Пароль"
                hint={
                  authMode === 'register'
                    ? `Не короче ${OWNER_PASSWORD_MIN_LEN} символов — для нового аккаунта`
                    : 'Введите пароль от аккаунта'
                }
              >
                <PasswordInput
                  ref={ownPasswordRef}
                  autoComplete={authMode === 'register' ? 'new-password' : 'current-password'}
                  minLength={authMode === 'register' ? OWNER_PASSWORD_MIN_LEN : undefined}
                  value={ownPassword}
                  onChange={(e) => setOwnPassword(e.target.value)}
                  onInput={(e) => setOwnPassword(e.currentTarget.value)}
                  onBlur={(e) => setOwnPassword(e.currentTarget.value)}
                  onAnimationStart={(e) => onAutofillAnimation(e, setOwnPassword)}
                />
              </Field>
              {authMode === 'register' ? (
                <>
                  <div className="field field--full serviceHint__fieldWrap" id="owner-auth-name">
                    <Field
                      label="Имя"
                    >
                      <Input
                        className="input"
                        value={ownName}
                        onChange={(e) => setOwnName(e.target.value)}
                        autoComplete="name"
                      />
                    </Field>
                  </div>
                  <div className="field field--full serviceHint__fieldWrap" id="owner-auth-phone">
                    <Field
                      label="Телефон" hint="Необязательно"
                    >
                      <PhoneRuInput
                        value={ownPhone}
                        onChange={(e) => setOwnPhone(formatPhoneRuInput(e.target.value))}
                        onInput={(e) => setOwnPhone(formatPhoneRuInput(e.currentTarget.value))}
                        onBlur={() => setOwnPhone((p) => formatPhoneRuInput(p))}
                        onAnimationStart={(e) => onAutofillAnimation(e, (v) => setOwnPhone(formatPhoneRuInput(v)))}
                        autoComplete="tel"
                      />
                    </Field>
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
              <AuthForgotPasswordBlock sendForgot={(email) => forgotPassword({ email })} />
            ) : null}
            <div className="formActions authFormActions" style={{ marginTop: 14 }}>
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
          {!nativeApp && (
            <div className="authAppDownloads" aria-label="Скачать приложение CarPasss">
              <p className="muted small authAppDownloads__title">Мобильное приложение</p>
              <div className="authAppDownloads__grid">
                <a
                  className="authAppDownloadBtn authAppDownloadBtn--ios"
                  href={IOS_APP_URL}
                  target="_blank"
                  rel="noreferrer"
                  aria-label="Скачать приложение CarPasss для iOS в App Store"
                >
                  <span className="authAppDownloadBtn__copy">
                    <span className="authAppDownloadBtn__label">Скачать приложение</span>
                    <span className="authAppDownloadBtn__store">iOS · App Store</span>
                  </span>
                </a>
                <a
                  className="authAppDownloadBtn authAppDownloadBtn--android"
                  href={androidApkUrl()}
                  aria-label="Скачать приложение CarPasss для Android"
                >
                  <span className="authAppDownloadBtn__copy">
                    <span className="authAppDownloadBtn__label">Скачать приложение</span>
                    <span className="authAppDownloadBtn__store">Android · APK</span>
                  </span>
                </a>
              </div>
            </div>
          )}
          {nativeApp && (
            <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: 24 }}>
              <PartnerAuthLink className="btn" data-variant="ghost" to="/auth/partner">
                Вход для партнёров
              </PartnerAuthLink>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
