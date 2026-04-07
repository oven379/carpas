/**
 * Текст набран в EN (QWERTY), а пользователь думал, что включена русская раскладка:
 * каждая латинская буква заменяется на символ с той же физической клавиши (ЙЦУКЕН).
 * Цифры, кириллица, пробелы и прочие символы не меняются.
 */

const LOWER = {
  q: 'й',
  w: 'ц',
  e: 'у',
  r: 'к',
  t: 'е',
  y: 'н',
  u: 'г',
  i: 'ш',
  o: 'щ',
  p: 'з',
  '[': 'х',
  ']': 'ъ',
  a: 'ф',
  s: 'ы',
  d: 'в',
  f: 'а',
  g: 'п',
  h: 'р',
  j: 'о',
  k: 'л',
  l: 'д',
  ';': 'ж',
  "'": 'э',
  '`': 'ё',
  '~': 'Ё',
  z: 'я',
  x: 'ч',
  c: 'с',
  v: 'м',
  b: 'и',
  n: 'т',
  m: 'ь',
  ',': 'б',
  '.': 'ю',
  '/': '.',
}

const UPPER = {}
for (const [k, v] of Object.entries(LOWER)) {
  if (k.length === 1 && /[a-z]/.test(k)) {
    UPPER[k.toUpperCase()] = v.toUpperCase()
  }
}

/** Частые английские слова — не конвертируем целиком (намеренный английский). */
const SKIP_LATIN_WORDS = new Set(
  [
    'the',
    'and',
    'for',
    'not',
    'you',
    'all',
    'can',
    'her',
    'was',
    'one',
    'our',
    'out',
    'day',
    'get',
    'has',
    'him',
    'his',
    'how',
    'its',
    'may',
    'new',
    'now',
    'old',
    'see',
    'two',
    'way',
    'who',
    'boy',
    'did',
    'let',
    'put',
    'say',
    'she',
    'too',
    'use',
    'hello',
    'world',
    'yes',
    'no',
    'ok',
    'okay',
    'test',
    'api',
    'id',
    'vin',
    'bmw',
    'audi',
    'www',
    'http',
    'https',
    'null',
    'true',
    'false',
    'error',
    'from',
    'with',
    'this',
    'that',
    'have',
    'your',
    'more',
    'some',
    'what',
    'when',
    'will',
    'just',
    'than',
    'then',
    'them',
    'very',
    'also',
    'only',
    'over',
    'such',
    'here',
    'each',
    'made',
    'most',
    'name',
    'both',
    'help',
    'make',
    'like',
    'into',
    'time',
    'year',
    'work',
    'well',
    'even',
    'back',
    'call',
    'came',
    'come',
    'could',
    'first',
    'good',
    'know',
    'last',
    'left',
    'life',
    'little',
    'long',
    'look',
    'much',
    'must',
    'need',
    'next',
    'open',
    'part',
    'read',
    'real',
    'right',
    'same',
    'seem',
    'show',
    'still',
    'take',
    'tell',
    'than',
    'their',
    'there',
    'these',
    'think',
    'three',
    'under',
    'until',
    'want',
    'week',
    'where',
    'which',
    'while',
    'would',
    'write',
  ].map((w) => w.toLowerCase()),
)

function mapLatinChar(ch) {
  if (LOWER[ch] !== undefined) return LOWER[ch]
  if (UPPER[ch] !== undefined) return UPPER[ch]
  return null
}

/** Построчное преобразование всех латинских букв и связанных символов раскладки. */
export function fixQwertyLayoutToRussianChars(str) {
  if (str == null || str === '') return str
  let out = ''
  for (const ch of String(str)) {
    const m = mapLatinChar(ch)
    out += m != null ? m : ch
  }
  return out
}

/**
 * Для свободного текста (комментарии, описания): конвертировать только «слова» из латиницы,
 * если в строке ещё нет кириллицы; не трогать URL, @, домены, токены с цифрами, короткие ALL CAPS.
 */
export function maybeFixRussianFreeTextLayout(raw) {
  const s = String(raw ?? '')
  if (!s) return s
  if (/[а-яёА-ЯЁ]/u.test(s)) return s
  if (/https?:\/\//i.test(s) || /ftp:\/\//i.test(s)) return s
  if (/@/.test(s)) return s
  if (/\b[a-z0-9][a-z0-9-]*\.(com|ru|org|net|io|app|dev)\b/i.test(s)) return s

  const partRe = /[A-Za-z]+|[^A-Za-z]+/g
  let out = ''
  let m
  while ((m = partRe.exec(s)) !== null) {
    const p = m[0]
    if (!/^[A-Za-z]+$/.test(p)) {
      out += p
      continue
    }
    const lower = p.toLowerCase()
    if (SKIP_LATIN_WORDS.has(lower)) {
      out += p
      continue
    }
    if (/^[A-ZА-ЯЁ]{2,8}$/.test(p) && p === p.toUpperCase()) {
      out += p
      continue
    }
    out += fixQwertyLayoutToRussianChars(p)
  }
  return out
}

/**
 * Обработчик onBlur для контролируемых полей: подставляет исправленное значение через колбэк.
 * @param {(next: string) => void} apply — например setState с обрезкой по maxLength
 */
export function createBlurFixRuFreeText(apply) {
  return (e) => {
    const raw = e.target.value
    const next = maybeFixRussianFreeTextLayout(raw)
    if (next !== raw) apply(next)
  }
}
