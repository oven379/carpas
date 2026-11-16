import brandMark from '../assets/brand-mark.svg?raw'

const DEFAULT_TITLE = 'КарПас'
let defaultFaviconHref = ''

function findFavicon() {
  if (typeof document === 'undefined') return null
  let link = document.querySelector('link[rel="icon"][sizes="any"]') || document.querySelector('link[rel="icon"]')
  if (!link) {
    link = document.createElement('link')
    link.rel = 'icon'
    document.head.appendChild(link)
  }
  if (!defaultFaviconHref) defaultFaviconHref = link.getAttribute('href') || '/favicon.svg'
  return link
}

function badgeFavicon(count) {
  const label = count > 9 ? '9+' : String(count)
  const badge = `<circle cx="47" cy="17" r="15" fill="#58e089"/><text x="47" y="18" text-anchor="middle" dominant-baseline="central" font-family="Arial,sans-serif" font-size="18" font-weight="800" fill="#0b0b0b">${label}</text>`
  return `data:image/svg+xml,${encodeURIComponent(brandMark.replace('</svg>', `${badge}</svg>`))}`
}

export function syncNotificationBadge(count) {
  const value = Math.max(0, Number(count || 0))

  try {
    if (typeof window !== 'undefined' && window.ReactNativeWebView?.postMessage) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'carpas-notification-badge', count: value }))
    }
  } catch {
    // Native bridge is optional.
  }

  try {
    if (typeof document === 'undefined') return
    document.title = value > 0 ? `(${value}) ${DEFAULT_TITLE}` : DEFAULT_TITLE
    const link = findFavicon()
    if (!link) return
    link.setAttribute('href', value > 0 ? badgeFavicon(value) : defaultFaviconHref || '/favicon.svg')
  } catch {
    // Browser favicon updates are best-effort, especially on mobile Safari.
  }
}
