import { getApiBaseUrl } from '../api/client.js'

function isLoopbackHost(hostname) {
  const h = String(hostname || '').toLowerCase()
  return h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1'
}

/** http://localhost/… без порта (= :80): в dev фронт на :5173, на :80 ничего не слушает — только относительный /storage/… */
function isBrokenLocalDefaultHttp(parsed) {
  return (
    parsed.protocol === 'http:' &&
    (parsed.port === '' || parsed.port === '80') &&
    isLoopbackHost(parsed.hostname)
  )
}

function apiOriginIfUsable() {
  const api = getApiBaseUrl()
  if (!api.startsWith('http://') && !api.startsWith('https://')) return ''
  const origin = api.replace(/\/api\/?$/, '')
  if (!origin) return ''
  try {
    const o = new URL(origin)
    if (isBrokenLocalDefaultHttp(o)) return ''
    return origin
  } catch {
    return ''
  }
}

/**
 * Абсолютный URL с путём /storage/… приводим к тому, что реально откроется в браузере.
 * Laravel кладёт в JSON http://localhost/storage/… если APP_URL без порта — запрос уходит на :80 и падает.
 */
function normalizeAbsoluteHttpUrl(u) {
  let parsed
  try {
    parsed = new URL(u)
  } catch {
    return u
  }
  const path = parsed.pathname + parsed.search + parsed.hash
  if (!path.startsWith('/storage/')) return u

  if (isBrokenLocalDefaultHttp(parsed)) {
    return path
  }

  const origin = apiOriginIfUsable()
  if (origin) return `${origin}${path}`

  if (isLoopbackHost(parsed.hostname)) {
    return path
  }

  return u
}

/**
 * URL медиа из API (/storage/…, абсолютный http(s), data:) → то, что браузер может загрузить.
 */
export function resolvePublicMediaUrl(url) {
  const u = String(url || '').trim()
  if (!u) return ''
  if (u.startsWith('data:')) return u
  if (u.startsWith('//')) {
    try {
      const proto = typeof window !== 'undefined' && window.location?.protocol ? window.location.protocol : 'https:'
      return normalizeAbsoluteHttpUrl(`${proto}${u}`)
    } catch {
      return normalizeAbsoluteHttpUrl(`https:${u}`)
    }
  }
  if (/^https?:\/\//i.test(u)) {
    return normalizeAbsoluteHttpUrl(u)
  }
  if (!u.startsWith('/')) return u
  const origin = apiOriginIfUsable()
  if (origin) return `${origin}${u}`
  return u
}

/** Для style={{ backgroundImage: … }} из сырого URL API */
export function resolvedBackgroundImageUrl(raw) {
  const u = resolvePublicMediaUrl(raw)
  if (!u) return undefined
  return `url("${String(u).replaceAll('"', '%22')}")`
}
