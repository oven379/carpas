import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import {
  AuthLegalConsent,
  BackNav,
  Button,
  Card,
  ComboBox,
  Field,
  Input,
  PhoneRuInput,
  ServiceHint,
} from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { hasDetailingSession, hasOwnerSession, setSessionDetailingId } from '../auth.js'
import { partnerApplyErrorMessage } from '../authPartnerMessages.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { formatPhoneRuInput } from '../../lib/format.js'
import { RUSSIAN_MILLION_PLUS_CITIES } from '../../lib/russianMillionCities.js'

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
              <BackNav to="/auth/partner" title="К форме входа" />
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
                  Укажите название, контакты, город и адрес. Стартовый пароль входа: <strong>1111</strong>. Список услуг
                  (детейлинг и ТО) заполняется на первом шаге настройки страницы детейлинга.
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
              <Field className="field--full" label="Город">
                <ComboBox
                  value={regCity}
                  options={RUSSIAN_MILLION_PLUS_CITIES}
                  placeholder="Города-миллионники в списке; можно ввести любой город"
                  maxItems={20}
                  onChange={(v) => setRegCity(v)}
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
                      setSessionDetailingId(String(res.detailing.id), res.token)
                      invalidateRepo()
                      nav('/detailing/landing', { replace: true })
                    } catch (e) {
                      const body = e?.body
                      const emailErr = body?.errors?.email
                      const first = Array.isArray(emailErr) ? emailErr[0] : emailErr
                      if (first === 'email_taken') alert(partnerApplyErrorMessage('email_taken'))
                      else alert('Не удалось отправить заявку. Проверьте поля и подключение к интернету.')
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
                . Забыли пароль — на экране входа нажмите «Забыли пароль?» и укажите почту организации.
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
