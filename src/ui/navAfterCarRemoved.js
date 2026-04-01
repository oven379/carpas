/**
 * Куда перейти после удаления или передачи авто: оставшаяся машина в том же гараже/кабинете или список.
 */
export function getPathAfterCarRemovedFromScope(r, { mode, owner, detailingId }) {
  if (mode === 'owner' && owner?.email) {
    const list = r.listCars({ ownerEmail: owner.email })
    if (list.length >= 1) return `/car/${list[0].id}`
    return '/cars'
  }
  if (mode === 'detailing' && detailingId) {
    const list = r.listCars(detailingId)
    if (list.length >= 1) return `/car/${list[0].id}`
    return '/cars'
  }
  return '/cars'
}
