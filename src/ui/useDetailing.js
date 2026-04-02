import { useMemo } from 'react'
import { getSessionDetailingId, getSessionOwner } from './auth.js'
import { useRepo } from './useRepo.js'

export function useDetailing() {
  const r = useRepo()
  const detailingId = getSessionDetailingId()
  const detailing = detailingId && r.getDetailing ? r.getDetailing(detailingId) : null
  const ownerSession = getSessionOwner()
  const owner =
    ownerSession?.email && r.getOwner
      ? r.getOwner(ownerSession.email) || ownerSession
      : ownerSession
  const mode = owner ? 'owner' : detailingId ? 'detailing' : 'guest'
  return useMemo(() => ({ detailingId, detailing, owner, mode }), [detailingId, detailing, owner, mode])
}

/** Партнёр вошёл, но ещё не сохранил первичные настройки детейлинга — кабинет недоступен, только /detailing/settings */
export function detailingOnboardingPending(mode, detailing) {
  return mode === 'detailing' && detailing != null && detailing.profileCompleted === false
}

