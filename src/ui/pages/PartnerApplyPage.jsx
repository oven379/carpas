import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import {
  AuthLegalConsent,
  BackNav,
  Button,
  Card,
  CityComboBox,
  Field,
  Input,
  PhoneRuInput,
  ServiceHint,
} from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { hasDetailingSession, hasOwnerSession, safeAuthReturnPath, setSessionDetailingId } from '../auth.js'
import { partnerApplyErrorMessage } from '../authPartnerMessages.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { CITY_FIELD_DD_HINT, formatPhoneRuInput } from '../../lib/format.js'

export default function PartnerApplyPage() {
  const r = useRepo()
  const { detailing } = useDetailing()
  const [regName, setRegName] = useState('')
  const [regContactName, setRegContactName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regCity, setRegCity] = useState('')
  const [regAddress, setRegAddress] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const returnPath = safeAuthReturnPath(loc.state?.from)
  const partnerLoginLinkState = returnPath ? { from: returnPath } : undefined

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
              <BackNav to="/auth/partner" title="К форме входа" linkState={partnerLoginLinkState} />
              <h1 className="h1" style={{ margin: 0 }}>
                Стать партнёром
              </h1>
            </div>
            <div className="authSplit__lede">
              <p className="authSplit__tagline">Подключите детейлинг или СТО к сервису истории авто</p>
              <ul className="authSplit__benefits">
                <li>Клиенты ведут гараж онлайн — вы фиксируете визиты, фото и документы к работам.</li>
                <li>Единая картина обслуживания повышает доверие и снижает вопросы «что делали раньше».</li>
                <li>После заявки откроется настройка лендинга: там же укажете услуги детейлинга и ТО.</li>
              </ul>
            </div>
          </div>
        </aside>

        <div className="authSplit__formCol">
          <Card className="card pad authSplit__formCard">
            <div id="partner-apply-hint" className="row gap wrap" style={{ alignItems: 'center', marginBottom: 14 }}>
              <div className="cardTitle" style={{ margin: 0 }}>
                Заявка
              </div>
              <ServiceHint scopeId="partner-apply-hint" variant="compact" label="Справка: стать партнёром">
                <p className="serviceHint__panelText">
                  Укажите название студии или СТО, контактное лицо, телефон, почту, город и адрес. После отправки заявки мы
                  свяжемся с вами для верификации аккаунта; когда доступ откроется, войдите на экране «Вход партнёра» (пароль по
                  умолчанию для первого входа — <strong>1111</strong>, его можно сменить в настройках или через «Забыли пароль?»).
                  Список услуг для клиентов настраивается уже в кабинете.
                </p>
              </ServiceHint>
            </div>
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
              <Field className="field--full" label="Телефон">
                <PhoneRuInput
                  value={regPhone}
                  onChange={(e) => setRegPhone(formatPhoneRuInput(e.target.value))}
                  onBlur={() => setRegPhone((p) => formatPhoneRuInput(p))}
                  autoComplete="tel"
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
              <div className="field field--full serviceHint__fieldWrap" id="partner-apply-city">
                <div className="field__top serviceHint__fieldTop">
                  <span className="field__label">Город</span>
                  <ServiceHint scopeId="partner-apply-city" variant="compact" label="Справка: город">
                    <p className="serviceHint__panelText">{CITY_FIELD_DD_HINT}</p>
                  </ServiceHint>
                </div>
                <CityComboBox value={regCity} maxItems={20} onChange={(v) => setRegCity(v)} />
              </div>
              <Field className="field--full" label="Адрес" hint="улица, дом">
                <Input
                  className="input"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="Улица, дом"
                  autoComplete="street-address"
                />
              </Field>
              <AuthLegalConsent
                inputId="partner-apply-consent"
                style={{ marginTop: 8 }}
                checked={agreedToTerms}
                onChange={setAgreedToTerms}
              />
              <div className="field--full" style={{ marginTop: 4 }}>
                <Button
                  className="btn"
                  variant="primary"
                  style={{ width: '100%' }}
                  type="button"
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
                        phone: formatPhoneRuInput(regPhone).trim(),
                        city: regCity,
                        address: regAddress,
                        servicesOffered: [],
                      })
                      if (res?.pendingVerification) {
                        alert(
                          String(
                            res.message ||
                              'Заявка принята. Вскоре с вами свяжутся для верификации аккаунта. После подтверждения войдите на экране «Вход партнёра».',
                          ),
                        )
                        nav('/auth/partner', { replace: true, state: partnerLoginLinkState })
                        return
                      }
                      if (res?.token && res?.detailing?.id) {
                        setSessionDetailingId(String(res.detailing.id), res.token)
                        invalidateRepo()
                        nav('/detailing/landing', { replace: true })
                      }
                    } catch (e) {
                      const body = e?.body
                      const emailErr = body?.errors?.email
                      const first = Array.isArray(emailErr) ? emailErr[0] : emailErr
                      if (first === 'email_taken') alert(partnerApplyErrorMessage('email_taken'))
                      else {
                        const phoneErr = body?.errors?.phone
                        const phoneFirst = Array.isArray(phoneErr) ? phoneErr[0] : phoneErr
                        if (phoneFirst) alert(String(phoneFirst))
                        else alert('Не удалось отправить заявку. Проверьте поля и подключение к интернету.')
                      }
                    }
                  }}
                >
                  Подать заявку
                </Button>
              </div>
              <p className="muted small" style={{ marginTop: 14, lineHeight: 1.45 }}>
                <Link className="link" to="/auth/partner">
                  Уже есть аккаунт — войти
                </Link>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
