/** Bearer после POST /api/admin/support/login (sessionStorage, одна вкладка). */
const KEY = 'carPass_adminSupportBearer'

export function setAdminApiToken(token) {
  try {
    if (token) sessionStorage.setItem(KEY, String(token))
    else sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function getAdminApiToken() {
  try {
    return sessionStorage.getItem(KEY) || ''
  } catch {
    return ''
  }
}

export function clearAdminApiToken() {
  try {
    sessionStorage.removeItem(KEY)
  } catch {
    /* ignore */
  }
}

export function hasAdminApiToken() {
  return Boolean(getAdminApiToken())
}
