import { randomUUID } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { createServer } from 'node:http'
import { json } from 'node:stream/consumers'

const host = '127.0.0.1'
const photoPath = '/storage/carpas-demo-vehicle.webp'
const demoOwner = {
  id: 'demo-owner',
  email: 'owner@demo.car',
  name: 'Алексей',
  garageCity: 'Москва',
  garagePrivate: true,
}
const detailing = {
  id: 'demo-partner',
  email: 'partner@demo.car',
  name: 'Демо-автосервис',
  businessType: 'detailing',
  profileCompleted: true,
  city: 'Москва',
}

const partnerRoutes = new Map([
  ['/api/me', { detailing }],
])

const car = {
  id: 'demo',
  make: 'Honda',
  model: 'Prelude',
  year: 1990,
  city: demoOwner.garageCity,
  plate: 'А123ВС',
  plateRegion: '77',
  vin: 'DEMO0000000000001',
  color: 'Серебристый',
  mileageKm: 48620,
  hero: photoPath,
  updatedAt: '2026-10-24T09:20:00Z',
  ownerEmail: demoOwner.email,
}
const visits = [
  {
    id: 'demo-visit',
    at: car.updatedAt,
    title: 'Плановое ТО',
    type: 'visit',
    source: 'owner',
    mileageKm: car.mileageKm,
    comment: 'Заменили масло и фильтры. Проверили тормозные колодки.',
  },
  {
    id: 'demo-service',
    at: '2026-09-21T13:15:00Z',
    title: 'Полировка и защита кузова',
    type: 'visit',
    source: 'service',
    detailingName: 'Студия на Садовой',
    mileageKm: 46300,
    note: 'Нанесли защитный состав. Рекомендована бережная мойка.',
  },
  {
    id: 'demo-visit-2',
    at: '2026-08-15T11:00:00Z',
    title: 'Мойка и уход',
    type: 'visit',
    source: 'owner',
    mileageKm: 44500,
  },
]
const docs = [
  {
    id: 'demo-photo',
    eventId: visits[0].id,
    kind: 'photo',
    title: 'Фото после обслуживания',
    source: 'owner',
    url: photoPath,
  },
]

const carPath = `/api/owners/cars/${car.id}`
const ownerRoutes = new Map([
  ['/api/owners/cars', [car]],
  ['/api/owners/claims', []],
  [carPath, car],
  [`${carPath}/events`, visits],
  [`${carPath}/docs`, docs],
  [`${carPath}/shares`, []],
  [`${carPath}/share-eligibility`, { eligible: false, visits: 2, requiredVisits: 6, requiredMonths: 3 }],
  ['/api/notifications', { items: [], unread_count: 0 }],
  ['/api/notifications/unread-count', { unread_count: 0 }],
  ['/api/support/inbox', []],
  ['/api/support/unread-count', { unread_count: 0 }],
])

function sendJson(response, status, data, headers = {}) {
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  }).end(JSON.stringify(data))
}

async function login(request, response, tokens, account, role) {
  const credentials = await json(request).catch(() => null)
  const email = typeof credentials?.email === 'string' ? credentials.email.trim().toLowerCase() : ''
  const password = typeof credentials?.password === 'string' ? credentials.password : ''
  if (!email || !password) return sendJson(response, 422, { ok: false, reason: 'bad_credentials' })
  if (email !== account.email) return sendJson(response, 401, { ok: false, reason: 'not_found' })
  if (password !== '1111') return sendJson(response, 401, { ok: false, reason: 'bad_password' })

  const token = randomUUID()
  tokens.set(token, role)
  return sendJson(response, 200, { ok: true, [role]: account, token })
}

async function updateProfile(request, response, owner) {
  const patch = await json(request).catch(() => null)
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    return sendJson(response, 422, { message: 'Укажите данные профиля.' })
  }
  if ('currentPassword' in patch || 'newPassword' in patch) {
    return sendJson(response, 422, { message: 'Смена пароля недоступна в демо-режиме.' })
  }
  for (const field of ['name', 'phone', 'garageCity', 'garageAvatar']) {
    if (typeof patch[field] === 'string') owner[field] = patch[field].trim()
  }
  return sendJson(response, 200, { owner })
}

export function createDemoApi() {
  const owner = { ...demoOwner }
  const cabinetCars = new Map()
  const pendingClaims = new Map()
  const networkCar = {
    id: 'demo-network',
    vin: '1HGCM82633A004352',
    make: 'Honda',
    model: 'Accord',
    year: 2003,
    color: 'Серебристый',
    mileageKm: 160000,
  }
  const ownerCar = { ...car, city: owner.garageCity }
  const findCarByVin = (vin) => [ownerCar, networkCar, ...cabinetCars.values()].find((item) => item.vin === vin)
  const tokens = new Map()
  const photo = readFileSync(new URL('../src/assets/home-mountain-honda.webp', import.meta.url))

  return createServer(async (request, response) => {
    const { pathname, searchParams } = new URL(request.url, `http://${host}`)
    if (pathname === '/api/owners/login' || pathname === '/api/detailings/login') {
      if (request.method !== 'POST') {
        return sendJson(response, 405, { message: 'Method Not Allowed' }, { Allow: 'POST' })
      }
      return pathname === '/api/owners/login'
        ? login(request, response, tokens, owner, 'owner')
        : login(request, response, tokens, detailing, 'detailing')
    }

    const partnerCarRoute = /^\/api\/cars\/([^/]+)(?:\/(events|docs))?$/.exec(pathname)
    const partnerCar = partnerCarRoute ? cabinetCars.get(partnerCarRoute[1]) : null
    const vinAction = [
      '/api/cars', '/api/cars/search-duplicate', '/api/cars/add-existing', '/api/claims/outbox',
      '/api/detailings/crm/clients',
    ].includes(pathname)
    const role = tokens.get(request.headers.authorization?.match(/^Bearer (\S+)$/i)?.[1])
    if (vinAction || partnerCar) {
      if (!role) return sendJson(response, 401, { message: 'Unauthenticated.' })
      if (role !== 'detailing') return sendJson(response, 403, { message: 'Forbidden' })

      if (request.method === 'GET') {
        if (pathname === '/api/cars') return sendJson(response, 200, [...cabinetCars.values()])
        if (pathname === '/api/detailings/crm/clients') {
          const items = [...cabinetCars.values()].map((item) => ({
            id: item.id,
            car: item,
            client: { name: item.clientName, phone: item.clientPhone, email: item.clientEmail },
            stats: { visitsCount: 0 },
          }))
          return sendJson(response, 200, { items, stats: { clients: items.length, cars: items.length } })
        }
        if (pathname === '/api/cars/search-duplicate') {
          const match = findCarByVin(searchParams.get('vin'))
          if (!match) return sendJson(response, 200, [])
          const { id, make, model, year, mileageKm, color, city, hero } = match
          return sendJson(response, 200, [{
            id, make, model, year, mileageKm, color, city, hero,
            alreadyInDetailingCabinet: cabinetCars.has(id),
            ownerApprovalRequired: id === ownerCar.id,
            canAddToDetailing: true,
          }])
        }
        if (partnerCar) return sendJson(response, 200, partnerCarRoute[2] ? [] : partnerCar)
      }

      if (request.method === 'POST') {
        const data = await json(request).catch(() => null)
        if (!data) return sendJson(response, 422, { message: 'Укажите данные автомобиля.' })
        if (pathname === '/api/claims/outbox' && data.carId === ownerCar.id) {
          if (!pendingClaims.has(data.carId)) pendingClaims.set(data.carId, { id: randomUUID(), status: 'pending' })
          return sendJson(response, 200, pendingClaims.get(data.carId))
        }
        if (pathname === '/api/cars/add-existing') {
          const match = findCarByVin(data.vin)
          if (!match || match.id !== data.carId) return sendJson(response, 404, { message: 'Автомобиль не найден.' })
          if (match.id === ownerCar.id) return sendJson(response, 409, { code: 'owner_approval_required', message: 'Требуется подтверждение владельца.' })
          cabinetCars.set(match.id, match)
          return sendJson(response, 200, { carId: match.id })
        }
        if (pathname === '/api/cars') {
          if (!/^[A-Z0-9]{17}$/.test(data.vin) || !data.legalConsentAccepted || findCarByVin(data.vin)) {
            return sendJson(response, 422, { message: 'Проверьте VIN и согласие на обработку данных.' })
          }
          const created = { ...data, id: randomUUID(), detailingId: detailing.id }
          cabinetCars.set(created.id, created)
          return sendJson(response, 201, created)
        }
      }
      return sendJson(response, 405, { message: 'Method Not Allowed' })
    }

    const profileRoute = pathname === '/api/owners/me'
    const ownerData = profileRoute ? { owner } : ownerRoutes.get(pathname)
    const publicRoute = pathname === photoPath || pathname === '/api/health' || pathname === '/api/push/settings'
    const partnerData = partnerRoutes.get(pathname)
    if (!ownerData && !partnerData && !publicRoute) return sendJson(response, 404, { message: 'Not Found' })
    const patchProfile = profileRoute && request.method === 'PATCH'
    if (request.method !== 'GET' && !patchProfile) {
      return sendJson(response, 405, { message: 'Method Not Allowed' }, { Allow: profileRoute ? 'GET, PATCH' : 'GET' })
    }

    if (pathname === photoPath) return response.writeHead(200, { 'Content-Type': 'image/webp' }).end(photo)
    if (pathname === '/api/health') return sendJson(response, 200, { ok: true })
    if (pathname === '/api/push/settings') return sendJson(response, 200, { enabled: false })

    // Выход в интерфейсе удаляет локальный токен, серверного вызова у клиента нет.
    if (!role) return sendJson(response, 401, { message: 'Unauthenticated.' })
    const data = pathname.startsWith('/api/owners/')
      ? (role === 'owner' ? ownerData : undefined)
      : partnerData ? (role === 'detailing' ? partnerData : undefined) : ownerData
    if (!data) return sendJson(response, 403, { message: 'Forbidden' })
    if (patchProfile) return updateProfile(request, response, owner)
    return sendJson(response, 200, data)
  })
}

if (import.meta.main) {
  const port = Number(process.env.PORT || 8088)
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT must be between 1 and 65535')
  createDemoApi().listen(port, host, () => console.log(`CarPass demo API: http://${host}:${port}/api`))
}
