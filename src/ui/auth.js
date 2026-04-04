import { ownerCityPublicFlag, ownerPublicFlagTrue } from '../lib/format.js'
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

/** Обновить в сессии текстовые поля владельца после сохранения в репозиторий (без баннера/аватара — объём). */
export function mergeSessionOwnerScalars(patch) {
  const cur = getSessionOwner()
  if (!cur?.email || !patch || typeof patch !== 'object') return
  writeSS(SESSION_OWNER_KEY, {
    ...cur,
    name: patch.name != null ? String(patch.name) : cur.name,
    phone: patch.phone != null ? String(patch.phone) : cur.phone,
    garageCity: patch.garageCity != null ? String(patch.garageCity) : cur.garageCity,
    garageSlug: patch.garageSlug != null ? String(patch.garageSlug) : cur.garageSlug,
    showPhonePublic:
      patch.showPhonePublic !== undefined
        ? ownerPublicFlagTrue(patch.showPhonePublic)
        : ownerPublicFlagTrue(cur.showPhonePublic),
    garageWebsite: patch.garageWebsite != null ? String(patch.garageWebsite) : cur.garageWebsite,
    showWebsitePublic:
      patch.showWebsitePublic !== undefined
        ? ownerPublicFlagTrue(patch.showWebsitePublic)
        : ownerPublicFlagTrue(cur.showWebsitePublic),
    garageSocial: patch.garageSocial != null ? String(patch.garageSocial) : cur.garageSocial,
    showSocialPublic:
      patch.showSocialPublic !== undefined
        ? ownerPublicFlagTrue(patch.showSocialPublic)
        : ownerPublicFlagTrue(cur.showSocialPublic),
    showCityPublic:
      patch.showCityPublic !== undefined
        ? ownerPublicFlagTrue(patch.showCityPublic)
        : ownerCityPublicFlag(cur.showCityPublic),
    isPremium: patch.isPremium != null ? Boolean(patch.isPremium) : cur.isPremium,
    updatedAt: patch.updatedAt != null ? String(patch.updatedAt) : cur.updatedAt,
    lastVisitAt: patch.lastVisitAt != null ? String(patch.lastVisitAt) : cur.lastVisitAt,
  })
}

/** Снимок владельца для sessionStorage: скаляры для UI, без пароля и без base64 баннера/аватара. */
export function ownerToSessionSnapshot(o) {
  if (!o || typeof o !== 'object') return null
  const email = typeof o.email === 'string' ? o.email.trim() : ''
  if (!email) return null
  return {
    email,
    name: o.name != null ? String(o.name) : '',
    phone: o.phone != null ? String(o.phone) : '',
    garageCity: o.garageCity != null ? String(o.garageCity) : '',
    garageSlug: o.garageSlug != null ? String(o.garageSlug) : '',
    showPhonePublic: ownerPublicFlagTrue(o.showPhonePublic),
    garageWebsite: o.garageWebsite != null ? String(o.garageWebsite) : '',
    showWebsitePublic: ownerPublicFlagTrue(o.showWebsitePublic),
    garageSocial: o.garageSocial != null ? String(o.garageSocial) : '',
    showSocialPublic: ownerPublicFlagTrue(o.showSocialPublic),
    showCityPublic: ownerCityPublicFlag(o.showCityPublic),
    isPremium: Boolean(o.isPremium),
    updatedAt: o.updatedAt != null ? String(o.updatedAt) : '',
    lastVisitAt: o.lastVisitAt != null ? String(o.lastVisitAt) : '',
  }
}

export function clearSession() {
  removeSS(SESSION_DETAILING_KEY)
  removeSS(SESSION_OWNER_KEY)
}

