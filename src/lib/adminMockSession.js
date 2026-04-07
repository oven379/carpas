/** Макет админки без бэкенда: «вход» только в этой вкладке. */
const KEY = 'carPass_adminMockOk'

export function setAdminMockSession() {
  try {
    sessionStorage.setItem(KEY, '1')
  } catch {
    /* ignore */
  }
}

export function clearAdminMockSession() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function hasAdminMockSession() {
  try {
    return sessionStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}
