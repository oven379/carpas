/**
 * Абсолютные URL для canonical и Open Graph.
 * В продакшене VITE_SITE_ORIGIN имеет приоритет, чтобы canonical и Open Graph
 * оставались едиными даже при заходе через http или домен без www.
 */
export function getSiteOrigin() {
  const env = import.meta.env.VITE_SITE_ORIGIN
  if (env && String(env).trim()) return String(env).trim().replace(/\/+$/, '')
  if (typeof window !== 'undefined' && window.location?.origin) {
    return String(window.location.origin).replace(/\/+$/, '')
  }
  return ''
}

/** Путь с ведущим «/». Без origin возвращает относительный путь (для dev без .env). */
export function absoluteUrl(pathname) {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`
  const base = getSiteOrigin()
  if (!base) return p
  return `${base}${p}`
}
