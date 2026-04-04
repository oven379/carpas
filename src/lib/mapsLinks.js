/**
 * Поле «Адрес» детейлинга может содержать целиком ссылку «Поделиться» из Яндекс.Карт —
 * тогда маршрут ведёт в точную точку, а не в поиск по тексту.
 */
export function isWholeLineYandexMapsUrl(raw) {
  const s = String(raw ?? '').trim()
  if (!/^https?:\/\//i.test(s)) return false
  const lower = s.toLowerCase()
  if (lower.includes('maps.yandex.')) return true
  if (/yandex\.(ru|com|by|kz|uz)\//i.test(lower) && lower.includes('/maps')) return true
  return false
}

/** Ссылка для открытия Яндекс.Карт в браузере (точка или поиск по адресу). */
export function detailingYandexMapsWebHref(det) {
  const addr = String(det?.address ?? '').trim()
  if (isWholeLineYandexMapsUrl(addr)) return addr
  const q = [det?.city, det?.address].filter(Boolean).join(', ')
  return q ? `https://yandex.ru/maps/?text=${encodeURIComponent(q)}` : ''
}

/** Запрос для geo:/maps: навигатор; для чистой ссылки карт — только город, если есть. */
export function detailingNavGeocodeQuery(det) {
  const addr = String(det?.address ?? '').trim()
  if (isWholeLineYandexMapsUrl(addr)) return String(det?.city ?? '').trim()
  return [det?.city, det?.address].filter(Boolean).join(', ')
}

export const DETAILING_ADDRESS_YANDEX_HINT =
  'Можно написать улицу и дом как обычно, либо вставить сюда целиком ссылку из Яндекс.Карт: клиент откроет именно эту точку и сможет построить маршрут. Как взять ссылку: в приложении или на yandex.ru/maps найдите вход в сервис, нажмите «Поделиться» или «Скопировать ссылку» и вставьте её в это поле. Если ссылка есть, поиск по тексту для карты не используется — важна точность точки на карте.'
