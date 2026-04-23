import { Capacitor } from '@capacitor/core'
import { httpJson, httpFormData, HttpError } from './http.js'
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

  /** Capacitor WebView: нет того же origin, что у API — нужен полный URL (см. .env.example). */
  if (Capacitor.isNativePlatform()) {
    if (trimmed) return trimmed
    if (Capacitor.getPlatform() === 'android') {
      return 'http://10.0.2.2:8088/api'
    }
    return 'http://127.0.0.1:8088/api'
  }

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

/** Логин: API отвечает 401/422 (раньше 404) с JSON { ok, reason } — возвращаем тело, чтобы UI не считал это «ошибкой сети». */
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
  const inflightOwnerClaimSearchByKey = new Map()
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
    inflightOwnerClaimSearchByKey.clear()
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

    async publicLandingGarageCards({ limit = 12 } = {}) {
      return await req('public/landing/garage-cards', { query: { limit: String(limit) }, token: null })
    },

    async publicDetailingShowcase(id) {
      const t = oTok() || null
      return await req(`public/detailings/${encodeURIComponent(id)}`, { token: t })
    },

    async publicGarage(slug) {
      const t = dTok() || null
      return await req(`public/garages/${encodeURIComponent(slug)}`, { token: t })
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

    async registerDetailingDevicePush(body) {
      return await req('detailings/me/device-push-token', { method: 'POST', body, token: dTok() })
    },

    async unregisterDetailingDevicePush(body) {
      return await req('detailings/me/device-push-token', { method: 'DELETE', body, token: dTok() })
    },

    async registerOwner(body) {
      return await req('owners/register', { method: 'POST', body, token: null })
    },

    async loginOwner(body) {
      return await authLoginReq('owners/login', body)
    },

    async forgotOwnerPassword(body) {
      return await req('owners/forgot-password', { method: 'POST', body, token: null })
    },

    async forgotDetailingPassword(body) {
      return await req('detailings/forgot-password', { method: 'POST', body, token: null })
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

    async registerOwnerDevicePush(body) {
      return await req('owners/me/device-push-token', { method: 'POST', body, token: oTok() })
    },

    async unregisterOwnerDevicePush(body) {
      return await req('owners/me/device-push-token', { method: 'DELETE', body, token: oTok() })
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
      if (dTok()) return await req('cars', { method: 'POST', body: input, token: dTok() })
      throw new Error('createCar: войдите как владелец или как партнёр.')
    },

    /** Кабинет партнёра: найти карточку по VIN для визита (POST /cars/for-visit) — 404 с code car_not_found, 422 car_in_owner_garage. */
    async ensureCarForVisit(body) {
      flushCoalescedRequests()
      return await req('cars/for-visit', { method: 'POST', body, token: dTok() })
    },

    /** Владелец: шаг добавления авто — статус not_found | orphan | claimed. */
    async lookupOwnerCarForAdd(vin) {
      const v = String(vin || '').trim()
      return await req('owners/cars/lookup-for-add', { query: { vin: v }, token: oTok() })
    },

    async attachOwnerExistingCar(body) {
      flushCoalescedRequests()
      return await req('owners/cars/attach-existing', { method: 'POST', body, token: oTok() })
    },

    /** Владелец: убрать авто из гаража (карточка остаётся в сети без владельца). */
    async unlinkOwnerCar(carId) {
      flushCoalescedRequests()
      const id = encodeURIComponent(String(carId ?? '').trim())
      return await req(`owners/cars/${id}/unlink`, { method: 'POST', body: {}, token: oTok() })
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

    /**
     * @param {string|number} carId
     * @param {{ scope?: 'owner' }} [opts] — `scope: 'owner'` для экранов гаража владельца: не дергать `/cars/…/events` без токена партнёра (иначе 401 в консоли и лишняя нагрузка).
     */
    async listEvents(carId, opts = {}) {
      const id = String(carId)
      const forceOwner = opts?.scope === 'owner'
      if (forceOwner && !oTok()) {
        return []
      }
      const useOwner = forceOwner || Boolean(oTok())
      const key = useOwner ? `o:${id}` : `d:${id}`
      const existing = inflightEventsByKey.get(key)
      if (existing) return existing
      const p = (useOwner
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

    /** Поиск карточек в сервисах: VIN, телефон клиента в карточке или client_email. */
    async findCarsForOwnerClaim(q) {
      const key = String(q || '').trim().toLowerCase()
      let p = inflightOwnerClaimSearchByKey.get(key)
      if (p) return p
      p = req('owners/cars/search-for-claim', {
        query: { q: String(q || '').trim() },
        token: oTok(),
      }).finally(() => {
        if (inflightOwnerClaimSearchByKey.get(key) === p) inflightOwnerClaimSearchByKey.delete(key)
      })
      inflightOwnerClaimSearchByKey.set(key, p)
      return p
    },

    /** Кабинет партнёра: совпадения по VIN, госномеру, телефону и/или почте клиента перед созданием карточки. */
    async findDuplicateCarsForDetailing({ vin, clientPhone, clientEmail, plate, plateRegion } = {}) {
      const key = `${String(vin || '').trim().toLowerCase()}|${String(clientPhone || '').trim()}|${String(clientEmail || '').trim().toLowerCase()}|${String(plate || '').trim().toLowerCase()}|${String(plateRegion || '').trim().toLowerCase()}`
      let p = inflightDupesByKey.get(key)
      if (p) return p
      p = req('cars/search-duplicate', {
        query: {
          vin: String(vin || '').trim(),
          clientPhone: String(clientPhone || '').trim(),
          clientEmail: String(clientEmail || '').trim(),
          plate: String(plate || '').trim(),
          plateRegion: String(plateRegion || '').trim(),
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

    async createSupportTicket({ body, page_path, page_title, context, guest_email, attachment }) {
      const fd = new FormData()
      fd.append('body', String(body || '').trim())
      fd.append('page_path', String(page_path || '/').slice(0, 512))
      if (page_title) fd.append('page_title', String(page_title).slice(0, 255))
      if (context && typeof context === 'object') {
        fd.append('context', JSON.stringify(context))
      }
      if (guest_email) fd.append('guest_email', String(guest_email).trim())
      if (attachment instanceof File) fd.append('attachment', attachment)
      const token = oTok() || dTok() || null
      return await httpFormData({
        baseUrl: baseUrl(),
        path: 'support/tickets',
        method: 'POST',
        formData: fd,
        token,
      })
    },

    async supportInbox() {
      const token = oTok() || dTok()
      if (!token) return []
      return await req('support/inbox', { token })
    },

    async supportUnreadCount() {
      const token = oTok() || dTok()
      if (!token) return { unread_count: 0 }
      return await req('support/unread-count', { token })
    },

    async supportMarkRead(ticketId) {
      const token = oTok() || dTok()
      return await req(`support/tickets/${encodeURIComponent(String(ticketId))}/read`, {
        method: 'PATCH',
        token,
      })
    },

    async adminSupportLogin(body) {
      return await req('admin/support/login', { method: 'POST', body, token: null })
    },

    async adminSupportTickets(adminToken) {
      return await req('admin/support/tickets', { token: adminToken })
    },

    async adminPartnerRegistrationsPending(adminToken) {
      return await req('admin/support/partner-registrations/pending', { token: adminToken })
    },

    async adminPartnerRegistrationApprove(adminToken, detailingId) {
      return await req(`admin/support/partner-registrations/${encodeURIComponent(String(detailingId))}/approve`, {
        method: 'POST',
        body: {},
        token: adminToken,
      })
    },

    async adminSupportReply(adminToken, ticketId, message) {
      return await req(`admin/support/tickets/${encodeURIComponent(String(ticketId))}/reply`, {
        method: 'POST',
        body: { message: String(message || '').trim() },
        token: adminToken,
      })
    },

    async adminPushStats(adminToken) {
      return await req('admin/support/push/stats', { token: adminToken })
    },

    async adminPushBroadcast(adminToken, body) {
      return await req('admin/support/push/broadcast', {
        method: 'POST',
        body,
        token: adminToken,
      })
    },
  }
}
