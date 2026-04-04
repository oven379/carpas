import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BackNav, Button, Card, Field, Input } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { setSessionDetailingId } from '../auth.js'
import { partnerApplyErrorMessage } from '../authPartnerMessages.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { DETAILING_SERVICES, MAINTENANCE_SERVICES } from '../../lib/serviceCatalogs.js'

export default function PartnerApplyPage() {
  const r = useRepo()
  const { mode, detailing, owner } = useDetailing()
  const [regName, setRegName] = useState('')
  const [regContactName, setRegContactName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regCity, setRegCity] = useState('')
  const [regAddress, setRegAddress] = useState('')
  const [regServicesOffered, setRegServicesOffered] = useState([])
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const from = loc.state?.from || '/'

  if (mode === 'owner' && owner?.email) return <Navigate to="/cars" replace />
  if (mode === 'detailing') {
    if (detailingOnboardingPending(mode, detailing)) return <Navigate to="/detailing/landing" replace />
    return <Navigate to="/detailing" replace />
  }

  function toggleService(item) {
    const v = String(item || '').trim()
    if (!v) return
    setRegServicesOffered((cur) => {
      const has = cur.includes(v)
      return has ? cur.filter((x) => x !== v) : [...cur, v]
    })
  }

  return (
    <div className="container authPage">
      <div className="authSplit">
        <aside className="authSplit__aside">
          <div className="authPage__head authPage__head--splitAside">
            <div className="row gap wrap" style={{ alignItems: 'center' }}>
              <BackNav to="/auth" title="К выбору входа" />
              <h1 className="h1" style={{ margin: 0 }}>
                Стать партнёром
              </h1>
            </div>
            <div className="authSplit__lede">
              <p className="authSplit__tagline">Подключите детейлинг или СТО к сервису истории авто</p>
              <ul className="authSplit__benefits">
                <li>Клиенты ведут гараж онлайн — вы фиксируете визиты, фото и документы к работам.</li>
                <li>Единая картина обслуживания повышает доверие и снижает вопросы «что делали раньше».</li>
                <li>После заявки откроется профиль организации; пароль для первого входа задаётся автоматически.</li>
              </ul>
              <p className="muted small authSplit__note">
                Укажите название, контакты, город и адрес, отметьте услуги детейлинга и/или ТО. Стартовый пароль входа:{' '}
                <strong>1111</strong>. После отправки — настройка лендинга и работа в кабинете.
              </p>
            </div>
          </div>
        </aside>

        <div className="authSplit__formCol">
          <Card className="card pad authSplit__formCard">
            <div className="formGrid authFormGrid authFormGrid--owner">
              <Field className="field--full" label="Название">
                <Input
                  className="input"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  placeholder="Например: Студия Детейлинг"
                  autoComplete="organization"
                />
              </Field>
              <Field className="field--full" label="Имя" hint="контактное лицо">
                <Input
                  className="input"
                  value={regContactName}
                  onChange={(e) => setRegContactName(e.target.value)}
                  placeholder="Например: Анна"
                  autoComplete="name"
                />
              </Field>
              <Field className="field--full" label="Почта">
                <Input
                  className="input"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  placeholder="studio@example.com"
                />
              </Field>
              <Field className="field--full" label="Телефон">
                <Input
                  className="input"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                  placeholder="+7 …"
                />
              </Field>
              <Field className="field--full" label="Город">
                <Input
                  className="input"
                  value={regCity}
                  onChange={(e) => setRegCity(e.target.value)}
                  placeholder="Например: Москва"
                  autoComplete="address-level2"
                />
              </Field>
              <Field className="field--full" label="Адрес" hint="улица, дом">
                <Input
                  className="input"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="Улица, дом"
                  autoComplete="street-address"
                />
              </Field>
              <div className="field field--full">
                <div className="field__top">
                  <span className="field__label">Услуги</span>
                  <span className="field__hint">детейлинг и ТО — отметьте, что предлагаете</span>
                </div>
                <p className="muted small" style={{ margin: '0 0 8px' }}>
                  Детейлинг
                </p>
                <div className="svc svc--compact">
                  {DETAILING_SERVICES.map((g) => {
                    const items = Array.isArray(g.items) ? g.items : []
                    const selected = items.filter((x) => regServicesOffered.includes(x)).length
                    return (
                      <details key={`d-${g.group}`} className="svc__group" open={selected > 0}>
                        <summary className="svc__title">
                          <span>{g.group}</span>
                          <span className="svc__count">{selected ? `${selected}/${items.length}` : `${items.length}`}</span>
                        </summary>
                        <div className="svc__grid">
                          {items.map((it) => {
                            const checked = regServicesOffered.includes(it)
                            return (
                              <label key={it} className="svc__item">
                                <input type="checkbox" checked={checked} onChange={() => toggleService(it)} />
                                <span>{it}</span>
                              </label>
                            )
                          })}
                        </div>
                      </details>
                    )
                  })}
                </div>
                <p className="muted small" style={{ margin: '14px 0 8px' }}>
                  ТО и ремонт
                </p>
                <div className="svc svc--compact">
                  {MAINTENANCE_SERVICES.map((g) => {
                    const items = Array.isArray(g.items) ? g.items : []
                    const selected = items.filter((x) => regServicesOffered.includes(x)).length
                    return (
                      <details key={`m-${g.group}`} className="svc__group" open={selected > 0}>
                        <summary className="svc__title">
                          <span>{g.group}</span>
                          <span className="svc__count">{selected ? `${selected}/${items.length}` : `${items.length}`}</span>
                        </summary>
                        <div className="svc__grid">
                          {items.map((it) => {
                            const checked = regServicesOffered.includes(it)
                            return (
                              <label key={it} className="svc__item">
                                <input type="checkbox" checked={checked} onChange={() => toggleService(it)} />
                                <span>{it}</span>
                              </label>
                            )
                          })}
                        </div>
                      </details>
                    )
                  })}
                </div>
              </div>
              <label className="authConsent field--full" style={{ marginTop: 8 }}>
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
              <div className="field--full" style={{ marginTop: 4 }}>
                <Button
                  className="btn"
                  variant="primary"
                  style={{ width: '100%' }}
                  onClick={async () => {
                    if (!agreedToTerms) {
                      alert('Подтвердите согласие с политикой конфиденциальности и правилами использования сервиса.')
                      return
                    }
                    try {
                      const res = await r.registerDetailing({
                        name: regName,
                        contactName: regContactName,
                        email: regEmail,
                        phone: regPhone,
                        city: regCity,
                        address: regAddress,
                        servicesOffered: regServicesOffered,
                      })
                      setSessionDetailingId(String(res.detailing.id), res.token)
                      invalidateRepo()
                      nav('/detailing/landing', { replace: true })
                    } catch (e) {
                      const body = e?.body
                      const emailErr = body?.errors?.email
                      const first = Array.isArray(emailErr) ? emailErr[0] : emailErr
                      if (first === 'email_taken') alert(partnerApplyErrorMessage('email_taken'))
                      else alert('Не удалось отправить заявку. Проверьте поля и доступность сервера.')
                    }
                  }}
                >
                  Подать заявку
                </Button>
              </div>
            </div>
            <p className="muted small" style={{ marginTop: 16 }}>
              Уже есть аккаунт?{' '}
              <Link className="link" to="/auth/partner" state={{ from }}>
                Вход партнёра
              </Link>
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
