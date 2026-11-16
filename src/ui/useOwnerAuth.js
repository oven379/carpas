import { useLocation, useNavigate } from 'react-router-dom'
import { formatHttpErrorMessage } from '../api/http.js'
import { GOALS, reachGoal } from '../lib/metrika.js'
import { ownerToSessionSnapshot, safeAuthReturnPath, setSessionOwner } from './auth.js'
import { refreshAllClientData, useRepo } from './useRepo.js'

export function useOwnerAuth() {
  const repo = useRepo()
  const navigate = useNavigate()
  const location = useLocation()
  const returnPath = safeAuthReturnPath(location.state?.from)
  const nextAfterAuth = returnPath && returnPath !== '/' && !returnPath.startsWith('/auth') ? returnPath : '/garage'

  function finish(response, registering, signal) {
    if (signal?.aborted) return
    const owner = ownerToSessionSnapshot(response.owner)
    if (!owner) return 'Не удалось сохранить сессию. Попробуйте ещё раз.'

    setSessionOwner(owner, response.token)
    if (registering) reachGoal(GOALS.ownerRegister)
    refreshAllClientData()
    navigate(registering && nextAfterAuth === '/garage' ? '/garage/settings' : nextAfterAuth, { replace: true })
  }

  async function login(credentials, signal) {
    try {
      const result = await repo.loginOwner(credentials)
      if (result?.ok) return finish(result, false, signal)
      if (result?.reason === 'bad_password') return 'Неверный пароль для этой почты.'
      if (result?.reason === 'not_found') return 'Аккаунта с такой почтой нет. Переключитесь на регистрацию.'
      if (result?.reason === 'bad_credentials') return 'Укажите почту и пароль.'
      return 'Не удалось войти. Попробуйте ещё раз.'
    } catch (error) {
      return formatHttpErrorMessage(error, 'Не удалось войти. Попробуйте ещё раз.')
    }
  }

  async function register(profile, signal) {
    try {
      const result = await repo.registerOwner(profile)
      return finish(result, true, signal)
    } catch (error) {
      return formatHttpErrorMessage(error, 'Не удалось зарегистрироваться. Попробуйте ещё раз.')
    }
  }

  return { login, register, forgotPassword: repo.forgotOwnerPassword, returnPath, nextAfterAuth }
}
