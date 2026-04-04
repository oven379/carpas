import { Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useState } from 'react'
import { BackNav, Button, Card, Field, Input, Pill, ServiceHint, Textarea } from '../components.jsx'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import { DETAILING_WORKING_HOURS_MAX_LEN, formatPhoneRuInput } from '../../lib/format.js'
import { DETAILING_ADDRESS_YANDEX_HINT, isWholeLineYandexMapsUrl } from '../../lib/mapsLinks.js'
import MediaBannerAvatarBlock from '../MediaBannerAvatarBlock.jsx'
import {
  dedupeOfferedStrings,
  DETAILING_SERVICES,
  MAINTENANCE_SERVICES,
  OFFERED_SERVICE_MAX_LEN,
} from '../../lib/serviceCatalogs.js'
import OfferedServiceTagsRow from '../OfferedServiceTagsRow.jsx'

export default function DetailingSettingsPage() {
  const nav = useNavigate()
  const r = useRepo()
  const { detailingId, mode } = useDetailing()

  const detailing = useMemo(() => {
    if (!detailingId) return null
    return r.getDetailing?.(detailingId) || null
  }, [r, detailingId])

  const [draft, setDraft] = useState(() => ({
    name: '',
    detailingServicesOffered: [],
    maintenanceServicesOffered: [],
    phone: '',
    city: '',
    address: '',
    workingHours: '',
    description: '',
    website: '',
    telegram: '',
    instagram: '',
    logo: '',
    cover: '',
  }))
  const [customDet, setCustomDet] = useState('')
  const [customMaint, setCustomMaint] = useState('')
  useEffect(() => {
    if (!detailingId) return
    const d = r.getDetailing?.(detailingId)
    if (!d) return
    setDraft({
      name: d.name || '',
      detailingServicesOffered: Array.isArray(d.detailingServicesOffered) ? [...d.detailingServicesOffered] : [],
      maintenanceServicesOffered: Array.isArray(d.maintenanceServicesOffered) ? [...d.maintenanceServicesOffered] : [],
      phone: d.phone || '',
      city: d.city || '',
      address: d.address || '',
      workingHours: d.workingHours || '',
      description: d.description || '',
      website: d.website || '',
      telegram: d.telegram || '',
      instagram: d.instagram || '',
      logo: d.logo || '',
      cover: d.cover || '',
    })
  }, [detailingId, r])

  if (mode !== 'detailing' || !detailingId) return <Navigate to="/cars" replace />
  if (!detailing) return <Navigate to="/cars" replace />

  const initials = String(draft.name || detailing.name || 'Д').trim().slice(0, 2).toUpperCase()
  const draftAddrRaw = String(draft.address || '').trim()
  const addressText = isWholeLineYandexMapsUrl(draftAddrRaw)
    ? String(draft.city || '').trim()
      ? `${String(draft.city).trim()} · точка из Яндекс.Карт`
      : 'Указана ссылка на Яндекс.Карты'
    : [draft.city, draft.address].filter(Boolean).join(', ')
  const phoneDigits = String(draft.phone || '').replace(/[^\d+]/g, '')
  const phoneHref = phoneDigits ? `tel:${phoneDigits}` : ''

  function toggleService(bucket, item) {
    const v = String(item || '').trim()
    if (!v) return
    const key = bucket === 'det' ? 'detailingServicesOffered' : 'maintenanceServicesOffered'
    setDraft((d) => {
      const cur = Array.isArray(d[key]) ? d[key] : []
      const has = cur.includes(v)
      const next = has ? cur.filter((x) => x !== v) : [...cur, v]
      return { ...d, [key]: next }
    })
  }

  function addCustom(bucket) {
    const raw = bucket === 'det' ? customDet : customMaint
    const v = String(raw || '')
      .trim()
      .slice(0, OFFERED_SERVICE_MAX_LEN)
    if (!v) return
    const lower = v.toLowerCase()
    const key = bucket === 'det' ? 'detailingServicesOffered' : 'maintenanceServicesOffered'
    setDraft((d) => {
      const cur = Array.isArray(d[key]) ? d[key] : []
      if (cur.some((x) => String(x).toLowerCase() === lower)) return d
      return { ...d, [key]: [...cur, v] }
    })
    if (bucket === 'det') setCustomDet('')
    else setCustomMaint('')
  }

  function removeFromBucket(bucket, label) {
    const key = bucket === 'det' ? 'detailingServicesOffered' : 'maintenanceServicesOffered'
    setDraft((d) => ({
      ...d,
      [key]: (Array.isArray(d[key]) ? d[key] : []).filter((x) => x !== label),
    }))
  }

  const previewServices = dedupeOfferedStrings([
    ...(draft.detailingServicesOffered || []),
    ...(draft.maintenanceServicesOffered || []),
  ])

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <span>Кабинет</span>
            <span> / </span>
            <span>Лендинг</span>
          </div>
          <div id="detailing-settings-hint-scope" className="serviceHint__pageBlock">
            <div className="serviceHint__pageBlockRow row gap wrap" style={{ alignItems: 'center' }}>
              <BackNav />
              <h1 className="h1">Настройки лендинга</h1>
              <ServiceHint scopeId="detailing-settings-hint-scope" variant="compact" label="Справка о лендинге">
                <p className="serviceHint__panelText">
                  Здесь настраивается публичная страница по ссылке <span className="mono">/d/…</span> — что увидят клиенты до визита. В шапке
                  кабинета используются те же название, обложка и логотип.
                </p>
                {detailing.profileCompleted === false ? (
                  <p className="serviceHint__panelText">
                    <strong>Первый вход:</strong> заполните данные о сервисе и нажмите «Сохранить» — откроется ваша публичная
                    страница с этими данными. Оттуда можно перейти в кабинет и добавить первое авто на обслуживание.
                  </p>
                ) : null}
              </ServiceHint>
            </div>
          </div>
        </div>
      </div>

      <Card className="card pad" style={{ marginTop: 12 }}>
        <div className="cardTitle" style={{ marginBottom: 10 }}>
          Предпросмотр лендинга (как увидят клиенты)
        </div>
        <div
          className="detHero detHero--card"
          style={draft.cover ? { backgroundImage: `url("${String(draft.cover).replaceAll('"', '%22')}")` } : undefined}
        >
          <div className="detHero__overlay detHero__overlay--card">
            {draft.logo ? (
              <div className="detHero__logo detHero__logo--card">
                <img alt="Логотип" src={draft.logo} />
              </div>
            ) : (
              <div className="detHero__logo detHero__logo--card">
                <span aria-hidden="true">{initials}</span>
              </div>
            )}
          </div>
        </div>

        <div className="topBorder">
          <div className="row spread gap" style={{ alignItems: 'flex-start' }}>
            <div style={{ minWidth: 0 }}>
              <div className="h2" style={{ margin: 0 }}>
                {draft.name || 'Название студии / СТО'}
              </div>
              <p className="muted" style={{ marginTop: 8 }}>
                {addressText || 'Город и адрес'}
              </p>
              {String(draft.workingHours || '').trim() ? (
                <p className="muted small" style={{ marginTop: 6, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                  {String(draft.workingHours || '').trim()}
                </p>
              ) : null}
              {draft.description ? (
                <p className="muted small" style={{ marginTop: 8, lineHeight: 1.55 }}>
                  {draft.description}
                </p>
              ) : (
                <p className="muted small" style={{ marginTop: 8 }}>
                  Добавьте описание — специализация, гарантия, подход к клиенту.
                </p>
              )}
            </div>
            {draft.phone ? (
              <a className="btn" data-variant="primary" href={phoneHref} style={{ whiteSpace: 'nowrap' }}>
                Позвонить
              </a>
            ) : null}
          </div>
          {previewServices.length ? (
            <div className="row gap wrap" style={{ marginTop: 10 }}>
              {previewServices.slice(0, 10).map((s) => (
                <Pill key={s}>{s}</Pill>
              ))}
              {previewServices.length > 10 ? <Pill>+ ещё</Pill> : null}
            </div>
          ) : null}
        </div>
      </Card>

      <Card className="card pad" style={{ marginTop: 12 }}>
        <div className="topBorder" style={{ borderTop: 0, paddingTop: 0 }}>
          <div id="detailing-appearance-hint" className="row gap wrap" style={{ alignItems: 'center', marginBottom: 12 }}>
            <div className="cardTitle" style={{ margin: 0 }}>
              Внешний вид лендинга
            </div>
            <ServiceHint scopeId="detailing-appearance-hint" variant="compact" label="Справка: логотип и обложка">
              <p className="serviceHint__panelText">
                Баннер — широкое фото (фасад, зал). Аватар — логотип, лучше квадрат. Удаление — иконки на превью. Оба показываются на{' '}
                <span className="mono">/d/…</span> и в шапке кабинета.
              </p>
            </ServiceHint>
          </div>
          <MediaBannerAvatarBlock
            variant="detailing"
            bannerUrl={draft.cover}
            avatarUrl={draft.logo}
            onBannerUrl={(url) => setDraft((d) => ({ ...d, cover: url }))}
            onAvatarUrl={(url) => setDraft((d) => ({ ...d, logo: url }))}
          />
        </div>

        <div className="topBorder">
          <div id="detailing-contacts-hint" className="row gap wrap" style={{ alignItems: 'center', marginBottom: 8 }}>
            <div className="cardTitle" style={{ margin: 0 }}>
              Текст и контакты на лендинге
            </div>
            <ServiceHint scopeId="detailing-contacts-hint" variant="compact" label="Справка: блок контактов">
              <p className="serviceHint__panelText">
                Название, адрес, режим работы, телефон, услуги и ссылки отображаются на публичной странице{' '}
                <span className="mono">/d/…</span> так, как их видят клиенты.
              </p>
            </ServiceHint>
          </div>
        </div>

        <div className="formGrid">
          <Field label="Название">
            <Input
              className="input"
              value={draft.name}
              onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
              placeholder="Название студии / СТО"
              autoComplete="organization"
            />
          </Field>
          <Field label="Телефон">
            <Input
              className="input"
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: formatPhoneRuInput(e.target.value) }))}
              placeholder="+7 …"
              autoComplete="tel"
              inputMode="tel"
            />
          </Field>
          <Field label="Город">
            <Input
              className="input"
              value={draft.city}
              onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
              placeholder="Например: Москва"
              autoComplete="address-level2"
            />
          </Field>
          <div className="field serviceHint__fieldWrap" id="detailing-settings-hint-address">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Адрес</span>
              <ServiceHint scopeId="detailing-settings-hint-address" label="Справка: адрес и Яндекс.Карты">
                <p className="serviceHint__panelText">{DETAILING_ADDRESS_YANDEX_HINT}</p>
              </ServiceHint>
            </div>
            <Input
              className="input"
              value={draft.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              placeholder="Улица, дом или ссылка из Яндекс.Карт"
              autoComplete="street-address"
            />
          </div>
          <Field
            className="field--full"
            label="Режим работы"
            hint="Показывается на публичной странице сервиса в блоке контактов. Можно с новой строки для каждого дня."
          >
            <Textarea
              className="textarea"
              rows={2}
              value={draft.workingHours}
              maxLength={DETAILING_WORKING_HOURS_MAX_LEN}
              onChange={(e) => setDraft((d) => ({ ...d, workingHours: e.target.value }))}
              placeholder="Например: Пн–Пт 9:00–20:00, Сб 10:00–18:00, вс — выходной"
            />
          </Field>
          <div className="field field--full serviceHint__fieldWrap" id="detailing-services-hint">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label field__label--servicesLead">Услуги</span>
              <ServiceHint scopeId="detailing-services-hint" label="Справка: услуги">
                <p className="serviceHint__panelText">
                  Отметьте детейлинг и/или ТО. Нет в списке — допишите свою строку: она сохранится в профиле и появится в
                  выпадающих списках при оформлении визитов. Список также виден на публичном лендинге.
                </p>
              </ServiceHint>
            </div>
            <p className="muted small" style={{ margin: '0 0 8px' }}>
              Детейлинг
            </p>
            <div className="svc svc--compact">
              {DETAILING_SERVICES.map((g) => {
                const items = Array.isArray(g.items) ? g.items : []
                const selected = items.filter((x) => draft.detailingServicesOffered.includes(x)).length
                return (
                  <details key={`d-${g.group}`} className="svc__group" open={selected > 0}>
                    <summary className="svc__title">
                      <span>{g.group}</span>
                      <span className="svc__count">{selected ? `${selected}/${items.length}` : `${items.length}`}</span>
                    </summary>
                    <div className="svc__grid">
                      {items.map((it) => {
                        const checked = draft.detailingServicesOffered.includes(it)
                        return (
                          <label key={it} className="svc__item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleService('det', it)}
                            />
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
              items={draft.detailingServicesOffered}
              onRemove={(s) => removeFromBucket('det', s)}
              emptyHint="Пока ничего не выбрано — отметьте услуги в списке выше или добавьте свою строку ниже."
              ariaLabel="Выбранные услуги детейлинга"
            />
            <div className="row gap wrap" style={{ marginTop: 10, alignItems: 'center' }}>
              <Input
                className="input"
                style={{ flex: 1, minWidth: 160 }}
                value={customDet}
                onChange={(e) => setCustomDet(e.target.value)}
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
                const selected = items.filter((x) => draft.maintenanceServicesOffered.includes(x)).length
                return (
                  <details key={`m-${g.group}`} className="svc__group" open={selected > 0}>
                    <summary className="svc__title">
                      <span>{g.group}</span>
                      <span className="svc__count">{selected ? `${selected}/${items.length}` : `${items.length}`}</span>
                    </summary>
                    <div className="svc__grid">
                      {items.map((it) => {
                        const checked = draft.maintenanceServicesOffered.includes(it)
                        return (
                          <label key={it} className="svc__item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleService('maint', it)}
                            />
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
              items={draft.maintenanceServicesOffered}
              onRemove={(s) => removeFromBucket('maint', s)}
              emptyHint="Пока ничего не выбрано — отметьте услуги ТО в списке выше или добавьте свою строку ниже."
              ariaLabel="Выбранные услуги ТО"
            />
            <div className="row gap wrap" style={{ marginTop: 10, alignItems: 'center' }}>
              <Input
                className="input"
                style={{ flex: 1, minWidth: 160 }}
                value={customMaint}
                onChange={(e) => setCustomMaint(e.target.value)}
                maxLength={OFFERED_SERVICE_MAX_LEN}
                placeholder="Своя услуга ТО, если нет в списке"
              />
              <button type="button" className="btn" data-variant="outline" onClick={() => addCustom('maint')}>
                Добавить
              </button>
            </div>
          </div>
          <Field className="field--full" label="Описание">
            <Textarea
              className="textarea"
              rows={4}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Коротко: чем занимаетесь, режим работы, гарантия…"
            />
          </Field>
          <Field label="Сайт">
            <Input
              className="input"
              value={draft.website}
              onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
              placeholder="https://…"
              inputMode="url"
            />
          </Field>
          <Field label="Telegram">
            <Input
              className="input"
              value={draft.telegram}
              onChange={(e) => setDraft((d) => ({ ...d, telegram: e.target.value }))}
              placeholder="@username или ссылка"
            />
          </Field>
          <Field label="Instagram">
            <Input
              className="input"
              value={draft.instagram}
              onChange={(e) => setDraft((d) => ({ ...d, instagram: e.target.value }))}
              placeholder="@username или ссылка"
            />
          </Field>
        </div>

        <div className="row gap topBorder">
          <Button
            className="btn"
            variant="primary"
            onClick={() => {
              if (!String(draft.name || '').trim()) {
                alert('Укажите название')
                return
              }
              if (!String(draft.phone || '').trim()) {
                alert('Укажите телефон')
                return
              }
              if (!String(draft.city || '').trim()) {
                alert('Укажите город')
                return
              }
              const detL = dedupeOfferedStrings(draft.detailingServicesOffered)
              const maintL = dedupeOfferedStrings(draft.maintenanceServicesOffered)
              if (!detL.length && !maintL.length) {
                alert('Выберите хотя бы одну услугу')
                return
              }
              const saved = r.updateDetailing?.(
                detailingId,
                {
                  name: draft.name,
                  phone: draft.phone,
                  city: draft.city,
                  address: draft.address,
                  workingHours: draft.workingHours,
                  description: draft.description,
                  website: draft.website,
                  telegram: draft.telegram,
                  instagram: draft.instagram,
                  logo: draft.logo,
                  cover: draft.cover,
                  detailingServicesOffered: detL,
                  maintenanceServicesOffered: maintL,
                  profileCompleted: true,
                },
                { detailingId },
              )
              if (!saved) {
                alert('Не удалось сохранить настройки (нет доступа).')
                return
              }
              const wasFirstSetup = detailing.profileCompleted === false
              invalidateRepo()
              if (wasFirstSetup) {
                nav(`/d/${encodeURIComponent(String(detailingId))}?from=setup`, { replace: true })
              } else {
                nav('/detailing', { replace: true })
              }
            }}
          >
            Сохранить
          </Button>
        </div>
      </Card>
    </div>
  )
}

