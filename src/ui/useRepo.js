import { useMemo, useSyncExternalStore } from 'react'
import { createApi } from '../api/index.js'

const API = createApi()
const listeners = new Set()
let version = 0

function emit() {
  version++
  for (const l of listeners) l()
}

export function invalidateRepo() {
  emit()
}

export function useRepo() {
  useSyncExternalStore(
    (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    () => version,
    () => version,
  )

  return useMemo(() => {
    const r = API
    return {
      ...r,
      _invalidate: invalidateRepo,
    }
  }, [])
}

