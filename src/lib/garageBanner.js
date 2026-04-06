/** Показывать ли фото-баннер гаража (учитывает выключение в настройках). */
export function isGarageBannerImageVisible(owner) {
  if (!owner || typeof owner !== 'object') return false
  if (owner.garageBannerEnabled === false) return false
  return Boolean(String(owner.garageBanner || '').trim())
}
