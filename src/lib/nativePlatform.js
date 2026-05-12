export function isNativeApp() {
  if (typeof window === 'undefined') return false
  try {
    if (window.__CARPAS_NATIVE_APP__ === true) return true
    if (window.ReactNativeWebView) return true
    const sp = new URLSearchParams(window.location.search || '')
    return sp.get('native') === '1'
  } catch {
    return false
  }
}

export function nativePlatform() {
  return isNativeApp() ? 'native' : 'web'
}
