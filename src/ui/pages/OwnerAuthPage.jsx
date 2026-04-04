import { useRef, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BackNav, Button, Card, Field, Input } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { setSessionOwner } from '../auth.js'
import { OWNER_PASSWORD_MIN_LEN } from '../../lib/format.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'

export default function OwnerAuthPage() {
  const r = useRepo()
  const { mode, detailing, owner } = useDetailing()
  const [ownEmail, setOwnEmail] = useState('')
  const [ownPassword, setOwnPassword] = useState('')
  const [ownName, setOwnName] = useState('')
  const [ownPhone, setOwnPhone] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const ownEmailRef = useRef(null)
  const ownPasswordRef = useRef(null)
  const nav = useNavigate()
  const loc = useLocation()
  const f = loc.state?.from
  const nextAfterAuth =
    typeof f === 'string' && f.startsWith('/') && !f.startsWith('/auth') ? (f === '/' ? '/garage' : f) : '/garage'

  if (mode === 'owner' && owner?.email) return <Navigate to="/garage" replace />
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
              <p className="muted small authSplit__note">
                Укажите почту и пароль (не короче {OWNER_PASSWORD_MIN_LEN} символов). Имя и телефон — по желанию. Отметьте
                согласие с политикой и правилами — существующий аккаунт откроется по паролю, новый создастся автоматически.
              </p>
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
                hint={`Не короче ${OWNER_PASSWORD_MIN_LEN} символов — для нового аккаунта или для входа`}
              >
                <Input
                  ref={ownPasswordRef}
                  className="input mono"
                  type="password"
                  autoComplete="current-password"
                  value={ownPassword}
                  onChange={(e) => setOwnPassword(e.target.value)}
                  placeholder={`от ${OWNER_PASSWORD_MIN_LEN} символов`}
                />
              </Field>
              <Field className="field--full" label="Имя (необязательно)">
                <Input
                  className="input"
                  value={ownName}
                  onChange={(e) => setOwnName(e.target.value)}
                  placeholder="Например: Иван"
                  autoComplete="name"
                />
              </Field>
              <Field className="field--full" label="Телефон (необязательно)">
                <Input
                  className="input"
                  value={ownPhone}
                  onChange={(e) => setOwnPhone(e.target.value)}
                  placeholder="+7 …"
                  autoComplete="tel"
                  inputMode="tel"
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
                className="btn authOwner__submitGarage"
                variant="primary"
                onClick={async () => {
                  const em = (ownEmail || ownEmailRef.current?.value || '').trim()
                  const pwd = (ownPassword || ownPasswordRef.current?.value || '').trim()
                  if (!agreedToTerms) {
                    alert('Подтвердите согласие с политикой конфиденциальности и правилами использования сервиса.')
                    return
                  }
                  if (!em || !pwd) {
                    alert('Укажите почту и пароль')
                    return
                  }
                  if (pwd.length < OWNER_PASSWORD_MIN_LEN) {
                    alert(`Пароль слишком короткий: не менее ${OWNER_PASSWORD_MIN_LEN} символов.`)
                    return
                  }
                  try {
                    const loginRes = await r.loginOwner({ email: em, password: pwd })
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
                      try {
                        const reg = await r.registerOwner({
                          email: em,
                          password: pwd,
                          name: ownName,
                          phone: ownPhone,
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
                        nav(nextAfterAuth, { replace: true })
                        return
                      } catch {
                        alert('Не удалось создать аккаунт. Возможно, почта уже занята — попробуйте войти.')
                        return
                      }
                    }
                    if (reason === 'bad_credentials') alert('Укажите почту и пароль')
                    else alert('Не удалось войти')
                  } catch {
                    alert('Ошибка сети или сервера. Проверьте VITE_API_BASE_URL и что бэкенд запущен.')
                  }
                }}
              >
                Войти в гараж
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
