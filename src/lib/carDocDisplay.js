/**
 * Превью-миниатюра и lightbox — только для изображений.
 * PDF и прочие файлы открываются по ссылке.
 */
export function carDocHasImageThumbnail(d) {
  const u = String(d?.url || '').trim()
  if (!u) return false
  const lower = u.toLowerCase()
  if (lower.startsWith('data:image/')) return true
  if (lower.startsWith('data:application/pdf')) return false
  if (lower.startsWith('data:') && !lower.startsWith('data:image/')) return false
  return /\.(jpe?g|png|gif|webp|bmp)(\?|#|$)/i.test(u)
}

export function carDocFileBadgeLabel(d) {
  const u = String(d?.url || '').trim().toLowerCase()
  if (u.startsWith('data:application/pdf') || u.includes('.pdf')) return 'PDF'
  if (/\.docx?(\?|#|$)/i.test(u)) return 'DOC'
  return 'Файл'
}

/** Владелец может удалить вложение только через owner API, если оно загружено им (`source === 'owner'`). */
export function carDocDeletableByOwner(doc) {
  return String(doc?.source ?? 'service') === 'owner'
}
