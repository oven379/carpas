/**
 * Фон рамки фото: то же изображение, размытое (CSS `.photoFrame::before`).
 * Фото при этом показывается целиком (`object-fit: contain`), а поля по бокам не остаются чёрными.
 */
export function photoBgStyle(url) {
  const u = String(url || '').trim()
  if (!u) return undefined
  return { '--photo-bg': `url("${u.replace(/["\\\n\r]/g, encodeURIComponent)}")` }
}
