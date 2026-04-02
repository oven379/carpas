/** Заголовок визита в истории: лимит символов (пробелы учитываются). Менять только здесь. */
export const VISIT_TITLE_MAX_LEN = 40

/** Демо: один пароль для любого аккаунта владельца (почты различаются). */
export const OWNER_DEMO_PASSWORD = '1111'

export function clampVisitTitle(raw) {
  return String(raw ?? '')
    .slice(0, VISIT_TITLE_MAX_LEN)
    .trim()
}

export function fmtInt(n) {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0
  return new Intl.NumberFormat('ru-RU').format(Math.round(v))
}

export function fmtKm(n) {
  return `${fmtInt(n)} км`
}

export function fmtUsd(n) {
  return `${fmtInt(n)} $`
}

export function fmtRub(n) {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(v))} ₽`
}

export function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const parts = new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).formatToParts(d)
  const day = parts.find((p) => p.type === 'day')?.value
  const monthRaw = parts.find((p) => p.type === 'month')?.value
  const month = monthRaw ? String(monthRaw).replace(/\.$/, '') : monthRaw
  const year = parts.find((p) => p.type === 'year')?.value
  return [day, month, year].filter(Boolean).join(' ')
}

export function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const parts = new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d)
  const day = parts.find((p) => p.type === 'day')?.value
  const monthRaw = parts.find((p) => p.type === 'month')?.value
  const month = monthRaw ? String(monthRaw).replace(/\.$/, '') : monthRaw
  const year = parts.find((p) => p.type === 'year')?.value
  const hour = parts.find((p) => p.type === 'hour')?.value
  const minute = parts.find((p) => p.type === 'minute')?.value
  const date = [day, month, year].filter(Boolean).join(' ')
  const time = hour != null && minute != null ? `${hour}:${minute}` : ''
  return time ? `${date} · ${time}` : date
}

// VIN: 17 символов, только A-Z и 0-9, запрещены I/O/Q (ISO 3779)
// Нормализуем ввод: верхний регистр, выкидываем пробелы/дефисы/прочие символы,
// не пропускаем I/O/Q, ограничиваем длину.
export function normVin(raw, { maxLen = 17 } = {}) {
  const s = String(raw || '')
  if (!s) return ''
  let out = ''
  for (const ch of s.toUpperCase()) {
    if (out.length >= maxLen) break
    // часто вставляют с пробелами/дефисами
    if (ch === ' ' || ch === '-' || ch === '_' || ch === '\n' || ch === '\t' || ch === '\r') continue
    const code = ch.charCodeAt(0)
    const isDigit = code >= 48 && code <= 57
    const isUpper = code >= 65 && code <= 90
    if (!isDigit && !isUpper) continue
    if (ch === 'I' || ch === 'O' || ch === 'Q') continue
    out += ch
  }
  return out
}

export function normDigits(raw, { max = null, maxLen = null } = {}) {
  const s = String(raw || '')
  if (!s) return ''
  let digits = s.replace(/[^\d]/g, '')
  if (!digits) return ''
  if (typeof maxLen === 'number' && Number.isFinite(maxLen) && maxLen > 0) {
    digits = digits.slice(0, maxLen)
  }
  if (typeof max === 'number' && Number.isFinite(max)) {
    const n = Number(digits)
    if (Number.isFinite(n)) {
      const clamped = Math.min(Math.max(0, Math.trunc(n)), Math.trunc(max))
      digits = String(clamped)
    }
  }
  return digits
}

const PLATE_MAP_CYR_TO_LAT = new Map([
  ['А', 'A'],
  ['В', 'B'],
  ['Е', 'E'],
  ['К', 'K'],
  ['М', 'M'],
  ['Н', 'H'],
  ['О', 'O'],
  ['Р', 'P'],
  ['С', 'C'],
  ['Т', 'T'],
  ['У', 'Y'],
  ['Х', 'X'],
])

function plateToLatinUpper(ch) {
  const up = String(ch || '').toUpperCase()
  if (!up) return ''
  if (PLATE_MAP_CYR_TO_LAT.has(up)) return PLATE_MAP_CYR_TO_LAT.get(up)
  // если уже латиница/цифра — возвращаем как есть
  return up
}

// Госномер (base): допускаем A-Z и 0-9, дополнительно маппим "разрешённые" кириллические буквы к латинице.
// Храним базовую часть отдельно от региона (обычно 6 символов: A123BC).
export function normPlateBase(raw, { maxLen = 6 } = {}) {
  const s = String(raw || '')
  if (!s) return ''
  let out = ''
  for (const ch of s) {
    if (out.length >= maxLen) break
    const x = plateToLatinUpper(ch)
    const code = x.charCodeAt(0)
    const isDigit = code >= 48 && code <= 57
    const isUpper = code >= 65 && code <= 90
    if (!isDigit && !isUpper) continue
    out += x
  }
  return out
}

// Регион: 2-3 цифры (в MVP позволим 1-3, но показывать/проверять будем как строку)
export function normPlateRegion(raw, { maxLen = 3 } = {}) {
  return normDigits(raw, { maxLen, max: 999 })
}

// Парсим ввод вроде "A777AA77" -> { plate: "A777AA", plateRegion: "77" }
export function parsePlateFull(raw) {
  const s = String(raw || '')
  const cleaned = normPlateBase(s, { maxLen: 9 }) // временно, чтобы вытащить возможный регион
  const m = cleaned.match(/^([A-Z0-9]{4,7}?)(\d{2,3})$/)
  if (m) {
    const base = normPlateBase(m[1], { maxLen: 6 })
    const region = normPlateRegion(m[2], { maxLen: 3 })
    return { plate: base, plateRegion: region }
  }
  return { plate: normPlateBase(s, { maxLen: 6 }), plateRegion: '' }
}

export function fmtPlateFull(plate, plateRegion) {
  const b = normPlateBase(plate, { maxLen: 6 })
  const r = normPlateRegion(plateRegion, { maxLen: 3 })
  return r ? `${b}${r}` : b
}

