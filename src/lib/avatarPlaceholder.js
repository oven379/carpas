/** Первая «значимая» буква или цифра слова; иначе пусто. */
function firstSymbol(word) {
  const w = String(word || '')
  const letter = w.match(/[A-Za-zА-Яа-яЁё]/)
  if (letter) return letter[0].toUpperCase()
  const digit = w.match(/\d/)
  return digit ? digit[0] : ''
}

/** Инициалы из произвольной строки: два слова — две буквы, одно слово — одна. */
function initialsFromText(raw) {
  const words = String(raw || '')
    .split(/[\s\-_.]+/)
    .map(firstSymbol)
    .filter(Boolean)
  return words.slice(0, 2).join('')
}

/** Инициалы из локальной части email (до @), одна буква; иначе пусто. */
function initialsFromEmail(raw) {
  const e = String(raw || '').trim()
  if (!e) return ''
  const local = e.includes('@') ? e.split('@')[0] : e
  return firstSymbol(local)
}

/**
 * Плейсхолдер аватара: инициалы имени (название сервиса), при отсутствии — буква из email.
 * @param {string} [email]
 * @param {string} [fallback] имя или название сервиса
 */
export function avatarPlaceholderLetter(email, fallback = '') {
  return initialsFromText(fallback) || initialsFromEmail(email) || '?'
}

/** Пары «фон / текст» для тёмной темы; цвет выбирается по имени и не меняется между заходами. */
export const AVATAR_PLACEHOLDER_COLORS = [
  { bg: '#2f4f3f', fg: '#bfe6cf' },
  { bg: '#3d3a5c', fg: '#cfcaf2' },
  { bg: '#5c3a3a', fg: '#f2cccc' },
  { bg: '#2f4a5c', fg: '#c3e0f2' },
  { bg: '#5c4a2a', fg: '#f2dfb8' },
  { bg: '#4a2f5c', fg: '#e4c8f2' },
  { bg: '#2f5c57', fg: '#bff0ea' },
  { bg: '#5c2f4a', fg: '#f2c8de' },
]

/** Цвет плейсхолдера по имени (иначе по email): одинаковый вход — одинаковый цвет. */
export function avatarPlaceholderColors(email, fallback = '') {
  const seed = (String(fallback || '').trim() || String(email || '').trim()).toLowerCase()
  if (!seed) return AVATAR_PLACEHOLDER_COLORS[0]
  let h = 5381
  for (let i = 0; i < seed.length; i += 1) h = (h * 33 + seed.charCodeAt(i)) >>> 0
  return AVATAR_PLACEHOLDER_COLORS[h % AVATAR_PLACEHOLDER_COLORS.length]
}
