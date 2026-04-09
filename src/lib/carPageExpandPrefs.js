import { readLS, writeLS } from './storage.js'

const STORAGE_KEY = 'carPage.expandPrefs.v1'

function rowKey(mode, carId) {
  return `${String(mode || '')}:${String(carId || '')}`
}

export function readCarPageExpandPrefs(mode, carId) {
  if (!carId) return null
  const all = readLS(STORAGE_KEY, {})
  if (!all || typeof all !== 'object') return null
  const row = all[rowKey(mode, carId)]
  return row && typeof row === 'object' ? row : null
}

/** Частичное обновление; остальные поля строки для этой машины не затираем. */
export function patchCarPageExpandPrefs(mode, carId, patch) {
  if (!carId) return
  const all = readLS(STORAGE_KEY, {})
  const key = rowKey(mode, carId)
  const cur = all[key] && typeof all[key] === 'object' ? all[key] : {}
  all[key] = { ...cur, ...patch }
  writeLS(STORAGE_KEY, all)
}

/** По умолчанию развёрнуто, пока в хранилище явно не false. */
export function initialLastVisitExpanded(prefs) {
  return prefs?.lastVisit !== false
}

export function initialCarDataExpanded(prefs) {
  return prefs?.carData !== false
}
