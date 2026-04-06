import { Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import {
  BackNav,
  Button,
  Card,
  ComboBox,
  DropdownCaretIcon,
  Field,
  HeroCoverStat,
  Input,
  PhoneRuInput,
  PageLoadSpinner,
  Pill,
  ServiceHint,
  Textarea,
} from '../components.jsx'
import { useRepo, refreshAllClientData } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import MediaBannerAvatarBlock from '../MediaBannerAvatarBlock.jsx'
import {
  DETAILING_ITEM_SET,
  DETAILING_SERVICES,
  MAINTENANCE_ITEM_SET,
  MAINTENANCE_SERVICES,
  OFFERED_SERVICE_MAX_LEN,
} from '../../lib/serviceCatalogs.js'
import { formatHttpErrorMessage } from '../../api/http.js'
import { RUSSIAN_MILLION_PLUS_CITIES } from '../../lib/russianMillionCities.js'
import { PHOTO_LANDSCAPE_HINT_SENTENCE } from '../../lib/historyVisitHints.js'
import { DETAILING_WORKING_HOURS_MAX_LEN, displayRuPhone, formatPhoneRuInput } from '../../lib/format.js'
import { resolvePublicMediaUrl, resolvedBackgroundImageUrl } from '../../lib/mediaUrl.js'

function ServiceGroupSelectAllCheckbox({ items, selectedList, onToggleGroup, groupLabel }) {
  const selectedCount = items.filter((x) => selectedList.includes(x)).length
  const all = items.length > 0 && selectedCount === items.length
  const some = selectedCount > 0 && !all
  const inputRef = useRef(null)
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = some
  }, [some, all, items.length])
  return (
    <label
      className="svc__selectAllLabel"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      title={all ? 'Снять все в категории' : 'Выбрать все в категории'}
    >
      <input
        ref={inputRef}
        type="checkbox"
        className="svc__selectAllInput"
        checked={all}
        onChange={(e) => {
          e.stopPropagation()
          onToggleGroup(items, e.target.checked)
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Выбрать все: ${groupLabel}`}
      />
    </label>
  )
}

export default function DetailingSettingsPage() {
  const nav = useNavigate()
  const r = useRepo()
  const { detailingId, mode, detailing, loading, applyDetailingSnapshot } = useDetailing()
  const [carsCount, setCarsCount] = useState(0)
  const [previewServicesExpanded, setPreviewServicesExpanded] = useState(false)

  const [draft, setDraft] = useState(() => ({
    name: '',
    servicesOffered: [],
    phone: '',
    city: '',
    address: '',
    description: '',
    workingHours: '',
    website: '',
    telegram: '',
    instagram: '',
    logo: '',
    cover: '',
  }))
  useEffect(() => {
    if (!detailing) return
    setDraft({
      name: detailing.name || '',
      servicesOffered: Array.isArray(detailing.servicesOffered) ? detailing.servicesOffered : [],
      phone: formatPhoneRuInput(detailing.phone || ''),
      city: detailing.city || '',
      address: detailing.address || '',
      description: detailing.description || '',
      workingHours: detailing.workingHours || '',
      website: detailing.website || '',
      telegram: detailing.telegram || '',
      instagram: detailing.instagram || '',
      logo: detailing.logo || '',
      cover: detailing.cover || '',
    })
  }, [detailing])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (mode !== 'detailing' || !detailingId) return
      try {
        const list = await r.listCars()
        if (!cancelled) setCarsCount(Array.isArray(list) ? list.length : 0)
      } catch {
        if (!cancelled) setCarsCount(0)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, detailingId, r, r._version])

  if (mode !== 'detailing' || !detailingId) return <Navigate to="/cars" replace />
  if (loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }
  if (!detailing) return <Navigate to="/cars" replace />
  const initials = String(draft.name || detailing.name || 'Д').trim().slice(0, 2).toUpperCase()
  const addressText = [draft.city, draft.address].filter(Boolean).join(', ')
  const { telHref: phonePreviewTel } = displayRuPhone(draft.phone)
  const previewCoverBg = resolvedBackgroundImageUrl(draft.cover)

  function toggleService(item) {
    const v = String(item || '').trim()
    if (!v) return
    setDraft((d) => {
      const cur = Array.isArray(d.servicesOffered) ? d.servicesOffered : []
      const has = cur.includes(v)
      const next = has ? cur.filter((x) => x !== v) : [...cur, v]
      return { ...d, servicesOffered: next }
    })
  }

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <span>Кабинет</span>
            <span> / </span>
            <span>Лендинг</span>
          </div>
          <div id="detailing-settings-intro" className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav
              fallbackTo={detailing.profileCompleted === false ? '/auth' : '/detailing'}
              title={detailing.profileCompleted === false ? 'К выбору входа' : 'Назад'}
            />
            <h1 className="h1" style={{ margin: 0 }}>
              Настройки лендинга
            </h1>
            <ServiceHint scopeId="detailing-settings-intro" variant="compact" label="Справка: настройки лендинга">
              <p className="serviceHint__panelText">
                Здесь задаётся публичная страница по ссылке <strong>/d/…</strong>: что увидят клиенты до визита. Кабинет подтягивает те
                же название, обложку и логотип для узнаваемости.
              </p>
              {detailing.profileCompleted === false ? (
                <p className="serviceHint__panelText" style={{ marginTop: 10 }}>
                  <strong>Первый вход:</strong> заполните все обязательные поля ниже: название, телефон, город, адрес, режим
                  работы и хотя бы одну услугу (детейлинг и/или ТО). Описание, сайт, соцсети, логотип и обложка — по желанию, на
                  завершение шага не влияют. Затем нажмите «Сохранить и перейти в кабинет» — откроется кабинет для работы с авто.
                </p>
              ) : null}
            </ServiceHint>
          </div>
        </div>
      </div>

      <Card className="card pad" style={{ marginTop: 12 }}>
        <div className="cardTitle" style={{ marginBottom: 10 }}>
          Предпросмотр лендинга (как увидят клиенты)
        </div>
        <div
          className="detHero detHero--card"
          style={previewCoverBg ? { backgroundImage: previewCoverBg } : undefined}
        >
          <div className="detHero__overlay detHero__overlay--card detHero__overlay--bannerMetrics">
            {draft.logo ? (
              <div className="detHero__logo detHero__logo--card">
                <img alt="Логотип" src={resolvePublicMediaUrl(draft.logo)} />
              </div>
            ) : (
              <div className="detHero__logo detHero__logo--card">
                <span aria-hidden="true">{initials}</span>
              </div>
            )}
            <div className="detHero__bottomRow">
              <div className="row gap wrap carHero__pills detHero__pills detHero__pills--right">
                <HeroCoverStat
                  kind="car"
                  variant="overlay"
                  value={carsCount}
                  label="на обслуживании"
                  title={`${carsCount} автомобилей на обслуживании`}
                />
              </div>
            </div>
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
                <p className="muted small" style={{ marginTop: 8, lineHeight: 1.45, whiteSpace: 'pre-wrap' }}>
                  {String(draft.workingHours).trim()}
                </p>
              ) : null}
              {draft.description ? (
                <p className="muted small" style={{ marginTop: 8, lineHeight: 1.55 }}>
                  {draft.description}
                </p>
              ) : (
                <p className="muted small" style={{ marginTop: 8 }}>
                  Добавьте описание — чем вы занимаетесь, режим работы, гарантия, подход.
                </p>
              )}
            </div>
            {phonePreviewTel ? (
              <a className="btn" data-variant="primary" href={phonePreviewTel} style={{ whiteSpace: 'nowrap' }}>
                Позвонить
              </a>
            ) : null}
          </div>
          {Array.isArray(draft.servicesOffered) && draft.servicesOffered.length ? (
            draft.servicesOffered.length > 3 ? (
              <div className="detailingSettings__servicesPreview detPublicServicesCard" style={{ marginTop: 10 }}>
                <button
                  type="button"
                  className="dropdownCaretBtn dropdownCaretBtn--floating detPublicServicesCard__expand"
                  aria-expanded={previewServicesExpanded ? 'true' : 'false'}
                  onClick={() => setPreviewServicesExpanded((v) => !v)}
                  title={previewServicesExpanded ? 'Свернуть' : 'Показать все услуги'}
                  aria-label={previewServicesExpanded ? 'Свернуть список услуг' : 'Развернуть список услуг'}
                >
                  <DropdownCaretIcon open={previewServicesExpanded} />
                </button>
                <div className="cardTitle detPublicServicesCard__title detPublicServicesCard__title--withExpand" style={{ margin: 0 }}>
                  Услуги
                </div>
                <div className="row gap wrap" style={{ marginTop: 8 }}>
                  {(previewServicesExpanded ? draft.servicesOffered : draft.servicesOffered.slice(0, 3)).map(
                    (s, i) => (
                      <Pill key={`${i}-${String(s)}`}>{s}</Pill>
                    ),
                  )}
                </div>
              </div>
            ) : (
              <div className="row gap wrap" style={{ marginTop: 10 }}>
                {draft.servicesOffered.map((s, i) => (
                  <Pill key={`${i}-${String(s)}`}>{s}</Pill>
                ))}
              </div>
            )
          ) : null}
        </div>
      </Card>

      <Card className="card pad" style={{ marginTop: 12 }}>
        <div className="topBorder" style={{ borderTop: 0, paddingTop: 0 }}>
          <p className="muted small detailingSettings__mediaLead">
            Логотип и обложка видны на публичной странице и в шапке кабинета.
            {detailing.profileCompleted === false ? (
              <> Для первого входа можно добавить позже — на переход в кабинет не влияет.</>
            ) : null}
          </p>
          <MediaBannerAvatarBlock
            variant="detailing"
            title="Внешний вид лендинга"
            avatarLabel="Логотип"
            bannerLabel="Настройка баннера"
            bannerUrl={draft.cover}
            avatarUrl={draft.logo}
            onBannerUrl={(url) => setDraft((d) => ({ ...d, cover: url }))}
            onAvatarUrl={(url) => setDraft((d) => ({ ...d, logo: url }))}
            avatarEmptyHint="Нажмите для загрузки"
            bannerEmptyHint="Нажмите — широкое фото: фасад, зал или работа"
            avatarRemoveLabel="Убрать логотип"
            bannerRemoveLabel="Убрать обложку"
            bannerHintSlot={
              <ServiceHint scopeId="detailing-settings-banner-hint" variant="compact" label="Справка: баннер">
                <p className="serviceHint__panelText">{PHOTO_LANDSCAPE_HINT_SENTENCE}</p>
              </ServiceHint>
            }
          />
        </div>

        <div className="topBorder">
          <div className="cardTitle" style={{ marginBottom: 8 }}>
            Текст и контакты на лендинге
          </div>
          <p className="muted small" style={{ margin: 0 }}>
            Название, адрес, телефон, услуги и ссылки — как на публичной странице по ссылке для клиентов.
          </p>
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
            <PhoneRuInput
              value={draft.phone}
              onChange={(e) => setDraft((d) => ({ ...d, phone: formatPhoneRuInput(e.target.value) }))}
              onBlur={() => setDraft((d) => ({ ...d, phone: formatPhoneRuInput(d.phone) }))}
              autoComplete="tel"
            />
          </Field>
          <Field label="Город">
            <ComboBox
              value={draft.city}
              options={RUSSIAN_MILLION_PLUS_CITIES}
              placeholder="Города-миллионники в списке; можно ввести любой город"
              maxItems={20}
              onChange={(v) => setDraft((d) => ({ ...d, city: v }))}
            />
          </Field>
          <Field
            label="Адрес"
            hint={detailing.profileCompleted === false ? 'Обязательно при первой настройке' : 'необязательно'}
          >
            <Input
              className="input"
              value={draft.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              placeholder="Улица, дом"
              autoComplete="street-address"
            />
          </Field>
          <Field
            className="field--full"
            label="Режим работы"
            hint={
              detailing.profileCompleted === false
                ? 'Обязательно при первой настройке · на лендинге /d/… и в шапке кабинета'
                : 'на лендинге /d/… и в шапке кабинета'
            }
          >
            <Textarea
              className="textarea"
              rows={2}
              maxLength={DETAILING_WORKING_HOURS_MAX_LEN}
              value={draft.workingHours}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  workingHours: String(e.target.value).slice(0, DETAILING_WORKING_HOURS_MAX_LEN),
                }))
              }
              placeholder="Например: Пн–Пт 10:00–20:00, Сб 11:00–17:00"
            />
          </Field>
          <div className="field field--full serviceHint__fieldWrap" id="detailing-settings-services">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Услуги</span>
              <ServiceHint scopeId="detailing-settings-services" variant="compact" label="Справка: услуги на лендинге">
                <p className="serviceHint__panelText">
                  Отметьте детейлинг и ТО, что предлагаете клиентам на публичной странице.
                  {detailing.profileCompleted === false ? (
                    <>
                      {' '}
                      <strong>При первой настройке</strong> отметьте хотя бы одну услугу — без этого переход в кабинет недоступен.
                    </>
                  ) : null}
                </p>
              </ServiceHint>
            </div>
            <p className="muted small" style={{ margin: '0 0 8px' }}>
              Детейлинг
            </p>
            <div className="svc svc--compact">
              {DETAILING_SERVICES.map((g) => {
                const items = Array.isArray(g.items) ? g.items : []
                const selected = items.filter((x) => draft.servicesOffered.includes(x)).length
                return (
                  <details key={`d-${g.group}`} className="svc__group" open={selected > 0}>
                    <summary className="svc__title">
                      <span>{g.group}</span>
                      <span className="svc__count">{selected ? `${selected}/${items.length}` : `${items.length}`}</span>
                    </summary>
                    <div className="svc__grid">
                      {items.map((it) => {
                        const checked = draft.servicesOffered.includes(it)
                        return (
                          <label key={it} className="svc__item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleService(it)}
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
            <p className="muted small" style={{ margin: '14px 0 8px' }}>
              ТО и ремонт
            </p>
            <div className="svc svc--compact">
              {MAINTENANCE_SERVICES.map((g) => {
                const items = Array.isArray(g.items) ? g.items : []
                const selected = items.filter((x) => draft.servicesOffered.includes(x)).length
                return (
                  <details key={`m-${g.group}`} className="svc__group" open={selected > 0}>
                    <summary className="svc__title">
                      <span>{g.group}</span>
                      <span className="svc__count">{selected ? `${selected}/${items.length}` : `${items.length}`}</span>
                    </summary>
                    <div className="svc__grid">
                      {items.map((it) => {
                        const checked = draft.servicesOffered.includes(it)
                        return (
                          <label key={it} className="svc__item">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleService(it)}
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
          </div>
          <Field className="field--full" label="Описание" hint="необязательно">
            <Textarea
              className="textarea"
              rows={4}
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              placeholder="Коротко: специализация, гарантия, чем отличаетесь…"
            />
          </Field>
          <Field label="Сайт" hint="необязательно">
            <Input
              className="input"
              value={draft.website}
              onChange={(e) => setDraft((d) => ({ ...d, website: e.target.value }))}
              placeholder="https://…"
              inputMode="url"
            />
          </Field>
          <Field label="Telegram" hint="необязательно">
            <Input
              className="input"
              value={draft.telegram}
              onChange={(e) => setDraft((d) => ({ ...d, telegram: e.target.value }))}
              placeholder="@username или ссылка"
            />
          </Field>
          <Field label="Instagram" hint="необязательно">
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
            onClick={async () => {
              const firstSetup = detailing.profileCompleted === false
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
              if (firstSetup) {
                if (!String(draft.address || '').trim()) {
                  alert('Укажите адрес — он отображается клиентам на лендинге')
                  return
                }
                if (!String(draft.workingHours || '').trim()) {
                  alert('Укажите режим работы')
                  return
                }
              }
              if (!Array.isArray(draft.servicesOffered) || draft.servicesOffered.length === 0) {
                alert('Выберите хотя бы одну услугу')
                return
              }
              try {
                const res = await r.updateDetailingMe({ ...draft, profileCompleted: true })
                if (res?.detailing) applyDetailingSnapshot(res.detailing)
                refreshAllClientData()
                nav('/detailing', { replace: true })
              } catch (e) {
                alert(formatHttpErrorMessage(e, 'Не удалось сохранить настройки.'))
              }
            }}
          >
            {detailing.profileCompleted === false ? 'Сохранить и перейти в кабинет' : 'Сохранить'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

