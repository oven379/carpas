/**
 * Куда перейти после удаления или передачи авто: оставшаяся машина в том же гараже/кабинете или список.
 * @param {Array} carsList — свежий список авто (например после await r.listCars(...))
 */
export function getPathAfterCarRemovedFromScope(carsList, { mode, owner, detailingId }) {
  const list = Array.isArray(carsList) ? carsList : []
  if (mode === 'owner' && owner?.email) {
    if (list.length >= 1) return `/car/${list[0].id}`
    return '/cars'
  }
  if (mode === 'detailing' && detailingId) {
    if (list.length >= 1) return `/car/${list[0].id}`
    return '/detailing'
  }
  return '/cars'
}
