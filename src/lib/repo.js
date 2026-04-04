import { readLS, removeLS, resetAll, writeLS } from './storage.js'
import { buildQaDetailingPack, makeId, QA_DETAILING_ID, seedCars, seedEvents } from './seed.js'
import {
  dedupeOfferedStrings,
  splitLegacyCombinedServices,
  splitOfferedByCatalog,
} from './serviceCatalogs.js'
import {
  clampVisitTitle,
  fmtPlateFull,
  normPlateBase,
  normPlateRegion,
  normVin,
  OWNER_PASSWORD_MIN_LEN,
  ownerCityPublicFlag,
  ownerPublicFlagTrue,
  parsePlateFull,
  VISIT_CARE_TIP_MAX_LEN,
  DETAILING_WORKING_HOURS_MAX_LEN,
} from './format.js'
import { ownerGarageLimits } from './garageLimits.js'
import { VISIT_MAX_PHOTOS } from './uploadLimits.js'

const CARS_KEY = 'cars'
const EVENTS_KEY = 'events'
const DOCS_KEY = 'docs'
const SHARES_KEY = 'shares'
const DETAILINGS_KEY = 'detailings'
const OWNERS_KEY = 'owners'
const HERO_PREFIX = 'carHero.'
const WASH_PREFIX = 'carWash.'
const CLAIMS_KEY = 'carClaims'

/** Битый JSON в localStorage не должен валить весь UI при .map/.filter */
function lsArr(key) {
  const v = readLS(key, [])
  return Array.isArray(v) ? v : []
}

/** Тестовый детейлинг с 10 авто — один раз дописывается в хранилище, если ещё нет `det_qa`. */
function ensureQaDetailingPack() {
  const detailings = lsArr(DETAILINGS_KEY)
  if (detailings.some((d) => d && String(d.id) === QA_DETAILING_ID)) return

  const pack = buildQaDetailingPack()
  writeLS(DETAILINGS_KEY, [pack.detailing, ...detailings])
  writeLS(CARS_KEY, [...pack.cars, ...lsArr(CARS_KEY)])
  writeLS(EVENTS_KEY, [...pack.events, ...lsArr(EVENTS_KEY)])
  writeLS(DOCS_KEY, [...pack.docs, ...lsArr(DOCS_KEY)])
}

function ensureSeeded() {
  const seed = readLS('seeded', false)
  const existingCars = lsArr(CARS_KEY)
  const hasCars = Array.isArray(existingCars) && existingCars.length > 0
  if (!seed || !hasCars) {
    const detailings = [
      {
        id: 'det_seed',
        name: 'Демо-детейлинг',
        email: 'test@test',
        password: '1111',
        pin: '1234',
        createdAt: new Date().toISOString(),
        servicesOffered: [
          'Мойка кузова',
          'Деликатная мойка (2‑фазная)',
          'Осмотр ЛКП',
          'Полировка (1‑шаг)',
          'Керамика',
          'Химчистка салона',
          'Замена масла ДВС',
          'Замена передних колодок',
          'Развал‑схождение',
        ],
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

  ensureQaDetailingPack()
}

function nowIso() {
  return new Date().toISOString()
}

function normGarageSlug(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

const EVENT_EDIT_WINDOW_MS = 3 * 60 * 60 * 1000

function isWithinEditWindow(evt) {
  if (!evt) return false
  const base = evt.updatedAt || evt.createdAt || evt.at || null
  const t = base ? new Date(base).getTime() : NaN
  if (!Number.isFinite(t)) return false
  return Date.now() - t <= EVENT_EDIT_WINDOW_MS
}

function clampInt(n, { min = 0, max = 1000000 } = {}) {
  const v = Number(n)
  if (!Number.isFinite(v)) return min
  return Math.min(Math.max(min, Math.trunc(v)), Math.trunc(max))
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
        .slice(0, VISIT_MAX_PHOTOS),
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

  function normPhone(s) {
    const raw = String(s || '').trim()
    if (!raw) return ''
    const digits = raw.replace(/[^\d]/g, '')
    if (!digits) return ''
    // RU-friendly normalизация: 8XXXXXXXXXX -> +7XXXXXXXXXX, 9XXXXXXXXX -> +79XXXXXXXXX
    let d = digits
    if (d.length === 11 && d.startsWith('8')) d = `7${d.slice(1)}`
    else if (d.length === 10) d = `7${d}`
    // 11 цифр с ведущей 7 — уже в формате кода страны
    return `+${d}`
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
    const city = d.city != null ? String(d.city).trim() : ''
    const address = d.address != null ? String(d.address).trim() : ''
    const workingHours =
      d.workingHours != null
        ? String(d.workingHours).trim().slice(0, DETAILING_WORKING_HOURS_MAX_LEN)
        : ''
    const description = d.description != null ? String(d.description).trim() : ''
    const website = d.website != null ? String(d.website).trim() : ''
    const telegram = d.telegram != null ? String(d.telegram).trim() : ''
    const instagram = d.instagram != null ? String(d.instagram).trim() : ''
    const logo = d.logo != null ? String(d.logo).trim() : ''
    const cover = d.cover != null ? String(d.cover).trim() : ''
    const contactName = d.contactName != null ? String(d.contactName).trim() : ''
    const servicesOfferedRaw = Array.isArray(d.servicesOffered)
      ? d.servicesOffered.map((x) => String(x || '').trim()).filter(Boolean)
      : []
    const legacyNoSplit =
      d.detailingServicesOffered == null && d.maintenanceServicesOffered == null
    let detailingServicesOffered
    let maintenanceServicesOffered
    if (legacyNoSplit) {
      const split = splitOfferedByCatalog(servicesOfferedRaw)
      detailingServicesOffered = split.detailingServicesOffered
      maintenanceServicesOffered = split.maintenanceServicesOffered
    } else {
      detailingServicesOffered = dedupeOfferedStrings(
        Array.isArray(d.detailingServicesOffered) ? d.detailingServicesOffered : [],
      )
      maintenanceServicesOffered = dedupeOfferedStrings(
        Array.isArray(d.maintenanceServicesOffered) ? d.maintenanceServicesOffered : [],
      )
    }
    if (
      !detailingServicesOffered.length &&
      !maintenanceServicesOffered.length &&
      String(d.id || '') === 'det_seed'
    ) {
      const split = splitOfferedByCatalog([
        'Мойка кузова',
        'Деликатная мойка (2‑фазная)',
        'Осмотр ЛКП',
        'Полировка (1‑шаг)',
        'Керамика',
        'Химчистка салона',
        'Замена масла ДВС',
        'Замена передних колодок',
        'Развал‑схождение',
      ])
      detailingServicesOffered = split.detailingServicesOffered
      maintenanceServicesOffered = split.maintenanceServicesOffered
    }
    const servicesOffered = dedupeOfferedStrings([...detailingServicesOffered, ...maintenanceServicesOffered])
    // Явно false только у новых регистраций; отсутствие поля = старые данные, считаем профиль заполненным
    const profileCompleted = d.profileCompleted != null ? Boolean(d.profileCompleted) : true
    return {
      ...d,
      pin,
      email,
      password,
      phone,
      contactName,
      city,
      address,
      workingHours,
      description,
      website,
      telegram,
      instagram,
      logo,
      cover,
      servicesOffered,
      detailingServicesOffered,
      maintenanceServicesOffered,
      profileCompleted,
    }
  }

  function migrateOwner(o) {
    if (!o) return o
    const email = o.email != null ? normEmail(o.email) : ''
    const password = o.password != null ? String(o.password) : ''
    const name = o.name != null ? String(o.name).trim() : ''
    const phone = o.phone != null ? String(o.phone).trim() : ''
    const isPremium = o.isPremium != null ? Boolean(o.isPremium) : false
    const createdAt = o.createdAt || nowIso()
    const updatedAt = o.updatedAt || createdAt
    const garageBanner = o.garageBanner != null ? String(o.garageBanner).trim() : ''
    const garageAvatar = o.garageAvatar != null ? String(o.garageAvatar).trim() : ''
    const garageSlug = o.garageSlug != null ? normGarageSlug(String(o.garageSlug)) : ''
    const showPhonePublic = o.showPhonePublic != null ? ownerPublicFlagTrue(o.showPhonePublic) : false
    const garageWebsite = o.garageWebsite != null ? String(o.garageWebsite).trim() : ''
    const garageSocial = o.garageSocial != null ? String(o.garageSocial).trim() : ''
    const showWebsitePublic = o.showWebsitePublic != null ? ownerPublicFlagTrue(o.showWebsitePublic) : false
    const showSocialPublic = o.showSocialPublic != null ? ownerPublicFlagTrue(o.showSocialPublic) : false
    const showCityPublic = ownerCityPublicFlag(o.showCityPublic)
    const garageCity = o.garageCity != null ? String(o.garageCity).trim() : ''
    const lastVisitRaw = o.lastVisitAt != null ? String(o.lastVisitAt).trim() : ''
    const lastVisitAt = lastVisitRaw || updatedAt || createdAt
    return {
      ...o,
      email,
      password,
      name,
      phone,
      isPremium,
      garageBanner,
      garageAvatar,
      garageSlug,
      showPhonePublic,
      garageWebsite,
      garageSocial,
      showWebsitePublic,
      showSocialPublic,
      showCityPublic,
      garageCity,
      lastVisitAt,
      createdAt,
      updatedAt,
    }
  }

  function migrateCar(c) {
    if (c == null) return c
    const next = { ...c }
    if (next.vin != null) next.vin = normVin(next.vin)
    if (next.plateRegion == null) next.plateRegion = ''
    // миграция: если раньше в plate хранили вместе с регионом (A777AA77) — разнесём
    if (next.plate && !next.plateRegion) {
      const parsed = parsePlateFull(next.plate)
      next.plate = parsed.plate
      next.plateRegion = parsed.plateRegion
    } else {
      next.plate = normPlateBase(next.plate)
      next.plateRegion = normPlateRegion(next.plateRegion)
    }
    if (next.priceRub == null && next.priceUsd != null) {
      next.priceRub = Math.round(Number(next.priceUsd) * 95)
    }
    if (next.segment == null) next.segment = Number(next.priceRub) >= 6000000 ? 'premium' : 'mass'
    if (next.seller == null) next.seller = { name: 'Демо-детейлинг', type: 'service' }
    // Демо-детейлинг по умолчанию только для карточек без владельца (инвентарь сервиса).
    // Личный гараж (есть ownerEmail) без привязки к СТО остаётся с detailingId = null —
    // иначе авто попадало бы в список детейлинга без заявки по VIN.
    if (next.detailingId == null && !normEmail(next.ownerEmail)) {
      next.detailingId = 'det_seed'
    }
    if (next.ownerEmail == null) next.ownerEmail = null
    if (next.ownerPhone == null) next.ownerPhone = ''
    if (next.clientName == null) next.clientName = ''
    if (next.clientPhone == null) next.clientPhone = ''
    if (next.clientEmail == null) next.clientEmail = ''
    if (next.sellerId == null) next.sellerId = next.detailingId || null

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

  function normalizeCareTips(raw) {
    if (!raw || typeof raw !== 'object') return { important: '', tips: ['', '', ''] }
    const important = String(raw.important ?? '')
      .trim()
      .slice(0, VISIT_CARE_TIP_MAX_LEN)
    const src = Array.isArray(raw.tips) ? raw.tips : []
    const tips = [0, 1, 2].map((i) =>
      String(src[i] ?? '')
        .trim()
        .slice(0, VISIT_CARE_TIP_MAX_LEN),
    )
    return { important, tips }
  }

  function migrateEvent(e) {
    if (e == null) return e
    const next = { ...e }
    if (next.type == null || next.type === 'note') next.type = 'visit'
    if (!Array.isArray(next.services)) next.services = []
    if (!Array.isArray(next.maintenanceServices)) next.maintenanceServices = []
    const split = splitLegacyCombinedServices(next.services, next.maintenanceServices)
    next.services = split.services
    next.maintenanceServices = split.maintenanceServices
    if (next.detailingId == null) next.detailingId = 'det_seed'
    if (next.source == null) next.source = 'service'
    if (next.ownerEmail == null) next.ownerEmail = null
    if (next.createdAt == null) next.createdAt = next.at || nowIso()
    if (next.updatedAt == null) next.updatedAt = next.createdAt
    next.title = clampVisitTitle(next.title ?? '')
    next.careTips = normalizeCareTips(next.careTips)
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
    const migrated = lsArr(CLAIMS_KEY).map(migrateClaim)
    writeLS(CLAIMS_KEY, migrated)
    return migrated
  }

  function hasCarAccess(car, scope) {
    if (!car) return false
    const detId = scope?.detailingId ? String(scope.detailingId || '') : ''
    const ownerEmail = scope?.ownerEmail ? normEmail(scope.ownerEmail) : ''
    if (detId) return String(car.detailingId || '') === detId
    if (ownerEmail) return normEmail(car.ownerEmail) === ownerEmail
    return false
  }

  function hasDocAccess(doc, scope) {
    if (!doc) return false
    const detId = scope?.detailingId ? String(scope.detailingId || '') : ''
    const ownerEmail = scope?.ownerEmail ? normEmail(scope.ownerEmail) : ''
    if (detId) return doc.source === 'service' && String(doc.detailingId || '') === detId
    if (ownerEmail) return doc.source === 'owner' && normEmail(doc.ownerEmail) === ownerEmail
    return false
  }

  return {
    // ===== owners (локальная сессия) =====
    listOwners() {
      const migrated = lsArr(OWNERS_KEY).map(migrateOwner)
      writeLS(OWNERS_KEY, migrated)
      return migrated
    },
    getOwner(email) {
      const em = normEmail(email)
      if (!em) return null
      return this.listOwners().find((x) => normEmail(x.email) === em) || null
    },
    getOwnerByGarageSlug(slug) {
      const s = normGarageSlug(slug)
      if (!s) return null
      return this.listOwners().find((x) => normGarageSlug(x.garageSlug) === s) || null
    },
    registerOwner({ email, password, name, phone }) {
      const em = normEmail(email)
      const pwd = String(password || '').trim()
      if (!em) return { ok: false, reason: 'bad_email' }
      if (pwd.length < OWNER_PASSWORD_MIN_LEN) return { ok: false, reason: 'bad_password' }
      if (pwd.length > 128) return { ok: false, reason: 'bad_password' }
      const all = this.listOwners()
      if (all.some((x) => normEmail(x.email) === em)) return { ok: false, reason: 'email_taken' }
      const createdAt = nowIso()
      const o = {
        id: makeId('own'),
        email: em,
        password: pwd,
        name: String(name || '').trim(),
        phone: String(phone || '').trim(),
        isPremium: false,
        garageBanner: '',
        garageAvatar: '',
        garageSlug: '',
        showPhonePublic: false,
        garageWebsite: '',
        garageSocial: '',
        showWebsitePublic: false,
        showSocialPublic: false,
        showCityPublic: true,
        garageCity: '',
        createdAt,
        updatedAt: createdAt,
        lastVisitAt: createdAt,
      }
      writeLS(OWNERS_KEY, [o, ...all])
      return { ok: true, owner: o }
    },
    loginOwner({ email, password }) {
      const em = normEmail(email)
      const pwd = String(password || '').trim()
      if (!em || !pwd) return { ok: false, reason: 'bad_credentials' }
      const o = this.getOwner(em)
      if (!o) return { ok: false, reason: 'not_found' }
      const stored = String(o.password || '').trim()
      if (stored !== pwd) return { ok: false, reason: 'bad_password' }
      const all = this.listOwners()
      const idx = all.findIndex((x) => normEmail(x.email) === em)
      if (idx < 0) return { ok: true, owner: o }
      const prev = all[idx]
      const next = { ...prev, lastVisitAt: nowIso() }
      const copy = all.slice()
      copy[idx] = next
      writeLS(OWNERS_KEY, copy)
      return { ok: true, owner: next }
    },
    touchOwnerLastVisit(email) {
      const em = normEmail(email)
      if (!em) return null
      const all = this.listOwners()
      const idx = all.findIndex((x) => normEmail(x.email) === em)
      if (idx < 0) return null
      const prev = all[idx]
      const next = { ...prev, lastVisitAt: nowIso() }
      const copy = all.slice()
      copy[idx] = next
      writeLS(OWNERS_KEY, copy)
      return next
    },
    updateOwner(email, patch) {
      const em = normEmail(email)
      if (!em) return null
      const all = this.listOwners()
      const idx = all.findIndex((x) => normEmail(x.email) === em)
      if (idx < 0) return null
      const prev = all[idx]
      let garageSlug = prev.garageSlug != null ? normGarageSlug(String(prev.garageSlug)) : ''
      if (patch && Object.prototype.hasOwnProperty.call(patch, 'garageSlug')) {
        garageSlug = normGarageSlug(patch.garageSlug)
        if (garageSlug) {
          const taken = all.some(
            (x, i) => i !== idx && normGarageSlug(x.garageSlug || '') === garageSlug,
          )
          if (taken) return null
        }
      }
      const next = {
        ...prev,
        id: prev.id,
        email: prev.email,
        password: prev.password,
        name: patch?.name == null ? prev.name : String(patch.name || '').trim(),
        phone: patch?.phone == null ? prev.phone : String(patch.phone || '').trim(),
        isPremium: patch?.isPremium == null ? prev.isPremium : Boolean(patch.isPremium),
        garageBanner:
          patch?.garageBanner === undefined ? prev.garageBanner || '' : String(patch.garageBanner || '').trim(),
        garageAvatar:
          patch?.garageAvatar === undefined ? prev.garageAvatar || '' : String(patch.garageAvatar || '').trim(),
        garageSlug,
        showPhonePublic:
          patch?.showPhonePublic === undefined
            ? ownerPublicFlagTrue(prev.showPhonePublic)
            : ownerPublicFlagTrue(patch.showPhonePublic),
        garageWebsite:
          patch?.garageWebsite === undefined ? prev.garageWebsite || '' : String(patch.garageWebsite || '').trim(),
        garageSocial:
          patch?.garageSocial === undefined ? prev.garageSocial || '' : String(patch.garageSocial || '').trim(),
        showWebsitePublic:
          patch?.showWebsitePublic === undefined
            ? ownerPublicFlagTrue(prev.showWebsitePublic)
            : ownerPublicFlagTrue(patch.showWebsitePublic),
        showSocialPublic:
          patch?.showSocialPublic === undefined
            ? ownerPublicFlagTrue(prev.showSocialPublic)
            : ownerPublicFlagTrue(patch.showSocialPublic),
        showCityPublic:
          patch?.showCityPublic === undefined
            ? ownerCityPublicFlag(prev.showCityPublic)
            : ownerPublicFlagTrue(patch.showCityPublic),
        garageCity:
          patch?.garageCity === undefined ? prev.garageCity || '' : String(patch.garageCity || '').trim(),
        updatedAt: nowIso(),
      }
      const copy = all.slice()
      copy[idx] = next
      writeLS(OWNERS_KEY, copy)
      return next
    },

    listOwnerCars(ownerEmail) {
      return this.listCars({ ownerEmail: normEmail(ownerEmail) })
    },
    listDetailings() {
      const ds = lsArr(DETAILINGS_KEY)
      const migrated = ds.map(migrateDetailing)
      writeLS(DETAILINGS_KEY, migrated)
      return migrated.slice().sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')))
    },
    getDetailing(id) {
      return this.listDetailings().find((d) => d.id === id) || null
    },
    registerDetailing({
      name,
      contactName,
      email,
      phone,
      password,
      city,
      address,
      workingHours,
      servicesOffered,
      detailingServicesOffered,
      maintenanceServicesOffered,
    }) {
      const ds = lsArr(DETAILINGS_KEY)
      const migrated = ds.map(migrateDetailing)
      const em = normEmail(email)
      if (!em) return { error: 'bad_email' }
      const nm = String(name || '').trim()
      if (!nm) return { error: 'bad_name' }
      const contact = String(contactName || '').trim()
      if (!contact) return { error: 'bad_contact_name' }
      const phon = String(phone || '').trim()
      if (!phon) return { error: 'bad_phone' }
      const cityTrim = String(city || '').trim()
      if (!cityTrim) return { error: 'bad_city' }
      const addrTrim = String(address || '').trim()
      const hoursTrim = String(workingHours || '')
        .trim()
        .slice(0, DETAILING_WORKING_HOURS_MAX_LEN)
      let detList = dedupeOfferedStrings(Array.isArray(detailingServicesOffered) ? detailingServicesOffered : [])
      let maintList = dedupeOfferedStrings(Array.isArray(maintenanceServicesOffered) ? maintenanceServicesOffered : [])
      if (!detList.length && !maintList.length && Array.isArray(servicesOffered)) {
        const split = splitOfferedByCatalog(servicesOffered)
        detList = split.detailingServicesOffered
        maintList = split.maintenanceServicesOffered
      }
      if (!detList.length && !maintList.length) return { error: 'bad_services' }
      const offered = dedupeOfferedStrings([...detList, ...maintList])
      if (migrated.some((x) => normEmail(x.email) === em)) {
        return { error: 'email_taken' }
      }
      const pwd = String(password || '').trim()
      const finalPwd = pwd || '1111'
      const d = {
        id: makeId('det'),
        name: nm,
        contactName: contact,
        email: em,
        phone: phon,
        password: finalPwd,
        pin: finalPwd,
        servicesOffered: offered,
        detailingServicesOffered: detList,
        maintenanceServicesOffered: maintList,
        city: cityTrim,
        address: addrTrim,
        workingHours: hoursTrim,
        description: '',
        website: '',
        telegram: '',
        instagram: '',
        logo: '',
        cover: '',
        profileCompleted: false,
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

    updateDetailing(id, patch, { detailingId } = {}) {
      const detId = String(detailingId || '')
      if (!id || !detId || String(id) !== detId) return null

      const ds = lsArr(DETAILINGS_KEY).map(migrateDetailing)
      writeLS(DETAILINGS_KEY, ds)
      const idx = ds.findIndex((x) => x.id === id)
      if (idx < 0) return null
      const prev = ds[idx]

      let detailingServicesOffered = dedupeOfferedStrings(prev.detailingServicesOffered || [])
      let maintenanceServicesOffered = dedupeOfferedStrings(prev.maintenanceServicesOffered || [])
      if (patch?.detailingServicesOffered != null) {
        detailingServicesOffered = dedupeOfferedStrings(patch.detailingServicesOffered)
      }
      if (patch?.maintenanceServicesOffered != null) {
        maintenanceServicesOffered = dedupeOfferedStrings(patch.maintenanceServicesOffered)
      }
      if (
        patch?.servicesOffered != null &&
        patch?.detailingServicesOffered == null &&
        patch?.maintenanceServicesOffered == null
      ) {
        const split = splitOfferedByCatalog(patch.servicesOffered)
        detailingServicesOffered = split.detailingServicesOffered
        maintenanceServicesOffered = split.maintenanceServicesOffered
      }
      const servicesOffered = dedupeOfferedStrings([...detailingServicesOffered, ...maintenanceServicesOffered])

      const next = {
        ...prev,
        ...(patch || {}),
        id: prev.id,
        email: prev.email,
        pin: prev.pin,
        password: prev.password,
        phone: patch?.phone == null ? prev.phone : String(patch.phone || '').trim(),
        name: patch?.name == null ? prev.name : String(patch.name || '').trim(),
        contactName:
          patch?.contactName == null ? prev.contactName || '' : String(patch.contactName || '').trim(),
        detailingServicesOffered,
        maintenanceServicesOffered,
        servicesOffered,
        city: patch?.city == null ? prev.city : String(patch.city || '').trim(),
        address: patch?.address == null ? prev.address : String(patch.address || '').trim(),
        workingHours:
          patch?.workingHours == null
            ? prev.workingHours || ''
            : String(patch.workingHours || '').trim().slice(0, DETAILING_WORKING_HOURS_MAX_LEN),
        description: patch?.description == null ? prev.description : String(patch.description || '').trim(),
        website: patch?.website == null ? prev.website : String(patch.website || '').trim(),
        telegram: patch?.telegram == null ? prev.telegram : String(patch.telegram || '').trim(),
        instagram: patch?.instagram == null ? prev.instagram : String(patch.instagram || '').trim(),
        logo: patch?.logo == null ? prev.logo : String(patch.logo || '').trim(),
        cover: patch?.cover == null ? prev.cover : String(patch.cover || '').trim(),
        profileCompleted:
          patch && Object.prototype.hasOwnProperty.call(patch, 'profileCompleted')
            ? Boolean(patch.profileCompleted)
            : prev.profileCompleted,
        updatedAt: nowIso(),
      }
      const copy = ds.slice()
      copy[idx] = next
      writeLS(DETAILINGS_KEY, copy)
      return next
    },

    listCars(detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const detId = scope.detailingId || null
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const cars = lsArr(CARS_KEY)
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

      if (ownerEmail && !detId) {
        const mine = this.listCars({ ownerEmail })
        if (!ownerGarageLimits(mine).canAddManual) return null
      }

      const cars = lsArr(CARS_KEY)
      const createdAt = nowIso()
      const hero = input.hero?.trim() || ''
      const det = detId ? this.getDetailing(detId) : null
      const sellerFromDet =
        detId && det?.name
          ? { id: detId, name: String(det.name || '').trim(), type: 'service' }
          : detId
            ? { id: detId, name: 'Сервис', type: 'service' }
            : null
      const car = {
        id: makeId('car'),
        detailingId: detId,
        ownerEmail,
        ownerPhone: input.ownerPhone?.trim() || '',
        clientName: String(input.clientName || '').trim(),
        clientPhone: normPhone(input.clientPhone),
        clientEmail: input.clientEmail ? normEmail(input.clientEmail) : '',
        vin: normVin(input.vin),
        plate: normPlateBase(input.plate),
        plateRegion: normPlateRegion(input.plateRegion),
        make: input.make?.trim() || '',
        model: input.model?.trim() || '',
        year: Number(input.year) || null,
        mileageKm: clampInt(input.mileageKm, { min: 0, max: 1000000 }),
        priceRub: Number(input.priceRub ?? input.priceUsd) || 0,
        color: input.color?.trim() || '',
        city: input.city?.trim() || '',
        hero: '',
        segment: Number(input.priceRub ?? 0) >= 6000000 ? 'premium' : 'mass',
        sellerId: detId || null,
        seller: input.seller || sellerFromDet || { name: 'Демо-детейлинг', type: 'service' },
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

      const cars = lsArr(CARS_KEY)
      const idx = cars.findIndex((c) => c.id === id)
      if (idx < 0) return null
      const prev = cars[idx]
      if (ownerEmail) {
        if (normEmail(prev.ownerEmail) !== ownerEmail) return null
      } else if (detId && prev.detailingId && prev.detailingId !== detId) {
        return null
      }

      if (ownerEmail && prev.detailingId) {
        const keys = Object.keys(patch || {}).filter((k) => Object.prototype.hasOwnProperty.call(patch, k))
        const allowedOwnerServicePatch = new Set(['mileageKm', 'washPhotos', 'washPhoto'])
        if (keys.some((k) => !allowedOwnerServicePatch.has(k))) return null
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
        vin: patch?.vin == null ? prev.vin : normVin(patch.vin),
        plate: patch?.plate == null ? prev.plate : normPlateBase(patch.plate),
        plateRegion: patch?.plateRegion == null ? prev.plateRegion : normPlateRegion(patch.plateRegion),
        clientName: patch.clientName == null ? prev.clientName : String(patch.clientName || '').trim(),
        clientPhone: patch.clientPhone == null ? prev.clientPhone : normPhone(patch.clientPhone),
        clientEmail: patch.clientEmail == null ? prev.clientEmail : (patch.clientEmail ? normEmail(patch.clientEmail) : ''),
        year: patch.year == null ? prev.year : Number(patch.year) || null,
        mileageKm:
          patch.mileageKm == null
            ? prev.mileageKm
            : clampInt(patch.mileageKm, { min: clampInt(prev.mileageKm, { min: 0, max: 1000000 }), max: 1000000 }),
        priceRub: patch.priceRub == null ? prev.priceRub : Number(patch.priceRub) || 0,
        updatedAt: nowIso(),
      }
      next.segment = Number(next.priceRub) >= 6000000 ? 'premium' : 'mass'
      const copy = cars.slice()
      copy[idx] = next
      writeLS(CARS_KEY, copy)
      return next
    },
    deleteCar(id, detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const cars = lsArr(CARS_KEY).map(migrateCar)
      writeLS(CARS_KEY, cars)
      const prev = cars.find((c) => c.id === id)
      if (!prev || !hasCarAccess(prev, scope)) return null
      if (scope.ownerEmail && normEmail(prev.ownerEmail) === normEmail(scope.ownerEmail) && prev.detailingId) {
        return null
      }
      writeLS(CARS_KEY, cars.filter((c) => c.id !== id))
      removeHero(id)
      removeWash(id)
      const evts = lsArr(EVENTS_KEY)
      writeLS(EVENTS_KEY, evts.filter((e) => e.carId !== id))
      const docs = lsArr(DOCS_KEY)
      writeLS(DOCS_KEY, docs.filter((d) => d.carId !== id))
      const shares = lsArr(SHARES_KEY)
      writeLS(SHARES_KEY, shares.filter((s) => s.carId !== id))
      return { ok: true }
    },

    listEvents(carId, detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const detId = scope.detailingId || null
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const evts = lsArr(EVENTS_KEY)
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

    /** Фото блока «последний визит» на карточке = снимки самого нового визита (по дате), если у него есть вложения. */
    syncCarWashPhotosFromLatestEvent(carId, detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const evts = this.listEvents(carId, scope) || []
      const head = evts[0]
      let urls = []
      if (head?.id) {
        urls = (this.listDocs(carId, scope, { eventId: head.id }) || [])
          .map((d) => d.url)
          .filter(Boolean)
          .slice(0, VISIT_MAX_PHOTOS)
      }
      this.updateCar(carId, { washPhotos: urls }, scope)
    },

    addEvent(detailingId, carId, input) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const detId = scope.detailingId || null
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const evts = lsArr(EVENTS_KEY)
      const createdAt = nowIso()
      const rawSv = Array.isArray(input.services) ? input.services : []
      const rawMs = Array.isArray(input.maintenanceServices) ? input.maintenanceServices : []
      const car = this.getCar(carId, scope)
      const minMileage = car ? clampInt(car.mileageKm, { min: 0, max: 1000000 }) : 0
      const evt = {
        id: makeId('evt'),
        detailingId: detId,
        carId,
        at: input.at || createdAt,
        type: input.type || 'visit',
        title: clampVisitTitle(input.title),
        mileageKm: clampInt(input.mileageKm, { min: minMileage, max: 1000000 }),
        services: rawSv,
        maintenanceServices: rawMs,
        note: input.note?.trim() || '',
        careTips: ownerEmail ? normalizeCareTips(null) : normalizeCareTips(input.careTips),
        source: ownerEmail ? 'owner' : 'service',
        ownerEmail: ownerEmail || null,
        createdAt,
        updatedAt: createdAt,
      }
      writeLS(EVENTS_KEY, [evt, ...evts])
      // Подтягиваем пробег в карточке авто вверх, если визит выше текущего
      if (car && evt.mileageKm > minMileage) {
        try {
          this.updateCar(carId, { mileageKm: evt.mileageKm }, scope)
        } catch {
          // ignore
        }
      }
      return evt
    },
    updateEvent(id, patch, detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const detId = scope.detailingId || null
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const evts = lsArr(EVENTS_KEY).map(migrateEvent)
      writeLS(EVENTS_KEY, evts)
      const idx = evts.findIndex((e) => e.id === id)
      if (idx < 0) return null
      const prev = evts[idx]

      // Редактирование визита доступно только 3 часа с момента последнего сохранения
      if (!isWithinEditWindow(prev)) return null

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
        maintenanceServices: Array.isArray((patch || {}).maintenanceServices)
          ? (patch || {}).maintenanceServices
          : prev.maintenanceServices,
        title:
          (patch || {}).title == null ? prev.title : clampVisitTitle((patch || {}).title),
        note: (patch || {}).note == null ? prev.note : String((patch || {}).note || '').trim(),
        careTips:
          (patch || {}).careTips === undefined ? prev.careTips : normalizeCareTips((patch || {}).careTips),
        mileageKm:
          (patch || {}).mileageKm == null
            ? prev.mileageKm
            : (() => {
                const car = this.getCar(prev.carId, scope)
                const minMileage = car ? clampInt(car.mileageKm, { min: 0, max: 1000000 }) : 0
                return clampInt((patch || {}).mileageKm, { min: minMileage, max: 1000000 })
              })(),
        updatedAt: nowIso(),
      }

      const copy = evts.slice()
      copy[idx] = next
      writeLS(EVENTS_KEY, copy)
      // Подтягиваем пробег в карточке авто вверх, если визит выше текущего
      try {
        const car = this.getCar(prev.carId, scope)
        const cur = car ? clampInt(car.mileageKm, { min: 0, max: 1000000 }) : 0
        if (car && next.mileageKm > cur) this.updateCar(prev.carId, { mileageKm: next.mileageKm }, scope)
      } catch {
        // ignore
      }
      return next
    },
    deleteEvent(id, detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const evts = lsArr(EVENTS_KEY).map(migrateEvent)
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
      this.syncCarWashPhotosFromLatestEvent(prev.carId, scope)
      return { ok: true }
    },

    listDocs(carId, detailingId, { eventId } = {}) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const detId = scope.detailingId || null
      const ownerEmail = scope.ownerEmail ? normEmail(scope.ownerEmail) : null

      const docs = lsArr(DOCS_KEY)
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

      // Фото/файлы, привязанные к визиту, можно менять только в окно редактирования
      const targetEventId = input?.eventId || null
      if (targetEventId) {
        const evts = lsArr(EVENTS_KEY).map(migrateEvent)
        writeLS(EVENTS_KEY, evts)
        const evt = evts.find((e) => e.id === targetEventId)
        if (!evt || evt.carId !== carId) return null

        // права должны совпадать с типом визита
        if (evt.source === 'owner') {
          if (!ownerEmail || normEmail(evt.ownerEmail) !== ownerEmail) return null
        } else if (evt.source === 'service') {
          if (!detId || evt.detailingId !== detId) return null
        } else {
          return null
        }

        if (!isWithinEditWindow(evt)) return null
      }

      const docs = lsArr(DOCS_KEY)
      const doc = {
        id: makeId('doc'),
        detailingId: detId,
        carId,
        title: input.title?.trim() || 'Файл',
        kind: input.kind || 'photo',
        url: input.url || '',
        eventId: targetEventId,
        createdAt: nowIso(),
        source: ownerEmail ? 'owner' : 'service',
        ownerEmail: ownerEmail || null,
      }
      writeLS(DOCS_KEY, [doc, ...docs])
      if (targetEventId) {
        const evBump = lsArr(EVENTS_KEY).map(migrateEvent)
        const ix = evBump.findIndex((e) => e.id === targetEventId)
        if (ix >= 0) {
          const evCopy = evBump.slice()
          evCopy[ix] = { ...evCopy[ix], updatedAt: nowIso() }
          writeLS(EVENTS_KEY, evCopy)
        }
      }
      return doc
    },
    deleteDoc(id, detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const docs = lsArr(DOCS_KEY).map(migrateDoc)
      writeLS(DOCS_KEY, docs)
      const prev = docs.find((d) => d.id === id)
      if (!prev || !hasDocAccess(prev, scope)) return null

      // Если это файл визита — удалять можно только в окно редактирования визита
      if (prev.eventId) {
        const evts = lsArr(EVENTS_KEY).map(migrateEvent)
        writeLS(EVENTS_KEY, evts)
        const evt = evts.find((e) => e.id === prev.eventId)
        if (!evt) return null
        if (!isWithinEditWindow(evt)) return null
      }

      const evId = prev.eventId || null
      writeLS(DOCS_KEY, docs.filter((d) => d.id !== id))
      if (evId) {
        const evBump = lsArr(EVENTS_KEY).map(migrateEvent)
        const ix = evBump.findIndex((e) => e.id === evId)
        if (ix >= 0) {
          const evCopy = evBump.slice()
          evCopy[ix] = { ...evCopy[ix], updatedAt: nowIso() }
          writeLS(EVENTS_KEY, evCopy)
        }
        this.syncCarWashPhotosFromLatestEvent(prev.carId, scope)
      }
      return { ok: true }
    },

    createShare(carId, detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const car = this.getCar(carId, scope)
      if (!car) return null
      const shares = lsArr(SHARES_KEY)
      const token = makeId('share').replace('share_', '')
      const share = { id: makeId('share'), carId, token, createdAt: nowIso(), revokedAt: null }
      writeLS(SHARES_KEY, [share, ...shares])
      return share
    },
    listShares(carId) {
      const shares = lsArr(SHARES_KEY)
      return shares
        .filter((s) => s.carId === carId)
        .slice()
        .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''))
    },
    revokeShare(token, detailingId) {
      const scope =
        detailingId && typeof detailingId === 'object'
          ? detailingId
          : { detailingId: detailingId || null, ownerEmail: null }
      const shares = lsArr(SHARES_KEY)
      const share = shares.find((s) => s.token === token && !s.revokedAt)
      if (!share) return null
      const car = this.getCar(share.carId, scope)
      if (!car) return null
      const copy = shares.map((s) => (s.token === token ? { ...s, revokedAt: nowIso() } : s))
      writeLS(SHARES_KEY, copy)
      return { ok: true }
    },
    getCarByShareToken(token) {
      const shares = lsArr(SHARES_KEY)
      const share = shares.find((s) => s.token === token && !s.revokedAt)
      if (!share) return null
      const car = this.getCar(share.carId)
      if (!car) return null
      return { car, share }
    },

    // ===== заявки на привязку по VIN (mock) =====
    findCarsByVin(vin) {
      const v = normVin(vin)
      if (!v) return []
      // поиск по всем авто, без скоупа
      const all = lsArr(CARS_KEY).map(migrateCar)
      writeLS(CARS_KEY, all)
      return all.filter(
        (c) =>
          normVin(c.vin) === v &&
          Boolean(c.detailingId),
      )
    },

    findCarsByPlate({ plate, plateRegion } = {}) {
      const b = normPlateBase(plate)
      const r = normPlateRegion(plateRegion)
      if (!b) return []
      const key = fmtPlateFull(b, r)
      const all = lsArr(CARS_KEY).map(migrateCar)
      writeLS(CARS_KEY, all)
      return all.filter((c) => fmtPlateFull(c.plate, c.plateRegion) === key)
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
      const ownerCars = this.listCars({ ownerEmail: em })
      if (!ownerGarageLimits(ownerCars).canVinClaim) return { error: 'garage_full' }
      const car = this.getCar(carId)
      if (!car || !car.detailingId) return { error: 'not_found' }
      const all = readClaims()
      if (all.some((x) => x.carId === carId && normEmail(x.ownerEmail) === em && x.status === 'pending')) {
        return { error: 'already_pending' }
      }
      const ev = evidence && typeof evidence === 'object' ? evidence : {}
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
        evidence: { make: '', year, color },
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

    /** Очистка localStorage/sessionStorage с префиксом приложения + повторное заполнение стартовых данных. */
    resetLocalDemo() {
      resetAll()
      ensureSeeded()
      return { ok: true }
    },
  }
}

