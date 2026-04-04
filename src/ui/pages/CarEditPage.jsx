import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Button, Card, ComboBox, Field, Input, ServiceHint } from '../components.jsx'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'
import {
  formatPhoneRuInput,
  IMAGE_UPLOAD_EMPTY_CTA,
  normDigits,
  normPlateBase,
  normPlateRegion,
  normVin,
  parsePlateFull,
} from '../../lib/format.js'
import carBrands from '@al-bani/car-brands/assets/brands.json'
import allCities from 'country-city-state/cities.json'
import {
  addCustomMake,
  addCustomModel,
  getCustomMakes,
  getCustomModelsByMake,
} from '../../lib/customDicts.js'
import { buildCarFromQuery, ownerGarageListCrumbLabel, resolveCarListReturnPath } from '../carNav.js'
import { ownerGarageLimits } from '../../lib/garageLimits.js'
import { PHOTO_LANDSCAPE_HINT_SENTENCE } from '../../lib/historyVisitHints.js'

function cssUrl(url) {
  // data: URL может содержать символы, которые ломают url(...) без кавычек
  const safe = String(url || '').replaceAll('"', '%22')
  return `url("${safe}")`
}

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
  const { detailingId, detailing, owner, mode: who } = useDetailing()
  const [car, setCar] = useState(null)
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
  }, [mode, id, r, r._version])

  const baseMileageKm = mode === 'edit' && car ? Number(car.mileageKm) || 0 : 0
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

  const citiesRu = useMemo(() => {
    const names = (Array.isArray(allCities) ? allCities : [])
      .filter((c) => c?.countryCode === 'RU')
      .map((c) => String(c?.locales?.ru?.name || c?.name || '').trim())
      .filter(Boolean)
    return Array.from(new Set(names)).sort((a, b) => a.localeCompare(b))
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
    const key = `${mode}:${id || ''}`
    if (loadedKeyRef.current === key) return

    if (mode === 'edit') {
      if (!car) return
      const hero = car.hero || ''
      setDraft({
        vin: car.vin || '',
        plate: car.plate || '',
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
    // Быстрое создание из кабинета детейлинга: подставляем VIN/номер/контакты из query-параметров
    if (who !== 'owner') {
      const vin = normVin(String(sp.get('vin') || '').trim())
      const plate = String(sp.get('plate') || '').trim()
      const plateRegion = String(sp.get('plateRegion') || '').trim()
      const clientPhone = String(sp.get('clientPhone') || '').trim()
      const clientEmail = String(sp.get('clientEmail') || '').trim()
      if (vin) base.vin = vin
      if (plate) {
        const parsed = parsePlateFull(plate)
        base.plate = parsed.plate
        base.plateRegion = parsed.plateRegion
      }
      if (plateRegion) base.plateRegion = normPlateRegion(plateRegion)
      if (clientPhone) base.clientPhone = formatPhoneRuInput(clientPhone)
      if (clientEmail) base.clientEmail = clientEmail
    }
    setDraft(base)
    loadedKeyRef.current = key
  }, [mode, id, car, who, sp])

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

  if (detailingOnboardingPending(who, detailing)) return <Navigate to="/detailing/landing" replace />
  if (mode === 'edit') {
    if (!carReady) {
      return (
        <div className="container muted" style={{ padding: '24px 0' }}>
          Загрузка…
        </div>
      )
    }
    if (!car) {
      return <Navigate to={who === 'detailing' ? '/detailing' : '/cars'} replace />
    }
  }
  if (mode === 'edit' && who === 'owner' && car?.detailingId) {
    return <Navigate to={`/car/${id}${buildCarFromQuery(sp.get('from') || '')}`} replace />
  }
  if (mode === 'create' && who === 'owner' && owner?.email) {
    const lim = ownerGarageLimits(r.listCars({ ownerEmail: owner.email }))
    if (!lim.canAddManual) {
      return <Navigate to={resolveCarListReturnPath('owner', sp.get('from') || '')} replace />
    }
  }

  const fromParam = sp.get('from') || ''
  const listReturn = resolveCarListReturnPath(who, fromParam)
  const carCardHref = mode === 'edit' && id ? `/car/${id}${buildCarFromQuery(fromParam)}` : listReturn

  const title = who === 'owner' ? 'Моя машина' : mode === 'edit' ? 'Редактирование' : 'Новая карточка'
  /** Владелец: из редактирования сразу в гараж/список (?from=). Партнёр: из редактирования — к карточке авто. */
  const backNavTo = who === 'owner' ? listReturn : mode === 'edit' ? carCardHref : listReturn
  const backNavTitle =
    who === 'owner'
      ? listReturn === '/garage' || listReturn.startsWith('/garage?')
        ? 'В гараж'
        : 'К автомобилям'
      : mode === 'edit'
        ? 'К карточке авто'
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
              <ServiceHint scopeId="car-edit-mileage-hint" label="Справка: пробег">
                {mode === 'edit' && baseMileageKm ? (
                  <p className="serviceHint__panelText">Минимум {baseMileageKm} км — по данным последнего визита в истории.</p>
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
              placeholder={mode === 'edit' && baseMileageKm ? String(baseMileageKm) : '12000'}
            />
          </div>
          <Field label="Город">
            <ComboBox
              value={draft.city}
              options={citiesRu}
              placeholder="Начните вводить… (например: Москва)"
              maxItems={60}
              onChange={(v) => setDraft((d) => ({ ...d, city: v }))}
            />
          </Field>
          {who !== 'owner' ? (
            <>
              <div className="field serviceHint__fieldWrap" id="car-edit-client-name-hint">
                <div className="field__top serviceHint__fieldTop">
                  <span className="field__label">Клиент (имя)</span>
                  <ServiceHint scopeId="car-edit-client-name-hint" label="Справка: клиент">
                    <p className="serviceHint__panelText">
                      Имя, телефон и почта необязательны; помогают найти карточку в кабинете и связаться с владельцем.
                    </p>
                  </ServiceHint>
                </div>
                <Input
                  className="input"
                  value={draft.clientName}
                  onChange={(e) => setDraft((d) => ({ ...d, clientName: e.target.value }))}
                  placeholder="Например: Иван"
                  autoComplete="name"
                />
              </div>
              <Field label="Клиент (телефон)">
                <Input
                  className="input"
                  inputMode="tel"
                  value={draft.clientPhone}
                  onChange={(e) => setDraft((d) => ({ ...d, clientPhone: formatPhoneRuInput(e.target.value) }))}
                  placeholder="+7 999 123-45-67"
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
          <div className="field serviceHint__fieldWrap" id="car-edit-vin-hint">
            <div className="field__top serviceHint__fieldTop">
              <span className="field__label">VIN</span>
              <ServiceHint scopeId="car-edit-vin-hint" label="Справка: VIN">
                <p className="serviceHint__panelText">До 17 символов латиницы и цифр. Поле можно оставить пустым, если VIN пока неизвестен.</p>
              </ServiceHint>
            </div>
            <Input
              className="input mono"
              value={draft.vin}
              maxLength={17}
              onChange={(e) => setDraft((d) => ({ ...d, vin: normVin(e.target.value) }))}
              placeholder="WDD..."
            />
          </div>
          <Field label="Госномер">
            <div className="row gap" style={{ alignItems: 'center' }}>
              <Input
                className="input mono"
                value={draft.plate}
                maxLength={6}
                onChange={(e) => setDraft((d) => ({ ...d, plate: normPlateBase(e.target.value) }))}
                placeholder="A777AA"
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
                title="Регион"
              />
            </div>
          </Field>
          <Field label="Цвет">
            <ComboBox
              value={draft.color}
              options={COLOR_SUGGESTIONS}
              placeholder="Например: Чёрный (можно свой вариант)"
              maxItems={20}
              onChange={(v) => setDraft((d) => ({ ...d, color: v }))}
            />
          </Field>
        </div>

        <div className="topBorder carEditCoverBlock">
          <div className="muted small carEditCoverBlock__title">Обложка карточки</div>
          <p className="muted small" style={{ marginTop: 6, marginBottom: 10 }}>
            {PHOTO_LANDSCAPE_HINT_SENTENCE}
          </p>
          <div
            className={`carHero carHero--editCover${draft.hero ? '' : ' carHero--editCover--empty'}`}
            style={draft.hero ? { backgroundImage: cssUrl(draft.hero) } : undefined}
          >
            <div className="carHero__overlay carHero__overlay--editCover">
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
              <div className="carHero__editCoverBtns">
                <button
                  type="button"
                  className="heroCoverBtn heroCoverBtn--replace"
                  onClick={() => heroCoverFileRef.current?.click?.()}
                >
                  {draft.hero ? 'Заменить обложку' : IMAGE_UPLOAD_EMPTY_CTA}
                </button>
                {draft.hero ? (
                  <button
                    type="button"
                    className="heroCoverBtn heroCoverBtn--remove"
                    onClick={() => setDraft((d) => ({ ...d, hero: '' }))}
                  >
                    Убрать обложку
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className="row spread gap topBorder">
          <div className="row gap">
            <Button
              className="btn"
              variant="primary"
              onClick={async () => {
                try {
                  if (mode === 'edit') {
                    const nextMileage = Number(String(draft.mileageKm || '0')) || 0
                    if (nextMileage < baseMileageKm) {
                      alert(`Пробег не может быть меньше исходного (${baseMileageKm} км).`)
                      return
                    }
                    try {
                      await r.updateCar(id, draft)
                    } catch {
                      alert('Не удалось сохранить изменения: нет доступа к этой карточке (проверьте, что вы вошли в правильный аккаунт).')
                      return
                    }
                    invalidateRepo()
                    if (who === 'owner') nav(listReturn)
                    else nav(`/car/${id}${buildCarFromQuery(fromParam)}`)
                  } else {
                    const vin = normVin(draft.vin)
                    if (vin && r.findCarsByVin) {
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
                    if (plateKey && r.findCarsByPlate) {
                      try {
                        const matches2 = await r.findCarsByPlate({ plate: draft.plate, plateRegion: draft.plateRegion })
                        if (Array.isArray(matches2) && matches2.length) {
                          const msg =
                            'Похоже, авто с таким госномером уже есть в сервисе.\n\n' +
                            'Это может быть дубль.\n\n' +
                            'Создать новую карточку всё равно?'
                          if (!confirm(msg)) return
                        }
                      } catch {
                        /* ignore duplicate check */
                      }
                    }
                    const created = await r.createCar(null, draft)
                    if (!created?.id) {
                      alert(
                        'Не удалось создать карточку: возможен лимит гаража или ошибка сервера. Дополнительные авто — через поиск по VIN.',
                      )
                      return
                    }
                    invalidateRepo()
                    nav(`/car/${created.id}${buildCarFromQuery(fromParam)}`)
                  }
                } catch (e) {
                  console.error(e)
                  alert('Не удалось сохранить. Проверьте данные и подключение к серверу.')
                }
              }}
            >
              Сохранить
            </Button>
            <Link className="btn" data-variant="ghost" to={backNavTo}>
              Отмена
            </Link>
          </div>
          <div className="muted small">Данные сохраняются на сервере.</div>
        </div>
      </Card>
    </div>
  )
}

