/** @see https://dadata.ru/api/suggest/address/ */
const DADATA_SUGGEST_ADDRESS_URL =
  'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address'

export function getDadataSuggestToken() {
  return String(import.meta.env.VITE_DADATA_TOKEN || '').trim()
}

function suggestionToCityLabel(s) {
  const d = s?.data || {}
  const city = String(d.city || d.settlement || '').trim()
  if (city) return city
  const v = String(s?.value || '').trim()
  if (!v) return ''
  const head = v.split(',')[0].trim()
  return head.replace(/^г\.?\s+/i, '').trim() || head
}

/**
 * Подсказки только по городам РФ (гранулярность city…city).
 * @param {string} query
 * @param {{ signal?: AbortSignal }} [opts]
 * @returns {Promise<string[]>}
 */
export async function fetchDadataCitySuggestions(query, { signal } = {}) {
  const token = getDadataSuggestToken()
  if (!token) return []
  const q = String(query || '').trim()
  if (q.length < 2) return []

  const res = await fetch(DADATA_SUGGEST_ADDRESS_URL, {
    method: 'POST',
    mode: 'cors',
    signal,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Token ${token}`,
    },
    body: JSON.stringify({
      query: q,
      count: 20,
      from_bound: { value: 'city' },
      to_bound: { value: 'city' },
      locations: [{ country_iso_code: 'RU' }],
    }),
  })

  if (!res.ok) return []

  let json
  try {
    json = await res.json()
  } catch {
    return []
  }

  const suggestions = Array.isArray(json.suggestions) ? json.suggestions : []
  const labels = []
  const seen = new Set()
  for (const s of suggestions) {
    const label = suggestionToCityLabel(s)
    const key = label.toLowerCase()
    if (!label || seen.has(key)) continue
    seen.add(key)
    labels.push(label)
  }
  return labels
}
