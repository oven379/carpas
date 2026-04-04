/**
 * Подпись крошки «назад к списку» для владельца: /garage — профиль и улица, /cars — список машин.
 */
export function ownerGarageListCrumbLabel(listReturnPath) {
  const p = String(listReturnPath || '')
  if (p === '/garage' || p.startsWith('/garage?')) return 'В гараж'
  return 'Мои автомобили'
}

/**
 * Куда возвращаться из карточки авто: учитываем ?from= из кабинета/гаража (только безопасные пути).
 */
export function resolveCarListReturnPath(mode, fromParam) {
  const garage = mode === 'owner' ? '/garage' : '/detailing'
  const raw = String(fromParam || '').trim()
  if (!raw) return garage
  let decoded = raw
  try {
    decoded = decodeURIComponent(raw)
  } catch {
    return garage
  }
  if (!decoded.startsWith('/') || decoded.startsWith('//')) return garage
  if (decoded.includes('..')) return garage

  if (mode === 'detailing') {
    if (decoded === '/detailing' || decoded.startsWith('/detailing?')) return decoded
    if (decoded === '/requests' || decoded.startsWith('/requests?')) return decoded
    return garage
  }
  if (decoded === '/garage' || decoded.startsWith('/garage?')) return decoded
  if (decoded === '/cars' || decoded.startsWith('/cars?')) return decoded
  return garage
}

/** Суффикс ?from=… для ссылок с карточки на историю / документы / редактирование. */
export function buildCarFromQuery(fromParam) {
  const v = String(fromParam || '').trim()
  if (!v) return ''
  try {
    return `?from=${encodeURIComponent(v)}`
  } catch {
    return ''
  }
}

/** Путь /car/:id/<sub> с сохранением from и доп. query (например new=1). */
export function buildCarSubRoutePath(carId, sub, fromParam, extra = {}) {
  const p = new URLSearchParams()
  const v = String(fromParam || '').trim()
  if (v) p.set('from', v)
  for (const [k, val] of Object.entries(extra)) {
    if (val != null && String(val) !== '') p.set(k, String(val))
  }
  const q = p.toString()
  return q ? `/car/${carId}/${sub}?${q}` : `/car/${carId}/${sub}`
}
