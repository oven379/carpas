import { httpJson, HttpError } from './http.js'
import {
  clearDetailingSession,
  clearOwnerSession,
  getDetailingToken,
  getOwnerToken,
} from '../ui/auth.js'

/** Локальный хост страницы — тот же origin, что и для /api. */
function isSameOriginApiHost(hostname) {
  if (!hostname) return false
  if (hostname === 'localhost' || hostname === '127.0.0.1') return true
  // Телефон / другой ПК в LAN: http://192.168.x.x:5173 или :4173 — без этого запросы шли на localhost клиента
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) return true
  const m = /^172\.(\d{1,3})\.\d{1,3}\.\d{1,3}$/.exec(hostname)
  if (m) {
    const n = Number(m[1])
    if (n >= 16 && n <= 31) return true
  }
  return false
}

/**
 * В dev `VITE_API_BASE_URL=http://localhost/api` (порт 80 по умолчанию) обходит прокси Vite → 404.
 * Используйте относительный `/api` или явный порт: `http://127.0.0.1:8088/api`.
 */
export function getApiBaseUrl() {
  const raw = import.meta.env.VITE_API_BASE_URL
  const trimmed = raw && String(raw).trim() ? String(raw).replace(/\/+$/, '') : ''

  if (trimmed && import.meta.env.DEV) {
    try {
      const href =
        trimmed.startsWith('http://') || trimmed.startsWith('https://')
          ? trimmed
          : `http://${trimmed}`
      const url = new URL(href)
      const host = url.hostname.toLowerCase()
      const isLoopback =
        host === 'localhost' || host === '127.0.0.1' || host === '[::1]' || host === '::1'
      if (isLoopback && url.protocol === 'http:') {
        const port = url.port
        if (port === '' || port === '80') {
          return '/api'
        }
      }
    } catch {
      /* ignore */
    }
  }

  if (trimmed) return trimmed
  if (import.meta.env.DEV) return '/api'
  if (typeof window !== 'undefined' && window.location.protocol !== 'file:') {
    if (isSameOriginApiHost(window.location.hostname)) return '/api'
  }
  return 'http://localhost:8088/api'
}

function baseUrl() {
  return getApiBaseUrl()
}

function joinQuery(path, query) {
  if (!query || typeof query !== 'object') return path
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    if (v != null && v !== '') sp.set(k, String(v))
  }
  const s = sp.toString()
  return s ? `${path}?${s}` : path
}

async function req(path, { method = 'GET', body, token, query } = {}) {
  const p = joinQuery(path, query)
  try {
    return await httpJson({ baseUrl: baseUrl(), path: p, method, body, token })
  } catch (e) {
    if (e instanceof HttpError && e.status === 401 && token) {
      const pathStr = String(path || '')
      const t = String(token)
      if (pathStr.startsWith('owners/') && t === String(oTok() || '')) {
        clearOwnerSession()
      } else if (!pathStr.startsWith('owners/') && t === String(dTok() || '')) {
        clearDetailingSession()
      }
    }
    throw e
  }
}

/** Логин: API отвечает 401/404 с JSON { ok, reason } — возвращаем тело, чтобы UI не считал это «ошибкой сети». */
async function authLoginReq(path, body) {
  try {
    return await req(path, { method: 'POST', body, token: null })
  } catch (e) {
    if (e instanceof HttpError && e.body && typeof e.body === 'object' && 'ok' in e.body) {
      return e.body
    }
    throw e
  }
}

function dTok() {
  return getDetailingToken()
}

function oTok() {
  return getOwnerToken()
}

export function createApiClient() {
  let inflightOwnerMe = null
  let inflightDetailingMe = null
  /** Сливаем параллельные GET в один запрос (React Strict Mode, несколько useEffect, invalidateRepo). */
  let inflightOwnerCars = null
  let inflightDetailingCars = null
  let inflightOwnerClaims = null
  let inflightDetailingClaims = null
  const inflightEventsByKey = new Map()
  const inflightVinSearchByKey = new Map()
  const inflightDupesByKey = new Map()
  const inflightPlateSearchByKey = new Map()

  function flushCoalescedRequests() {
    inflightOwnerMe = null
    inflightDetailingMe = null
    inflightOwnerCars = null
    inflightDetailingCars = null
    inflightOwnerClaims = null
    inflightDetailingClaims = null
    inflightEventsByKey.clear()
    inflightVinSearchByKey.clear()
    inflightDupesByKey.clear()
    inflightPlateSearchByKey.clear()
  }

  return {
    flushCoalescedRequests,
    mode: 'api',

    async publicStats() {
      return await req('public/stats', { token: null })
    },

    async publicCarsRecent({ limit = 6 } = {}) {
      return await req('public/cars/recent', { query: { limit: String(limit) }, token: null })
    },

    async publicDetailingShowcase(id) {
      return await req(`public/detailings/${id}`, { token: null })
    },

    async publicGarage(slug) {
      return await req(`public/garages/${encodeURIComponent(slug)}`, { token: null })
    },

    async registerDetailing(body) {
      return await req('detailings', { method: 'POST', body, token: null })
    },

    async loginDetailing(body) {
      return await authLoginReq('detailings/login', body)
    },

    async getMeDetailing() {
      if (inflightDetailingMe) return inflightDetailingMe
      const p = req('me', { token: dTok() }).finally(() => {
        if (inflightDetailingMe === p) inflightDetailingMe = null
      })
      inflightDetailingMe = p
      return inflightDetailingMe
    },

    async updateDetailingMe(patch) {
      flushCoalescedRequests()
      return await req('detailings/me', { method: 'PATCH', body: patch, token: dTok() })
    },

    async registerOwner(body) {
      return await req('owners/register', { method: 'POST', body, token: null })
    },

    async loginOwner(body) {
      return await authLoginReq('owners/login', body)
    },

    async getMeOwner() {
      if (inflightOwnerMe) return inflightOwnerMe
      const p = req('owners/me', { token: oTok() }).finally(() => {
        if (inflightOwnerMe === p) inflightOwnerMe = null
      })
      inflightOwnerMe = p
      return inflightOwnerMe
    },

    async updateOwnerMe(patch) {
      flushCoalescedRequests()
      return await req('owners/me', { method: 'PATCH', body: patch, token: oTok() })
    },

    async detailingYandexUrl() {
      return await req('detailings/oauth/yandex/url', { token: null })
    },

    async detailingYandexCallback(body) {
      return await req('detailings/oauth/yandex/callback', { method: 'POST', body, token: null })
    },

    async getCarByShareToken(token) {
      return await req(`share/${encodeURIComponent(token)}`, { token: null })
    },

    async listCars(arg) {
      if (!oTok() && !dTok()) return []
      if (arg && typeof arg === 'object' && arg.ownerEmail) {
        if (inflightOwnerCars) return inflightOwnerCars
        const p = req('owners/cars', { token: oTok() }).finally(() => {
          if (inflightOwnerCars === p) inflightOwnerCars = null
        })
        inflightOwnerCars = p
        return inflightOwnerCars
      }
      if (oTok()) {
        if (inflightOwnerCars) return inflightOwnerCars
        const p = req('owners/cars', { token: oTok() }).finally(() => {
          if (inflightOwnerCars === p) inflightOwnerCars = null
        })
        inflightOwnerCars = p
        return inflightOwnerCars
      }
      if (inflightDetailingCars) return inflightDetailingCars
      const pDet = req('cars', { token: dTok() }).finally(() => {
        if (inflightDetailingCars === pDet) inflightDetailingCars = null
      })
      inflightDetailingCars = pDet
      return inflightDetailingCars
    },

    async getCar(id) {
      if (oTok()) return await req(`owners/cars/${id}`, { token: oTok() })
      return await req(`cars/${id}`, { token: dTok() })
    },

    async createCar(_scope, input) {
      flushCoalescedRequests()
      if (oTok()) return await req('owners/cars', { method: 'POST', body: input, token: oTok() })
      return await req('cars', { method: 'POST', body: input, token: dTok() })
    },

    async updateCar(id, patch) {
      flushCoalescedRequests()
      if (oTok()) return await req(`owners/cars/${id}`, { method: 'PATCH', body: patch, token: oTok() })
      return await req(`cars/${id}`, { method: 'PATCH', body: patch, token: dTok() })
    },

    async deleteCar(id) {
      flushCoalescedRequests()
      if (oTok()) return await req(`owners/cars/${id}`, { method: 'DELETE', token: oTok() })
      return await req(`cars/${id}`, { method: 'DELETE', token: dTok() })
    },

    async listEvents(carId) {
      const id = String(carId)
      const key = oTok() ? `o:${id}` : `d:${id}`
      const existing = inflightEventsByKey.get(key)
      if (existing) return existing
      const p = (oTok()
        ? req(`owners/cars/${id}/events`, { token: oTok() })
        : req(`cars/${id}/events`, { token: dTok() })
      ).finally(() => {
        if (inflightEventsByKey.get(key) === p) inflightEventsByKey.delete(key)
      })
      inflightEventsByKey.set(key, p)
      return p
    },

    async addEvent(_scope, carId, input) {
      flushCoalescedRequests()
      if (oTok()) {
        return await req(`owners/cars/${carId}/events`, { method: 'POST', body: input, token: oTok() })
      }
      return await req(`cars/${carId}/events`, { method: 'POST', body: input, token: dTok() })
    },

    async updateEvent(carId, id, patch) {
      flushCoalescedRequests()
      if (oTok()) {
        return await req(`owners/cars/${carId}/events/${id}`, { method: 'PATCH', body: patch, token: oTok() })
      }
      return await req(`events/${id}`, { method: 'PATCH', body: patch, token: dTok() })
    },

    async deleteEvent(carId, id) {
      flushCoalescedRequests()
      if (oTok()) {
        return await req(`owners/cars/${carId}/events/${id}`, { method: 'DELETE', token: oTok() })
      }
      return await req(`events/${id}`, { method: 'DELETE', token: dTok() })
    },

    async listDocs(carId) {
      if (oTok()) return await req(`owners/cars/${carId}/docs`, { token: oTok() })
      return await req(`cars/${carId}/docs`, { token: dTok() })
    },

    async addDoc(_scope, carId, input) {
      flushCoalescedRequests()
      if (oTok()) {
        return await req(`owners/cars/${carId}/docs`, { method: 'POST', body: input, token: oTok() })
      }
      return await req(`cars/${carId}/docs`, { method: 'POST', body: input, token: dTok() })
    },

    /** У владельца удаление по id документа (`DELETE /owners/docs/:id`), без carId в пути — меньше 404 при рассинхроне id авто. */
    async deleteDoc(_carId, id) {
      flushCoalescedRequests()
      if (oTok()) {
        const docId = encodeURIComponent(String(id ?? '').trim())
        return await req(`owners/docs/${docId}`, { method: 'DELETE', token: oTok() })
      }
      return await req(`docs/${encodeURIComponent(String(id ?? '').trim())}`, { method: 'DELETE', token: dTok() })
    },

    async listShares(carId) {
      if (oTok()) return await req(`owners/cars/${carId}/shares`, { token: oTok() })
      return await req(`cars/${carId}/shares`, { token: dTok() })
    },

    async createShare(carId) {
      flushCoalescedRequests()
      if (oTok()) {
        return await req(`owners/cars/${carId}/shares`, { method: 'POST', body: {}, token: oTok() })
      }
      return await req(`cars/${carId}/shares`, { method: 'POST', body: {}, token: dTok() })
    },

    async revokeShare(token) {
      flushCoalescedRequests()
      if (oTok()) {
        return await req(`owners/shares/${encodeURIComponent(token)}`, { method: 'DELETE', token: oTok() })
      }
      return await req(`shares/${encodeURIComponent(token)}`, { method: 'DELETE', token: dTok() })
    },

    async findCarsByVin(vin) {
      const v = String(vin || '').trim().toLowerCase()
      let p = inflightVinSearchByKey.get(v)
      if (p) return p
      p = req('owners/cars/search-by-vin', {
        query: { vin: String(vin || '').trim() },
        token: oTok(),
      }).finally(() => {
        if (inflightVinSearchByKey.get(v) === p) inflightVinSearchByKey.delete(v)
      })
      inflightVinSearchByKey.set(v, p)
      return p
    },

    /** Кабинет партнёра: совпадения по VIN и/или телефон + почта клиента перед созданием карточки. */
    async findDuplicateCarsForDetailing({ vin, clientPhone, clientEmail } = {}) {
      const key = `${String(vin || '').trim().toLowerCase()}|${String(clientPhone || '').trim()}|${String(clientEmail || '').trim().toLowerCase()}`
      let p = inflightDupesByKey.get(key)
      if (p) return p
      p = req('cars/search-duplicate', {
        query: {
          vin: String(vin || '').trim(),
          clientPhone: String(clientPhone || '').trim(),
          clientEmail: String(clientEmail || '').trim(),
        },
        token: dTok(),
      }).finally(() => {
        if (inflightDupesByKey.get(key) === p) inflightDupesByKey.delete(key)
      })
      inflightDupesByKey.set(key, p)
      return p
    },

    async findCarsByPlate({ plate, plateRegion }) {
      const key = `${String(plate || '').trim().toLowerCase()}|${String(plateRegion || '').trim().toLowerCase()}`
      let p = inflightPlateSearchByKey.get(key)
      if (p) return p
      p = req('owners/cars/search-by-plate', {
        query: { plate: String(plate || '').trim(), plateRegion: String(plateRegion || '').trim() },
        token: oTok(),
      }).finally(() => {
        if (inflightPlateSearchByKey.get(key) === p) inflightPlateSearchByKey.delete(key)
      })
      inflightPlateSearchByKey.set(key, p)
      return p
    },

    async createClaim({ carId, evidence }) {
      flushCoalescedRequests()
      return await req('owners/claims', {
        method: 'POST',
        body: { carId: String(carId), evidence: evidence || {} },
        token: oTok(),
      })
    },

    async listClaimsForOwner() {
      if (inflightOwnerClaims) return inflightOwnerClaims
      const p = req('owners/claims', { token: oTok() }).finally(() => {
        if (inflightOwnerClaims === p) inflightOwnerClaims = null
      })
      inflightOwnerClaims = p
      return inflightOwnerClaims
    },

    async listClaimsForDetailing() {
      if (inflightDetailingClaims) return inflightDetailingClaims
      const p = req('claims/inbox', { token: dTok() }).finally(() => {
        if (inflightDetailingClaims === p) inflightDetailingClaims = null
      })
      inflightDetailingClaims = p
      return inflightDetailingClaims
    },

    async reviewClaim(id, { status }) {
      flushCoalescedRequests()
      return await req(`claims/${id}`, { method: 'PATCH', body: { status }, token: dTok() })
    },

    /** Партнёр: перенести карточку из личного гаража владельца в свой кабинет (проверка года/города). */
    async linkPersonalGarageCar({ carId, year, city }) {
      flushCoalescedRequests()
      return await req('cars/link-from-personal-garage', {
        method: 'POST',
        body: {
          carId: String(carId),
          year: String(year || '').trim(),
          city: String(city || '').trim(),
        },
        token: dTok(),
      })
    },
  }
}
