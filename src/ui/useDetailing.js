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
  subscribeSessionRefresh,
} from './auth.js'
import { getApi } from '../api/index.js'

const DetailingSessionContext = createContext(null)

/** Один раз на приложение: загрузка `/me` и `/owners/me`, без N запросов от каждого компонента. */
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

  const value = useMemo(() => {
    const sid = getSessionDetailingId()
    const stOwner = getSessionOwner()
    const oT = getOwnerToken()
    const em = stOwner?.email || ''

    // Пока /owners/me не вернулся, в state `owner` ещё null — иначе защищённые страницы шлют обратно на /auth/owner
    const effectiveOwner =
      owner != null ? owner : em && oT && !sid && typeof stOwner === 'object' ? stOwner : null

    const mode = effectiveOwner?.email ? 'owner' : sid ? 'detailing' : 'guest'
    return { detailingId: sid, detailing, owner: effectiveOwner, mode, loading }
  }, [detailingId, detailing, owner, loading, dTok, oTok, ownerEmailKey, sessionEpoch])

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
