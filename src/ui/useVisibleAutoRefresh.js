import { useEffect, useRef } from 'react'

export function useVisibleAutoRefresh(onRefresh, { enabled = true, intervalMs = 30_000 } = {}) {
  const refreshRef = useRef(onRefresh)

  useEffect(() => {
    refreshRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    if (!enabled) return undefined

    const tick = () => {
      if (document.visibilityState !== 'visible') return
      if (typeof refreshRef.current === 'function') refreshRef.current()
    }

    const id = window.setInterval(tick, intervalMs)
    return () => window.clearInterval(id)
  }, [enabled, intervalMs])
}
