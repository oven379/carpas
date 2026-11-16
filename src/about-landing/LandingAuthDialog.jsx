import { useEffect, useId, useRef, useState } from 'react'
import { formatHttpErrorMessage } from '../api/http.js'
import { formatPhoneRuInput, OWNER_PASSWORD_MIN_LEN } from '../lib/format.js'
import { AuthLegalConsent, Button, Field, Input, PasswordInput, PhoneRuInput } from '../ui/components.jsx'
import { useOwnerAuth } from '../ui/useOwnerAuth.js'
import { LandingAuthModal } from './LandingAuthModal.jsx'
import { PartnerAuthLink } from './PartnerAuthLink.tsx'

const modes = {
  login: {
    title: 'Вход в КарПас',
    description: 'Войдите, чтобы открыть свой гараж и историю обслуживания.',
    submit: 'Войти',
    pending: 'Входим…',
  },
  register: {
    title: 'Создайте аккаунт',
    description: 'Добавьте автомобиль и начните вести его историю.',
    submit: 'Зарегистрироваться',
    pending: 'Создаём аккаунт…',
  },
  recovery: {
    title: 'Восстановление пароля',
    description: 'Укажите почту аккаунта. Если она зарегистрирована, мы отправим новый пароль, а старый перестанет действовать.',
    submit: 'Отправить письмо',
    pending: 'Отправляем…',
  },
}

export function LandingAuthDialog({ initialMode, onClose }) {
  const { login, register, forgotPassword } = useOwnerAuth()
  const [mode, setMode] = useState(initialMode)
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const emailRef = useRef(null)
  const requestRef = useRef(null)
  const consentId = useId()
  const { title, description, submit, pending } = modes[mode]
  const registering = mode === 'register'
  const recovering = mode === 'recovery'

  useEffect(() => () => requestRef.current?.abort(), [])

  function changeMode(next) {
    setMode(next)
    setError('')
    setStatus('')
    setConsent(false)
    if (next === 'recovery' || recovering) emailRef.current?.focus({ preventScroll: true })
  }

  function closeDialog() {
    requestRef.current?.abort()
    onClose()
  }

  async function submitForm(event) {
    event.preventDefault()
    if (requestRef.current) return

    const data = new FormData(event.currentTarget)
    const email = String(data.get('email') || '').trim()
    const password = String(data.get('password') || '').trim()
    const name = String(data.get('name') || '').trim()

    if (!recovering && !password) {
      setError('Укажите пароль.')
      return
    }
    if (registering && (password.length < OWNER_PASSWORD_MIN_LEN || !name)) {
      setError(!name ? 'Укажите имя.' : `Пароль должен содержать не менее ${OWNER_PASSWORD_MIN_LEN} символов.`)
      return
    }

    const request = new AbortController()
    requestRef.current = request
    setError('')
    setStatus('')
    setBusy(true)
    try {
      if (recovering) {
        const result = await forgotPassword({ email })
        if (!request.signal.aborted) {
          setStatus(result?.message || 'Если почта зарегистрирована, проверьте входящие и папку «Спам».')
        }
      } else {
        const message = registering
          ? await register({ email, password, name, phone: formatPhoneRuInput(phone).trim() }, request.signal)
          : await login({ email, password }, request.signal)
        if (!request.signal.aborted && message) setError(message)
      }
    } catch (requestError) {
      if (!request.signal.aborted) setError(formatHttpErrorMessage(requestError, 'Не удалось отправить письмо. Попробуйте ещё раз.'))
    } finally {
      requestRef.current = null
      if (!request.signal.aborted) setBusy(false)
    }
  }

  return (
    <LandingAuthModal title={title} description={description} initialFocusRef={emailRef} onClose={closeDialog}>
      {!recovering && (
        <div className="landingAuthDialog__modes" role="group" aria-label="Выбор действия">
          <button type="button" aria-pressed={mode === 'login'} disabled={busy} onClick={() => changeMode('login')}>Вход</button>
          <button type="button" aria-pressed={registering} disabled={busy} onClick={() => changeMode('register')}>Регистрация</button>
        </div>
      )}

      <form className="landingAuthDialog__form" onSubmit={submitForm} aria-busy={busy}>
        <fieldset disabled={busy}>
          {registering && (
            <Field label="Имя">
              <Input className="input" name="name" autoComplete="name" required />
            </Field>
          )}
          <Field label="Почта">
            <Input ref={emailRef} className="input" name="email" type="email" autoComplete={recovering ? 'email' : 'username'} required />
          </Field>
          {!recovering && (
            <Field label="Пароль" hint={registering ? `От ${OWNER_PASSWORD_MIN_LEN} символов` : undefined}>
              <PasswordInput
                key={mode}
                className="input"
                name="password"
                autoComplete={registering ? 'new-password' : 'current-password'}
                minLength={registering ? OWNER_PASSWORD_MIN_LEN : undefined}
                required
              />
            </Field>
          )}
          {mode === 'login' && (
            <button className="landingAuthDialog__textAction" type="button" onClick={() => changeMode('recovery')}>
              Забыли пароль?
            </button>
          )}
          {registering && (
            <>
              <Field label="Телефон" hint="Необязательно">
                <PhoneRuInput value={phone} onChange={event => setPhone(event.target.value)} />
              </Field>
              <AuthLegalConsent inputId={consentId} checked={consent} onChange={setConsent} required linkTarget="_blank" />
            </>
          )}
        </fieldset>
        {error && <p className="landingAuthDialog__feedback landingAuthDialog__feedback--error" role="alert">{error}</p>}
        {status && <p className="landingAuthDialog__feedback" role="status">{status}</p>}
        <Button className="btn landingAuthDialog__submit" type="submit" disabled={busy}>
          {busy ? pending : submit}
        </Button>
      </form>

      <div className="landingAuthDialog__footer">
        {recovering ? (
          <button className="landingAuthDialog__textAction" type="button" disabled={busy} onClick={() => changeMode('login')}>
            Вернуться ко входу
          </button>
        ) : (
          <PartnerAuthLink
            to="/auth/partner"
            className="landingAuthDialog__textAction"
            onClick={(event) => {
              if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) closeDialog()
            }}
          >
            Вход для сервисов
          </PartnerAuthLink>
        )}
      </div>
    </LandingAuthModal>
  )
}
