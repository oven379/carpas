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
    rawLower.includes('err_connection_refused')
  )
}

/** Сообщение для alert/toast при ошибках API (сохранение форм и т.п.). */
export function formatHttpErrorMessage(err, fallback = 'Запрос не выполнен.') {
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
        return 'Нет связи с API. Запустите backend (docker compose up), затем откройте сайт через npm run dev или npm run preview — запросы идут на /api через прокси Vite. Либо задайте VITE_API_BASE_URL при сборке.'
      }
      if (raw) return `Сеть: ${raw}`.slice(0, 400)
      return 'Нет связи с сервером.'
    }

    const b = err.body
    if (b && typeof b === 'object') {
      const top = typeof b.message === 'string' ? b.message.trim() : ''
      if (top && top !== 'The given data was invalid.') return top
      const errs = b.errors
      if (errs && typeof errs === 'object') {
        for (const key of Object.keys(errs)) {
          const v = errs[key]
          if (Array.isArray(v) && v[0]) {
            const s = String(v[0])
            if (s === 'slug_taken') return SLUG_TAKEN_HINT
            return s
          }
          if (typeof v === 'string' && v) {
            if (v === 'slug_taken') return SLUG_TAKEN_HINT
            return v
          }
        }
      }
      if (top) return top
    }
    if (typeof b === 'string' && b.trim()) return b.trim().slice(0, 500)
    if (err.status === 401) return 'Сессия истекла. Войдите снова.'
    if (err.status === 403) return 'Нет доступа к этой операции.'
    if (err.status === 413) return 'Слишком большой запрос (например, фото). Уменьшите размер файла.'
    if (err.status === 422) return 'Проверьте данные в форме.'
    if (err.status >= 500)
      return 'Ошибка сервера. Если недавно обновляли проект, выполните миграции БД (php artisan migrate).'
    return `${fallback} (код ${err.status}).`
  }
  if (err instanceof Error && err.message) {
    const m = err.message.toLowerCase()
    if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('load failed')) {
      return 'Нет связи с API. Запустите backend и используйте npm run dev (прокси /api).'
    }
    return `${fallback} (${err.message})`.slice(0, 500)
  }
  return fallback
}

export async function httpJson({ baseUrl, path, method = 'GET', body, token }) {
  const url = joinUrl(baseUrl, path)
  let bodyStr
  try {
    bodyStr = body == null ? undefined : JSON.stringify(body)
  } catch {
    throw new HttpError('Не удалось сформировать тело запроса (слишком большие данные?).', {
      status: 0,
      body: null,
    })
  }

  let res
  let text
  try {
    res = await fetch(url, {
      method,
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

