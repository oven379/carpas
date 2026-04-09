/** Заголовок визита в истории: лимит символов (пробелы учитываются). Менять только здесь. */
export const VISIT_TITLE_MAX_LEN = 40

/** Свободный комментарий к визиту (что обслуживали). */
export const VISIT_NOTE_MAX_LEN = 2000

/** Текст «совета себе» в настройках гаража (подсказка при самостоятельной записи визита). */
export const GARAGE_VISIT_SELF_ADVICE_MAX_LEN = 2000

/**
 * @deprecated Старый лимит одной строки «Важно»/«Совет N». Используйте VISIT_CARE_ADVICE_MAX_LEN.
 */
export const VISIT_CARE_TIP_MAX_LEN = 120

/** Единый текст совета детейлинга для владельца (форма визита и карточка авто). */
export const VISIT_CARE_ADVICE_MAX_LEN = 2000

/** Режим работы детейлинга/СТО (публичная страница на улице и кабинет). */
export const DETAILING_WORKING_HOURS_MAX_LEN = 200

/**
 * Своя услуга в настройках лендинга: короткое название для чипов и списков.
 * Оптимально 40–56 символов; 50 — баланс между информативностью и читаемостью на мобилке.
 */
export const DETAILING_CUSTOM_OFFER_INPUT_MAX_LEN = 50

/** Подпись в пустых зонах выбора изображения (баннер, аватар, обложка карточки). */
export const IMAGE_UPLOAD_EMPTY_CTA = 'Нажмите для загрузки'

/** Горизонтальная ориентация снимков (обложка, визит, баннер и т.д.). */
export const PHOTO_UPLOAD_LANDSCAPE_LINE =
  'Делайте снимок в горизонтальной (альбомной) ориентации — так лучше смотрится в карточке и галереях.'

/** Госномер на кадре с автомобилем. */
export const PHOTO_UPLOAD_NO_PLATE_IMPORTANT_LINE =
  'Важно: если в кадре автомобиль, на снимке не должно быть читаемого регистрационного номера (госномера).'

/** Два правила одним абзацем — под зоны загрузки фото. */
export const PHOTO_UPLOAD_HINTS_PARAGRAPH = `${PHOTO_UPLOAD_LANDSCAPE_LINE} ${PHOTO_UPLOAD_NO_PLATE_IMPORTANT_LINE}`

/** Для короткой подписи в пустой миниатюре (рядом с полным текстом снизу). */
export const PHOTO_UPLOAD_EMPTY_THUMB_HINT = 'Альбомная съёмка · без госномера в кадре'

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
  return new Intl.NumberFormat('ru-RU', {
    maximumFractionDigits: 0,
    useGrouping: true,
  })
    .format(Math.round(v))
    .replace(/\u202f|\u00a0/g, ' ')
}

export function fmtKm(n) {
  return `${fmtInt(n)} км`
}

export function fmtUsd(n) {
  return `${fmtInt(n)} $`
}

export function fmtRub(n) {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0, useGrouping: true }).format(Math.round(v)).replace(/\u202f|\u00a0/g, ' ')} ₽`
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

// VIN: 17 символов, латиница A–Z и цифры (как в международной записи идентификатора).
// Нормализуем ввод: верхний регистр, убираем пробелы/дефисы/прочие символы, ограничиваем длину.
// Контрольная цифра на 9-й позиции (NHTSA) не проверяем — в разных юрисдикциях правила расходятся.
export function normVin(raw, { maxLen = 17 } = {}) {
  const s = String(raw || '')
  if (!s) return ''
  let out = ''
  for (const ch of s.toUpperCase()) {
    if (out.length >= maxLen) break
    if (ch === ' ' || ch === '-' || ch === '_' || ch === '\n' || ch === '\t' || ch === '\r') continue
    const code = ch.charCodeAt(0)
    const isDigit = code >= 48 && code <= 57
    const isUpper = code >= 65 && code <= 90
    if (!isDigit && !isUpper) continue
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

/** Латиница → кириллица для тех же букв ГОСТ (как на российской табличке). */
export const PLATE_MAP_LAT_TO_CYR = new Map(
  [...PLATE_MAP_CYR_TO_LAT.entries()].map(([cyr, lat]) => [lat, cyr]),
)

/** Латинские буквы, допустимые на российских госномерах (как на табличке: АВЕКМНОРСТУХ). */
export const RU_PLATE_LETTERS_LAT = 'ABEKMHOPCTYX'
const RU_PLATE_LETTER_SET = new Set(RU_PLATE_LETTERS_LAT.split(''))

/** Пример: основная часть слева, регион справа (как на белой табличке). */
export const RU_PLATE_LAYOUT_DIAGRAM = '  А123ВС   +   77\n  основная часть   регион'

/** Общий текст справки для поля города (CityComboBox, DaData). */
export const CITY_FIELD_DD_HINT =
  'Подсказки городов — через DaData (нужен ключ VITE_DADATA_TOKEN в окружении фронта). Можно ввести название вручную.'

export const RU_PLATE_HINT_PARAGRAPHS = [
  'Легковой номер РФ: первое поле — шесть знаков подряд (буква, три цифры, две буквы), как слева на табличке; второе — код региона, 2–3 цифры.',
  'Буквы только из набора ГОСТ: А, В, Е, К, М, Н, О, Р, С, Т, У, Х (кириллица). Для удобства также принимаются те же буквы латиницей (A, B, E, K, M, H, O, P, C, T, Y, X). Остальные символы из ввода убираются. Номер можно не указывать.',
  'Поля принимают символы по порядку: символ, неподходящий к текущей позиции, не попадает в поле.',
]

function normalizePlateCyrillicForGost(u) {
  return u === 'Ё' ? 'Е' : u
}

function plateCharToLatinUpper(ch) {
  let u = String(ch || '').toLocaleUpperCase('ru-RU')
  u = normalizePlateCyrillicForGost(u)
  if (!u) return ''
  if (PLATE_MAP_CYR_TO_LAT.has(u)) return PLATE_MAP_CYR_TO_LAT.get(u)
  if (u.length === 1 && u >= '0' && u <= '9') return u
  if (u.length === 1 && u >= 'A' && u <= 'Z' && RU_PLATE_LETTER_SET.has(u)) return u
  return ''
}

/** Одна буква ГОСТ для поля основной части: кириллица как на табличке (латиница → кириллица). */
function plateBaseUiLetterFromChar(ch) {
  let u = String(ch).toLocaleUpperCase('ru-RU')
  u = normalizePlateCyrillicForGost(u)
  if (PLATE_MAP_CYR_TO_LAT.has(u)) return u
  if (u.length === 1 && u >= 'A' && u <= 'Z' && RU_PLATE_LETTER_SET.has(u)) {
    return PLATE_MAP_LAT_TO_CYR.get(u) || ''
  }
  return ''
}

/**
 * Поле ввода основной части: строго буква → три цифры → две буквы (АВЕКМНОРСТУХ).
 * Латинские «близнецы» превращаются в кириллицу. Неверный для позиции символ отбрасывается.
 */
export function normPlateBaseUi(raw, { maxLen = 6 } = {}) {
  const s = String(raw || '')
  if (!s) return ''
  let out = ''
  for (const ch of s) {
    if (out.length >= maxLen) break
    const pos = out.length
    if (pos === 0 || pos === 4 || pos === 5) {
      const cyr = plateBaseUiLetterFromChar(ch)
      if (cyr) out += cyr
    } else if (ch >= '0' && ch <= '9') {
      out += ch
    }
  }
  return out
}

// Госномер (base) для API и БД: латиница ABEKMHOPCTYX + цифры, 6 символов (A123BC).
export function normPlateBase(raw, { maxLen = 6 } = {}) {
  const s = String(raw || '')
  if (!s) return ''
  let out = ''
  for (const ch of s) {
    if (out.length >= maxLen) break
    const lat = plateCharToLatinUpper(ch)
    if (!lat) continue
    if (lat >= '0' && lat <= '9') {
      out += lat
      continue
    }
    if (lat >= 'A' && lat <= 'Z' && RU_PLATE_LETTER_SET.has(lat)) out += lat
  }
  return out
}

/** Отображение сохранённой латинской базы кириллицей (как на номере РФ). */
export function plateLatinBaseToCyrillicDisplay(latinPlate) {
  const b = normPlateBase(latinPlate, { maxLen: 6 })
  let out = ''
  for (const ch of b) {
    if (ch >= '0' && ch <= '9') out += ch
    else out += PLATE_MAP_LAT_TO_CYR.get(ch) || ch
  }
  return out
}

/** null — ок (пустой VIN допустим). Иначе текст ошибки для пользователя. */
export function describeVinValidationError(normalizedVin) {
  const vin = normVin(normalizedVin)
  if (!vin) return null
  if (vin.length !== 17) {
    return 'VIN — ровно 17 символов латиницы (A–Z) и цифр либо оставьте поле пустым.'
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
    return 'Первая часть: буква из АВЕКМНОРСТУХ, три цифры, две буквы (например А777АА). Регион — во втором поле.'
  }
  if (r.length < 2 || r.length > 3) {
    return 'Регион — 2 или 3 цифры.'
  }
  return null
}

function normPlateStringForParse(raw) {
  const s = String(raw || '')
  let out = ''
  for (const ch of s) {
    const x = plateCharToLatinUpper(ch)
    if (!x) continue
    if (x >= '0' && x <= '9') {
      out += x
      continue
    }
    if (x >= 'A' && x <= 'Z' && RU_PLATE_LETTER_SET.has(x)) out += x
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
  const bShow = plateLatinBaseToCyrillicDisplay(b)
  return r ? `${bShow}${r}` : bShow
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

/** До 10 цифр национальной части (без кода страны), с нормализацией 8/7. */
export function getPhoneRuNationalDigits(raw) {
  const digitsOnly = String(raw ?? '').replace(/\D/g, '')
  if (!digitsOnly) return ''
  let d = digitsOnly
  if (d.startsWith('8')) d = `7${d.slice(1)}`
  if (d.startsWith('7')) d = d.slice(1)
  return d.slice(0, 10)
}

/** Отображение национальной части: «999 999 00 00» (3‑3‑2‑2), привычный вид мобильного номера РФ. */
export function formatPhoneRuNationalDisplay(digits) {
  const d = String(digits || '').replace(/\D/g, '').slice(0, 10)
  if (!d) return ''
  const p0 = d.slice(0, 3)
  const p1 = d.slice(3, 6)
  const p2 = d.slice(6, 8)
  const p3 = d.slice(8, 10)
  const parts = [p0]
  if (p1) parts.push(p1)
  if (p2) parts.push(p2)
  if (p3) parts.push(p3)
  return parts.join(' ')
}

/**
 * Поле ввода телефона РФ: префикс +7, далее до 10 цифр в маске «+7 999 999 00 00».
 * Ввод 8… или с лидирующей 7 нормализуется. Пусто — пустая строка.
 */
export function formatPhoneRuInput(raw) {
  const d = getPhoneRuNationalDigits(raw)
  if (!d) return ''
  return `+7 ${formatPhoneRuNationalDisplay(d)}`
}

/**
 * Показ и ссылка tel: для РФ: всегда +7 и до 10 цифр после кода страны.
 * tel: только если набрано 10 цифр номера (без учёта ведущей 7).
 */
export function displayRuPhone(raw) {
  const display = formatPhoneRuInput(raw)
  if (!display) return { display: '', telHref: '' }
  const national = display.replace(/^\+7\s*/, '').replace(/\D/g, '')
  if (national.length === 0) return { display: '', telHref: '' }
  const telHref = national.length >= 10 ? `tel:+7${national.slice(0, 10)}` : ''
  return { display, telHref }
}

/** Публичная страница на улице: не показываем полный номер. */
export function fmtPlatePublic(plate, plateRegion) {
  const full = fmtPlateFull(plate, plateRegion)
  if (!full) return '—'
  if (full.length <= 3) return '•••'
  return `${full.slice(0, 2)}•••${full.slice(-2)}`
}

/** Короткая подпись ссылки для карточек (домен + усечённый путь). */
export function shortExternalLinkLabel(href, rawLine = '') {
  const h = String(href || '').trim()
  if (!h) {
    const s = String(rawLine || '').trim()
    return s.length > 44 ? `${s.slice(0, 42)}…` : s
  }
  try {
    const u = new URL(h)
    const host = u.hostname.replace(/^www\./i, '')
    let path = u.pathname + u.search
    if (path === '/' || path === '') return host
    if (path.length > 30) path = `${path.slice(0, 28)}…`
    return `${host}${path}`
  } catch {
    const s = String(rawLine || h).trim()
    return s.length > 44 ? `${s.slice(0, 42)}…` : s
  }
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

