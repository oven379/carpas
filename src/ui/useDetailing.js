import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
  mergeSessionOwnerScalars,
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

  /** Смена роли/токена/почты — полная загрузка со спиннером. Только `sessionEpoch` (после PATCH /me) — фон, без блокировки UI. */
  const identityKey = useMemo(
    () => `${detailingId || ''}|${dTok || ''}|${oTok || ''}|${ownerEmailKey}`,
    [detailingId, dTok, oTok, ownerEmailKey],
  )
  const prevIdentityRef = useRef(null)
  const prevEpochRef = useRef(null)
  /** Игнорируем ответы устаревших запросов /me (гонка после PATCH, flush coalesce, смена epoch). */
  const loadGenerationRef = useRef(0)

  useEffect(() => {
    const generation = ++loadGenerationRef.current
    let cancelled = false
    const api = getApi()
    const prevId = prevIdentityRef.current
    const prevEp = prevEpochRef.current
    const first = prevId === null
    const identityChanged = first || prevId !== identityKey
    const softProfileRefresh = !first && !identityChanged && prevEp !== sessionEpoch

    async function load() {
      const dTokNow = getDetailingToken()
      const oTokNow = getOwnerToken()
      const did = getSessionDetailingId()
      const oEmail = getSessionOwner()?.email || ''

      const applyIfCurrent = () => !cancelled && generation === loadGenerationRef.current

      if (softProfileRefresh) {
        setLoading(false)
        if (oEmail && oTokNow && applyIfCurrent()) {
          const os = getSessionOwner()
          if (os?.email) setOwner(os)
        }
      } else {
        setLoading(true)
      }

      try {
        if (did && dTokNow) {
          const me = await api.getMeDetailing()
          if (applyIfCurrent()) {
            setDetailing(me?.detailing ?? null)
            setOwner(null)
          }
          return
        }
        if (oEmail && oTokNow) {
          const me = await api.getMeOwner()
          if (applyIfCurrent()) {
            const fresh = me?.owner ?? null
            if (fresh && typeof fresh === 'object') {
              try {
                mergeSessionOwnerScalars(fresh)
              } catch {
                /* ignore */
              }
            }
            setOwner(fresh ?? getSessionOwner())
            setDetailing(null)
          }
          return
        }
        if (applyIfCurrent()) {
          setDetailing(null)
          const os = getSessionOwner()
          setOwner(oEmail && os ? os : null)
        }
      } catch {
        if (applyIfCurrent()) {
          setDetailing(null)
          const os = getSessionOwner()
          setOwner(oEmail && os ? os : null)
        }
      } finally {
        if (applyIfCurrent()) {
          setLoading(false)
          prevIdentityRef.current = identityKey
          prevEpochRef.current = sessionEpoch
        }
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [identityKey, sessionEpoch])

  /** Сразу после PATCH /detailings/me — без ожидания повторного GET /me (избегаем гонок с coalesce и старым ответом). */
  const applyDetailingSnapshot = useCallback((det) => {
    if (det != null && typeof det === 'object') {
      setDetailing(det)
    }
  }, [])

  const value = useMemo(() => {
    const sid = getSessionDetailingId()
    const mode = hasOwnerSession() ? 'owner' : hasDetailingSession() ? 'detailing' : 'guest'
    return { detailingId: sid, detailing, owner, mode, loading, applyDetailingSnapshot }
  }, [detailing, owner, loading, applyDetailingSnapshot])

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
  if (mode !== 'detailing' || detailing == null || typeof detailing !== 'object') return false
  return detailing.profileCompleted === false
}
