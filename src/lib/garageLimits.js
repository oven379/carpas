/** Лимиты гаража владельца: бесплатно до 2 авто; при Premium — без ограничений на стороне клиента. */

/** Убирает повторы по `id` в ответе API (защита от дублей в списке при сбоях клиента). */
export function dedupeCarsById(cars) {
  const seen = new Set()
  const out = []
  for (const c of Array.isArray(cars) ? cars : []) {
    const id = c?.id
    if (id == null || id === '') continue
    const k = String(id)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(c)
  }
  return out
}

/** Сколько автомобилей можно держать в гараже на бесплатном тарифе. */
export const OWNER_MAX_FREE_GARAGE_CARS = 2

/** @deprecated то же число, что и OWNER_MAX_FREE_GARAGE_CARS (оставлено для старых импортов) */
export const OWNER_MAX_MANUAL_CARS = OWNER_MAX_FREE_GARAGE_CARS

/** @deprecated раньше было 5; лимит объединён с бесплатным гаражом */
export const OWNER_MAX_TOTAL_CARS = OWNER_MAX_FREE_GARAGE_CARS

/**
 * @param {Array<{ detailingId?: string|null }>} cars — список авто владельца из репозитория
 * @param {{ isPremium?: boolean }} [options] — у владельца включён Premium (обход лимита)
 */
export function ownerGarageLimits(cars, options = {}) {
  const isPremium = Boolean(options.isPremium)
  const list = Array.isArray(cars) ? cars : []
  const manualCount = list.filter((c) => !c?.detailingId).length
  const totalCount = list.length
  const canAddMore = isPremium || totalCount < OWNER_MAX_FREE_GARAGE_CARS
  return {
    manualCount,
    totalCount,
    isPremium,
    /** Можно добавить ещё одно авто в гараж (создание карточки или привязка по VIN). */
    canAddManual: canAddMore,
    canVinClaim: canAddMore,
  }
}
