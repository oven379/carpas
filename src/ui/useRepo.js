import { useMemo, useSyncExternalStore } from 'react'
import { getApi } from '../api/index.js'

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

export function subscribeRepo(cb) {
  listeners.add(cb)
  return () => listeners.delete(cb)
}

export function getRepoVersion() {
  return version
}

export function useRepo() {
  const v = useSyncExternalStore(subscribeRepo, getRepoVersion, getRepoVersion)
  return useMemo(() => ({ ...API, _version: v }), [v])
}
