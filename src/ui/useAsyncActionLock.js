import { useCallback, useRef, useState } from 'react'

/**
 * Блокирует повторный запуск одной и той же асинхронной операции (двойной клик по кнопке).
 * Возвращает обёртку и флаг для disabled / подписи «…».
 */
export function useAsyncActionLock() {
  const lockRef = useRef(false)
  const [pending, setPending] = useState(false)

  const run = useCallback(async (fn) => {
    if (lockRef.current) return
    lockRef.current = true
    setPending(true)
    try {
      return await fn()
    } finally {
      lockRef.current = false
      setPending(false)
    }
  }, [])

  return { run, pending }
}
