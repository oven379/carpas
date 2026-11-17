import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useToast } from '../toast.jsx'
import { useRepo, invalidateRepo, refreshAllClientData } from '../useRepo.js'
import {
  BackNav,
  CarDataConsent,
  Button,
  Card,
  CityComboBox,
  ComboBox,
  Field,
  Input,
  PageLoadSpinner,
  PhoneRuInput,
} from '../components.jsx'
import { SupportButton } from '../support/SupportHub.jsx'
import { useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'
import {
  describeRuPlateValidationError,
  describeVinValidationError,
  formatPhoneRuInput,
  fmtInt,
  fmtKm,
  normDigits,
  normPlateBase,
  normPlateBaseUi,
  normPlateRegion,
  normVin,
  parsePlateFull,
  PHOTO_UPLOAD_EMPTY_THUMB_HINT,
  PHOTO_UPLOAD_HINTS_PARAGRAPH,
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
import { ownerGarageLimits } from '../../lib/garageLimits.js'
import { PREMIUM_GARAGE_MODAL_OPTIONS } from '../../lib/supportTicketPresets.js'
import MediaBannerAvatarBlock, { MediaThumbRemoveButton } from '../MediaBannerAvatarBlock.jsx'
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
  const toast = useToast()
  const { id } = useParams()
  const nav = useNavigate()
  const [sp] = useSearchParams()
  const r = useRepo()
  const { owner, mode: who, loading, detailingId } = useDetailing()
  const deleteCarLock = useAsyncActionLock()
  const [ownerAddVinPhase, setOwnerAddVinPhase] = useState('form')
  const [ownerOrphanModalOpen, setOwnerOrphanModalOpen] = useState(false)
  const [ownerOrphanCar, setOwnerOrphanCar] = useState(null)
  const [ownerVinLookupBusy, setOwnerVinLookupBusy] = useState(false)
  const [ownerAttachBusy, setOwnerAttachBusy] = useState(false)
  const [detailingVinPhase, setDetailingVinPhase] = useState('vin')
  const [detailingFoundCar, setDetailingFoundCar] = useState(null)
  const [detailingVinBusy, setDetailingVinBusy] = useState(false)
  const [detailingVinError, setDetailingVinError] = useState('')
  const [detailingLinkError, setDetailingLinkError] = useState('')
  const checkedDetailingVinRef = useRef('')
  const ownerUrlVinLookupDone = useRef(false)
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
        const ev = await r.listEvents(id, who === 'owner' ? { scope: 'owner' } : {})
        if (!cancelled) setCarEditEvents(Array.isArray(ev) ? ev : [])
      } catch {
        if (!cancelled) setCarEditEvents([])
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, id, r, r._version, who])

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
  const [carLegalConsent, setCarLegalConsent] = useState(false)
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
      toast('Не удалось прочитать файл', 'error')
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
      setCarLegalConsent(false)
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
    setCarLegalConsent(false)
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
            ownerGarageLimits(Array.isArray(cl) ? cl : [], {
              isPremium: Boolean(owner?.isPremium),
              carLimit: owner?.garageCarLimit,
            }),
          )
      } catch {
        if (!cancelled) {
          setOwnerCreateLimits(
            ownerGarageLimits([], { isPremium: Boolean(owner?.isPremium), carLimit: owner?.garageCarLimit }),
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, who, owner?.email, owner?.isPremium, owner?.garageCarLimit, r, r._version])

  useEffect(() => {
    if (mode === 'create' && who === 'owner') {
      setOwnerAddVinPhase('vin')
      setOwnerOrphanModalOpen(false)
      setOwnerOrphanCar(null)
    } else {
      setOwnerAddVinPhase('form')
    }
    if (mode === 'create' && who === 'detailing') {
      setDetailingVinPhase('vin')
      setDetailingFoundCar(null)
      setDetailingVinError('')
      setDetailingLinkError('')
    } else {
      setDetailingVinPhase('form')
    }
  }, [mode, who])

  useEffect(() => {
    if (mode !== 'create' || who !== 'owner') return
    const urlVin = normVin(String(sp.get('vin') || '').trim())
    if (urlVin.length !== 17) return
    if (ownerUrlVinLookupDone.current) return
    ownerUrlVinLookupDone.current = true
    let cancelled = false
    ;(async () => {
      setOwnerVinLookupBusy(true)
      try {
        if (!r.lookupOwnerCarForAdd) {
          ownerUrlVinLookupDone.current = false
          return
        }
        const res = await r.lookupOwnerCarForAdd(urlVin)
        if (cancelled) return
        if (res.status === 'not_found') {
          setOwnerAddVinPhase('form')
        } else if (res.status === 'orphan') {
          setOwnerOrphanCar(res.car)
          setOwnerOrphanModalOpen(true)
        } else {
          toast('По этому VIN машина уже привязана к владельцу в КарПас. Добавить её к себе нельзя.', 'warn')
        }
      } catch (e) {
        ownerUrlVinLookupDone.current = false
        if (!cancelled) toast(formatHttpErrorMessage(e), 'error')
      } finally {
        if (!cancelled) setOwnerVinLookupBusy(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [mode, who, sp, r, toast])

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
      const limitDetail = `В вашем гараже автомобилей: ${ownerCreateLimits.totalCount}, лимит — ${ownerCreateLimits.carLimit}.`
      return (
        <div className="container">
          <div className="row spread gap" style={{ marginBottom: 12 }}>
            <div>
              <div className="breadcrumbs">
                <Link to={listReturnEarly}>{ownerGarageListCrumbLabel(listReturnEarly)}</Link>
                <span> / </span>
                <span>Новый автомобиль</span>
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
              {limitDetail} Чтобы добавить ещё одно авто, отправьте запрос в поддержку — мы свяжемся с вами и увеличим лимит.
            </p>
            <div className="row gap wrap" style={{ alignItems: 'center' }}>
              <SupportButton className="btn" data-variant="primary" openOptions={PREMIUM_GARAGE_MODAL_OPTIONS}>
                Увеличить лимит
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

  const ownerVinFieldsLocked = mode === 'create' && who === 'owner' && ownerAddVinPhase === 'vin'
  const isDetailingCreate = mode === 'create' && who === 'detailing'
  const detailingFormFieldsDisabled = isDetailingCreate && detailingVinPhase !== 'form'
  const useProfileLayout = isDetailingCreate && detailingVinPhase === 'form'
  const foundCarAlreadyAdded = Boolean(detailingFoundCar?.alreadyInDetailingCabinet)
  const foundCarNeedsApproval = Boolean(detailingFoundCar?.ownerApprovalRequired)
  const foundCarCanAdd = Boolean(detailingFoundCar?.canAddToDetailing)

  const handleDetailingVinCheck = async () => {
    const vin = normVin(draft.vin)
    const vinError = describeVinValidationError(vin)
    if (vinError || vin.length !== 17) {
      setDetailingVinError(vinError || 'Введите полный VIN из 17 символов.')
      return
    }
    setDetailingVinError('')
    setDetailingVinBusy(true)
    try {
      const matches = await r.findDuplicateCarsForDetailing({ vin })
      const match = matches.find((car) => car.alreadyInDetailingCabinet)
        || matches.find((car) => car.canAddToDetailing)
        || matches[0]
      if (!match && checkedDetailingVinRef.current !== vin) {
        setDraft({ ...emptyDraft(), vin })
        setCarLegalConsent(false)
      }
      checkedDetailingVinRef.current = vin
      setDetailingFoundCar(match || null)
      setDetailingVinPhase(match ? 'found' : 'form')
    } catch (error) {
      setDetailingVinError(formatHttpErrorMessage(error, 'Не удалось проверить VIN. Попробуйте ещё раз.'))
    } finally {
      setDetailingVinBusy(false)
    }
  }

  const editDetailingVin = () => {
    setDetailingVinPhase('vin')
    setDetailingFoundCar(null)
    setDetailingLinkError('')
    document.getElementById('car-edit-vin-input')?.focus()
  }

  const confirmFoundCar = async () => {
    if (!detailingFoundCar) return
    const carPath = `/car/${encodeURIComponent(detailingFoundCar.id)}${buildCarFromQuery(fromParam)}`
    if (foundCarAlreadyAdded) {
      nav(carPath)
      return
    }
    if (!foundCarNeedsApproval && !foundCarCanAdd) return

    setDetailingLinkError('')
    try {
      if (foundCarNeedsApproval) {
        await r.createDetailingClaim({ carId: detailingFoundCar.id })
        setDetailingVinPhase('requested')
      } else {
        await r.addExistingCarToDetailing({ carId: detailingFoundCar.id, vin: draft.vin })
        invalidateRepo()
        nav(carPath)
      }
    } catch (error) {
      setDetailingLinkError(formatHttpErrorMessage(error, 'Не удалось добавить автомобиль. Проверьте VIN ещё раз.'))
    }
  }

  const title = who === 'owner' ? 'Моя машина' : mode === 'edit' ? 'Редактирование' : 'Новый автомобиль'
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

  const ownerOrphanModalEl =
    ownerOrphanModalOpen && ownerOrphanCar && typeof document !== 'undefined'
      ? createPortal(
          <div
            className="supportModalOverlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="car-edit-orphan-title"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) {
                setOwnerOrphanModalOpen(false)
                nav(listReturn, { replace: true })
              }
            }}
          >
            <div className="supportModal card pad">
              <h2 id="car-edit-orphan-title" className="h2 supportModal__title">
                Автомобиль уже в системе
              </h2>
              <p className="supportModal__lead" style={{ marginTop: 12, lineHeight: 1.55 }}>
                По этому VIN есть карточка без владельца в КарПас (её вели сервисы). Вы можете добавить её в свой гараж — данные и
                история визитов сохранятся.
              </p>
              <p className="muted small mono" style={{ marginTop: 10 }}>
                VIN: {ownerOrphanCar.vin || '—'}
              </p>
              <p className="muted small" style={{ marginTop: 6 }}>
                {[ownerOrphanCar.make, ownerOrphanCar.model].filter(Boolean).join(' ') || '—'}
                {ownerOrphanCar.year ? `, ${ownerOrphanCar.year} г.` : ''}
              </p>
              <div className="supportModal__submitRow" style={{ marginTop: 18 }}>
                <Button
                  className="btn"
                  variant="primary"
                  type="button"
                  disabled={ownerAttachBusy}
                  aria-busy={ownerAttachBusy || undefined}
                  onClick={() =>
                    void (async () => {
                      if (!r.attachOwnerExistingCar) {
                        toast('Действие недоступно в этой сборке.', 'warn')
                        return
                      }
                      setOwnerAttachBusy(true)
                      try {
                        await r.attachOwnerExistingCar({ carId: ownerOrphanCar.id })
                        invalidateRepo()
                        refreshAllClientData()
                        setOwnerOrphanModalOpen(false)
                        nav(listReturn, { replace: true })
                      } catch (e) {
                        toast(formatHttpErrorMessage(e), 'error')
                      } finally {
                        setOwnerAttachBusy(false)
                      }
                    })()
                  }
                >
                  {ownerAttachBusy ? 'Добавление…' : 'Добавить в гараж'}
                </Button>
                <Button
                  className="btn"
                  variant="ghost"
                  type="button"
                  disabled={ownerAttachBusy}
                  onClick={() => {
                    setOwnerOrphanModalOpen(false)
                    nav(listReturn, { replace: true })
                  }}
                >
                  Отмена
                </Button>
              </div>
            </div>
          </div>,
          document.body,
        )
      : null

  return (
    <>
      {ownerOrphanModalEl}
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
            </div>
          </div>
        </div>
      </div>

      <Card className="card pad">
        <div className="formGrid">
          <div className={`field serviceHint__fieldWrap${isDetailingCreate ? ' field--full' : ''}`} id="car-edit-vin-hint">
            {isDetailingCreate ? <h2 className="h2 carEditSectionTitle">Проверка VIN</h2> : null}
            <Field
              label="VIN" insetLabel
              hint={mode === 'create'
                ? 'Введите VIN из 17 букв и цифр.'
                : '17 букв и цифр. Если VIN неизвестен, оставьте поле пустым.'}
            >
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
                readOnly={isDetailingCreate && (detailingVinPhase !== 'vin' || detailingVinBusy)}
                onKeyDown={isDetailingCreate && detailingVinPhase === 'vin' ? (event) => {
                  if (event.key !== 'Enter' || detailingVinBusy) return
                  event.preventDefault()
                  void handleDetailingVinCheck()
                } : undefined}
                onChange={(e) => setDraft((d) => ({ ...d, vin: normVin(e.target.value) }))}
              />
            </Field>
            {isDetailingCreate && detailingVinPhase === 'vin' ? (
              <div style={{ marginTop: 10 }}>
                {detailingVinError ? (
                  <p className="field__error" role="alert" style={{ marginBottom: 8 }}>{detailingVinError}</p>
                ) : null}
                <div className="formActions">
                  <Button
                    className="btn"
                    variant="primary"
                    type="button"
                    disabled={detailingVinBusy}
                    aria-busy={detailingVinBusy || undefined}
                    onClick={() => void handleDetailingVinCheck()}
                  >
                    {detailingVinBusy ? 'Проверка…' : 'Проверить VIN и продолжить'}
                  </Button>
                  <Button className="btn" variant="outline" type="button" onClick={() => nav(listReturn)}>
                    Отменить
                  </Button>
                </div>
              </div>
            ) : null}
            {isDetailingCreate && detailingVinPhase === 'form' ? (
              <button type="button" className="link" onClick={editDetailingVin}>
                Изменить VIN
              </button>
            ) : null}
            {isDetailingCreate && detailingFoundCar ? (
              <div className="carVinMatch">
                <div className="carVinMatch__summary">
                  {detailingFoundCar.hero ? (
                    <img className="carVinMatch__photo" src={resolvePublicMediaUrl(detailingFoundCar.hero)} alt="" />
                  ) : null}
                  <div>
                    <h3 className="h2">{[detailingFoundCar.make, detailingFoundCar.model].filter(Boolean).join(' ') || 'Автомобиль найден'}</h3>
                    <dl className="carVinMatch__specs">
                      {[
                        ['Год', detailingFoundCar.year],
                        ['Пробег', detailingFoundCar.mileageKm == null ? '' : fmtKm(detailingFoundCar.mileageKm)],
                        ['Цвет', detailingFoundCar.color],
                        ['Город', detailingFoundCar.city],
                      ].filter(([, value]) => value).map(([label, value]) => (
                        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
                      ))}
                    </dl>
                  </div>
                </div>
                {detailingVinPhase === 'requested' ? (
                  <p className="muted small" role="status">Запрос отправлен. Автомобиль появится в кабинете после подтверждения владельцем.</p>
                ) : foundCarNeedsApproval && !foundCarAlreadyAdded ? (
                  <p className="muted small">Для добавления автомобиля нужно подтверждение владельца.</p>
                ) : !foundCarCanAdd && !foundCarAlreadyAdded ? (
                  <p className="muted small">Эту карточку сейчас нельзя добавить в кабинет.</p>
                ) : null}
                {detailingLinkError ? <p className="field__error" role="alert">{detailingLinkError}</p> : null}
                <div className="formActions">
                  <Button className="btn" variant="ghost" onClick={editDetailingVin}>Изменить VIN</Button>
                  {detailingVinPhase === 'requested' ? (
                    <Link className="btn" data-variant="primary" to={listReturn}>К списку автомобилей</Link>
                  ) : foundCarAlreadyAdded || foundCarNeedsApproval || foundCarCanAdd ? (
                    <Button className="btn" variant="primary" onClick={confirmFoundCar}>
                      {foundCarAlreadyAdded ? 'Открыть карточку' : foundCarNeedsApproval ? 'Запросить добавление' : 'Подтвердить добавление'}
                    </Button>
                  ) : null}
                </div>
              </div>
            ) : null}
            {ownerVinFieldsLocked ? (
              <div className="formActions" style={{ marginTop: 10 }}>
                <Button
                  className="btn"
                  variant="primary"
                  type="button"
                  disabled={ownerVinLookupBusy}
                  aria-busy={ownerVinLookupBusy || undefined}
                  onClick={() =>
                    void (async () => {
                      const v = normVin(draft.vin)
                      const vinErr = describeVinValidationError(v)
                      if (vinErr || v.length !== 17) {
                        toast(vinErr || 'Введите полный VIN из 17 символов.', 'warn')
                        return
                      }
                      setOwnerVinLookupBusy(true)
                      try {
                        if (!r.lookupOwnerCarForAdd) {
                          toast('Действие недоступно в этой сборке.', 'warn')
                          return
                        }
                        const res = await r.lookupOwnerCarForAdd(v)
                        if (res.status === 'not_found') {
                          setOwnerAddVinPhase('form')
                        } else if (res.status === 'orphan') {
                          setOwnerOrphanCar(res.car)
                          setOwnerOrphanModalOpen(true)
                        } else {
                          toast(
                            'По этому VIN машина уже привязана к владельцу в КарПас. Добавить её к себе нельзя.',
                            'warn',
                          )
                        }
                      } catch (e) {
                        toast(formatHttpErrorMessage(e), 'error')
                      } finally {
                        setOwnerVinLookupBusy(false)
                      }
                    })()
                  }
                >
                  {ownerVinLookupBusy ? 'Проверка…' : 'Проверить VIN и продолжить'}
                </Button>
                <Button
                  className="btn"
                  variant="outline"
                  type="button"
                  disabled={ownerVinLookupBusy}
                  onClick={() => nav(listReturn)}
                >
                  Отменить
                </Button>
              </div>
            ) : null}
          </div>
          {!detailingFormFieldsDisabled ? (
            <>
              {useProfileLayout ? <h2 className="h2 field--full carEditSectionTitle">Данные автомобиля</h2> : null}
              <div className={useProfileLayout ? 'field--full garageSettings__profile' : 'carEditFieldsContents'}>
                {useProfileLayout ? (
                  <MediaBannerAvatarBlock
                    variant="car"
                    showBannerColumn={false}
                    showPhotoUploadHints={false}
                    avatarLabel="Фото автомобиля"
                    avatarEmptyHint="Загрузить фото"
                    avatarRemoveLabel="Убрать фото автомобиля"
                    avatarUrl={draft.hero}
                    onAvatarUrl={(url) => setDraft((d) => ({ ...d, hero: url }))}
                  />
                ) : null}
                <div className={useProfileLayout ? 'garageSettings__fields' : 'carEditFieldsContents'}>
                  <Field label="Марка" insetLabel>
                    <ComboBox
                      value={draft.make}
                      options={makes}
                      disabled={ownerVinFieldsLocked}
                      onChange={(v) => setDraft((d) => ({ ...d, make: v }))}
                      onBlur={() => addCustomMake(draft.make)}
                    />
                  </Field>
                  <Field label="Модель" insetLabel>
                    <ComboBox
                      value={draft.model}
                      options={modelOptions}
                      placeholder={draft.make ? '' : 'Сначала выберите марку'}
                      disabled={!draft.make || ownerVinFieldsLocked}
                      onChange={(v) => setDraft((d) => ({ ...d, model: v }))}
                      emptyText={draft.make ? 'Нет моделей для этой марки' : 'Сначала выберите марку'}
                      onBlur={() => addCustomModel(draft.make, draft.model)}
                    />
                  </Field>
                  <Field label="Год" insetLabel>
                    <ComboBox
                      value={String(draft.year ?? '')}
                      options={years}
                      maxItems={30}
                      disabled={ownerVinFieldsLocked}
                      onChange={(v) =>
                        setDraft((d) => ({ ...d, year: normDigits(v, { max: 2100, maxLen: 4 }) }))
                      }
                    />
                  </Field>
                  <div className="field serviceHint__fieldWrap" id="car-edit-mileage-hint">
                    <Field
                      label="Пробег (км)" insetLabel
                      hint={mode === 'edit' && minMileageKm ? `Минимум ${fmtInt(minMileageKm)} км` : undefined}
                    >
                      <Input
                        className="input"
                        inputMode="numeric"
                        value={draft.mileageKm}
                        maxLength={7}
                        disabled={ownerVinFieldsLocked}
                        onChange={(e) =>
                          setDraft((d) => {
                            const nextRaw = normDigits(e.target.value, { maxLen: 7 })
                            const n = nextRaw ? Number(nextRaw) : 0
                            if (Number.isFinite(n) && n > 1000000) return d // мягко блокируем ввод сверх лимита
                            return { ...d, mileageKm: nextRaw }
                          })
                        }
                      />
                    </Field>
                  </div>
                  <Field label="Цвет" insetLabel>
                    <ComboBox
                      value={draft.color}
                      options={COLOR_SUGGESTIONS}
                      maxItems={20}
                      disabled={ownerVinFieldsLocked}
                      onChange={(v) => setDraft((d) => ({ ...d, color: v }))}
                    />
                  </Field>
                  <div className="field serviceHint__fieldWrap" id="car-edit-plate-hint">
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
                        disabled={ownerVinFieldsLocked}
                        title="Шесть знаков: буква АВЕКМНОРСТУХ, три цифры, две буквы (можно вводить кириллицей)"
                        onChange={(e) => setDraft((d) => ({ ...d, plate: normPlateBaseUi(e.target.value) }))}
                        placeholder="Госномер"
                        aria-label="Госномер без региона"
                      />
                      <Input
                        className="input mono"
                        inputMode="numeric"
                        value={draft.plateRegion}
                        maxLength={3}
                        disabled={ownerVinFieldsLocked}
                        onChange={(e) =>
                          setDraft((d) => ({ ...d, plateRegion: normPlateRegion(e.target.value) }))
                        }
                        placeholder="Регион"
                        aria-label="Код региона"
                        title="Код региона, 2–3 цифры"
                      />
                    </div>
                  </div>
                  <div className="field serviceHint__fieldWrap" id="car-edit-city-hint">
                    <Field label="Город" insetLabel={useProfileLayout}>
                      <CityComboBox
                        value={draft.city}
                        maxItems={20}
                        disabled={ownerVinFieldsLocked}
                        onChange={(v) => setDraft((d) => ({ ...d, city: v }))}
                      />
                    </Field>
                  </div>
                </div>
              </div>
            </>
          ) : null}
          {who !== 'owner' && !detailingFormFieldsDisabled ? (
            <>
              {isDetailingCreate ? <h2 className="h2 field--full carEditSectionTitle">Контакты клиента</h2> : null}
              <div className="field serviceHint__fieldWrap" id="car-edit-client-name-hint">
                <Field
                  label={useProfileLayout ? 'Имя' : 'Клиент (имя)'} insetLabel={useProfileLayout}
                >
                  <Input
                    className="input"
                    value={draft.clientName}
                    onChange={(e) => setDraft((d) => ({ ...d, clientName: e.target.value }))}
                    onBlur={createBlurFixRuFreeText((next) => setDraft((d) => ({ ...d, clientName: next })))}
                    autoComplete="name"
                  />
                </Field>
              </div>
              <Field label={useProfileLayout ? 'Телефон' : 'Клиент (телефон)'} insetLabel={useProfileLayout}>
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
              <Field label={useProfileLayout ? 'Электронная почта' : 'Клиент (почта)'} insetLabel={useProfileLayout}>
                <Input
                  className="input"
                  type="email"
                  value={draft.clientEmail}
                  onChange={(e) => setDraft((d) => ({ ...d, clientEmail: e.target.value }))}
                  autoComplete="email"
                />
              </Field>
            </>
          ) : null}
        </div>

        {!detailingFormFieldsDisabled ? (
          <>
            {!useProfileLayout ? (
              <div
                className="topBorder carEditCoverBlock"
                style={
                  ownerVinFieldsLocked
                    ? { pointerEvents: 'none', opacity: 0.55 }
                    : undefined
                }
              >
                <div
                  className="field field--full serviceHint__fieldWrap carEditCoverBlock__field"
                  id="car-edit-hero-hint"
                >
                  <div className="field__top serviceHint__fieldTop carEditCoverBlock__labelRow">
                    <span className="field__label">Настройка обложки</span>
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
            ) : null}

            {mode === 'create' ? (
              <div className="topBorder carEditLegalConsent">
                <CarDataConsent
                  inputId="car-create-legal-consent"
                  checked={carLegalConsent}
                  onChange={setCarLegalConsent}
                  className="carEditLegalConsent__checkbox"
                />
                <p className="muted small carEditLegalConsent__hint">
                  Согласие обязательно для сохранения новой карточки автомобиля и обработки данных авто.
                </p>
              </div>
            ) : null}

            <div className="formActions topBorder">
              <Button
                className="btn"
                variant="primary"
                disabled={saveBusy || ownerVinFieldsLocked}
                aria-busy={saveBusy || undefined}
                onClick={async () => {
                  if (saveInFlightRef.current) return
                  if (mode === 'create' && !carLegalConsent) {
                    toast('Подтвердите согласие с политикой конфиденциальности и правилами использования сервиса.', 'warn')
                    return
                  }
                  const vinErr = describeVinValidationError(normVin(draft.vin))
                  const plateErr = describeRuPlateValidationError(draft.plate, draft.plateRegion)
                  if (vinErr) {
                    toast(vinErr, 'warn')
                    return
                  }
                  if (mode === 'create' && who === 'owner' && normVin(draft.vin).length !== 17) {
                    toast('Укажите полный VIN из 17 символов.', 'warn')
                    return
                  }
                  if (mode === 'create' && who === 'detailing' && normVin(draft.vin).length !== 17) {
                    toast('Для новой карточки в кабинете партнёра нужен полный VIN из 17 символов.', 'warn')
                    return
                  }
                  if (plateErr) {
                    toast(plateErr, 'warn')
                    return
                  }
                  if (mode === 'edit') {
                    const nextMileage = Number(String(draft.mileageKm || '0')) || 0
                    if (nextMileage < minMileageKm) {
                      toast(`Пробег не может быть меньше ${fmtInt(minMileageKm)} км — по карточке и истории визитов.`, 'warn')
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
                        toast(formatHttpErrorMessage(e), 'error')
                        return
                      }
                      invalidateRepo()
                      if (who === 'owner') nav(listReturn)
                      else nav(`/car/${id}${buildCarFromQuery(fromParam)}`)
                    } else {
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
                      const created = await r.createCar(null, {
                        ...draft,
                        legalConsentAccepted: true,
                      })
                      if (!created?.id) {
                        toast('Ошибка при создании карточки', 'error')
                        return
                      }
                      if (who === 'owner') refreshAllClientData()
                      else invalidateRepo()
                      nav(`/car/${created.id}${buildCarFromQuery(fromParam)}`)
                    }
                  } catch (e) {
                    if (import.meta.env.DEV) console.error(e)
                    toast(formatHttpErrorMessage(e), 'error')
                  } finally {
                    saveInFlightRef.current = false
                    setSaveBusy(false)
                  }
                }}
              >
                {saveBusy ? 'Сохранение…' : isDetailingCreate ? 'Добавить автомобиль' : 'Сохранить'}
              </Button>
              <Link className="btn" data-variant="outline" to={backNavTo}>
                Отменить
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
                        'Альтернатива: в настройках карточки можно отвязать авто от гаража — карточка останется в сети без владельца.'
                      if (!confirm(msg)) return
                      try {
                        await r.deleteCar(id)
                        invalidateRepo()
                        const list = await r.listCars()
                        nav(getPathAfterCarRemovedFromScope(list, { mode: who, owner, detailingId }), { replace: true })
                      } catch {
                        toast('Не удалось удалить авто (нет доступа).', 'error')
                      }
                    })
                  }
                >
                  Удалить авто
                </Button>
              ) : null}
            </div>
          </>
        ) : null}
      </Card>
    </div>
    </>
  )
}

