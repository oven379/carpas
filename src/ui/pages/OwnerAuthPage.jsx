import { useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLegalConsent, BackNav, Button, Card, Field, Input, ServiceHint } from '../components.jsx'
import { useRepo, refreshAllClientData } from '../useRepo.js'
import {
  debugAuth,
  hasDetailingSession,
  hasOwnerSession,
  ownerToSessionSnapshot,
  setSessionOwner,
} from '../auth.js'
import { formatPhoneRuInput, OWNER_PASSWORD_MIN_LEN } from '../../lib/format.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { formatHttpErrorMessage, HttpError } from '../../api/http.js'

export default function OwnerAuthPage() {
  const r = useRepo()
  const { detailing } = useDetailing()
  const [ownEmail, setOwnEmail] = useState('')
  const [ownPassword, setOwnPassword] = useState('')
  const [ownName, setOwnName] = useState('')
  const [ownPhone, setOwnPhone] = useState('')
  const [registerExpanded, setRegisterExpanded] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const ownEmailRef = useRef(null)
  const ownPasswordRef = useRef(null)
  const nav = useNavigate()
  const loc = useLocation()
  const f = loc.state?.from
  const nextAfterAuth =
    typeof f === 'string' && f.startsWith('/') && !f.startsWith('/auth') ? (f === '/' ? '/garage' : f) : '/garage'

  /** После первой регистрации ведём в настройки гаража, если не было явного deep-link. */
  function resolveAfterRegister() {
    const d = String(nextAfterAuth || '/garage')
    if (d === '/garage' || d === '/') return '/garage/settings'
    return nextAfterAuth
  }

  if (hasOwnerSession()) {
    debugAuth('OwnerAuthPage: уже есть сессия владельца → редирект', { to: nextAfterAuth })
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

  function onRegisterClick() {
    if (!registerExpanded) {
      setRegisterExpanded(true)
      return undefined
    }
    return onRegisterSubmit()
  }

  async function onEnterGarage() {
    if (registerExpanded) {
      const { em, pwd } = readCreds()
      if (!em || !pwd) {
        setRegisterExpanded(false)
        return
      }
    }
    if (!requireConsent()) return
    const creds = requireEmailPassword()
    if (!creds) return
    const { em, pwd } = creds
    try {
      const loginRes = await r.loginOwner({ email: em, password: pwd })
      debugAuth('OwnerAuth: ответ loginOwner', { ok: loginRes?.ok, reason: loginRes?.reason })
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
        if (registerExpanded) {
          const extra = requireNamePhoneForRegister()
          if (extra) {
            try {
              const reg = await r.registerOwner({
                email: em,
                password: pwd,
                name: extra.name,
                phone: extra.phone,
              })
              const snap = ownerToSessionSnapshot(reg.owner)
              if (!snap) {
                alert('Не удалось сохранить сессию: нет почты в ответе сервера.')
                return
              }
              setSessionOwner(snap, reg.token)
              refreshAllClientData()
              debugAuth('OwnerAuth: вход → not_found → авто-регистрация', { to: resolveAfterRegister() })
              nav(resolveAfterRegister(), { replace: true })
              return
            } catch (e) {
              const base = formatHttpErrorMessage(e, 'Не удалось создать аккаунт.')
              const hint =
                e instanceof HttpError && e.status === 422 ? ' Возможно, аккаунт уже существует — попробуйте «В гараж».' : ''
              alert(`${base}${hint}`)
              return
            }
          }
        }
        alert(
          'Аккаунт с такой почтой ещё не создан. Раскройте «Регистрация», заполните имя и телефон, затем снова нажмите «Регистрация» или «В гараж».',
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
      debugAuth('OwnerAuth: регистрация ok, перед navigate', { dest })
      nav(dest, { replace: true })
    } catch (e) {
      const base = formatHttpErrorMessage(e, 'Не удалось создать аккаунт.')
      const hint =
        e instanceof HttpError && e.status === 422 ? ' Если аккаунт уже есть, нажмите «В гараж».' : ''
      alert(`${base}${hint}`)
    }
  }

  return (
    <div className="container authPage">
      <div className="authSplit">
        <aside className="authSplit__aside">
          <div className="authPage__head authPage__head--splitAside">
            <div className="row gap wrap" style={{ alignItems: 'center' }}>
              <BackNav to="/auth" title="К выбору входа" />
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
                    Сначала видны только почта и пароль. Первый раз <strong>«Регистрация»</strong> только раскрывает имя и телефон.
                    Когда поля заполнены и стоит галочка согласия, нажмите снова <strong>«Регистрация»</strong> (фиолетовая кнопка) —
                    создастся аккаунт и откроются настройки гаража. Если форма регистрации уже раскрыта, кнопка{' '}
                    <strong>«В гараж»</strong> при новой почте тоже создаст аккаунт (если имя и телефон заполнены), иначе выполнит
                    вход существующего пользователя. Пароль не короче {OWNER_PASSWORD_MIN_LEN} символов.
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
                <Input
                  ref={ownPasswordRef}
                  className="input mono"
                  type="password"
                  autoComplete={registerExpanded ? 'new-password' : 'current-password'}
                  value={ownPassword}
                  onChange={(e) => setOwnPassword(e.target.value)}
                  onInput={(e) => setOwnPassword(e.currentTarget.value)}
                  onBlur={(e) => setOwnPassword(e.currentTarget.value)}
                  onAnimationStart={(e) => onAutofillAnimation(e, setOwnPassword)}
                  placeholder={`от ${OWNER_PASSWORD_MIN_LEN} символов`}
                />
              </Field>
              {registerExpanded ? (
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
                    <Input
                      className="input"
                      value={ownPhone}
                      onChange={(e) => setOwnPhone(formatPhoneRuInput(e.target.value))}
                      onInput={(e) => setOwnPhone(formatPhoneRuInput(e.currentTarget.value))}
                      onBlur={(e) => setOwnPhone(formatPhoneRuInput(e.currentTarget.value))}
                      onAnimationStart={(e) => onAutofillAnimation(e, (v) => setOwnPhone(formatPhoneRuInput(v)))}
                      placeholder="+7 900 123-45-67"
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </div>
                </>
              ) : null}
              <AuthLegalConsent inputId="owner-auth-consent" checked={agreedToTerms} onChange={setAgreedToTerms} />
            </div>
            <div className="row gap wrap authFormActions authFormActions--dual" style={{ marginTop: 14 }}>
              <Button
                className="btn authOwner__submitGarage"
                variant={registerExpanded ? 'outline' : 'primary'}
                type="button"
                onClick={() => onEnterGarage()}
              >
                В гараж
              </Button>
              <Button
                className="btn"
                variant={registerExpanded ? 'primary' : 'outline'}
                type="button"
                onClick={() => onRegisterClick()}
              >
                Регистрация
              </Button>
            </div>
            {registerExpanded ? (
              <p className="muted small" style={{ marginTop: 12, marginBottom: 0 }}>
                <button
                  type="button"
                  className="link"
                  style={{ padding: 0, border: 'none', background: 'none', cursor: 'pointer', font: 'inherit' }}
                  onClick={() => setRegisterExpanded(false)}
                >
                  Только вход
                </button>
                {' — скрыть имя и телефон'}
              </p>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  )
}
