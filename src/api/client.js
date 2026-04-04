import { httpJson, HttpError } from './http.js'
import { getDetailingToken, getOwnerToken } from '../ui/auth.js'

function baseUrl() {
  const u = import.meta.env.VITE_API_BASE_URL
  if (u && String(u).trim()) return String(u).replace(/\/+$/, '')
  return 'http://localhost:8080/api'
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
  return httpJson({ baseUrl: baseUrl(), path: p, method, body, token })
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

  return {
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
      inflightDetailingMe = req('me', { token: dTok() }).finally(() => {
        inflightDetailingMe = null
      })
      return inflightDetailingMe
    },

    async updateDetailingMe(patch) {
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
      inflightOwnerMe = req('owners/me', { token: oTok() }).finally(() => {
        inflightOwnerMe = null
      })
      return inflightOwnerMe
    },

    async updateOwnerMe(patch) {
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
        return await req('owners/cars', { token: oTok() })
      }
      if (oTok()) {
        return await req('owners/cars', { token: oTok() })
      }
      return await req('cars', { token: dTok() })
    },

    async getCar(id) {
      if (oTok()) return await req(`owners/cars/${id}`, { token: oTok() })
      return await req(`cars/${id}`, { token: dTok() })
    },

    async createCar(_scope, input) {
      if (oTok()) return await req('owners/cars', { method: 'POST', body: input, token: oTok() })
      return await req('cars', { method: 'POST', body: input, token: dTok() })
    },

    async updateCar(id, patch) {
      if (oTok()) return await req(`owners/cars/${id}`, { method: 'PATCH', body: patch, token: oTok() })
      return await req(`cars/${id}`, { method: 'PATCH', body: patch, token: dTok() })
    },

    async deleteCar(id) {
      if (oTok()) return await req(`owners/cars/${id}`, { method: 'DELETE', token: oTok() })
      return await req(`cars/${id}`, { method: 'DELETE', token: dTok() })
    },

    async listEvents(carId) {
      if (oTok()) return await req(`owners/cars/${carId}/events`, { token: oTok() })
      return await req(`cars/${carId}/events`, { token: dTok() })
    },

    async addEvent(_scope, carId, input) {
      if (oTok()) {
        return await req(`owners/cars/${carId}/events`, { method: 'POST', body: input, token: oTok() })
      }
      return await req(`cars/${carId}/events`, { method: 'POST', body: input, token: dTok() })
    },

    async updateEvent(carId, id, patch) {
      if (oTok()) {
        return await req(`owners/cars/${carId}/events/${id}`, { method: 'PATCH', body: patch, token: oTok() })
      }
      return await req(`events/${id}`, { method: 'PATCH', body: patch, token: dTok() })
    },

    async deleteEvent(carId, id) {
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
      if (oTok()) {
        return await req(`owners/cars/${carId}/docs`, { method: 'POST', body: input, token: oTok() })
      }
      return await req(`cars/${carId}/docs`, { method: 'POST', body: input, token: dTok() })
    },

    async deleteDoc(carId, id) {
      if (oTok()) {
        return await req(`owners/cars/${carId}/docs/${id}`, { method: 'DELETE', token: oTok() })
      }
      return await req(`docs/${id}`, { method: 'DELETE', token: dTok() })
    },

    async listShares(carId) {
      if (oTok()) return await req(`owners/cars/${carId}/shares`, { token: oTok() })
      return await req(`cars/${carId}/shares`, { token: dTok() })
    },

    async createShare(carId) {
      if (oTok()) {
        return await req(`owners/cars/${carId}/shares`, { method: 'POST', body: {}, token: oTok() })
      }
      return await req(`cars/${carId}/shares`, { method: 'POST', body: {}, token: dTok() })
    },

    async revokeShare(token) {
      if (oTok()) {
        return await req(`owners/shares/${encodeURIComponent(token)}`, { method: 'DELETE', token: oTok() })
      }
      return await req(`shares/${encodeURIComponent(token)}`, { method: 'DELETE', token: dTok() })
    },

    async findCarsByVin(vin) {
      return await req('owners/cars/search-by-vin', {
        query: { vin: String(vin || '').trim() },
        token: oTok(),
      })
    },

    async findCarsByPlate({ plate, plateRegion }) {
      return await req('owners/cars/search-by-plate', {
        query: { plate: String(plate || '').trim(), plateRegion: String(plateRegion || '').trim() },
        token: oTok(),
      })
    },

    async createClaim({ carId, evidence }) {
      return await req('owners/claims', {
        method: 'POST',
        body: { carId: String(carId), evidence: evidence || {} },
        token: oTok(),
      })
    },

    async listClaimsForOwner() {
      return await req('owners/claims', { token: oTok() })
    },

    async listClaimsForDetailing() {
      return await req('claims/inbox', { token: dTok() })
    },

    async reviewClaim(id, { status }) {
      return await req(`claims/${id}`, { method: 'PATCH', body: { status }, token: dTok() })
    },

    async getDetailing(id) {
      const data = await this.publicDetailingShowcase(id)
      return data?.detailing ?? null
    },
  }
}
