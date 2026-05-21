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
  if (typeof document === 'undefined') return ''
  const canvas = document.createElement('canvas')
  canvas.width = 64
  canvas.height = 64
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  ctx.fillStyle = '#0b0b0b'
  ctx.fillRect(0, 0, 64, 64)
  ctx.fillStyle = '#d6b36a'
  ctx.font = '700 25px Arial, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('К', 27, 35)

  ctx.fillStyle = '#58e089'
  ctx.beginPath()
  ctx.arc(47, 17, 15, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#0b0b0b'
  ctx.font = '800 18px Arial, sans-serif'
  ctx.fillText(count > 9 ? '9+' : String(count), 47, 18)

  return canvas.toDataURL('image/png')
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
