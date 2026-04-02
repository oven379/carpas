import { useMemo } from 'react'
import { safeSyncRepo } from '../lib/syncRepoCall.js'
import { getSessionDetailingId, getSessionOwner } from './auth.js'
import { useRepo } from './useRepo.js'

export function useDetailing() {
  const r = useRepo()
  const detailingId = getSessionDetailingId()
  let detailing = null
  if (detailingId && r.getDetailing) {
    const res = safeSyncRepo(() => r.getDetailing(detailingId))
    if (res.ok) detailing = res.value ?? null
  }
  const ownerSession = getSessionOwner()
  let owner = ownerSession
  if (ownerSession?.email && r.getOwner) {
    const res = safeSyncRepo(() => r.getOwner(ownerSession.email))
    if (res.ok && res.value) owner = res.value
  }
  const mode = owner?.email ? 'owner' : detailingId ? 'detailing' : 'guest'
  return useMemo(() => ({ detailingId, detailing, owner, mode }), [detailingId, detailing, owner, mode])
}

/** Партнёр вошёл, но ещё не сохранил первичные настройки детейлинга — кабинет недоступен, только /detailing/settings */
export function detailingOnboardingPending(mode, detailing) {
  return mode === 'detailing' && detailing != null && detailing.profileCompleted === false
}

