/** Первая «значимая» буква из произвольной строки (имя, название сервиса). */
function firstLetterFromText(raw) {
  const t = String(raw || '').trim()
  if (!t) return ''
  const letter = t.match(/[A-Za-zА-Яа-яЁё]/)
  if (letter) return letter[0].toUpperCase()
  const digit = t.match(/\d/)
  if (digit) return digit[0]
  return t[0].toUpperCase()
}

/** Буква из локальной части email (до @); иначе пусто. */
function firstLetterFromEmail(raw) {
  const e = String(raw || '').trim()
  if (!e) return ''
  const local = e.includes('@') ? e.split('@')[0].trim() : e
  if (!local) return ''
  return firstLetterFromText(local)
}

/**
 * Плейсхолдер аватара: сначала буква из email, при отсутствии — из fallback (имя и т.д.).
 * @param {string} [email]
 * @param {string} [fallback]
 */
export function avatarPlaceholderLetter(email, fallback = '') {
  const fromMail = firstLetterFromEmail(email)
  if (fromMail) return fromMail
  const fromFb = firstLetterFromText(fallback)
  if (fromFb) return fromFb
  return '?'
}
