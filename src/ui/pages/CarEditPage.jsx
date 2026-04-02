import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { BackNav, Button, Card, ComboBox, Field, Input } from '../components.jsx'
import { detailingOnboardingPending, useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'
import { normDigits, normPlateBase, normPlateRegion, normVin, parsePlateFull } from '../../lib/format.js'
import carBrands from '@al-bani/car-brands/assets/brands.json'
import allCities from 'country-city-state/cities.json'
import {
  addCustomMake,
  addCustomModel,
  getCustomMakes,
  getCustomModelsByMake,
} from '../../lib/customDicts.js'

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
  const scope = who === 'owner' ? { ownerEmail: owner?.email } : { detailingId }
  const car = mode === 'edit' ? r.getCar(id, scope) : null
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
      if (clientPhone) base.clientPhone = clientPhone
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

  if (detailingOnboardingPending(who, detailing)) return <Navigate to="/detailing/settings" replace />
  if (mode === 'edit' && !car) return <Navigate to="/cars" replace />

  const title = who === 'owner' ? 'Моя машина' : mode === 'edit' ? 'Редактирование' : 'Новая карточка'
  const garageLink = who === 'owner' ? '/cars' : '/detailing'

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <Link to={garageLink}>{who === 'owner' ? 'Мой гараж' : 'Кабинет'}</Link>
            <span> / </span>
            <span>{title}</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <BackNav />
            <h1 className="h1" style={{ margin: 0 }}>
              {title}
            </h1>
          </div>
          <p className="muted">
            Карточка авто + история визитов + документы.
          </p>
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
          <Field
            label="Пробег (км)"
            hint={mode === 'edit' && baseMileageKm ? `мин. ${baseMileageKm} км` : undefined}
          >
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
          </Field>
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
              <Field label="Клиент (имя)" hint="необязательно">
                <Input
                  className="input"
                  value={draft.clientName}
                  onChange={(e) => setDraft((d) => ({ ...d, clientName: e.target.value }))}
                  placeholder="Например: Иван"
                  autoComplete="name"
                />
              </Field>
              <Field label="Клиент (телефон)" hint="необязательно, для поиска">
                <Input
                  className="input"
                  inputMode="tel"
                  value={draft.clientPhone}
                  onChange={(e) => setDraft((d) => ({ ...d, clientPhone: e.target.value }))}
                  placeholder="+7 999 123-45-67"
                  autoComplete="tel"
                />
              </Field>
              <Field label="Клиент (почта)" hint="необязательно, для поиска">
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
          <Field label="VIN" hint="можно оставить пустым для прототипа">
            <Input
              className="input mono"
              value={draft.vin}
              maxLength={17}
              onChange={(e) => setDraft((d) => ({ ...d, vin: normVin(e.target.value) }))}
              placeholder="WDD..."
            />
          </Field>
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
                  {draft.hero ? 'Заменить обложку' : 'Загрузить обложку'}
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
              onClick={() => {
                try {
                  if (mode === 'edit') {
                    const nextMileage = Number(String(draft.mileageKm || '0')) || 0
                    if (nextMileage < baseMileageKm) {
                      alert(`Пробег не может быть меньше исходного (${baseMileageKm} км).`)
                      return
                    }
                    const saved = r.updateCar(id, draft, scope)
                    if (!saved) {
                      alert('Не удалось сохранить изменения: нет доступа к этой карточке (проверьте, что вы вошли в правильный аккаунт).')
                      return
                    }
                  } else {
                    const vin = normVin(draft.vin)
                    if (vin) {
                      const matches = r.findCarsByVin ? r.findCarsByVin(vin) : []
                      if (Array.isArray(matches) && matches.length) {
                        const msg =
                          'Похоже, авто с таким VIN уже есть в сервисе.\n\n' +
                          'Это может быть дубль. Обычно в этом случае лучше запросить доступ по VIN и пройти модерацию у детейлинга.\n\n' +
                          'Создать новую карточку всё равно?'
                        if (!confirm(msg)) return
                      }
                    }
                    const plateKey =
                      draft.plate || draft.plateRegion ? `${normPlateBase(draft.plate)}${normPlateRegion(draft.plateRegion)}` : ''
                    if (plateKey && r.findCarsByPlate) {
                      const matches2 = r.findCarsByPlate({ plate: draft.plate, plateRegion: draft.plateRegion }) || []
                      if (Array.isArray(matches2) && matches2.length) {
                        const msg =
                          'Похоже, авто с таким госномером уже есть в сервисе.\n\n' +
                          'Это может быть дубль.\n\n' +
                          'Создать новую карточку всё равно?'
                        if (!confirm(msg)) return
                      }
                    }
                    const created = r.createCar(scope, draft)
                    nav(`/car/${created.id}`)
                  }
                  invalidateRepo()
                  if (mode === 'edit') nav(`/car/${id}`)
                } catch (e) {
                  console.error(e)
                  alert(
                    'Не удалось сохранить. Скорее всего, браузеру не хватает места для хранения фото (localStorage).\n\n' +
                      'Попробуйте: уменьшить фото или нажать «Сбросить демо», чтобы освободить место.',
                  )
                }
              }}
            >
              Сохранить
            </Button>
            <Link className="btn" data-variant="ghost" to={mode === 'edit' ? `/car/${id}` : garageLink}>
              Отмена
            </Link>
          </div>
          <div className="muted small">
            Подсказка: потом легко заменим localStorage на API.
          </div>
        </div>
      </Card>
    </div>
  )
}

