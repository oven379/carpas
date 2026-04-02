const PREFIX = 'cp.mvp.v1.'

const memLS = new Map()
const memSS = new Map()

let lsMemoryOnly = false
let ssMemoryOnly = false

function jsonParse(value, fallback) {
  if (value == null) return fallback
  try {
    return JSON.parse(value)
  } catch {
    return fallback
  }
}

function probeLocalStorage() {
  try {
    const k = `${PREFIX}__probe__`
    localStorage.setItem(k, '1')
    localStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

function probeSessionStorage() {
  try {
    const k = `${PREFIX}__probe__`
    sessionStorage.setItem(k, '1')
    sessionStorage.removeItem(k)
    return true
  } catch {
    return false
  }
}

function migrateLsToMemory() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(PREFIX)) {
        const v = localStorage.getItem(k)
        if (v != null) memLS.set(k, v)
      }
    }
  } catch {
    // ignore
  }
}

function migrateSsToMemory() {
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i)
      if (k?.startsWith(PREFIX)) {
        const v = sessionStorage.getItem(k)
        if (v != null) memSS.set(k, v)
      }
    }
  } catch {
    // ignore
  }
}

lsMemoryOnly = !probeLocalStorage()
ssMemoryOnly = !probeSessionStorage()

export function readLS(key, fallback) {
  const fullKey = PREFIX + key
  if (lsMemoryOnly) return jsonParse(memLS.get(fullKey), fallback)
  try {
    return jsonParse(localStorage.getItem(fullKey), fallback)
  } catch {
    lsMemoryOnly = true
    migrateLsToMemory()
    return jsonParse(memLS.get(fullKey), fallback)
  }
}

export function writeLS(key, value) {
  const fullKey = PREFIX + key
  const str = JSON.stringify(value)
  if (lsMemoryOnly) {
    memLS.set(fullKey, str)
    return
  }
  try {
    localStorage.setItem(fullKey, str)
  } catch {
    migrateLsToMemory()
    lsMemoryOnly = true
    memLS.set(fullKey, str)
  }
}

export function removeLS(key) {
  const fullKey = PREFIX + key
  memLS.delete(fullKey)
  if (!lsMemoryOnly) {
    try {
      localStorage.removeItem(fullKey)
    } catch {
      lsMemoryOnly = true
    }
  }
}

export function readSS(key, fallback) {
  const fullKey = PREFIX + key
  if (ssMemoryOnly) return jsonParse(memSS.get(fullKey), fallback)
  try {
    return jsonParse(sessionStorage.getItem(fullKey), fallback)
  } catch {
    ssMemoryOnly = true
    migrateSsToMemory()
    return jsonParse(memSS.get(fullKey), fallback)
  }
}

export function writeSS(key, value) {
  const fullKey = PREFIX + key
  const str = JSON.stringify(value)
  if (ssMemoryOnly) {
    memSS.set(fullKey, str)
    return
  }
  try {
    sessionStorage.setItem(fullKey, str)
  } catch {
    migrateSsToMemory()
    ssMemoryOnly = true
    memSS.set(fullKey, str)
  }
}

export function removeSS(key) {
  const fullKey = PREFIX + key
  memSS.delete(fullKey)
  if (!ssMemoryOnly) {
    try {
      sessionStorage.removeItem(fullKey)
    } catch {
      ssMemoryOnly = true
    }
  }
}

export function resetAll() {
  const keys = []
  if (!lsMemoryOnly) {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i)
        if (k?.startsWith(PREFIX)) keys.push(k)
      }
      for (const k of keys) localStorage.removeItem(k)
    } catch {
      lsMemoryOnly = true
    }
  }
  for (const k of [...memLS.keys()]) {
    if (k.startsWith(PREFIX)) memLS.delete(k)
  }

  const sKeys = []
  if (!ssMemoryOnly) {
    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const k = sessionStorage.key(i)
        if (k?.startsWith(PREFIX)) sKeys.push(k)
      }
      for (const k of sKeys) sessionStorage.removeItem(k)
    } catch {
      ssMemoryOnly = true
    }
  }
  for (const k of [...memSS.keys()]) {
    if (k.startsWith(PREFIX)) memSS.delete(k)
  }
}
