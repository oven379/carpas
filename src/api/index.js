import { repo } from '../lib/repo.js'
import { httpJson } from './http.js'

const MODE = import.meta.env.VITE_API_MODE || 'mock'
const BASE_URL = import.meta.env.VITE_API_BASE_URL || ''

function createMockApi() {
  const r = repo()
  return {
    mode: 'mock',

    listDetailings: (...a) => r.listDetailings(...a),
    getDetailing: (...a) => r.getDetailing(...a),
    registerDetailing: (...a) => r.registerDetailing(...a),
    loginDetailing: (...a) => r.loginDetailing(...a),

    listCars: (...a) => r.listCars(...a),
    getCar: (...a) => r.getCar(...a),
    createCar: (...a) => r.createCar(...a),
    updateCar: (...a) => r.updateCar(...a),
    deleteCar: (...a) => r.deleteCar(...a),

    listEvents: (...a) => r.listEvents(...a),
    addEvent: (...a) => r.addEvent(...a),
    updateEvent: (...a) => r.updateEvent(...a),
    deleteEvent: (...a) => r.deleteEvent(...a),

    listDocs: (...a) => r.listDocs(...a),
    addDoc: (...a) => r.addDoc(...a),
    deleteDoc: (...a) => r.deleteDoc(...a),

    createShare: (...a) => r.createShare(...a),
    listShares: (...a) => r.listShares(...a),
    revokeShare: (...a) => r.revokeShare(...a),
    getCarByShareToken: (...a) => r.getCarByShareToken(...a),

    // VIN claims / moderation (MVP mock)
    findCarsByVin: (...a) => r.findCarsByVin(...a),
    listClaimsForOwner: (...a) => r.listClaimsForOwner(...a),
    listClaimsForDetailing: (...a) => r.listClaimsForDetailing(...a),
    createClaim: (...a) => r.createClaim(...a),
    reviewClaim: (...a) => r.reviewClaim(...a),
  }
}

function createRealApi() {
  // Контракт-заглушка: чтобы UI уже был готов, а потом ты просто реализуешь бэк.
  // Предполагаемые маршруты можно поменять без трогания UI (только этот файл).
  const baseUrl = BASE_URL
  const token = null

  return {
    mode: 'real',

    async listDetailings() {
      return await httpJson({ baseUrl, path: 'detailings', method: 'GET', token })
    },
    async registerDetailing(body) {
      return await httpJson({ baseUrl, path: 'detailings', method: 'POST', body, token })
    },
    async loginDetailing(body) {
      return await httpJson({ baseUrl, path: 'detailings/login', method: 'POST', body, token })
    },

    async listCars() {
      return await httpJson({ baseUrl, path: 'cars', method: 'GET', token })
    },
    async getCar(id) {
      return await httpJson({ baseUrl, path: `cars/${id}`, method: 'GET', token })
    },
    async createCar(input) {
      return await httpJson({ baseUrl, path: 'cars', method: 'POST', body: input, token })
    },
    async updateCar(id, patch) {
      return await httpJson({ baseUrl, path: `cars/${id}`, method: 'PATCH', body: patch, token })
    },
    async deleteCar(id) {
      return await httpJson({ baseUrl, path: `cars/${id}`, method: 'DELETE', token })
    },

    async listEvents(carId) {
      return await httpJson({ baseUrl, path: `cars/${carId}/events`, method: 'GET', token })
    },
    async addEvent(carId, input) {
      return await httpJson({
        baseUrl,
        path: `cars/${carId}/events`,
        method: 'POST',
        body: input,
        token,
      })
    },
    async updateEvent(id, patch) {
      return await httpJson({ baseUrl, path: `events/${id}`, method: 'PATCH', body: patch, token })
    },
    async deleteEvent(id) {
      return await httpJson({ baseUrl, path: `events/${id}`, method: 'DELETE', token })
    },

    async listDocs(carId) {
      return await httpJson({ baseUrl, path: `cars/${carId}/docs`, method: 'GET', token })
    },
    async addDoc(carId, input) {
      return await httpJson({
        baseUrl,
        path: `cars/${carId}/docs`,
        method: 'POST',
        body: input,
        token,
      })
    },
    async deleteDoc(id) {
      return await httpJson({ baseUrl, path: `docs/${id}`, method: 'DELETE', token })
    },

    async createShare(carId) {
      return await httpJson({ baseUrl, path: `cars/${carId}/shares`, method: 'POST', token })
    },
    async listShares(carId) {
      return await httpJson({ baseUrl, path: `cars/${carId}/shares`, method: 'GET', token })
    },
    async revokeShare(tokenToRevoke) {
      return await httpJson({
        baseUrl,
        path: `shares/${tokenToRevoke}`,
        method: 'DELETE',
        token,
      })
    },
    async getCarByShareToken(tokenValue) {
      return await httpJson({ baseUrl, path: `share/${tokenValue}`, method: 'GET', token })
    },
  }
}

export function createApi() {
  return MODE === 'real' ? createRealApi() : createMockApi()
}

