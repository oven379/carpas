/** Чистая логика подписей «сервис / владелец» для карточки авто и списка детейлинга. */

function normEmail(s) {
  return String(s || '')
    .trim()
    .toLowerCase()
}

export function resolveServiceDisplayName(car) {
  if (!car?.detailingId) return ''
  const name = String(car.detailingName || '').trim()
  // seller.name на карточке — часто контактное лицо (ФИО), не название студии
  if (name) return name
  return 'Сервис'
}

/**
 * Для владельца: статус связи с сервисом по машине и заявкам.
 * @param {Array} ownerClaimsList — результат listClaimsForOwner()
 */
export function ownerServiceLinkSummary(car, ownerEmail, ownerClaimsList) {
  const em = normEmail(ownerEmail)
  if (!car || !em) return { kind: 'no_service' }

  if (!car.detailingId) {
    return { kind: 'no_service' }
  }

  const serviceName = resolveServiceDisplayName(car)
  const claims = (ownerClaimsList || []).filter((x) => String(x.carId) === String(car.id))
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

/** Карточка ведётся только у детейлинга (владелец в приложении не привязан). Плашку в UI кабинета не показываем — авто и так в списке сервиса. */
export const DETAILING_ACCESS_SERVICE_ONLY_LABEL = 'Учёт в сервисе'

/** Статус строки в списке детейлинга: учёт только у сервиса vs владелец в приложении vs заявка. */
export function detailingCarAccessBadge(car, detailingId, inboxClaims) {
  if (!car) return { label: '', tone: 'neutral' }
  const claims = (inboxClaims || []).filter((x) => String(x.carId) === String(car.id))
  const pending = claims.some((x) => x.status === 'pending')
  if (pending && !normEmail(car.ownerEmail)) {
    return { label: 'Заявка владельца', tone: 'accent' }
  }
  if (normEmail(car.ownerEmail)) {
    return { label: 'Владелец в приложении', tone: 'accent' }
  }
  return { label: DETAILING_ACCESS_SERVICE_ONLY_LABEL, tone: 'neutral' }
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
