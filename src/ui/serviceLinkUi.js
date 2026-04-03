/** Чистая логика подписей «сервис / владелец» для карточки авто и списка детейлинга. */

function normEmail(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
}

export function resolveServiceDisplayName(r, car) {
  if (!car?.detailingId) return ''
  const det = r.getDetailing?.(car.detailingId)
  const n = String(det?.name || car.seller?.name || '').trim()
  return n || 'Сервис'
}

/**
 * Для владельца: статус связи с сервисом по машине и заявкам.
 * @returns {{ kind: 'no_service' } | { kind: 'service', serviceName: string, ownerLink: 'approved'|'pending'|'rejected'|'implicit' }}
 */
export function ownerServiceLinkSummary(r, car, ownerEmail) {
  const em = normEmail(ownerEmail)
  if (!car || !em) return { kind: 'no_service' }

  if (!car.detailingId) {
    return { kind: 'no_service' }
  }

  const serviceName = resolveServiceDisplayName(r, car)
  const claims = (r.listClaimsForOwner?.(em) || []).filter((x) => x.carId === car.id)
  const claim = claims[0] || null

  if (claim?.status === 'pending') {
    return { kind: 'service', serviceName, ownerLink: 'pending' }
  }
  if (claim?.status === 'rejected') {
    return { kind: 'service', serviceName, ownerLink: 'rejected' }
  }
  if (claim?.status === 'approved') {
    return { kind: 'service', serviceName, ownerLink: 'approved' }
  }
  if (normEmail(car.ownerEmail) === em) {
    return { kind: 'service', serviceName, ownerLink: 'implicit' }
  }
  return { kind: 'service', serviceName, ownerLink: 'pending' }
}

/** Статус строки в списке детейлинга: учёт только у сервиса vs владелец в приложении vs заявка. */
export function detailingCarAccessBadge(r, car, detailingId) {
  if (!car) return { label: '', tone: 'neutral' }
  const detId = String(detailingId || '')
  const claims = (r.listClaimsForDetailing?.(detId) || []).filter((x) => x.carId === car.id)
  const pending = claims.some((x) => x.status === 'pending')
  if (pending && !normEmail(car.ownerEmail)) {
    return { label: 'Заявка владельца', tone: 'accent' }
  }
  if (normEmail(car.ownerEmail)) {
    return { label: 'Владелец в приложении', tone: 'accent' }
  }
  return { label: 'Учёт в сервисе', tone: 'neutral' }
}

/**
 * Куда вести кнопку бренда детейлинга: внешний website или публичная страница /d/:id.
 * @returns {{ kind: 'external', href: string } | { kind: 'app', to: string } | null}
 */
export function detailingBrandHref(det) {
  if (!det) return null
  const w = String(det.website || '').trim()
  if (w) {
    const href = /^https?:\/\//i.test(w) ? w : `https://${w}`
    return { kind: 'external', href }
  }
  const id = String(det.id || '').trim()
  if (id) return { kind: 'app', to: `/d/${id}` }
  return null
}
