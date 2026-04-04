import { useState } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { BackNav, Button, Card, Field, Input, ServiceHint, Textarea } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { setSessionDetailingId } from '../auth.js'
import { partnerApplyErrorMessage } from '../authPartnerMessages.js'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { DETAILING_WORKING_HOURS_MAX_LEN, formatPhoneRuInput } from '../../lib/format.js'
import { DETAILING_ADDRESS_YANDEX_HINT } from '../../lib/mapsLinks.js'
import {
  dedupeOfferedStrings,
  DETAILING_SERVICES,
  MAINTENANCE_SERVICES,
  OFFERED_SERVICE_MAX_LEN,
} from '../../lib/serviceCatalogs.js'
import OfferedServiceTagsRow from '../OfferedServiceTagsRow.jsx'

export default function PartnerApplyPage() {
  const r = useRepo()
  const { mode, detailing, owner } = useDetailing()
  const [regName, setRegName] = useState('')
  const [regContactName, setRegContactName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPhone, setRegPhone] = useState('')
  const [regCity, setRegCity] = useState('')
  const [regAddress, setRegAddress] = useState('')
  const [regWorkingHours, setRegWorkingHours] = useState('')
  const [regDetailingServices, setRegDetailingServices] = useState([])
  const [regMaintenanceServices, setRegMaintenanceServices] = useState([])
  const [regCustomDet, setRegCustomDet] = useState('')
  const [regCustomMaint, setRegCustomMaint] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const nav = useNavigate()
  const loc = useLocation()
  const from = loc.state?.from || '/'

  if (mode === 'owner' && owner?.email) return <Navigate to="/cars" replace />
  if (mode === 'detailing') {
    if (detailingOnboardingPending(mode, detailing)) return <Navigate to="/detailing/landing" replace />
    return <Navigate to="/detailing" replace />
  }

  function toggleService(bucket, item) {
    const v = String(item || '').trim()
    if (!v) return
    if (bucket === 'det') {
      setRegDetailingServices((cur) => {
        const has = cur.includes(v)
        return has ? cur.filter((x) => x !== v) : [...cur, v]
      })
    } else {
      setRegMaintenanceServices((cur) => {
        const has = cur.includes(v)
        return has ? cur.filter((x) => x !== v) : [...cur, v]
      })
    }
  }

  function addCustom(bucket) {
    const raw = bucket === 'det' ? regCustomDet : regCustomMaint
    const v = String(raw || '')
      .trim()
      .slice(0, OFFERED_SERVICE_MAX_LEN)
    if (!v) return
    const lower = v.toLowerCase()
    if (bucket === 'det') {
      setRegDetailingServices((cur) =>
        cur.some((x) => String(x).toLowerCase() === lower) ? cur : [...cur, v],
      )
      setRegCustomDet('')
    } else {
      setRegMaintenanceServices((cur) =>
        cur.some((x) => String(x).toLowerCase() === lower) ? cur : [...cur, v],
      )
      setRegCustomMaint('')
    }
  }

  function removeFromReg(bucket, label) {
    if (bucket === 'det') {
      setRegDetailingServices((cur) => cur.filter((x) => x !== label))
    } else {
      setRegMaintenanceServices((cur) => cur.filter((x) => x !== label))
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
            </div>
          </div>
        </aside>

        <div className="authSplit__formCol">
          <Card className="card pad authSplit__formCard">
            <div id="partner-apply-hint" className="row gap wrap" style={{ alignItems: 'center', marginBottom: 14 }}>
              <div className="cardTitle" style={{ margin: 0 }}>
                Заявка партнёра
              </div>
              <ServiceHint scopeId="partner-apply-hint" variant="compact" label="Справка по заявке">
                <p className="serviceHint__panelText">
                  Заполните название, контакты, город и адрес, отметьте услуги детейлинга и/или ТО (можно дописать свою
                  строку). Этот список потом попадёт в выпадающие поля при оформлении визитов. Стартовый пароль входа:{' '}
                  <strong>1111</strong>. После отправки откроется настройка лендинга и кабинет.
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
              <Field className="field--full" label="Имя">
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
                  onChange={(e) => setRegPhone(formatPhoneRuInput(e.target.value))}
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
              <div className="field field--full serviceHint__fieldWrap" id="partner-apply-hint-address">
                <div className="field__top serviceHint__fieldTop">
                  <span className="field__label">Адрес</span>
                  <ServiceHint scopeId="partner-apply-hint-address" label="Справка: адрес и Яндекс.Карты">
                    <p className="serviceHint__panelText">{DETAILING_ADDRESS_YANDEX_HINT}</p>
                  </ServiceHint>
                </div>
                <Input
                  className="input"
                  value={regAddress}
                  onChange={(e) => setRegAddress(e.target.value)}
                  placeholder="Улица, дом или ссылка из Яндекс.Карт"
                  autoComplete="street-address"
                />
              </div>
              <Field
                className="field--full"
                label="Режим работы"
                hint="Необязательно при заявке; потом можно заполнить в настройках лендинга. На витрине /d/… показывается клиентам."
              >
                <Textarea
                  className="textarea"
                  rows={2}
                  value={regWorkingHours}
                  maxLength={DETAILING_WORKING_HOURS_MAX_LEN}
                  onChange={(e) => setRegWorkingHours(e.target.value)}
                  placeholder="Например: Пн–Пт 9:00–20:00, Сб 10:00–18:00"
                />
              </Field>
              <div className="field field--full serviceHint__fieldWrap" id="partner-apply-services-hint">
                <div className="field__top serviceHint__fieldTop">
                  <span className="field__label field__label--servicesLead">Услуги</span>
                  <ServiceHint scopeId="partner-apply-services-hint" label="Справка: услуги">
                    <p className="serviceHint__panelText">
                      Отметьте детейлинг и/или ТО. Нет в списке — введите название ниже и нажмите «Добавить»: строка
                      сохранится в профиле и появится при выборе услуг в визите.
                    </p>
                  </ServiceHint>
                </div>
                <p className="muted small" style={{ margin: '0 0 8px' }}>
                  Детейлинг
                </p>
                <div className="svc svc--compact">
                  {DETAILING_SERVICES.map((g) => {
                    const items = Array.isArray(g.items) ? g.items : []
                    const selected = items.filter((x) => regDetailingServices.includes(x)).length
                    return (
                      <details key={`d-${g.group}`} className="svc__group" open={selected > 0}>
                        <summary className="svc__title">
                          <span>{g.group}</span>
                          <span className="svc__count">{selected ? `${selected}/${items.length}` : `${items.length}`}</span>
                        </summary>
                        <div className="svc__grid">
                          {items.map((it) => {
                            const checked = regDetailingServices.includes(it)
                            return (
                              <label key={it} className="svc__item">
                                <input type="checkbox" checked={checked} onChange={() => toggleService('det', it)} />
                                <span>{it}</span>
                              </label>
                            )
                          })}
                        </div>
                      </details>
                    )
                  })}
                </div>
                <OfferedServiceTagsRow
                  items={regDetailingServices}
                  onRemove={(s) => removeFromReg('det', s)}
                  emptyHint="Пока ничего не выбрано — отметьте услуги в списке выше или добавьте свою строку ниже."
                  ariaLabel="Выбранные услуги детейлинга"
                />
                <div className="row gap wrap" style={{ marginTop: 10, alignItems: 'center' }}>
                  <Input
                    className="input"
                    style={{ flex: 1, minWidth: 160 }}
                    value={regCustomDet}
                    onChange={(e) => setRegCustomDet(e.target.value)}
                    maxLength={OFFERED_SERVICE_MAX_LEN}
                    placeholder="Своя услуга детейлинга, если нет в списке"
                  />
                  <button type="button" className="btn" data-variant="outline" onClick={() => addCustom('det')}>
                    Добавить
                  </button>
                </div>
                <p className="muted small" style={{ margin: '14px 0 8px' }}>
                  ТО и ремонт
                </p>
                <div className="svc svc--compact">
                  {MAINTENANCE_SERVICES.map((g) => {
                    const items = Array.isArray(g.items) ? g.items : []
                    const selected = items.filter((x) => regMaintenanceServices.includes(x)).length
                    return (
                      <details key={`m-${g.group}`} className="svc__group" open={selected > 0}>
                        <summary className="svc__title">
                          <span>{g.group}</span>
                          <span className="svc__count">{selected ? `${selected}/${items.length}` : `${items.length}`}</span>
                        </summary>
                        <div className="svc__grid">
                          {items.map((it) => {
                            const checked = regMaintenanceServices.includes(it)
                            return (
                              <label key={it} className="svc__item">
                                <input type="checkbox" checked={checked} onChange={() => toggleService('maint', it)} />
                                <span>{it}</span>
                              </label>
                            )
                          })}
                        </div>
                      </details>
                    )
                  })}
                </div>
                <OfferedServiceTagsRow
                  items={regMaintenanceServices}
                  onRemove={(s) => removeFromReg('maint', s)}
                  emptyHint="Пока ничего не выбрано — отметьте услуги ТО в списке выше или добавьте свою строку ниже."
                  ariaLabel="Выбранные услуги ТО"
                />
                <div className="row gap wrap" style={{ marginTop: 10, alignItems: 'center' }}>
                  <Input
                    className="input"
                    style={{ flex: 1, minWidth: 160 }}
                    value={regCustomMaint}
                    onChange={(e) => setRegCustomMaint(e.target.value)}
                    maxLength={OFFERED_SERVICE_MAX_LEN}
                    placeholder="Своя услуга ТО, если нет в списке"
                  />
                  <button type="button" className="btn" data-variant="outline" onClick={() => addCustom('maint')}>
                    Добавить
                  </button>
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
                  onClick={() => {
                    if (!agreedToTerms) {
                      alert('Подтвердите согласие с политикой конфиденциальности и правилами использования сервиса.')
                      return
                    }
                    const detList = dedupeOfferedStrings(regDetailingServices)
                    const maintList = dedupeOfferedStrings(regMaintenanceServices)
                    if (!detList.length && !maintList.length) {
                      alert('Выберите хотя бы одну услугу детейлинга и/или ТО или добавьте свою строку.')
                      return
                    }
                    const d = r.registerDetailing({
                      name: regName,
                      contactName: regContactName,
                      email: regEmail,
                      phone: regPhone,
                      city: regCity,
                      address: regAddress,
                      workingHours: regWorkingHours,
                      detailingServicesOffered: detList,
                      maintenanceServicesOffered: maintList,
                    })
                    if (d?.error) {
                      alert(partnerApplyErrorMessage(d.error))
                      return
                    }
                    setSessionDetailingId(d.id)
                    invalidateRepo()
                    nav('/detailing/landing', { replace: true })
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
