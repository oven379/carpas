import { useEffect, useId, useRef, useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { formatHttpErrorMessage } from '../api/http.js'
import { BUSINESS_TYPES, DEFAULT_BUSINESS_TYPE } from '../lib/businessTypes.js'
import { formatPhoneRuInput } from '../lib/format.js'
import { GOALS, reachGoal } from '../lib/metrika.js'
import {
  hasDetailingSession, hasOwnerSession, safeAuthReturnPath, setSessionDetailingId,
} from '../ui/auth.js'
import { partnerApplyErrorMessage, partnerLoginErrorMessage } from '../ui/authPartnerMessages.js'
import { AuthLegalConsent, Button, CityComboBox, Field, Input, PasswordInput, PhoneRuInput } from '../ui/components.jsx'
import { detailingOnboardingPending, useDetailing } from '../ui/useDetailing.js'
import { invalidateRepo, useRepo } from '../ui/useRepo.js'
import { LandingAuthModal } from './LandingAuthModal.jsx'

const loginPath = '/auth/partner'
const registerPath = '/auth/partner/apply'
const modes = {
  login: {
    title: 'Вход для партнёров',
    description: 'Войдите в кабинет детейлинга или автосервиса.',
    submit: 'Войти',
    pending: 'Входим…',
  },
  register: {
    title: 'Стать партнёром',
    description: 'Оставьте заявку. После подтверждения мы пришлём данные для входа на вашу почту.',
    submit: 'Подать заявку',
    pending: 'Отправляем заявку…',
  },
  recovery: {
    title: 'Восстановление пароля',
    description: 'Укажите почту аккаунта. Если она зарегистрирована, на неё придёт письмо с новым паролем.',
    submit: 'Отправить письмо',
    pending: 'Отправляем…',
  },
}

export default function PartnerAuthDialog({ onClose }) {
  const repo = useRepo()
  const { detailing } = useDetailing()
  const location = useLocation()
  const navigate = useNavigate()
  const focusRef = useRef(null)
  const requestRef = useRef(null)
  const consentId = useId()
  const [recovering, setRecovering] = useState(false)
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [city, setCity] = useState('')
  const [consent, setConsent] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [status, setStatus] = useState('')
  const registering = /\/apply\/?$/i.test(location.pathname)
  const mode = registering ? 'register' : recovering ? 'recovery' : 'login'
  const { title, description, submit, pending } = modes[mode]
  const from = safeAuthReturnPath(location.state?.from) || ''

  useEffect(() => () => requestRef.current?.abort(), [])

  if (hasOwnerSession()) return <Navigate to="/garage" replace />
  if (hasDetailingSession()) {
    return <Navigate to={detailingOnboardingPending('detailing', detailing) ? '/detailing/landing' : '/detailing'} replace />
  }

  function changeMode(next) {
    if (next === mode) return
    setError('')
    setStatus('')
    setRecovering(next === 'recovery')
    if (next === 'register' || registering) {
      setConsent(false)
      navigate(next === 'register' ? registerPath : loginPath, { replace: true, state: location.state })
    }
  }

  async function submitForm(event) {
    event.preventDefault()
    if (requestRef.current) return

    const form = new FormData(event.currentTarget)
    const get = (name) => String(form.get(name) ?? '').trim()
    const submittedEmail = get('email')
    const request = new AbortController()
    requestRef.current = request
    setBusy(true)
    setError('')
    setStatus('')

    try {
      if (registering) {
        const result = await repo.registerDetailing({
          name: get('businessName'),
          businessType: get('businessType'),
          contactName: get('contactName'),
          email: submittedEmail,
          phone: formatPhoneRuInput(phone).trim(),
          city,
          address: get('address'),
          servicesOffered: [],
        })
        reachGoal(GOALS.partnerApplySubmit)
        if (request.signal.aborted) return

        if (result?.pendingVerification) {
          changeMode('login')
          setEmail(submittedEmail)
          setStatus(result.message || 'Заявка принята. После подтверждения мы пришлём данные для входа на вашу почту.')
        } else if (result?.token && result?.detailing?.id) {
          setSessionDetailingId(String(result.detailing.id), result.token)
          invalidateRepo()
          navigate('/detailing/landing', { replace: true })
        } else {
          setError('Не удалось подать заявку. Попробуйте ещё раз.')
        }
      } else if (recovering) {
        const result = await repo.forgotDetailingPassword({ email: submittedEmail })
        if (!request.signal.aborted) {
          setStatus(result?.message || 'Если почта зарегистрирована, проверьте входящие и папку «Спам».')
        }
      } else {
        const result = await repo.loginDetailing({ email: submittedEmail, password: get('password') })
        if (request.signal.aborted) return
        if (!result?.ok) {
          setError(partnerLoginErrorMessage(result?.reason))
          return
        }
        setSessionDetailingId(String(result.detailing.id), result.token)
        invalidateRepo()
        const canReturn = ['/detailing', '/car/', '/requests'].some((path) => from.startsWith(path))
        navigate(result.detailing.profileCompleted === false ? '/detailing/landing' : canReturn ? from : '/detailing', { replace: true })
      }
    } catch (failure) {
      if (request.signal.aborted) return
      const emailErrors = failure?.body?.errors?.email
      const emailError = Array.isArray(emailErrors) ? emailErrors[0] : emailErrors
      setError(registering && emailError === 'email_taken'
        ? partnerApplyErrorMessage('email_taken')
        : formatHttpErrorMessage(failure, 'Не удалось завершить действие. Попробуйте ещё раз.'))
    } finally {
      requestRef.current = null
      if (!request.signal.aborted) setBusy(false)
    }
  }

  return (
    <LandingAuthModal title={title} description={description} initialFocusRef={focusRef} onClose={() => {
      requestRef.current?.abort()
      onClose()
    }}>
      {!recovering && (
        <div className="landingAuthDialog__modes" role="group" aria-label="Выбор действия для партнёра">
          <button type="button" aria-pressed={!registering} disabled={busy} onClick={() => changeMode('login')}>Вход</button>
          <button type="button" aria-pressed={registering} disabled={busy} onClick={() => changeMode('register')}>Регистрация</button>
        </div>
      )}

      <form className="landingAuthDialog__form" onSubmit={submitForm} aria-busy={busy}>
        <fieldset disabled={busy}>
          {registering && (
            <>
              <Field label="Название организации">
                <Input ref={focusRef} className="input" name="businessName" autoComplete="organization" required />
              </Field>
              <Field label="Тип бизнеса">
                <select className="input" name="businessType" defaultValue={DEFAULT_BUSINESS_TYPE}>
                  {BUSINESS_TYPES.map(({ key, label }) => <option key={key} value={key}>{label}</option>)}
                </select>
              </Field>
              <Field label="Имя контактного лица">
                <Input className="input" name="contactName" autoComplete="name" />
              </Field>
              <Field label="Телефон">
                <PhoneRuInput value={phone} onChange={(event) => setPhone(event.target.value)} />
              </Field>
            </>
          )}
          <Field label="Почта">
            <Input
              ref={registering ? undefined : focusRef}
              className="input"
              name="email"
              type="email"
              autoComplete={mode === 'login' ? 'username' : 'email'}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>
          {mode === 'login' && (
            <>
              <Field label="Пароль">
                <PasswordInput className="input" name="password" autoComplete="current-password" required />
              </Field>
              <button className="landingAuthDialog__textAction" type="button" onClick={() => changeMode('recovery')}>
                Забыли пароль?
              </button>
            </>
          )}
          {registering && (
            <>
              <Field label="Город">
                <CityComboBox value={city} onChange={setCity} />
              </Field>
              <Field label="Адрес" hint="Улица и номер дома">
                <Input className="input" name="address" autoComplete="street-address" />
              </Field>
              <AuthLegalConsent inputId={consentId} checked={consent} onChange={setConsent} required linkTarget="_blank" />
            </>
          )}
        </fieldset>
        {error && <p className="landingAuthDialog__feedback landingAuthDialog__feedback--error" role="alert">{error}</p>}
        {status && <p className="landingAuthDialog__feedback" role="status">{status}</p>}
        <Button className="btn landingAuthDialog__submit" type="submit" disabled={busy}>{busy ? pending : submit}</Button>
      </form>
      {recovering && (
        <div className="landingAuthDialog__footer">
          <button className="landingAuthDialog__textAction" type="button" disabled={busy} onClick={() => changeMode('login')}>
            Вернуться ко входу
          </button>
        </div>
      )}
    </LandingAuthModal>
  )
}
