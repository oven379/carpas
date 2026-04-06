import { resolvePublicMediaUrl } from './mediaUrl.js'

/** Элементы для полноэкранного просмотра фото: только записи с непустым url. */
export function docsToPhotoItems(docs) {
  if (!Array.isArray(docs)) return []
  return docs
    .filter((d) => d && String(d.url || '').trim())
    .map((d) => ({
      id: d.id,
      url: resolvePublicMediaUrl(String(d.url).trim()),
      title: String(d.title || 'Фото').trim() || 'Фото',
    }))
}

export function urlsToPhotoItems(urls, titleFallback = 'Фото') {
  if (!Array.isArray(urls)) return []
  return urls
    .filter((u) => String(u || '').trim())
    .map((url, i) => ({
      id: `u-${i}-${String(url).slice(0, 24)}`,
      url: String(url).trim(),
      title: titleFallback,
    }))
}
