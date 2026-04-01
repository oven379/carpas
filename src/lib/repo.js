import { readLS, removeLS, resetAll, writeLS } from './storage.js'
import { makeId, seedCars, seedEvents } from './seed.js'
import { splitLegacyCombinedServices } from './serviceCatalogs.js'

const CARS_KEY = 'cars'
const EVENTS_KEY = 'events'
const DOCS_KEY = 'docs'
const SHARES_KEY = 'shares'
const DETAILINGS_KEY = 'detailings'
const HERO_PREFIX = 'carHero.'
const WASH_PREFIX = 'carWash.'
const CLAIMS_KEY = 'carClaims'

function ensureSeeded() {
  const seed = readLS('seeded', false)
  const existingCars = readLS(CARS_KEY, [])
  const hasCars = Array.isArray(existingCars) && existingCars.length > 0
  if (seed && hasCars) return

  const detailings = [
    {
      id: 'det_seed',
      name: 'Not. Moiko. (демо)',
      email: 'test@test',
      password: '1111',
      pin: '1234',
      createdAt: new Date().toISOString(),
    },
  ]
  const cars = seedCars()
  const events = cars.flatMap((c) => seedEvents(c.id))
  const docs = []
  const shares = []

  writeLS(DETAILINGS_KEY, detailings)
  writeLS(CARS_KEY, cars)
  writeLS(EVENTS_KEY, events)
  writeLS(DOCS_KEY, docs)
  writeLS(SHARES_KEY, shares)
  writeLS('seeded', true)
}

function nowIso() {
  return new Date().toISOString()
}

export function repo() {
  ensureSeeded()

  function getHero(carId) {
    return readLS(`${HERO_PREFIX}${carId}`, '') || ''
  }

  function setHero(carId, value) {
    writeLS(`${HERO_PREFIX}${carId}`, String(value || ''))
  }

  function removeHero(carId) {
    removeLS(`${HERO_PREFIX}${carId}`)
  }

  function getWash(carId) {
    const v = readLS(`${WASH_PREFIX}${carId}`, [])
    if (Array.isArray(v)) return v.map((x) => String(x || '')).filter(Boolean)
    // миграция со старого формата (строка)
    if (typeof v === 'string' && v.trim()) return [v.trim()]
    return []
  }

  function setWash(carId, value) {
    const arr = Array.isArray(value) ? value : value ? [value] : []
    writeLS(
      `${WASH_PREFIX}${carId}`,
      arr
        .map((x) => String(x || '').trim())
        .filter(Boolean)
        .slice(0, 12),
    )
  }

  function removeWash(carId) {
    removeLS(`${WASH_PREFIX}${carId}`)
  }

  function normEmail(s) {
    return String(s || '')
      .trim()
      .toLowerCase()
  }

  function migrateDetailing(d) {
    if (!d) return d
    const pin = String(d.pin || '1234')
    const email =
      d.email != null && String(d.email).trim()
        ? normEmail(d.email)
        : d.id === 'det_seed'
          ? 'test@test'
          : ''
    const password =
      d.password != null && String(d.password) !== ''
        ? String(d.password)
        : d.id === 'det_seed'
          ? '1111'
          : pin
    const phone = d.phone != null ? String(d.phone).trim() : ''
    return { ...d, pin, email, password, phone }
  }

  function migrateCar(c) {
    if (c == null) return c
    const next = { ...c }
    if (next.priceRub == null && next.priceUsd != null) {
      next.priceRub = Math.round(Number(next.priceUsd) * 95)
    }
    if (next.segment == null) next.segment = Number(next.priceRub) >= 6000000 ? 'premium' : 'mass'
    if (next.seller == null) next.seller = { name: 'Not. Moiko.', type: 'service' }
    // Демо-детейлинг по умолчанию только для карточек без владельца (инвентарь сервиса).
    // Личный гараж (есть ownerEmail) без привязки к СТО остаётся с detailingId = null —
    // иначе авто попадало бы в список детейлинга без заявки по VIN.
    if (next.detailingId == null && !normEmail(next.ownerEmail)) {
      next.detailingId = 'det_seed'
    }
    if (next.ownerEmail == null) next.ownerEmail = null

    // Переносим тяжелую обложку в отдельный ключ, чтобы не переписывать весь массив cars
    if (next.hero) {
      try {
        if (!getHero(next.id)) setHero(next.id, next.hero)
        next.hero = ''
      } catch {
        // если не удалось сохранить — оставим как есть (лучше хоть что-то, чем потерять)
      }
    }
    return next
  }

  function migrateEvent(e) {
    if (e == null) return e
    const next = { ...e }
    if (next.type == null || next.type === 'note') next.type = 'visit'
    if (!Array.isArray(next.services)) next.services = []
    if (!Array.isArray(next.maintenanceServices)) next.maintenanceServices = []
    if (next.source === 'service') {
      next.maintenanceServices = []
    } else {
      const split = splitLegacyCombinedServices(next.services, next.maintenanceServices)
      next.services = split.services
      next.maintenanceServices = split.maintenanceServices
    }
    if (next.detailingId == null) next.detailingId = 'det_seed'
    if (next.source == null) next.source = 'service'
    if (next.ownerEmail == null) next.ownerEmail = null
    if (next.createdAt == null) next.createdAt = next.at || nowIso()
    if (next.updatedAt == null) next.updatedAt = next.createdAt
    return next
  }

  function migrateDoc(d) {
    if (!d) return d
    const next = { ...d }
    if (next.detailingId == null) next.detailingId = 'det_seed'
    if (next.eventId == null) next.eventId = null
    if (next.source == null) next.source = 'service'
    if (next.ownerEmail == null) next.ownerEmail = null
    return next
  }

  function migrateClaim(x) {
    if (!x) return x
    const next = { ...x }
    if (next.status == null) next.status = 'pending' // pending|approved|rejected
    if (next.createdAt == null) next.createdAt = nowIso()
    if (next.reviewedAt == null) next.reviewedAt = null
    next.ownerEmail = next.ownerEmail ? normEmail(next.ownerEmail) : null
    if (next.evidence == null || typeof next.evidence !== 'object') next.evidence = { make: '', year: '', color: '' }
    return next
  }

  function readClaims() {
    const arr = readLS(CLAIMS_KEY, [])
    const migrated = (Array.isArray(arr) ? arr : []).map(migrateClaim)
    writeLS(CLAIMS_KEY, migrated)
    return migrated
  }

  return {
    listOwnerCars(ownerEmail) {
      return this.listCars({ ownerEmail: normEmail(ownerEmail) })
    },
    listDetailings() {
      const ds = readLS(DETAILINGS_KEY, [])
      const migrated = ds.map(migrateDetailing)
      writeLS(DETAILINGS_KEY, migrated)
      return migrated.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    },
    getDetailing(id) {
      return this.listDetailings().find((d) => d.id === id) || null
    },
    registerDetailing({ name, email, phone, password }) {
      const ds = readLS(DETAILINGS_KEY, [])
      const migrated = ds.map(migrateDetailing)
      const em = normEmail(email)
      if (!em) return { error: 'bad_email' }
      const nm = String(name || '').trim()
      if (!nm) return { error: 'bad_name' }
      const phon = String(phone || '').trim()
      if (!phon) return { error: 'bad_phone' }
      if (migrated.some((x) => normEmail(x.email) === em)) {
        return { error: 'email_taken' }
      }
      const pwd = String(password || '').trim()
      const finalPwd = pwd || '1111'
      const d = {
        id: makeId('det'),
        name: nm,
        email: em,
        phone: phon,
        password: finalPwd,
        pin: finalPwd,
        createdAt: nowIso(),
      }
      writeLS(DETAILINGS_KEY, [d, ...ds])
      return d
    },
    loginDetailing({ email, password }) {
      const em = normEmail(email)
      const pwd = String(password || '').trim()
      if (!em || !pwd) return { ok: false, reason: 'bad_credentials' }
      const d = this.listDetailings().find((x) => normEmail(x.email) === em)
      if (!d) return { ok: false, reason: 'not_found' }
      if (pwd !== String(d.password || '').trim()) return { ok: false, reason: 'bad_password' }
      return { ok: true, detailing: d }
    },

    listCars(detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const detId = scope.detailingId || null
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const cars = readLS(CARS_KEY, [])
      const migrated = cars.map(migrateCar)
      writeLS(CARS_KEY, migrated)

      let approvedOwnerByCar = null
      if (detId) {
        const claims = readClaims()
        approvedOwnerByCar = new Set(
          claims
            .filter((x) => x.status === 'approved' && x.detailingId === detId)
            .map((x) => `${x.carId}|${normEmail(x.ownerEmail)}`),
        )
      }

      return migrated
        .filter((c) => {
          if (ownerEmail) return normEmail(c.ownerEmail) === ownerEmail
          if (detId) {
            if (c.detailingId !== detId) return false
            const em = normEmail(c.ownerEmail)
            if (em) {
              const key = `${c.id}|${em}`
              if (!approvedOwnerByCar.has(key)) return false
            }
            return true
          }
          return true
        })
        .map((c) => {
          const washPhotos = getWash(c.id)
          return {
            ...c,
            hero: getHero(c.id) || c.hero || '',
            washPhotos,
            washPhoto: washPhotos[0] || '',
          }
        })
        .slice()
        .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    },
    getCar(id, detailingId) {
      return this.listCars(detailingId).find((c) => c.id === id) || null
    },
    createCar(detailingId, input) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const detId = scope.detailingId || null
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      if (ownerEmail) {
        const existing = this.listCars({ ownerEmail })
        if (existing.length >= 1) return { error: 'owner_limit' }
      }

      const cars = readLS(CARS_KEY, [])
      const createdAt = nowIso()
      const hero = input.hero?.trim() || ''
      const car = {
        id: makeId('car'),
        detailingId: detId,
        ownerEmail,
        vin: input.vin?.trim() || '',
        plate: input.plate?.trim() || '',
        make: input.make?.trim() || '',
        model: input.model?.trim() || '',
        year: Number(input.year) || null,
        mileageKm: Number(input.mileageKm) || 0,
        priceRub: Number(input.priceRub ?? input.priceUsd) || 0,
        color: input.color?.trim() || '',
        city: input.city?.trim() || '',
        hero: '',
        segment: Number(input.priceRub ?? 0) >= 6000000 ? 'premium' : 'mass',
        seller: input.seller || { name: 'Not. Moiko.', type: 'service' },
        createdAt,
        updatedAt: createdAt,
      }
      if (hero) setHero(car.id, hero)
      writeLS(CARS_KEY, [car, ...cars])
      return car
    },
    updateCar(id, patch, detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const detId = scope.detailingId || null
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const cars = readLS(CARS_KEY, [])
      const idx = cars.findIndex((c) => c.id === id)
      if (idx < 0) return null
      const prev = cars[idx]
      if (ownerEmail) {
        if (normEmail(prev.ownerEmail) !== ownerEmail) return null
      } else if (detId && prev.detailingId && prev.detailingId !== detId) {
        return null
      }

      if (patch && Object.prototype.hasOwnProperty.call(patch, 'hero')) {
        const h = String(patch.hero || '').trim()
        if (h) setHero(id, h)
        else removeHero(id)
        patch = { ...patch }
        delete patch.hero
      }

      if (patch && Object.prototype.hasOwnProperty.call(patch, 'washPhoto')) {
        // совместимость: одиночное фото
        setWash(id, patch.washPhoto || '')
        patch = { ...patch }
        delete patch.washPhoto
      }

      if (patch && Object.prototype.hasOwnProperty.call(patch, 'washPhotos')) {
        setWash(id, patch.washPhotos || [])
        patch = { ...patch }
        delete patch.washPhotos
      }

      const next = {
        ...prev,
        ...patch,
        year: patch.year == null ? prev.year : Number(patch.year) || null,
        mileageKm: patch.mileageKm == null ? prev.mileageKm : Number(patch.mileageKm) || 0,
        priceRub: patch.priceRub == null ? prev.priceRub : Number(patch.priceRub) || 0,
        updatedAt: nowIso(),
      }
      next.segment = Number(next.priceRub) >= 6000000 ? 'premium' : 'mass'
      const copy = cars.slice()
      copy[idx] = next
      writeLS(CARS_KEY, copy)
      return next
    },
    deleteCar(id) {
      const cars = readLS(CARS_KEY, [])
      writeLS(CARS_KEY, cars.filter((c) => c.id !== id))
      removeHero(id)
      removeWash(id)
      const evts = readLS(EVENTS_KEY, [])
      writeLS(EVENTS_KEY, evts.filter((e) => e.carId !== id))
      const docs = readLS(DOCS_KEY, [])
      writeLS(DOCS_KEY, docs.filter((d) => d.carId !== id))
      const shares = readLS(SHARES_KEY, [])
      writeLS(SHARES_KEY, shares.filter((s) => s.carId !== id))
    },

    listEvents(carId, detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const detId = scope.detailingId || null
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const evts = readLS(EVENTS_KEY, [])
      const migrated = evts.map(migrateEvent)
      writeLS(EVENTS_KEY, migrated)
      const car = this.getCar(carId)
      return migrated
        .filter((e) => e.carId === carId)
        .filter((e) => {
          // детйлинг видит только свои подтверждённые
          if (detId) return e.detailingId === detId && e.source === 'service'

          // владелец видит: свои личные + подтверждённые от текущего детейлинга карточки
          if (ownerEmail) {
            if (e.source === 'owner') return normEmail(e.ownerEmail) === ownerEmail
            if (e.source === 'service') return car?.detailingId ? e.detailingId === car.detailingId : false
          }

          // гостю ничего
          return false
        })
        .slice()
        .sort((a, b) => (b.at || '').localeCompare(a.at || ''))
    },
    addEvent(detailingId, carId, input) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const detId = scope.detailingId || null
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const evts = readLS(EVENTS_KEY, [])
      const createdAt = nowIso()
      const rawSv = Array.isArray(input.services) ? input.services : []
      const rawMs = Array.isArray(input.maintenanceServices) ? input.maintenanceServices : []
      const evt = {
        id: makeId('evt'),
        detailingId: detId,
        carId,
        at: input.at || createdAt,
        type: input.type || 'visit',
        title: input.title?.trim() || '',
        mileageKm: Number(input.mileageKm) || 0,
        services: rawSv,
        maintenanceServices: ownerEmail ? rawMs : [],
        note: input.note?.trim() || '',
        source: ownerEmail ? 'owner' : 'service',
        ownerEmail: ownerEmail || null,
        createdAt,
        updatedAt: createdAt,
      }
      writeLS(EVENTS_KEY, [evt, ...evts])
      return evt
    },
    updateEvent(id, patch, detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const detId = scope.detailingId || null
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const evts = readLS(EVENTS_KEY, []).map(migrateEvent)
      writeLS(EVENTS_KEY, evts)
      const idx = evts.findIndex((e) => e.id === id)
      if (idx < 0) return null
      const prev = evts[idx]

      // права: owner может редактировать только свою историю, detailing — только свою service-историю
      if (prev.source === 'owner') {
        if (!ownerEmail || normEmail(prev.ownerEmail) !== ownerEmail) return null
      } else if (prev.source === 'service') {
        if (!detId || prev.detailingId !== detId) return null
      } else {
        return null
      }

      const next = {
        ...prev,
        ...(patch || {}),
        // защищаем инварианты
        id: prev.id,
        carId: prev.carId,
        detailingId: prev.detailingId,
        source: prev.source,
        ownerEmail: prev.ownerEmail,
        type: prev.type || 'visit',
        services: Array.isArray((patch || {}).services) ? (patch || {}).services : prev.services,
        maintenanceServices:
          prev.source === 'service'
            ? []
            : Array.isArray((patch || {}).maintenanceServices)
              ? (patch || {}).maintenanceServices
              : prev.maintenanceServices,
        title: (patch || {}).title == null ? prev.title : String((patch || {}).title || '').trim(),
        note: (patch || {}).note == null ? prev.note : String((patch || {}).note || '').trim(),
        mileageKm:
          (patch || {}).mileageKm == null ? prev.mileageKm : Number((patch || {}).mileageKm) || 0,
        updatedAt: nowIso(),
      }

      const copy = evts.slice()
      copy[idx] = next
      writeLS(EVENTS_KEY, copy)
      return next
    },
    deleteEvent(id, detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const evts = readLS(EVENTS_KEY, []).map(migrateEvent)
      writeLS(EVENTS_KEY, evts)
      const prev = evts.find((e) => e.id === id)
      if (!prev) return null

      // Визиты/события детейлинга (service) по ТЗ не удаляются никогда.
      if (prev.source === 'service') return null

      // Личную историю владелец может удалить только у себя.
      if (prev.source === 'owner') {
        if (!ownerEmail || normEmail(prev.ownerEmail) !== ownerEmail) return null
      } else {
        return null
      }

      writeLS(EVENTS_KEY, evts.filter((e) => e.id !== id))
      return { ok: true }
    },

    listDocs(carId, detailingId, { eventId } = {}) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const detId = scope.detailingId || null
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const docs = readLS(DOCS_KEY, [])
      const migrated = docs.map(migrateDoc)
      writeLS(DOCS_KEY, migrated)
      const car = this.getCar(carId)
      return migrated
        .filter((d) => d.carId === carId)
        .filter((d) => {
          if (eventId && d.eventId !== eventId) return false

          if (detId) return d.detailingId === detId && d.source === 'service'
          if (ownerEmail) {
            if (d.source === 'owner') return normEmail(d.ownerEmail) === ownerEmail
            if (d.source === 'service') return car?.detailingId ? d.detailingId === car.detailingId : false
          }
          return false
        })
        .filter((d) => (eventId ? d.eventId === eventId : true))
        .slice()
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    },
    addDoc(detailingId, carId, input) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const detId = scope.detailingId || null
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const docs = readLS(DOCS_KEY, [])
      const doc = {
        id: makeId('doc'),
        detailingId: detId,
        carId,
        title: input.title?.trim() || 'Файл',
        kind: input.kind || 'photo',
        url: input.url || '',
        eventId: input.eventId || null,
        createdAt: nowIso(),
        source: ownerEmail ? 'owner' : 'service',
        ownerEmail: ownerEmail || null,
      }
      writeLS(DOCS_KEY, [doc, ...docs])
      return doc
    },
    deleteDoc(id) {
      const docs = readLS(DOCS_KEY, [])
      writeLS(DOCS_KEY, docs.filter((d) => d.id !== id))
    },

    createShare(carId) {
      const shares = readLS(SHARES_KEY, [])
      const token = makeId('share').replace('share_', '')
      const share = { id: makeId('share'), carId, token, createdAt: nowIso(), revokedAt: null }
      writeLS(SHARES_KEY, [share, ...shares])
      return share
    },
    listShares(carId) {
      const shares = readLS(SHARES_KEY, [])
      return shares
        .filter((s) => s.carId === carId)
        .slice()
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    },
    revokeShare(token) {
      const shares = readLS(SHARES_KEY, [])
      const copy = shares.map((s) => (s.token === token ? { ...s, revokedAt: nowIso() } : s))
      writeLS(SHARES_KEY, copy)
    },
    getCarByShareToken(token) {
      const shares = readLS(SHARES_KEY, [])
      const share = shares.find((s) => s.token === token && !s.revokedAt)
      if (!share) return null
      const car = this.getCar(share.carId)
      if (!car) return null
      return { car, share }
    },

    // ===== VIN claim flow (MVP mock) =====
    findCarsByVin(vin) {
      const v = String(vin || '').trim().toLowerCase()
      if (!v) return []
      // поиск по всем авто, без скоупа
      const all = readLS(CARS_KEY, []).map(migrateCar)
      writeLS(CARS_KEY, all)
      return all.filter(
        (c) =>
          String(c.vin || '').trim().toLowerCase() === v &&
          Boolean(c.detailingId),
      )
    },
    listClaimsForOwner(ownerEmail) {
      const em = normEmail(ownerEmail)
      return readClaims()
        .filter((x) => normEmail(x.ownerEmail) === em)
        .slice()
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    },
    listClaimsForDetailing(detailingId) {
      const detId = String(detailingId || '')
      return readClaims()
        .filter((x) => x.detailingId === detId)
        .slice()
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    },
    createClaim({ carId, ownerEmail, evidence }) {
      const em = normEmail(ownerEmail)
      if (!carId || !em) return { error: 'bad_input' }
      const car = this.getCar(carId)
      if (!car || !car.detailingId) return { error: 'not_found' }
      const all = readClaims()
      if (all.some((x) => x.carId === carId && normEmail(x.ownerEmail) === em && x.status === 'pending')) {
        return { error: 'already_pending' }
      }
      const ev = evidence && typeof evidence === 'object' ? evidence : {}
      const make = String(ev.make || '').trim()
      const year = String(ev.year || '').trim()
      const color = String(ev.color || '').trim()
      const claim = {
        id: makeId('claim'),
        carId,
        detailingId: car.detailingId,
        ownerEmail: em,
        status: 'pending',
        createdAt: nowIso(),
        reviewedAt: null,
        evidence: { make, year, color },
      }
      writeLS(CLAIMS_KEY, [claim, ...all])
      return claim
    },
    reviewClaim(claimId, { status }) {
      const all = readClaims()
      const idx = all.findIndex((x) => x.id === claimId)
      if (idx < 0) return null
      const prev = all[idx]
      if (status !== 'approved' && status !== 'rejected') return null

      const next = { ...prev, status, reviewedAt: nowIso() }
      const copy = all.slice()
      copy[idx] = next
      writeLS(CLAIMS_KEY, copy)

      if (status === 'approved') {
        // назначаем владельца авто
        this.updateCar(prev.carId, { ownerEmail: prev.ownerEmail }, { detailingId: prev.detailingId })
      }
      return next
    },

    /** Очистка localStorage/sessionStorage с префиксом приложения + повторное заполнение демо (MVP). */
    resetLocalDemo() {
      resetAll()
      ensureSeeded()
      return { ok: true }
    },
  }
}

