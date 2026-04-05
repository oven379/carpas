import { useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthLegalConsent, BackNav, Button, Card, Field, Input, ServiceHint } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { debugAuth, hasDetailingSession, hasOwnerSession, setSessionOwner } from '../auth.js'
import { OWNER_PASSWORD_MIN_LEN } from '../../lib/format.js'
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
    const phone = String(ownPhone || '').trim()
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
      return
    }
    void onRegisterSubmit()
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
        setSessionOwner(
          {
            email: loginRes.owner.email,
            name: loginRes.owner.name,
            phone: loginRes.owner.phone,
          },
          loginRes.token,
        )
        invalidateRepo()
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
          'Аккаунт с такой почтой не найден. Нажмите «Регистрация», чтобы создать гараж, или проверьте адрес почты.',
        )
        return
      }
      if (reason === 'bad_credentials') alert('Укажите почту и пароль')
      else alert('Не удалось войти')
    } catch {
      alert('Ошибка сети или сервера. Проверьте VITE_API_BASE_URL и что бэкенд запущен.')
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
      setSessionOwner(
        {
          email: reg.owner.email,
          name: reg.owner.name,
          phone: reg.owner.phone,
        },
        reg.token,
      )
      invalidateRepo()
      debugAuth('OwnerAuth: регистрация ok, перед navigate', { nextAfterAuth })
      nav(nextAfterAuth, { replace: true })
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
                    Сначала видны только почта и пароль. <strong>«Регистрация»</strong> первый раз только раскрывает поля имя и
                    телефон (для смены режима согласие не нужно). Если раскрыта регистрация, а почта или пароль ещё пустые,{' '}
                    <strong>«В гараж»</strong> просто свернёт лишние поля к форме входа — без запроса согласия. Когда всё заполнено,
                    отметьте галочку и нажмите <strong>«В гараж»</strong> для входа или <strong>«Регистрация»</strong> повторно — для
                    создания аккаунта. Имя и телефон при регистрации обязательны. Пароль не короче {OWNER_PASSWORD_MIN_LEN}{' '}
                    символов.
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
                      onChange={(e) => setOwnPhone(e.target.value)}
                      placeholder="+7 …"
                      autoComplete="tel"
                      inputMode="tel"
                    />
                  </div>
                </>
              ) : null}
              <AuthLegalConsent inputId="owner-auth-consent" checked={agreedToTerms} onChange={setAgreedToTerms} />
            </div>
            <div className="row gap wrap authFormActions authFormActions--dual" style={{ marginTop: 14 }}>
              <Button className="btn authOwner__submitGarage" variant="primary" type="button" onClick={() => void onEnterGarage()}>
                В гараж
              </Button>
              <Button className="btn" variant="outline" type="button" onClick={onRegisterClick}>
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
