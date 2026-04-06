function joinUrl(base, path) {
  const b = String(base || '').replace(/\/+$/, '')
  const p = String(path || '').replace(/^\/+/, '')
  return `${b}/${p}`
}

export class HttpError extends Error {
  constructor(message, { status, body } = {}) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.body = body
  }
}

const SLUG_TAKEN_HINT = 'Этот адрес страницы уже занят. Укажите другой.'

function networkFailureUserHint(rawLower) {
  return (
    rawLower.includes('failed to fetch') ||
    rawLower.includes('load failed') ||
    rawLower.includes('networkerror') ||
    rawLower.includes('ecconnrefused') ||
    rawLower.includes('err_connection_refused') ||
    rawLower.includes('connection refused')
  )
}

/** В dev Vite проксирует /api → :8088; без Docker пользователь видит ERR_CONNECTION_REFUSED в консоли. */
function devApiReachabilityHint() {
  try {
    return typeof import.meta !== 'undefined' && import.meta.env?.DEV
      ? ' Локально: запустите бэкенд — в корне проекта: docker compose up (API через nginx на порту 8088).'
      : ''
  } catch {
    return ''
  }
}

/** Сообщение для alert/toast при сетевых и серверных ошибках (формы и т.п.). */
export function formatHttpErrorMessage(err, fallback = 'Операция не выполнена.') {
  if (err instanceof HttpError) {
    // Сначала сеть (status 0): иначе «Failed to fetch» из body.message уходит в общий return и показывается сырой текст
    if (err.status === 0) {
      if (err.message && !String(err.message).startsWith('network:')) {
        return err.message
      }
      const b = err.body
      const raw = b && typeof b === 'object' && typeof b.message === 'string' ? b.message : ''
      const m = raw.toLowerCase()
      if (networkFailureUserHint(m)) {
        return `Не удалось связаться с сервером API. Проверьте интернет.${devApiReachabilityHint()}`
      }
      if (raw && !networkFailureUserHint(m)) return raw.slice(0, 400)
      return `Нет связи с сервером.${devApiReachabilityHint()}`
    }

    // До разбора body.message: Laravel отдаёт 401 с текстом «Unauthenticated.» — показываем по-русски
    if (err.status === 401) return 'Сессия истекла или вы не вошли. Войдите снова с той же ролью (владелец или партнёр).'
    if (err.status === 403) return 'Нет доступа к этой операции.'

    const b = err.body
    if (b && typeof b === 'object') {
      const top = typeof b.message === 'string' ? b.message.trim() : ''
      if (top && top !== 'The given data was invalid.') return top
      const errs = b.errors
      if (errs && typeof errs === 'object') {
        const collected = []
        for (const key of Object.keys(errs)) {
          const v = errs[key]
          if (Array.isArray(v) && v[0]) {
            const s = String(v[0])
            collected.push(s === 'slug_taken' ? SLUG_TAKEN_HINT : s)
          } else if (typeof v === 'string' && v) {
            collected.push(v === 'slug_taken' ? SLUG_TAKEN_HINT : v)
          }
        }
        if (collected.length) return collected.join('\n')
      }
      if (top && top !== 'The given data was invalid.') return top
      if (top) return top
    }
    if (typeof b === 'string' && b.trim()) return b.trim().slice(0, 500)
    if (err.status === 413) return 'Файл слишком большой (например, фото). Уменьшите размер и попробуйте снова.'
    if (err.status === 422) return 'Проверьте данные в форме.'
    if (err.status >= 500) return 'Сервис временно недоступен. Попробуйте позже.'
    return fallback
  }
  if (err instanceof Error && err.message) {
    const m = err.message.toLowerCase()
    if (
      m.includes('failed to fetch') ||
      m.includes('networkerror') ||
      m.includes('load failed') ||
      m.includes('connection refused')
    ) {
      return `Не удалось связаться с сервером API. Проверьте интернет.${devApiReachabilityHint()}`
    }
    return fallback
  }
  return fallback
}

export async function httpJson({ baseUrl, path, method = 'GET', body, token }) {
  const url = joinUrl(baseUrl, path)
  let bodyStr
  try {
    bodyStr = body == null ? undefined : JSON.stringify(body)
  } catch {
    throw new HttpError('Данные слишком объёмные. Попробуйте уменьшить фото или количество вложений.', {
      status: 0,
      body: null,
    })
  }

  let res
  let text
  try {
    res = await fetch(url, {
      method,
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: bodyStr,
    })
    text = await res.text()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    throw new HttpError(`network: ${msg}`, { status: 0, body: { message: msg } })
  }

  const parsed = text ? safeJson(text) : null

  if (!res.ok) {
    throw new HttpError(`HTTP ${res.status}`, { status: res.status, body: parsed ?? text })
  }

  return parsed
}

function safeJson(text) {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

