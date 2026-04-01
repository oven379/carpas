import { readSS, removeSS, writeSS } from '../lib/storage.js'

const SESSION_DETAILING_KEY = 'auth.detailingId'
const SESSION_OWNER_KEY = 'auth.owner'

export function getSessionDetailingId() {
  return readSS(SESSION_DETAILING_KEY, null)
}

export function getSessionOwner() {
  return readSS(SESSION_OWNER_KEY, null)
}

export function isAuthed() {
  return Boolean(getSessionDetailingId() || getSessionOwner())
}

export function setSessionDetailingId(id) {
  writeSS(SESSION_DETAILING_KEY, id)
  removeSS(SESSION_OWNER_KEY)
}

export function setSessionOwner(owner) {
  writeSS(SESSION_OWNER_KEY, owner || { ok: true })
  removeSS(SESSION_DETAILING_KEY)
}

export function clearSession() {
  removeSS(SESSION_DETAILING_KEY)
  removeSS(SESSION_OWNER_KEY)
}

