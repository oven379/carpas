import { useMemo } from 'react'
import { getSessionDetailingId, getSessionOwner } from './auth.js'
import { useRepo } from './useRepo.js'

export function useDetailing() {
  const r = useRepo()
  const detailingId = getSessionDetailingId()
  const detailing = detailingId && r.getDetailing ? r.getDetailing(detailingId) : null
  const owner = getSessionOwner()
  const mode = owner ? 'owner' : detailingId ? 'detailing' : 'guest'
  return useMemo(() => ({ detailingId, detailing, owner, mode }), [detailingId, detailing, owner, mode])
}

