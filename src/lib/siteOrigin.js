/**
 * Абсолютные URL для canonical и Open Graph.
 * В браузере — текущий origin; при сборке/preview без window — VITE_SITE_ORIGIN из .env.
 */
export function getSiteOrigin() {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return String(window.location.origin).replace(/\/+$/, '')
  }
  const env = import.meta.env.VITE_SITE_ORIGIN
  if (env && String(env).trim()) return String(env).trim().replace(/\/+$/, '')
  return ''
}

/** Путь с ведущим «/». Без origin возвращает относительный путь (для dev без .env). */
export function absoluteUrl(pathname) {
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`
  const base = getSiteOrigin()
  if (!base) return p
  return `${base}${p}`
}
