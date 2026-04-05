/** Заголовок визита в истории: лимит символов (пробелы учитываются). Менять только здесь. */
export const VISIT_TITLE_MAX_LEN = 40

/** Советы по уходу из визита детейлинга (поля «Важно» / «Совет 1–3»). */
export const VISIT_CARE_TIP_MAX_LEN = 240

/** Режим работы детейлинга/СТО (публичная страница на улице и кабинет). */
export const DETAILING_WORKING_HOURS_MAX_LEN = 200

/** Подпись в пустых зонах выбора изображения (баннер, аватар, обложка карточки). */
export const IMAGE_UPLOAD_EMPTY_CTA = 'Нажмите для загрузки'

/** Демо: раньше был единый пароль; оставлен для совместимости со старыми подсказками в коде партнёров. */
export const OWNER_DEMO_PASSWORD = '1111'

/** Минимальная длина пароля владельца в локальном режиме. */
export const OWNER_PASSWORD_MIN_LEN = 4

/** Для поля ввода: только лимит длины; пробелы не удаляем (иначе нельзя набрать пробел между словами). */
export function clampVisitTitleInput(raw) {
  return String(raw ?? '').slice(0, VISIT_TITLE_MAX_LEN)
}

/** Для сохранения визита: убираем пробелы по краям, затем лимит длины. */
export function clampVisitTitle(raw) {
  return clampVisitTitleInput(String(raw ?? '').trim())
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

/** Латинские буквы, допустимые на российских госномерах (как на табличке: АВЕКМНОРСТУХ). */
export const RU_PLATE_LETTERS_LAT = 'ABEKMHOPCTYX'
const RU_PLATE_LETTER_SET = new Set(RU_PLATE_LETTERS_LAT.split(''))

function plateToLatinUpper(ch) {
  const up = String(ch || '').toUpperCase()
  if (!up) return ''
  if (PLATE_MAP_CYR_TO_LAT.has(up)) return PLATE_MAP_CYR_TO_LAT.get(up)
  // если уже латиница/цифра — возвращаем как есть
  return up
}

// Госномер (base): только цифры и буквы из RU_PLATE_LETTERS_LAT (после маппинга разрешённой кириллицы).
// Храним базовую часть отдельно от региона (6 символов: A123BC).
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
    if (isDigit) {
      out += x
      continue
    }
    if (isUpper && RU_PLATE_LETTER_SET.has(x)) out += x
  }
  return out
}

const VIN_VALUE_BY_LETTER = {
  A: 1,
  B: 2,
  C: 3,
  D: 4,
  E: 5,
  F: 6,
  G: 7,
  H: 8,
  J: 1,
  K: 2,
  L: 3,
  M: 4,
  N: 5,
  P: 7,
  R: 9,
  S: 2,
  T: 3,
  U: 4,
  V: 5,
  W: 6,
  X: 7,
  Y: 8,
  Z: 9,
}
const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2]

/** Контрольный знак VIN (ISO 3779 / NHTSA): позиция 9, веса по 17 позициям. */
export function vinCheckDigitValid(normalized17) {
  const v = String(normalized17 || '').toUpperCase()
  if (v.length !== 17) return false
  let sum = 0
  for (let i = 0; i < 17; i++) {
    const c = v[i]
    let n
    if (c >= '0' && c <= '9') n = c.charCodeAt(0) - 48
    else n = VIN_VALUE_BY_LETTER[c]
    if (n == null) return false
    sum += n * VIN_WEIGHTS[i]
  }
  const mod = sum % 11
  const expected = mod === 10 ? 'X' : String(mod)
  return v[8] === expected
}

/** null — ок (пустой VIN допустим). Иначе текст ошибки для пользователя. */
export function describeVinValidationError(normalizedVin) {
  const vin = normVin(normalizedVin)
  if (!vin) return null
  if (vin.length !== 17) {
    return 'VIN — ровно 17 символов латиницы и цифр (без I, O, Q) либо оставьте поле пустым.'
  }
  if (!vinCheckDigitValid(vin)) {
    return '9-й символ VIN — контрольный: он не совпадает с расчётом по стандарту. Проверьте опечатки. Буквы I, O, Q в VIN не используются.'
  }
  return null
}

/** Пустой номер допустим; иначе нужны база и регион в формате РФ (легковой). */
export function describeRuPlateValidationError(plateRaw, plateRegionRaw) {
  const b = normPlateBase(plateRaw)
  const r = normPlateRegion(plateRegionRaw)
  if (!b && !r) return null
  if (!b || !r) {
    return 'Укажите основную часть номера и код региона (2–3 цифры) либо оставьте госномер пустым.'
  }
  if (!/^[ABEKMHOPCTYX]\d{3}[ABEKMHOPCTYX]{2}$/.test(b)) {
    return 'Формат как у легкового номера РФ: буква из набора А В Е К М Н О Р С Т У Х, три цифры, две буквы из того же набора. Другие латинские буквы на таких номерах не используются.'
  }
  if (r.length < 2 || r.length > 3) {
    return 'Код региона — 2 или 3 цифры (как на табличке справа).'
  }
  return null
}

function normPlateStringForParse(raw) {
  const s = String(raw || '')
  let out = ''
  for (const ch of s) {
    const x = plateToLatinUpper(ch)
    const code = x.charCodeAt(0)
    if (code >= 48 && code <= 57) {
      out += x
      continue
    }
    if (code >= 65 && code <= 90 && RU_PLATE_LETTER_SET.has(x)) out += x
  }
  return out
}

const PLATE_BASE_RE = /^[ABEKMHOPCTYX]\d{3}[ABEKMHOPCTYX]{2}$/

// Регион: 2–3 цифры; при вводе допускаем 1–3 символа
export function normPlateRegion(raw, { maxLen = 3 } = {}) {
  return normDigits(raw, { maxLen, max: 999 })
}

// Парсим ввод вроде "A777AA77" -> { plate: "A777AA", plateRegion: "77" }
export function parsePlateFull(raw) {
  const cleaned = normPlateStringForParse(raw)
  if (cleaned.length >= 9) {
    const r3 = cleaned.slice(-3)
    const b3 = cleaned.slice(0, -3)
    if (/^\d{3}$/.test(r3) && b3.length === 6 && PLATE_BASE_RE.test(b3)) {
      return { plate: b3, plateRegion: normPlateRegion(r3, { maxLen: 3 }) }
    }
  }
  if (cleaned.length >= 8) {
    const r2 = cleaned.slice(-2)
    const b2 = cleaned.slice(0, -2)
    if (/^\d{2}$/.test(r2) && b2.length === 6 && PLATE_BASE_RE.test(b2)) {
      return { plate: b2, plateRegion: normPlateRegion(r2, { maxLen: 3 }) }
    }
  }
  return { plate: normPlateBase(raw, { maxLen: 6 }), plateRegion: '' }
}

export function fmtPlateFull(plate, plateRegion) {
  const b = normPlateBase(plate, { maxLen: 6 })
  const r = normPlateRegion(plateRegion, { maxLen: 3 })
  return r ? `${b}${r}` : b
}

/** Кириллица (и часть укр. букв) → латиница для slug в URL. */
const CYR_TO_LATIN_SLUG = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'c',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  і: 'i',
  ї: 'yi',
  є: 'e',
  ґ: 'g',
}

export function translitCyrillicForSlug(raw) {
  let out = ''
  for (const ch of String(raw)) {
    const low = ch.toLocaleLowerCase('ru-RU')
    const rep = CYR_TO_LATIN_SLUG[low]
    if (rep !== undefined) out += rep
    else out += ch
  }
  return out
}

/** Ввод адреса гаража: транслит + только a-z, 0-9, дефис (как в репозитории). */
export function normalizeGarageSlugInput(raw) {
  const s = translitCyrillicForSlug(raw)
  return String(s || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40)
}

/** Публичная страница на улице: не показываем полный VIN. */
export function fmtVinPublic(vin) {
  const v = normVin(vin)
  if (!v) return '—'
  if (v.length <= 6) return '••••••'
  return `${v.slice(0, 4)}…${v.slice(-3)}`
}

/**
 * Поле ввода телефона РФ: всегда префикс +7, после него до 10 цифр (как у 9XXXXXXXXX).
 * Ввод 8XXXXXXXXXX или с лидирующей 7 нормализуется. Только «+» без цифр или пусто — пустая строка.
 */
export function formatPhoneRuInput(raw) {
  const dAll = String(raw ?? '').replace(/\D/g, '')
  if (!dAll) return ''
  let d = dAll
  if (d.startsWith('8')) d = `7${d.slice(1)}`
  if (d.startsWith('7')) d = d.slice(1)
  d = d.slice(0, 10)
  return `+7${d}`
}

/** Публичная страница на улице: не показываем полный номер. */
export function fmtPlatePublic(plate, plateRegion) {
  const full = fmtPlateFull(plate, plateRegion)
  if (!full) return '—'
  if (full.length <= 3) return '•••'
  return `${full.slice(0, 2)}•••${full.slice(-2)}`
}

/** Сайт и строки соцсетей: только http/https. */
export function normalizeHttpUrl(raw) {
  const t = String(raw ?? '').trim()
  if (!t) return ''
  let u = t
  if (!/^https?:\/\//i.test(u)) {
    if (/^\/\//.test(u)) u = `https:${u}`
    else u = `https://${u}`
  }
  try {
    const parsed = new URL(u)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return ''
    return parsed.href
  } catch {
    return ''
  }
}

export function parseGarageSocialLines(raw) {
  return String(raw ?? '')
    .split(/\r?\n/)
    .map((x) => x.trim())
    .filter(Boolean)
}

/** Одна ссылка для поля в настройках гаража (остальные строки при сохранении отбрасываются). */
export function firstGarageSocialLine(raw) {
  const [first] = parseGarageSocialLines(raw)
  return first || ''
}

/**
 * Флаги публичности «улицы» владельца: `Boolean("false")` в JS даёт true — явный разбор.
 */
export function ownerPublicFlagTrue(value) {
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase()
    if (s === 'true' || s === '1' || s === 'yes') return true
    if (s === 'false' || s === '0' || s === 'no' || s === '') return false
  }
  return false
}

/** Город на публичной улице: если поля не было — считаем включённым (миграция со старых данных). */
export function ownerCityPublicFlag(value) {
  if (value == null) return true
  return ownerPublicFlagTrue(value)
}

