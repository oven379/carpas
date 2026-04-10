import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRepo, invalidateRepo, refreshAllClientData } from '../useRepo.js'
import {
  BackNav,
  Button,
  Card,
  CityComboBox,
  ComboBox,
  Field,
  Input,
  PageLoadSpinner,
  PhoneRuInput,
  ServiceHint,
} from '../components.jsx'
import { SupportButton } from '../support/SupportHub.jsx'
import { useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'
import {
  CITY_FIELD_DD_HINT,
  describeRuPlateValidationError,
  describeVinValidationError,
  formatPhoneRuInput,
  fmtInt,
  fmtPlateFull,
  normDigits,
  normPlateBase,
  normPlateBaseUi,
  normPlateRegion,
  normVin,
  parsePlateFull,
  PHOTO_UPLOAD_EMPTY_THUMB_HINT,
  PHOTO_UPLOAD_HINTS_PARAGRAPH,
  RU_PLATE_HINT_PARAGRAPHS,
  RU_PLATE_LAYOUT_DIAGRAM,
} from '../../lib/format.js'
import carBrands from '@al-bani/car-brands/assets/brands.json'
import { createBlurFixRuFreeText } from '../../lib/fixQwertyLayoutToRussian.js'
import {
  addCustomMake,
  addCustomModel,
  getCustomMakes,
  getCustomModelsByMake,
} from '../../lib/customDicts.js'
import { buildCarFromQuery, ownerGarageListCrumbLabel, resolveCarListReturnPath } from '../carNav.js'
import { OWNER_MAX_FREE_GARAGE_CARS, ownerGarageLimits } from '../../lib/garageLimits.js'
import { PREMIUM_GARAGE_MODAL_OPTIONS } from '../../lib/supportTicketPresets.js'
import { MediaThumbRemoveButton } from '../MediaBannerAvatarBlock.jsx'
import { formatHttpErrorMessage } from '../../api/http.js'
import { resolvePublicMediaUrl } from '../../lib/mediaUrl.js'
import { useAsyncActionLock } from '../useAsyncActionLock.js'
import { getPathAfterCarRemovedFromScope } from '../navAfterCarRemoved.js'
import { resolveMinMileageKmForVisitForm } from '../../lib/carMileage.js'

function emptyDraft() {
  return {
    vin: '',
    plate: '',
    plateRegion: '',
    make: '',
    model: '',
    year: '',
    mileageKm: '',
    city: '',
    color: '',
    ownerPhone: '',
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    hero: '',
  }
}

const COLOR_SUGGESTIONS = [
  'Чёрный',
  'Белый',
  'Серый',
  'Серебристый',
  'Синий',
  'Голубой',
  'Красный',
  'Бордовый',
  'Зелёный',
  'Жёлтый',
  'Оранжевый',
  'Коричневый',
  'Бежевый',
  'Фиолетовый',
]

const modelFiles = import.meta.glob('/node_modules/@al-bani/car-brands/assets/model/*.json')

function norm(s) {
  return String(s || '').trim().toLowerCase()
}

export default function CarEditPage({ mode }) {
  const { id } = useParams()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const r = useRepo()
  const { owner, mode: who, loading, detailingId } = useDetailing()
  const deleteCarLock = useAsyncActionLock()
  const [car, setCar] = useState(null)
  const [carEditEvents, setCarEditEvents] = useState([])
  const [carReady, setCarReady] = useState(mode !== 'edit')

  useEffect(() => {
    let cancelled = false
    if (mode !== 'edit' || !id) {
      setCar(null)
      setCarReady(true)
      return undefined
    }
    setCarReady(false)
    ;(async () => {
      try {
        const cr = await r.getCar(id)
        if (!cancelled) setCar(cr)
      } catch {
        if (!cancelled) setCar(null)
      } finally {
        if (!cancelled) setCarReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
    // Намеренно без r._version: иначе после сохранения лишний getCar до навигации.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- см. выше
  }, [mode, id])

  useEffect(() => {
    let cancelled = false
    if (mode !== 'edit' || !id) {
      setCarEditEvents([])
      return undefined
    }
    ;(async () => {
      try {
        const ev = await r.listEvents(id)
        if (!cancelled) setCarEditEvents(Array.isArray(ev) ? ev : [])
      } catch {
        if (!cancelled) setCarEditEvents([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, id, r, r._version])

  const minMileageKm =
    mode === 'edit' && car ? resolveMinMileageKmForVisitForm(car, carEditEvents, null) : 0
  const makes = useMemo(() => {
    const labels = (Array.isArray(carBrands) ? carBrands : [])
      .map((x) => String(x?.label || '').trim())
      .filter(Boolean)
    const merged = labels.concat(getCustomMakes())
    return Array.from(new Set(merged)).sort((a, b) => a.localeCompare(b))
  }, [])

  const brandIdByMake = useMemo(() => {
    const map = new Map()
    for (const b of Array.isArray(carBrands) ? carBrands : []) {
      const label = String(b?.label || '').trim()
      const value = b?.value
      if (!label || value == null) continue
      map.set(norm(label), String(value))
    }
    return map
  }, [])

  const years = useMemo(() => {
    const now = new Date().getFullYear()
    const start = 1950
    const arr = []
    for (let y = now; y >= start; y--) arr.push(String(y))
    return arr
  }, [])

  const [modelOptions, setModelOptions] = useState([])

  const [draft, setDraft] = useState(() => emptyDraft())
  const [saveBusy, setSaveBusy] = useState(false)
  /** null — ещё не загрузили список; лимиты для режима создания у владельца */
  const [ownerCreateLimits, setOwnerCreateLimits] = useState(null)
  const saveInFlightRef = useRef(false)
  const loadedKeyRef = useRef('')
  const heroCoverFileRef = useRef(null)

  async function applyHeroFromFile(file) {
    if (!file) return
    try {
      const url = await compressImageFile(file, {
        maxW: 1200,
        maxH: 800,
        quality: 0.82,
        maxBytes: 2 * 1024 * 1024,
      })
      setDraft((d) => ({ ...d, hero: url }))
    } catch {
      alert('Не удалось прочитать файл')
    }
  }

  useEffect(() => {
    const key =
      mode === 'create' ? `create:${who || ''}:${sp.toString()}` : `${mode}:${id || ''}`
    if (loadedKeyRef.current === key) return

    if (mode === 'edit') {
      if (!car) return
      const hero = car.hero || ''
      setDraft({
        vin: car.vin || '',
        plate: normPlateBaseUi(car.plate || ''),
        plateRegion: car.plateRegion || '',
        make: car.make || '',
        model: car.model || '',
        year: car.year ?? '',
        mileageKm: car.mileageKm ?? '',
        city: car.city || '',
        color: car.color || '',
        ownerPhone: car.ownerPhone || '',
        clientName: car.clientName || '',
        clientPhone: car.clientPhone || '',
        clientEmail: car.clientEmail || '',
        hero,
      })
      loadedKeyRef.current = key
      return
    }

    const base = emptyDraft()
    const vinFromQuery = normVin(String(sp.get('vin') || '').trim())
    if (vinFromQuery) base.vin = vinFromQuery
    // Кабинет партнёра: номер, контакты из query (VIN — общий путь выше, в т.ч. после поиска по VIN)
    if (who !== 'owner') {
      const plate = String(sp.get('plate') || '').trim()
      const plateRegion = String(sp.get('plateRegion') || '').trim()
      const clientPhone = String(sp.get('clientPhone') || '').trim()
      const clientEmail = String(sp.get('clientEmail') || '').trim()
      if (plate) {
        const parsed = parsePlateFull(plate)
        base.plate = normPlateBaseUi(parsed.plate)
        base.plateRegion = parsed.plateRegion
      }
      if (plateRegion) base.plateRegion = normPlateRegion(plateRegion)
      if (clientPhone) base.clientPhone = formatPhoneRuInput(clientPhone)
      if (clientEmail) base.clientEmail = clientEmail
    }
    setDraft(base)
    loadedKeyRef.current = key
  }, [mode, id, car, who, sp])

  const createVinFromQuery = mode === 'create' ? normVin(String(sp.get('vin') || '').trim()) : ''

  useEffect(() => {
    if (mode !== 'create' || !createVinFromQuery) return
    const idRaf = window.requestAnimationFrame(() => {
      document.getElementById('car-edit-vin-hint')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    })
    return () => window.cancelAnimationFrame(idRaf)
  }, [mode, createVinFromQuery])

  useEffect(() => {
    let cancelled = false
    async function loadModels() {
      const makeKey = norm(draft.make)
      const brandId = brandIdByMake.get(makeKey) || null

      const customModels = getCustomModelsByMake(draft.make)
      if (!brandId) {
        setModelOptions(customModels)
        return
      }

      const fileKey = Object.keys(modelFiles).find((k) => k.endsWith(`/${brandId}.json`))
      if (!fileKey) {
        setModelOptions(customModels)
        return
      }

      try {
        const mod = await modelFiles[fileKey]()
        const data = mod?.default?.data
        const labels = (Array.isArray(data) ? data : [])
          .map((x) => String(x?.label || '').trim())
          .filter(Boolean)
        const uniq = Array.from(new Set(labels.concat(customModels))).sort((a, b) => a.localeCompare(b))
        if (!cancelled) setModelOptions(uniq)
      } catch {
        if (!cancelled) setModelOptions(customModels)
      }
    }
    loadModels()
    return () => {
      cancelled = true
    }
  }, [draft.make, brandIdByMake])

  useEffect(() => {
    if (mode !== 'create' || who !== 'owner' || !owner?.email) {
      setOwnerCreateLimits(null)
      return undefined
    }
    let cancelled = false
    setOwnerCreateLimits(null)
    ;(async () => {
      try {
        const cl = await r.listCars({ ownerEmail: owner.email })
        if (!cancelled)
          setOwnerCreateLimits(
            ownerGarageLimits(Array.isArray(cl) ? cl : [], { isPremium: Boolean(owner?.isPremium) }),
          )
      } catch {
        if (!cancelled) setOwnerCreateLimits(ownerGarageLimits([], { isPremium: Boolean(owner?.isPremium) }))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, who, owner?.email, owner?.isPremium, r, r._version])

  if ((who === 'owner' || who === 'detailing') && loading) {
    return (
      <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
        <PageLoadSpinner />
      </div>
    )
  }

  if (mode === 'edit') {
    if (!carReady) {
      return (
        <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
          <PageLoadSpinner />
        </div>
      )
    }
    if (!car) {
      return <Navigate to={who === 'detailing' ? '/detailing' : '/cars'} replace />
    }
  }
  if (mode === 'create' && who === 'owner' && owner?.email) {
    if (ownerCreateLimits === null) {
      return (
        <div className="container muted pageLoadSpinner--centerBlock" style={{ padding: '24px 0' }}>
          <PageLoadSpinner />
        </div>
      )
    }
    if (!ownerCreateLimits.canAddManual) {
      const fromParamEarly = sp.get('from') || ''
      const listReturnEarly = resolveCarListReturnPath('owner', fromParamEarly)
      const limitDetail = `В бесплатном гараже — не больше ${OWNER_MAX_FREE_GARAGE_CARS} автомобилей.`
      return (
        <div className="container">
          <div className="row spread gap" style={{ marginBottom: 12 }}>
            <div>
              <div className="breadcrumbs">
                <Link to={listReturnEarly}>{ownerGarageListCrumbLabel(listReturnEarly)}</Link>
                <span> / </span>
                <span>Новая карточка</span>
              </div>
              <div className="row gap wrap" style={{ alignItems: 'center', marginTop: 8 }}>
                <BackNav to={listReturnEarly} title={listReturnEarly.startsWith('/garage') ? 'В гараж' : 'К автомобилям'} />
                <h1 className="h1" style={{ margin: 0 }}>
                  Лимит гаража
                </h1>
              </div>
            </div>
          </div>
          <Card className="card pad">
            <p className="muted small" style={{ margin: '0 0 12px', lineHeight: 1.55, maxWidth: '64ch' }}>
              {limitDetail} Чтобы добавить третье и следующие авто, оформите Premium — откроется заявка в поддержку; в админ-панели она
              будет помечена как запрос на Premium-аккаунт. Это ограничение только для личного гаража владельца: в кабинете детейлинга
              партнёр может заводить неограниченное число карточек клиентов.
            </p>
            <div className="row gap wrap" style={{ alignItems: 'center' }}>
              <SupportButton className="btn" data-variant="primary" openOptions={PREMIUM_GARAGE_MODAL_OPTIONS}>
                Заявка на Premium
              </SupportButton>
              <Link className="btn" data-variant="ghost" to={listReturnEarly}>
                Назад к списку
              </Link>
            </div>
          </Card>
        </div>
      )
    }
  }

  const fromParam = sp.get('from') || ''
  const listReturn = resolveCarListReturnPath(who, fromParam)
  const carCardHref = mode === 'edit' && id ? `/car/${id}${buildCarFromQuery(fromParam)}` : listReturn

  const title = who === 'owner' ? 'Моя машина' : mode === 'edit' ? 'Редактирование' : 'Новая карточка'
  /** Редактирование: «Отмена» и назад — на страницу автомобиля (с ?from=). Создание — в гараж/список или кабинет. */
  const backNavTo = mode === 'edit' && id ? carCardHref : listReturn
  const backNavTitle =
    mode === 'edit' && id
      ? 'К карточке авто'
      : who === 'owner'
        ? listReturn === '/garage' || listReturn.startsWith('/garage?')
          ? 'В гараж'
          : 'К автомобилям'
        : 'К кабинету'

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <Link to={listReturn}>{who === 'owner' ? ownerGarageListCrumbLabel(listReturn) : 'Кабинет'}</Link>
            <span> / </span>
            <span>{title}</span>
          </div>
          <div id="car-edit-page-hint" className="serviceHint__pageBlock">
            <div className="serviceHint__pageBlockRow row gap wrap" style={{ alignItems: 'center' }}>
              <BackNav to={backNavTo} title={backNavTitle} />
              <h1 className="h1">{title}</h1>
              <ServiceHint scopeId="car-edit-page-hint" variant="compact" label="Справка: карточка авто">
                <p className="serviceHint__panelText">
                  Здесь основные данные автомобиля. История визитов, фото и документы — в карточке после сохранения.
                </p>
                {who === 'detailing' ? (
                  <p className="serviceHint__panelText">
                    Город и госномер — в том же формате, что в гараже владельца: подсказки городов через DaData, номер двумя
                    полями (основная часть и код региона).
                  </p>
                ) : null}
              </ServiceHint>
            </div>
          </div>
        </div>
      </div>

      <Card className="card pad">
        <div className="formGrid">
          <Field label="Марка">
            <ComboBox
              value={draft.make}
              options={makes}
              placeholder="Начните вводить… (например: Volkswagen)"
              onChange={(v) => setDraft((d) => ({ ...d, make: v }))}
              onBlur={() => addCustomMake(draft.make)}
            />
          </Field>
          <Field label="Модель">
            <ComboBox
              value={draft.model}
              options={modelOptions}
              placeholder={draft.make ? 'Выберите из списка или введите вручную…' : 'Сначала выберите марку'}
              disabled={!draft.make}
              onChange={(v) => setDraft((d) => ({ ...d, model: v }))}
              emptyText={draft.make ? 'Нет моделей для этой марки' : 'Сначала выберите марку'}
              onBlur={() => addCustomModel(draft.make, draft.model)}
            />
          </Field>
          <Field label="Год">
            <ComboBox
              value={String(draft.year ?? '')}
              options={years}
              placeholder="Например: 2020"
              maxItems={30}
              onChange={(v) =>
                setDraft((d) => ({ ...d, year: normDigits(v, { max: 2100, maxLen: 4 }) }))
              }
            />
          </Field>
          <div className="field serviceHint__fieldWrap" id="car-edit-mileage-hint">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Пробег (км)</span>
              <ServiceHint scopeId="car-edit-mileage-hint" variant="compact" label="Справка: пробег">
                {mode === 'edit' && minMileageKm ? (
                  <p className="serviceHint__panelText">
                    Минимум {fmtInt(minMileageKm)} км — по карточке и сохранённым визитам в истории.
                  </p>
                ) : (
                  <p className="serviceHint__panelText">Укажите актуальный или ближайший к реальности пробег в километрах.</p>
                )}
              </ServiceHint>
            </div>
            <Input
              className="input"
              inputMode="numeric"
              value={draft.mileageKm}
              maxLength={7}
              onChange={(e) =>
                setDraft((d) => {
                  const nextRaw = normDigits(e.target.value, { maxLen: 7 })
                  const n = nextRaw ? Number(nextRaw) : 0
                  if (Number.isFinite(n) && n > 1000000) return d // мягко блокируем ввод сверх лимита
                  return { ...d, mileageKm: nextRaw }
                })
              }
              placeholder={mode === 'edit' && minMileageKm ? fmtInt(minMileageKm) : '12 000'}
            />
          </div>
          <Field label="Цвет">
            <ComboBox
              value={draft.color}
              options={COLOR_SUGGESTIONS}
              placeholder="Например: Чёрный (можно свой вариант)"
              maxItems={20}
              onChange={(v) => setDraft((d) => ({ ...d, color: v }))}
            />
          </Field>
          <div className="field serviceHint__fieldWrap" id="car-edit-vin-hint">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">VIN</span>
              <ServiceHint scopeId="car-edit-vin-hint" variant="compact" label="Справка: VIN">
                <p className="serviceHint__panelText">
                  Ровно 17 символов: латиница (A–Z) и цифры. Пробелы и дефисы при вводе убираются автоматически.
                </p>
                <p className="serviceHint__panelText">
                  Поле можно оставить пустым, если VIN пока неизвестен.
                </p>
              </ServiceHint>
            </div>
            <Input
              id="car-edit-vin-input"
              className="input mono"
              value={draft.vin}
              maxLength={17}
              autoComplete="off"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              inputMode="text"
              autoFocus={mode === 'create' && Boolean(createVinFromQuery)}
              onChange={(e) => setDraft((d) => ({ ...d, vin: normVin(e.target.value) }))}
              placeholder="WDD..."
            />
          </div>
          <div className="field serviceHint__fieldWrap" id="car-edit-plate-hint">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Госномер</span>
              <ServiceHint scopeId="car-edit-plate-hint" variant="compact" label="Справка: госномер">
                {RU_PLATE_HINT_PARAGRAPHS.map((text, i) => (
                  <p key={i} className="serviceHint__panelText">
                    {text}
                  </p>
                ))}
                <pre className="serviceHint__panelPre mono">{RU_PLATE_LAYOUT_DIAGRAM}</pre>
              </ServiceHint>
            </div>
            <div className="row gap" style={{ alignItems: 'center' }}>
              <Input
                className="input mono"
                lang="ru"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                value={draft.plate}
                maxLength={6}
                title="Шесть знаков: буква АВЕКМНОРСТУХ, три цифры, две буквы (можно вводить кириллицей)"
                onChange={(e) => setDraft((d) => ({ ...d, plate: normPlateBaseUi(e.target.value) }))}
                placeholder="А777АА"
              />
              <Input
                className="input mono"
                inputMode="numeric"
                value={draft.plateRegion}
                maxLength={3}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, plateRegion: normPlateRegion(e.target.value) }))
                }
                placeholder="77"
                title="Код региона, 2–3 цифры"
              />
            </div>
          </div>
          <div className="field serviceHint__fieldWrap" id="car-edit-city-hint">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">Город</span>
              <ServiceHint scopeId="car-edit-city-hint" variant="compact" label="Справка: город">
                <p className="serviceHint__panelText">{CITY_FIELD_DD_HINT}</p>
              </ServiceHint>
            </div>
            <CityComboBox value={draft.city} maxItems={20} onChange={(v) => setDraft((d) => ({ ...d, city: v }))} />
          </div>
          {who !== 'owner' ? (
            <>
              <div className="field serviceHint__fieldWrap" id="car-edit-client-name-hint">
                <div className="field__top serviceHint__fieldTop">
                  <span className="field__label">Клиент (имя)</span>
                  <ServiceHint scopeId="car-edit-client-name-hint" variant="compact" label="Справка: клиент">
                    <p className="serviceHint__panelText">
                      Имя, телефон и почта необязательны; помогают найти карточку в кабинете и связаться с владельцем. Перед
                      сохранением новой карточки сервис проверяет совпадения по VIN и по паре «телефон + почта» — если такая
                      машина уже есть, можно открыть существующую вместо дубля.
                    </p>
                  </ServiceHint>
                </div>
                <Input
                  className="input"
                  value={draft.clientName}
                  onChange={(e) => setDraft((d) => ({ ...d, clientName: e.target.value }))}
                  onBlur={createBlurFixRuFreeText((next) => setDraft((d) => ({ ...d, clientName: next })))}
                  placeholder="Например: Иван"
                  autoComplete="name"
                />
              </div>
              <Field label="Клиент (телефон)">
                <PhoneRuInput
                  value={draft.clientPhone}
                  onChange={(e) =>
                    setDraft((d) => ({ ...d, clientPhone: formatPhoneRuInput(e.target.value) }))
                  }
                  onBlur={() =>
                    setDraft((d) => ({ ...d, clientPhone: formatPhoneRuInput(d.clientPhone) }))
                  }
                  autoComplete="tel"
                />
              </Field>
              <Field label="Клиент (почта)">
                <Input
                  className="input"
                  type="email"
                  value={draft.clientEmail}
                  onChange={(e) => setDraft((d) => ({ ...d, clientEmail: e.target.value }))}
                  placeholder="client@example.com"
                  autoComplete="email"
                />
              </Field>
            </>
          ) : null}
        </div>

        <div className="topBorder carEditCoverBlock">
          <div
            className="field field--full serviceHint__fieldWrap carEditCoverBlock__field"
            id="car-edit-hero-hint"
          >
            <div className="field__top serviceHint__fieldTop carEditCoverBlock__labelRow">
              <span className="field__label">Настройка обложки</span>
              <ServiceHint scopeId="car-edit-hero-hint" variant="compact" label="Справка: обложка карточки">
                <p className="serviceHint__panelText">{PHOTO_UPLOAD_HINTS_PARAGRAPH}</p>
              </ServiceHint>
            </div>
          </div>
          <input
            ref={heroCoverFileRef}
            className="srOnly"
            type="file"
            accept="image/*"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (file) await applyHeroFromFile(file)
              e.target.value = ''
            }}
          />
          <div className="garageSettings__thumbWrap carEditCoverBlock__thumbWrap">
            <button
              type="button"
              className="garageSettings__thumb garageSettings__thumb--banner carEditCoverBlock__thumb"
              onClick={() => heroCoverFileRef.current?.click?.()}
              aria-label={draft.hero ? 'Заменить обложку' : 'Загрузить обложку'}
            >
              {draft.hero ? (
                <img alt="Превью обложки карточки" src={resolvePublicMediaUrl(draft.hero)} />
              ) : (
                <span className="garageSettings__thumbEmpty garageSettings__thumbEmpty--banner">
                  <span className="garageSettings__thumbEmptyPrimary">Нажмите для загрузки</span>
                  <span className="garageSettings__thumbEmptySecondary">{PHOTO_UPLOAD_EMPTY_THUMB_HINT}</span>
                </span>
              )}
            </button>
            {draft.hero ? (
              <MediaThumbRemoveButton
                shape="square"
                aria-label="Убрать обложку"
                onRemove={() => setDraft((d) => ({ ...d, hero: '' }))}
              />
            ) : null}
          </div>
          <p className="muted small carEditCoverBlock__photoHints">{PHOTO_UPLOAD_HINTS_PARAGRAPH}</p>
        </div>

        <div className="row spread gap topBorder carEditFormActions">
          <div className="row gap wrap carEditFormActions__buttons">
            <Button
              className="btn"
              variant="primary"
              disabled={saveBusy}
              aria-busy={saveBusy || undefined}
              onClick={async () => {
                if (saveInFlightRef.current) return
                const vinErr = describeVinValidationError(normVin(draft.vin))
                const plateErr = describeRuPlateValidationError(draft.plate, draft.plateRegion)
                if (vinErr) {
                  alert(vinErr)
                  return
                }
                if (plateErr) {
                  alert(plateErr)
                  return
                }
                if (mode === 'edit') {
                  const nextMileage = Number(String(draft.mileageKm || '0')) || 0
                  if (nextMileage < minMileageKm) {
                    alert(`Пробег не может быть меньше ${fmtInt(minMileageKm)} км — по карточке и истории визитов.`)
                    return
                  }
                }

                saveInFlightRef.current = true
                setSaveBusy(true)
                try {
                  if (mode === 'edit') {
                    try {
                      await r.updateCar(id, draft)
                    } catch (e) {
                      alert(
                        formatHttpErrorMessage(
                          e,
                          'Не удалось сохранить изменения: нет доступа к этой карточке (проверьте, что вы вошли в правильный аккаунт).',
                        ),
                      )
                      return
                    }
                    invalidateRepo()
                    if (who === 'owner') nav(listReturn)
                    else nav(`/car/${id}${buildCarFromQuery(fromParam)}`)
                  } else {
                    const vin = normVin(draft.vin)
                    const clientPhone = String(draft.clientPhone || '').trim()
                    const clientEmail = String(draft.clientEmail || '').trim().toLowerCase()

                    if (who === 'detailing' && r.findDuplicateCarsForDetailing) {
                      const phoneDigitsLen = String(clientPhone || '').replace(/\D/g, '').length
                      const phoneAloneOk = phoneDigitsLen >= 10
                      if (vin || (clientPhone && clientEmail) || phoneAloneOk) {
                        try {
                          const dupes = await r.findDuplicateCarsForDetailing({
                            vin,
                            clientPhone,
                            clientEmail,
                          })
                          if (Array.isArray(dupes) && dupes.length > 0) {
                            const c = dupes[0]
                            const plateLine = fmtPlateFull(c.plate, c.plateRegion)
                            const more =
                              dupes.length > 1 ? `\n\nЕщё совпадений в базе: ${dupes.length - 1}.` : ''
                            const vinLine = c.vin ? `\nVIN: ${c.vin}` : ''
                            const srcLine = c.vinHitFromOwnerGarage
                              ? '\nИсточник: личный гараж владельца в КарПас.'
                              : ''
                            const msg =
                              'Найдена существующая карточка по VIN и/или телефону клиента:\n\n' +
                              `${c.make} ${c.model}${c.year ? `, ${c.year} г.` : ''}` +
                              vinLine +
                              (plateLine ? `\nГосномер: ${plateLine}` : '') +
                              (c.detailingName ? `\nСервис: ${c.detailingName}` : '') +
                              srcLine +
                              `${more}\n\n` +
                              'Открыть её вместо создания новой?\n\n' +
                              'ОК — перейти к карточке, Отмена — создать новую.'
                            if (confirm(msg)) {
                              nav(`/car/${c.id}${buildCarFromQuery(fromParam)}`)
                              return
                            }
                          }
                        } catch {
                          /* ignore duplicate check */
                        }
                      }
                    }

                    if (who === 'owner' && vin && r.findCarsByVin) {
                      try {
                        const matches = await r.findCarsByVin(vin)
                        if (Array.isArray(matches) && matches.length) {
                          const msg =
                            'Похоже, авто с таким VIN уже есть в сервисе.\n\n' +
                            'Это может быть дубль. Обычно в этом случае лучше запросить доступ по VIN и пройти модерацию у детейлинга.\n\n' +
                            'Создать новую карточку всё равно?'
                          if (!confirm(msg)) return
                        }
                      } catch {
                        /* ignore duplicate check */
                      }
                    }
                    const plateKey =
                      draft.plate || draft.plateRegion ? `${normPlateBase(draft.plate)}${normPlateRegion(draft.plateRegion)}` : ''
                    if (who === 'owner' && plateKey && r.findCarsByPlate) {
                      try {
                        const matches2 = await r.findCarsByPlate({
                          plate: normPlateBase(draft.plate),
                          plateRegion: normPlateRegion(draft.plateRegion),
                        })
                        if (Array.isArray(matches2) && matches2.length) {
                          const msg =
                            'Авто с таким госномером уже может быть в сервисе (возможен дубль). Создать карточку всё равно?'
                          if (!confirm(msg)) return
                        }
                      } catch {
                        /* ignore duplicate check */
                      }
                    }
                    const created = await r.createCar(null, draft)
                    if (!created?.id) {
                      alert(
                        'Не удалось создать карточку: возможен лимит гаража или временный сбой. Дополнительные авто — через поиск по VIN.',
                      )
                      return
                    }
                    if (who === 'owner') refreshAllClientData()
                    else invalidateRepo()
                    nav(`/car/${created.id}${buildCarFromQuery(fromParam)}`)
                  }
                } catch (e) {
                  if (import.meta.env.DEV) console.error(e)
                  alert(
                    formatHttpErrorMessage(e, 'Не удалось сохранить. Проверьте поля и интернет.'),
                  )
                } finally {
                  saveInFlightRef.current = false
                  setSaveBusy(false)
                }
              }}
            >
              {saveBusy ? 'Сохранение…' : 'Сохранить'}
            </Button>
            <Link className="btn" data-variant="ghost" to={backNavTo}>
              Отмена
            </Link>
            {mode === 'edit' && id ? (
              <Button
                className="btn"
                variant="danger"
                type="button"
                disabled={saveBusy || deleteCarLock.pending}
                aria-busy={deleteCarLock.pending || undefined}
                onClick={() =>
                  void deleteCarLock.run(async () => {
                    const msg =
                      'Удалить авто навсегда?\n\n' +
                      'Если вы удалите ваше авто, оно больше не появится в сервисе (вместе с историей и фото).\n\n' +
                      'Альтернатива: вместо удаления вы можете передать авто другому хозяину.'
                    if (!confirm(msg)) return
                    try {
                      await r.deleteCar(id)
                      invalidateRepo()
                      const list = await r.listCars()
                      nav(getPathAfterCarRemovedFromScope(list, { mode: who, owner, detailingId }), { replace: true })
                    } catch {
                      alert('Не удалось удалить авто (нет доступа).')
                    }
                  })
                }
              >
                Удалить авто
              </Button>
            ) : null}
          </div>
          <div className="muted small carEditFormActions__hint">Изменения сохраняются в вашем кабинете.</div>
        </div>
      </Card>
    </div>
  )
}

