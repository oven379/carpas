const PREFIX = 'cp.mvp.v1.'

function jsonParse(value, fallback) {
  if (value == null) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

export function readLS(key, fallback) {
  return jsonParse(localStorage.getItem(PREFIX + key), fallback)
}

export function writeLS(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value))
  } catch (e) {
    const err = new Error('storage_write_failed')
    err.cause = e
    throw err
  }
}

export function removeLS(key) {
  localStorage.removeItem(PREFIX + key)
}

export function readSS(key, fallback) {
  return jsonParse(sessionStorage.getItem(PREFIX + key), fallback)
}

export function writeSS(key, value) {
  sessionStorage.setItem(PREFIX + key, JSON.stringify(value))
}

export function removeSS(key) {
  sessionStorage.removeItem(PREFIX + key)
}

export function resetAll() {
  const keys = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (k?.startsWith(PREFIX)) keys.push(k)
  }
  for (const k of keys) localStorage.removeItem(k)
  const sKeys = []
  for (let i = 0; i < sessionStorage.length; i++) {
    const k = sessionStorage.key(i)
    if (k?.startsWith(PREFIX)) sKeys.push(k)
  }
  for (const k of sKeys) sessionStorage.removeItem(k)
}

