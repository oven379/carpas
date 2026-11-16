import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearSession } from './auth.js'
import { refreshAllClientData } from './useRepo.js'
import { isNativeApp } from '../lib/nativePlatform.js'

/** Признак в location.state: главная завершает выход после перехода. */
export const LOGOUT_STATE_KEY = 'carpasLogout'

export function finishLogout() {
  clearSession()
  refreshAllClientData()
}

/**
 * Выход из аккаунта с переходом на главную.
 *
 * Сессию нельзя очищать до перехода: смена сессии синхронно перерисовывает
 * текущий кабинет, и его защита уводит на /auth/owner раньше навигации.
 * Поэтому сначала уходим на «/», а сессию очищает HomePage по LOGOUT_STATE_KEY.
 * В нативном приложении главной нет — там сразу экран входа.
 */
export function useLogout() {
  const nav = useNavigate()
  return useCallback(() => {
    if (isNativeApp()) {
      finishLogout()
      nav('/auth/owner', { replace: true })
      return
    }
    nav('/', { replace: true, state: { [LOGOUT_STATE_KEY]: true } })
  }, [nav])
}
