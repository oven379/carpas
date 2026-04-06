import { useSyncExternalStore } from 'react'
import { getApi } from '../api/index.js'
import { bumpSessionRefresh } from './auth.js'

const API = getApi()
const listeners = new Set()
let version = 0

function emit() {
  version++
  for (const l of listeners) l()
}

export function invalidateRepo() {
  emit()
}

/** Сброс слияния параллельных GET, перезагрузка профиля из /me и повторная подгрузка списков в UI. */
export function refreshAllClientData() {
  const api = getApi()
  if (typeof api.flushCoalescedRequests === 'function') api.flushCoalescedRequests()
  bumpSessionRefresh()
  invalidateRepo()
}

export function subscribeRepo(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getRepoVersion() {
  return version
}

/** Одна стабильная ссылка: методы с `API`, `_version` всегда актуален (без лишних перезапусков эффектов из‑за нового `{ ...API }`). */
const REPO = new Proxy(API, {
  get(target, prop, receiver) {
    if (prop === '_version') return getRepoVersion()
    return Reflect.get(target, prop, receiver)
  },
})

export function useRepo() {
  useSyncExternalStore(subscribeRepo, getRepoVersion, getRepoVersion)
  return REPO
}
