import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { useRepo, invalidateRepo } from '../useRepo.js'
import { Button, Card, ComboBox, Field, Input } from '../components.jsx'
import { useDetailing } from '../useDetailing.js'
import { compressImageFile } from '../../lib/imageCompression.js'
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
    make: '',
    model: '',
    year: '',
    mileageKm: '',
    city: '',
    color: '',
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
  const r = useRepo()
  const { detailingId, owner, mode: who } = useDetailing()
  const scope = who === 'owner' ? { ownerEmail: owner?.email } : { detailingId }
  const car = mode === 'edit' ? r.getCar(id, scope) : null
  const ownerLimitHit =
    who === 'owner' && mode === 'create' && r.listCars({ ownerEmail: owner?.email }).length >= 1

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

  useEffect(() => {
    const key = `${mode}:${id || ''}`
    if (loadedKeyRef.current === key) return

    if (mode === 'edit') {
      if (!car) return
      setDraft({
        vin: car.vin || '',
        plate: car.plate || '',
        make: car.make || '',
        model: car.model || '',
        year: car.year ?? '',
        mileageKm: car.mileageKm ?? '',
        city: car.city || '',
        color: car.color || '',
        hero: car.hero || '',
      })
      loadedKeyRef.current = key
      return
    }

    setDraft(emptyDraft())
    loadedKeyRef.current = key
  }, [mode, id, car])

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

  if (mode === 'edit' && !car) return <Navigate to="/cars" replace />

  const title = who === 'owner' ? 'Моя машина' : mode === 'edit' ? 'Редактирование' : 'Новая карточка'
  const backTo = mode === 'edit' ? `/car/${id}` : '/cars'

  return (
    <div className="container">
      <div className="row spread gap">
        <div>
          <div className="breadcrumbs">
            <Link to="/cars">{who === 'owner' ? 'Мой гараж' : 'Мои авто'}</Link>
            <span> / </span>
            <span>{title}</span>
          </div>
          <div className="row gap wrap" style={{ alignItems: 'center' }}>
            <Link className="carBack" to={backTo} title="Назад">
              <span className="chev chev--left" aria-hidden="true" />
              <span className="srOnly">Назад</span>
            </Link>
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
        {ownerLimitHit ? (
          <Card className="card pad" style={{ marginBottom: 14 }}>
            <div className="cardTitle">Лимит MVP</div>
            <p className="muted small">
              В «Мой гараж» можно добавить <strong>1 авто бесплатно</strong>. Чтобы добавить ещё — напишите в сервис.
            </p>
          </Card>
        ) : null}
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
              onChange={(v) => setDraft((d) => ({ ...d, year: v }))}
            />
          </Field>
          <Field label="Пробег (км)">
            <Input
              className="input"
              inputMode="numeric"
              value={draft.mileageKm}
              onChange={(e) => setDraft((d) => ({ ...d, mileageKm: e.target.value }))}
              placeholder="12000"
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
          <Field label="VIN" hint="можно оставить пустым для прототипа">
            <Input
              className="input mono"
              value={draft.vin}
              onChange={(e) => setDraft((d) => ({ ...d, vin: e.target.value }))}
              placeholder="WDD..."
            />
          </Field>
          <Field label="Госномер">
            <Input
              className="input mono"
              value={draft.plate}
              onChange={(e) => setDraft((d) => ({ ...d, plate: e.target.value }))}
              placeholder="A777AA77"
            />
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
          <Field label="Фото/обложка (URL)" hint="можно вставить ссылку на картинку">
            <Input
              className="input"
              value={draft.hero}
              onChange={(e) => setDraft((d) => ({ ...d, hero: e.target.value }))}
              placeholder="https://..."
            />
          </Field>
          <Field label="Или загрузить фото" hint="фото будет автоматически сжато до 2 МБ и сохранено в браузере">
            <Input
              className="input"
              type="file"
              accept="image/*"
              onChange={async (e) => {
                const file = e.target.files?.[0]
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
                } finally {
                  e.target.value = ''
                }
              }}
            />
          </Field>
        </div>

        {draft.hero ? (
          <div className="topBorder">
            <div className="muted small" style={{ marginBottom: 10 }}>
              Предпросмотр обложки
            </div>
            <div className="carHero" style={{ height: 200, margin: 0, backgroundImage: cssUrl(draft.hero) }} />
          </div>
        ) : null}

        <div className="row spread gap topBorder">
          <div className="row gap">
            <Button
              className="btn"
              variant="primary"
              disabled={ownerLimitHit}
              title={ownerLimitHit ? 'Лимит 1 авто в Мой гараж (MVP)' : undefined}
              onClick={() => {
                try {
                  if (mode === 'edit') {
                    const saved = r.updateCar(id, draft, scope)
                    if (!saved) {
                      alert('Не удалось сохранить изменения: нет доступа к этой карточке (проверьте, что вы вошли в правильный аккаунт).')
                      return
                    }
                  } else {
                    if (ownerLimitHit) return
                    const vin = String(draft.vin || '').trim()
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
                    const created = r.createCar(scope, draft)
                    if (created?.error === 'owner_limit') {
                      alert('В «Мой гараж» можно добавить 1 авто бесплатно. Чтобы добавить ещё — напишите в сервис.')
                      return
                    }
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
            <Link className="btn" data-variant="ghost" to={mode === 'edit' ? `/car/${id}` : '/cars'}>
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

