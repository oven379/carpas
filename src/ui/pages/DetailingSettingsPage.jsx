import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BackNav,
  Button,
  Card,
  CityComboBox,
  ComboBox,
  Field,
  Input,
  PhoneRuInput,
  PageLoadSpinner,
  Pill,
  ServiceHint,
  Textarea,
} from '../components.jsx'
import { useRepo, invalidateRepo, refreshAllClientData } from '../useRepo.js'
import { useDetailing } from '../useDetailing.js'
import { clearSession } from '../auth.js'
import { publicDetailingPath } from '../serviceLinkUi.js'
import MediaBannerAvatarBlock from '../MediaBannerAvatarBlock.jsx'
import {
  DETAILING_ITEM_SET,
  DETAILING_SERVICES,
  MAINTENANCE_ITEM_SET,
  MAINTENANCE_SERVICES,
  OFFERED_SERVICE_MAX_LEN,
  dedupeOfferedStrings,
} from '../../lib/serviceCatalogs.js'
import { formatHttpErrorMessage } from '../../api/http.js'
import { createBlurFixRuFreeText } from '../../lib/fixQwertyLayoutToRussian.js'
import {
  CITY_FIELD_DD_HINT,
  DETAILING_CUSTOM_OFFER_INPUT_MAX_LEN,
  DETAILING_WORKING_HOURS_MAX_LEN,
  formatPhoneRuInput,
  PHOTO_UPLOAD_HINTS_PARAGRAPH,
} from '../../lib/format.js'

/** Локальное превью до сохранения: не подменять значением с сервера при фоновом GET /me. */
function isPendingLocalMediaDraft(s) {
  const v = String(s || '').trim()
  if (!v) return false
  const low = v.toLowerCase()
  return low.startsWith('data:') || low.startsWith('blob:')
}

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
  const [customOfferInput, setCustomOfferInput] = useState('')
  const [customCatInputs, setCustomCatInputs] = useState({})

  const [draft, setDraft] = useState(() => ({
    name: '',
    servicesOffered: [],
    customServiceCategories: [],
    phone: '',
    city: '',
    address: '',
    inn: '',
    legalName: '',
    masterName: '',
    warrantyText: '',
    description: '',
    workingHours: '',
    website: '',
    telegram: '',
    instagram: '',
    logo: '',
    cover: '',
  }))
  /** Только смена аккаунта (id), не каждый новый объект с GET /me — иначе фоновый refetch затирает черновик (режим работы и др.). */
  const detailingHydrateId = detailing ? String(detailing.id) : ''
  useEffect(() => {
    if (!detailing) return
    setDraft({
      name: detailing.name || '',
      servicesOffered: Array.isArray(detailing.servicesOffered) ? detailing.servicesOffered : [],
      customServiceCategories: Array.isArray(detailing.customServiceCategories)
        ? detailing.customServiceCategories.map((c, i) => ({ ...c, _id: String(i) }))
        : [],
      phone: formatPhoneRuInput(detailing.phone || ''),
      city: detailing.city || '',
      address: detailing.address || '',
      inn: detailing.inn || '',
      legalName: detailing.legalName || '',
      masterName: detailing.masterName || '',
      warrantyText: detailing.warrantyText || '',
      description: detailing.description || '',
      workingHours: String(detailing.workingHours ?? detailing.working_hours ?? '').trim() || '',
      website: detailing.website || '',
      telegram: detailing.telegram || '',
      instagram: detailing.instagram || '',
      logo: detailing.logo || '',
      cover: detailing.cover || '',
    })
  }, [detailingHydrateId]) // eslint-disable-line react-hooks/exhaustive-deps -- только id: иначе любой refetch /me затирает форму

  /** Логотип/обложка с API после PATCH или фонового GET /me — не затираем несохранённый data: из превью загрузки. */
  useEffect(() => {
    if (!detailing) return
    const logo = detailing.logo || ''
    const cover = detailing.cover || ''
    setDraft((d) => {
      const nextLogo = isPendingLocalMediaDraft(d.logo) ? d.logo : logo
      const nextCover = isPendingLocalMediaDraft(d.cover) ? d.cover : cover
      if (d.logo === nextLogo && d.cover === nextCover) return d
      return { ...d, logo: nextLogo, cover: nextCover }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- достаточно id и строк URL; весь `detailing` лишние циклы
  }, [detailingHydrateId, detailing?.cover, detailing?.logo])

  const catalogOfferSet = useMemo(() => new Set([...DETAILING_ITEM_SET, ...MAINTENANCE_ITEM_SET]), [])

  if (mode !== 'detailing' || !detailingId) return <Navigate to="/cars" replace />
  if (loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }
  if (!detailing) return <Navigate to="/cars" replace />
  const publicPath = publicDetailingPath(detailing ? { ...detailing, id: detailingId } : { id: detailingId })

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

  function addCustomOfferedLine() {
    const s = String(customOfferInput || '')
      .trim()
      .slice(0, DETAILING_CUSTOM_OFFER_INPUT_MAX_LEN)
    if (!s) return
    setDraft((d) => {
      const cur = Array.isArray(d.servicesOffered) ? d.servicesOffered : []
      return { ...d, servicesOffered: dedupeOfferedStrings([...cur, s], OFFERED_SERVICE_MAX_LEN) }
    })
    setCustomOfferInput('')
  }

  function removeOfferedLine(label) {
    const v = String(label || '').trim()
    if (!v) return
    setDraft((d) => ({
      ...d,
      servicesOffered: (Array.isArray(d.servicesOffered) ? d.servicesOffered : []).filter((x) => x !== v),
    }))
  }

  const customOffersOnly = (Array.isArray(draft.servicesOffered) ? draft.servicesOffered : []).filter(
    (s) => !catalogOfferSet.has(s),
  )

  function addCustomCategory() {
    const _id = String(Date.now())
    setDraft((d) => ({
      ...d,
      customServiceCategories: [...(d.customServiceCategories || []), { _id, title: '', services: [] }],
    }))
  }

  function removeCustomCategory(_id) {
    setDraft((d) => ({
      ...d,
      customServiceCategories: (d.customServiceCategories || []).filter((c) => c._id !== _id),
    }))
    setCustomCatInputs((prev) => { const n = { ...prev }; delete n[_id]; return n })
  }

  function updateCategoryTitle(_id, title) {
    setDraft((d) => ({
      ...d,
      customServiceCategories: (d.customServiceCategories || []).map((c) =>
        c._id === _id ? { ...c, title } : c,
      ),
    }))
  }

  function addServiceToCategory(_id) {
    const val = String(customCatInputs[_id] || '').trim().slice(0, DETAILING_CUSTOM_OFFER_INPUT_MAX_LEN)
    if (!val) return
    setDraft((d) => ({
      ...d,
      customServiceCategories: (d.customServiceCategories || []).map((c) => {
        if (c._id !== _id) return c
        const existing = Array.isArray(c.services) ? c.services : []
        if (existing.includes(val)) return c
        return { ...c, services: [...existing, val] }
      }),
    }))
    setCustomCatInputs((prev) => ({ ...prev, [_id]: '' }))
  }

  function removeServiceFromCategory(_id, svc) {
    setDraft((d) => ({
      ...d,
      customServiceCategories: (d.customServiceCategories || []).map((c) =>
        c._id === _id ? { ...c, services: (c.services || []).filter((s) => s !== svc) } : c,
      ),
    }))
  }

  function logoutAndGoAuth() {
    clearSession()
    invalidateRepo()
    nav('/auth/partner', { replace: true })
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
                Здесь настраивается страница вашего сервиса для клиентов в интернете: что человек увидит до визита. То же название,
                обложку и логотип использует кабинет — так клиенту проще вас узнать.
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
        <div className="row gap wrap" style={{ alignItems: 'center' }}>
          <Link className="btn" data-variant="outline" to={publicPath}>
            Посмотреть лендинг
          </Link>
          <button type="button" className="btn" data-variant="ghost" onClick={logoutAndGoAuth}>
            Выйти
          </button>
        </div>
      </div>

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
            placeholderEmail={String(detailing?.email || '').trim()}
            placeholderFallback={String(draft.name || detailing.name || '').trim()}
            avatarEmptyHint="Нажмите для загрузки"
            bannerEmptyHint="Нажмите — широкое фото: фасад, зал или работа"
            avatarRemoveLabel="Убрать логотип"
            bannerRemoveLabel="Убрать обложку"
            bannerHintSlot={
              <ServiceHint scopeId="detailing-settings-banner-hint" variant="compact" label="Справка: баннер">
                <p className="serviceHint__panelText">{PHOTO_UPLOAD_HINTS_PARAGRAPH}</p>
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
          <div className="field field--full serviceHint__fieldWrap" id="detailing-settings-city">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Город</span>
              <ServiceHint scopeId="detailing-settings-city" variant="compact" label="Справка: город">
                <p className="serviceHint__panelText">
                  {CITY_FIELD_DD_HINT} Отображается на вашей публичной странице вместе с адресом, если поля заполнены.
                </p>
              </ServiceHint>
            </div>
            <CityComboBox value={draft.city} maxItems={20} onChange={(v) => setDraft((d) => ({ ...d, city: v }))} />
          </div>
          <Field
            label="Адрес"
            hint={detailing.profileCompleted === false ? 'Обязательно при первой настройке' : 'необязательно'}
          >
            <Input
              className="input"
              value={draft.address}
              onChange={(e) => setDraft((d) => ({ ...d, address: e.target.value }))}
              onBlur={createBlurFixRuFreeText((next) => setDraft((d) => ({ ...d, address: next })))}
              placeholder="Улица, дом"
              autoComplete="street-address"
            />
          </Field>
          <Field label="ИНН / ОГРНИП" hint="для заказ-нарядов · необязательно">
            <Input
              className="input"
              value={draft.inn}
              maxLength={30}
              onChange={(e) => setDraft((d) => ({ ...d, inn: e.target.value }))}
              placeholder="773179709430"
            />
          </Field>
          <Field label="Юридическое название" hint="ИП / ООО — выводится в шапке ЗН · необязательно">
            <Input
              className="input"
              value={draft.legalName}
              maxLength={255}
              onChange={(e) => setDraft((d) => ({ ...d, legalName: e.target.value }))}
              onBlur={createBlurFixRuFreeText((next) => setDraft((d) => ({ ...d, legalName: next })))}
              placeholder="ИП Иванов Иван Иванович"
            />
          </Field>
          <Field label="Мастер-приёмщик (по умолчанию)" hint="для заказ-нарядов · необязательно">
            <Input
              className="input"
              value={draft.masterName}
              maxLength={255}
              onChange={(e) => setDraft((d) => ({ ...d, masterName: e.target.value }))}
              onBlur={createBlurFixRuFreeText((next) => setDraft((d) => ({ ...d, masterName: next })))}
              placeholder="Иван Иванов"
            />
          </Field>
          <Field className="field--full" label="Гарантийные обязательства" hint="текст для нижней части ЗН · необязательно">
            <Textarea
              className="textarea"
              rows={4}
              value={draft.warrantyText}
              maxLength={5000}
              onChange={(e) => setDraft((d) => ({ ...d, warrantyText: e.target.value }))}
              onBlur={createBlurFixRuFreeText((next) => setDraft((d) => ({ ...d, warrantyText: next })))}
              placeholder="Исполнитель несёт гарантийные обязательства при условии соблюдения правил эксплуатации…"
            />
          </Field>
          <Field
            className="field--full"
            label="Режим работы"
            hint={
              detailing.profileCompleted === false
                ? 'Обязательно при первой настройке · показывается на вашей публичной странице и в шапке кабинета'
                : 'Показывается на вашей публичной странице и в шапке кабинета'
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
              onBlur={createBlurFixRuFreeText((next) =>
                setDraft((d) => ({
                  ...d,
                  workingHours: String(next).slice(0, DETAILING_WORKING_HOURS_MAX_LEN),
                })),
              )}
              placeholder="Например: Пн–Пт 10:00–20:00, Сб 11:00–17:00"
            />
          </Field>
          <Field
            className="field--full"
            label="Своя услуга"
            hint={`до ${DETAILING_CUSTOM_OFFER_INPUT_MAX_LEN} символов · клиенты увидят на вашей публичной странице; сотрудники — в списке при создании визита`}
          >
            <div className="detailingCustomOfferRow">
              <Input
                className="input"
                value={customOfferInput}
                maxLength={DETAILING_CUSTOM_OFFER_INPUT_MAX_LEN}
                onChange={(e) =>
                  setCustomOfferInput(
                    String(e.target.value).slice(0, DETAILING_CUSTOM_OFFER_INPUT_MAX_LEN),
                  )
                }
                onBlur={createBlurFixRuFreeText((next) =>
                  setCustomOfferInput(String(next).slice(0, DETAILING_CUSTOM_OFFER_INPUT_MAX_LEN)),
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    addCustomOfferedLine()
                  }
                }}
                placeholder="Введите название вашей услуги."
                autoComplete="off"
              />
              <button
                type="button"
                className="btn detailingCustomOfferAddBtn"
                data-variant="outline"
                aria-label="Добавить услугу"
                onClick={addCustomOfferedLine}
              >
                +
              </button>
            </div>
            {customOffersOnly.length ? (
              <div className="row gap wrap" style={{ marginTop: 10 }}>
                {customOffersOnly.map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="pill"
                    data-tone="neutral"
                    title="Убрать из списка"
                    onClick={() => removeOfferedLine(s)}
                  >
                    {s}
                    <span aria-hidden="true"> ×</span>
                  </button>
                ))}
              </div>
            ) : null}
          </Field>
          <div className="field field--full">
            <div className="field__top">
              <span className="field__label">Свои категории услуг</span>
              <span className="field__hint">необязательно · отображаются в форме визита отдельной группой</span>
            </div>
            {(draft.customServiceCategories || []).map((cat) => (
              <div key={cat._id} className="detCustomCat">
                <div className="detCustomCat__head">
                  <Input
                    className="input detCustomCat__titleInput"
                    value={cat.title}
                    placeholder="Название категории"
                    maxLength={60}
                    onChange={(e) => updateCategoryTitle(cat._id, e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn detCustomCat__removeBtn"
                    data-variant="ghost"
                    onClick={() => removeCustomCategory(cat._id)}
                  >
                    Удалить
                  </button>
                </div>
                <div className="detailingCustomOfferRow">
                  <Input
                    className="input"
                    value={customCatInputs[cat._id] || ''}
                    maxLength={DETAILING_CUSTOM_OFFER_INPUT_MAX_LEN}
                    placeholder="Добавить услугу в категорию"
                    autoComplete="off"
                    onChange={(e) => setCustomCatInputs((prev) => ({ ...prev, [cat._id]: e.target.value }))}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); addServiceToCategory(cat._id) }
                    }}
                  />
                  <button
                    type="button"
                    className="btn detailingCustomOfferAddBtn"
                    data-variant="outline"
                    aria-label="Добавить услугу"
                    onClick={() => addServiceToCategory(cat._id)}
                  >
                    +
                  </button>
                </div>
                {(cat.services || []).length > 0 ? (
                  <div className="row gap wrap" style={{ marginTop: 8 }}>
                    {(cat.services || []).map((svc) => (
                      <button
                        key={svc}
                        type="button"
                        className="pill"
                        data-tone="neutral"
                        title="Убрать услугу"
                        onClick={() => removeServiceFromCategory(cat._id, svc)}
                      >
                        {svc}
                        <span aria-hidden="true"> ×</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              className="btn detCustomCat__addBtn"
              data-variant="outline"
              onClick={addCustomCategory}
            >
              + Добавить категорию
            </button>
          </div>

          <div className="field field--full serviceHint__fieldWrap" id="detailing-settings-services">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Услуги</span>
              <ServiceHint scopeId="detailing-settings-services" variant="compact" label="Справка: услуги на лендинге">
                <p className="serviceHint__panelText">
                  Отметьте детейлинг и ТО, что предлагаете клиентам на публичной странице. Свои названия добавляйте полем выше
                  («Своя услуга»).
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
              onBlur={createBlurFixRuFreeText((next) => setDraft((d) => ({ ...d, description: next })))}
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

        <div className="row gap wrap topBorder historyFormActions">
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
                  alert('Укажите адрес — клиенты увидят его на вашей публичной странице')
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
                const customServiceCategories = (draft.customServiceCategories || [])
                  .filter((c) => String(c.title || '').trim())
                  .map(({ _id, ...rest }) => rest)
                const res = await r.updateDetailingMe({ ...draft, customServiceCategories, profileCompleted: true })
                if (res?.detailing) {
                  applyDetailingSnapshot(res.detailing)
                  const next = res.detailing
                  setDraft((d) => ({
                    ...d,
                    logo: next.logo || '',
                    cover: next.cover || '',
                  }))
                }
                refreshAllClientData()
                nav('/detailing', { replace: true })
              } catch (e) {
                alert(formatHttpErrorMessage(e))
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

