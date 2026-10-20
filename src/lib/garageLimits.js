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
export const OWNER_MAX_FREE_GARAGE_CARS = 1



/**
 * @param {Array<{ detailingId?: string|null }>} cars — список авто владельца из репозитория
 * @param {{ isPremium?: boolean, carLimit?: number }} [options]
 *   isPremium — обход лимита; carLimit — персональный лимит аккаунта (по умолчанию бесплатный).
 */
export function ownerGarageLimits(cars, options = {}) {
  const isPremium = Boolean(options.isPremium)
  const carLimit = Math.max(1, Number(options.carLimit) || OWNER_MAX_FREE_GARAGE_CARS)
  const list = Array.isArray(cars) ? cars : []
  const manualCount = list.filter((c) => !c?.detailingId).length
  const totalCount = list.length
  const canAddMore = isPremium || totalCount < carLimit
  return {
    manualCount,
    totalCount,
    isPremium,
    carLimit,
    /** Можно добавить ещё одно авто в гараж (создание карточки или привязка по VIN). */
    canAddManual: canAddMore,
    canVinClaim: canAddMore,
  }
}
