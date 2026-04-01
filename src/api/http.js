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

export async function httpJson({ baseUrl, path, method = 'GET', body, token }) {
  const url = joinUrl(baseUrl, path)
  const res = await fetch(url, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  })

  const text = await res.text()
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

