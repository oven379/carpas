import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react'
import {
  getDetailingToken,
  getOwnerToken,
  getSessionDetailingId,
  getSessionOwner,
  getSessionRefreshEpoch,
  hasDetailingSession,
  hasOwnerSession,
  subscribeSessionRefresh,
} from './auth.js'
import { getApi } from '../api/index.js'

const DetailingSessionContext = createContext(null)

/**
 * Профиль с API (`owner`, `detailing`) — асинхронно.
 * Роль (`mode`) — синхронно из sessionStorage: hasOwnerSession / hasDetailingSession (см. auth.js).
 */
export function DetailingSessionProvider({ children }) {
  const sessionEpoch = useSyncExternalStore(subscribeSessionRefresh, getSessionRefreshEpoch, getSessionRefreshEpoch)
  const detailingId = getSessionDetailingId()
  const ownerEmailKey = getSessionOwner()?.email || ''
  const dTok = getDetailingToken()
  const oTok = getOwnerToken()

  const [detailing, setDetailing] = useState(null)
  const [owner, setOwner] = useState(null)
  const [loading, setLoading] = useState(true)

  const sessionKey = useMemo(
    () => `${detailingId || ''}|${dTok || ''}|${oTok || ''}|${ownerEmailKey}|${sessionEpoch}`,
    [detailingId, dTok, oTok, ownerEmailKey, sessionEpoch],
  )

  useEffect(() => {
    let cancelled = false
    const api = getApi()

    async function load() {
      setLoading(true)
      const dTokNow = getDetailingToken()
      const oTokNow = getOwnerToken()
      const did = getSessionDetailingId()
      const oEmail = getSessionOwner()?.email || ''
      try {
        if (did && dTokNow) {
          const me = await api.getMeDetailing()
          if (!cancelled) {
            setDetailing(me?.detailing ?? null)
            setOwner(null)
          }
          return
        }
        if (oEmail && oTokNow) {
          const me = await api.getMeOwner()
          if (!cancelled) {
            setOwner(me?.owner ?? getSessionOwner())
            setDetailing(null)
          }
          return
        }
        if (!cancelled) {
          setDetailing(null)
          const os = getSessionOwner()
          setOwner(oEmail && os ? os : null)
        }
      } catch {
        if (!cancelled) {
          setDetailing(null)
          const os = getSessionOwner()
          setOwner(oEmail && os ? os : null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [sessionKey])

  const value = useMemo(
    () => {
      const sid = getSessionDetailingId()
      const mode = hasOwnerSession() ? 'owner' : hasDetailingSession() ? 'detailing' : 'guest'
      return { detailingId: sid, detailing, owner, mode, loading }
    },
    // sessionEpoch: смена сессии (другая вкладка), пока load() не обновил state
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [detailing, owner, loading, sessionEpoch],
  )

  return createElement(DetailingSessionContext.Provider, { value }, children)
}

export function useDetailing() {
  const ctx = useContext(DetailingSessionContext)
  if (ctx == null) {
    throw new Error('useDetailing: оберните приложение в <DetailingSessionProvider>')
  }
  return ctx
}

/** Партнёр вошёл, но ещё не сохранил настройки лендинга — кабинет недоступен, только /detailing/landing */
export function detailingOnboardingPending(mode, detailing) {
  return mode === 'detailing' && detailing != null && detailing.profileCompleted === false
}
