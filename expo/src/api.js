const API_BASE = String(process.env.EXPO_PUBLIC_API_BASE_URL || '').replace(/\/+$/, '')

export function apiBaseUrl() {
  if (API_BASE) return API_BASE
  return 'http://10.0.2.2:8088/api'
}

async function json(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${apiBaseUrl()}/${String(path).replace(/^\/+/, '')}`, {
    method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body == null ? undefined : JSON.stringify(body),
  })
  const text = await res.text()
  const parsed = text ? JSON.parse(text) : null
  if (!res.ok) {
    const err = new Error(`HTTP ${res.status}`)
    err.status = res.status
    err.body = parsed
    throw err
  }
  return parsed
}

export async function pushSettings() {
  return json('push/settings')
}

export async function registerOwnerPushToken(ownerToken, token) {
  return json('owners/me/device-push-token', {
    method: 'POST',
    token: ownerToken,
    body: { token, platform: 'expo' },
  })
}

export async function registerDetailingPushToken(detailingToken, token) {
  return json('detailings/me/device-push-token', {
    method: 'POST',
    token: detailingToken,
    body: { token, platform: 'expo' },
  })
}
