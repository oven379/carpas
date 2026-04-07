/**
 * Учётные данные входа на /admin/379team (макет на клиенте).
 * В продакшене: только серверная проверка + httpOnly-cookie / сессия, не хранить пароль в фронтенд-бандле.
 */
const LOGIN = 'carpasss379tm'
const PASSWORD = '379Tmgroup2026'

export function adminGateCredentialsOk(loginRaw, passwordRaw) {
  const login = String(loginRaw ?? '').trim()
  const password = String(passwordRaw ?? '')
  return login === LOGIN && password === PASSWORD
}
