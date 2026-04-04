/** Лимиты гаража владельца (без Premium): вручную до 2 авто, всего до 5 (остальное — через детейлинг по VIN). */

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
