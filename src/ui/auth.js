import { readSS, removeSS, writeSS } from '../lib/storage.js'

/** Счётчик для принудительного обновления профиля после PATCH /me (токен тот же). Не связан с invalidateRepo. */
let sessionRefreshEpoch = 0
const sessionRefreshListeners = new Set()

export function subscribeSessionRefresh(cb) {
  sessionRefreshListeners.add(cb)
  return () => sessionRefreshListeners.delete(cb)
}

export function getSessionRefreshEpoch() {
  return sessionRefreshEpoch
}

export function bumpSessionRefresh() {
  sessionRefreshEpoch++
  for (const l of sessionRefreshListeners) l()
}

const SESSION_DETAILING_KEY = 'auth.detailingId'
const SESSION_DETAILING_TOKEN_KEY = 'auth.detailingToken'
const SESSION_OWNER_KEY = 'auth.owner'
const SESSION_OWNER_TOKEN_KEY = 'auth.ownerToken'

export function getSessionDetailingId() {
  return readSS(SESSION_DETAILING_KEY, null)
}

export function getSessionOwner() {
  return readSS(SESSION_OWNER_KEY, null)
}

export function getDetailingToken() {
  return readSS(SESSION_DETAILING_TOKEN_KEY, null)
}

export function getOwnerToken() {
  return readSS(SESSION_OWNER_TOKEN_KEY, null)
}

/** Синхронно: есть сессия владельца (токен + почта в storage). Редиректы и mode — от этого, не от async /me. */
export function hasOwnerSession() {
  const t = getOwnerToken()
  const em = String(getSessionOwner()?.email || '').trim()
  return Boolean(t && em)
}

/** Синхронно: сессия партнёра (детейлинг). */
export function hasDetailingSession() {
  return Boolean(getDetailingToken() && getSessionDetailingId())
}

const AUTH_DEBUG = import.meta.env.DEV

export function debugAuth(phase, data = {}) {
  if (!AUTH_DEBUG) return
  console.log('[carpas:auth]', phase, {
    hasOwnerSession: hasOwnerSession(),
    hasDetailingSession: hasDetailingSession(),
    path: typeof location !== 'undefined' ? location.pathname : '',
    ...data,
  })
}

export function isAuthed() {
  return Boolean(getSessionDetailingId() || getSessionOwner())
}

export function setSessionDetailingId(id, token = null) {
  writeSS(SESSION_DETAILING_KEY, id)
  if (token) writeSS(SESSION_DETAILING_TOKEN_KEY, String(token))
  else removeSS(SESSION_DETAILING_TOKEN_KEY)
  removeSS(SESSION_OWNER_KEY)
  removeSS(SESSION_OWNER_TOKEN_KEY)
  debugAuth('setSessionDetailingId', { detailingId: id, hasToken: Boolean(token) })
  bumpSessionRefresh()
}

export function setSessionOwner(owner, token = null) {
  writeSS(SESSION_OWNER_KEY, owner || { ok: true })
  if (token) writeSS(SESSION_OWNER_TOKEN_KEY, String(token))
  else removeSS(SESSION_OWNER_TOKEN_KEY)
  removeSS(SESSION_DETAILING_KEY)
  removeSS(SESSION_DETAILING_TOKEN_KEY)
  debugAuth('setSessionOwner', { email: owner?.email, hasToken: Boolean(token) })
  bumpSessionRefresh()
}

export function clearSession() {
  removeSS(SESSION_DETAILING_KEY)
  removeSS(SESSION_DETAILING_TOKEN_KEY)
  removeSS(SESSION_OWNER_KEY)
  removeSS(SESSION_OWNER_TOKEN_KEY)
  debugAuth('clearSession')
  bumpSessionRefresh()
}

/** @deprecated используйте setSessionDetailingId(id, token) */
export function setDetailingToken(token) {
  if (token) writeSS(SESSION_DETAILING_TOKEN_KEY, String(token))
  else removeSS(SESSION_DETAILING_TOKEN_KEY)
}
