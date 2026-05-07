function joinUrl(base, path) {
  const b = String(base || '').replace(/\/+$/, '')
  const p = String(path || '').replace(/^\/+/, '')
  return `${b}/${p}`
}

/** Чтобы зависший бэкенд не держал вкладку вечным ожиданием (типично 300+ с без таймаута у fetch). */
function fetchTimeoutSignal(ms = 45000) {
  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
    return AbortSignal.timeout(ms)
  }
  return undefined
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
    rawLower.includes('econnrefused') ||
    rawLower.includes('err_connection_refused') ||
    rawLower.includes('connection refused')
  )
}

/** Сообщение для alert/toast при ошибках запросов. */
export function formatHttpErrorMessage(err, fallback = 'Ошибка') {
  if (err instanceof HttpError) {
    if (err.status === 0) {
      if (err.message && !String(err.message).startsWith('network:')) {
        return err.message
      }
      const b = err.body
      const raw = b && typeof b === 'object' && typeof b.message === 'string' ? b.message : ''
      const m = raw.toLowerCase()
      if (networkFailureUserHint(m)) {
        return 'Ошибка'
      }
      if (raw && !networkFailureUserHint(m)) return raw.slice(0, 400)
      return 'Ошибка'
    }

    if (err.status === 401) return 'Ошибка'
    if (err.status === 403) return 'Ошибка'

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
    if (err.status === 413) return 'Ошибка'
    if (err.status === 422) return 'Ошибка'
    if (err.status >= 500) return 'Ошибка'
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
      return 'Ошибка'
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
    throw new HttpError('Ошибка', {
      status: 0,
      body: null,
    })
  }

  let res
  let text
  try {
    const signal = fetchTimeoutSignal(45000)
    res = await fetch(url, {
      method,
      cache: 'no-store',
      ...(signal ? { signal } : {}),
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

/** multipart/form-data (вложения); не задавать Content-Type — браузер поставит boundary */
export async function httpFormData({ baseUrl, path, method = 'POST', formData, token }) {
  const url = joinUrl(baseUrl, path)
  let res
  let text
  try {
    const signal = fetchTimeoutSignal(120000)
    res = await fetch(url, {
      method,
      cache: 'no-store',
      ...(signal ? { signal } : {}),
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
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

