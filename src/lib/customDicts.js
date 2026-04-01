import { readLS, writeLS } from './storage.js'

const MAKES_KEY = 'dict.customMakes'
const MODELS_KEY = 'dict.customModelsByMake'

function norm(s) {
  return String(s || '').trim().toLowerCase()
}

function title(s) {
  const v = String(s || '').trim()
  return v
}

export function getCustomMakes() {
  const arr = readLS(MAKES_KEY, [])
  return Array.isArray(arr) ? arr.map(title).filter(Boolean) : []
}

export function addCustomMake(make) {
  const m = title(make)
  if (!m) return
  const arr = getCustomMakes()
  const set = new Map(arr.map((x) => [norm(x), x]))
  if (!set.has(norm(m))) set.set(norm(m), m)
  writeLS(MAKES_KEY, Array.from(set.values()).sort((a, b) => a.localeCompare(b)))
}

export function getCustomModelsByMake(make) {
  const map = readLS(MODELS_KEY, {})
  const key = norm(make)
  const arr = map && typeof map === 'object' ? map[key] : null
  return Array.isArray(arr) ? arr.map(title).filter(Boolean) : []
}

export function addCustomModel(make, model) {
  const mk = title(make)
  const md = title(model)
  if (!mk || !md) return

  const map = readLS(MODELS_KEY, {})
  const next = map && typeof map === 'object' ? { ...map } : {}
  const key = norm(mk)
  const prev = Array.isArray(next[key]) ? next[key] : []
  const set = new Map(prev.map((x) => [norm(x), x]))
  if (!set.has(norm(md))) set.set(norm(md), md)
  next[key] = Array.from(set.values()).sort((a, b) => a.localeCompare(b))
  writeLS(MODELS_KEY, next)
}

