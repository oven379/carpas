/** Показывать ли фото-баннер гаража: только если владелец явно включил и есть картинка. */
export function isGarageBannerImageVisible(owner) {
  if (!owner || typeof owner !== 'object') return false
  if (owner.garageBannerEnabled !== true) return false
  return Boolean(String(owner.garageBanner || '').trim())
}
