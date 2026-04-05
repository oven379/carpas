/** Лимиты гаража владельца (без Premium): вручную до 2 авто, всего до 5 (остальное — через детейлинг по VIN). */

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

export const OWNER_MAX_MANUAL_CARS = 2
export const OWNER_MAX_TOTAL_CARS = 5

/**
 * @param {Array<{ detailingId?: string|null }>} cars — список авто владельца из репозитория
 */
export function ownerGarageLimits(cars) {
  const list = Array.isArray(cars) ? cars : []
  const manualCount = list.filter((c) => !c?.detailingId).length
  const totalCount = list.length
  return {
    manualCount,
    totalCount,
    canAddManual: manualCount < OWNER_MAX_MANUAL_CARS && totalCount < OWNER_MAX_TOTAL_CARS,
    canVinClaim: totalCount < OWNER_MAX_TOTAL_CARS,
  }
}
