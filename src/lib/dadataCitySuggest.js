/** @see https://dadata.ru/api/suggest/address/ */
const DADATA_SUGGEST_ADDRESS_URL =
  'https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address'

export function getDadataSuggestToken() {
  return String(import.meta.env.VITE_DADATA_TOKEN || '').trim()
}

/** Типовые префиксы НП в хвосте `value` у DaData (без однобуквенных сокращений — меньше ложных срабатываний). */
const NP_TAIL_RE =
  /^(г|город|пгт|пос\.?|поселок|село|дер\.?|деревня|станица|аул|рп\.?|мкр|мкрн|нп|пст|жилрайон)\.?\s+(.+)$/i

function suggestionToCityLabel(s) {
  const d = s?.data || {}
  let city = String(d.city || d.settlement || '').trim()
  const rtf = String(d.region_type_full || '').toLowerCase()
  if (
    !city &&
    (String(d.region_type || '').toLowerCase() === 'г' || rtf.includes('город'))
  ) {
    city = String(d.region || '').trim()
  }
  if (city) return city

  const raw = String(s?.unrestricted_value || s?.value || '').trim()
  if (!raw) return ''

  const parts = raw.split(',').map((p) => p.trim()).filter(Boolean)
  for (let i = parts.length - 1; i >= 0; i--) {
    const m = parts[i].match(NP_TAIL_RE)
    if (m && String(m[2] || '').trim()) return String(m[2]).trim()
  }
  const head = parts[0] || raw
  return head.replace(/^г\.?\s+/i, '').trim() || head
}

/**
 * Подсказки по городам и НП РФ (гранулярность city…settlement в API адресов).
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
      to_bound: { value: 'settlement' },
      /* Не передаём locations: в связке с гранулярностью city…settlement у части ключей DaData отдаёт пустой список. Оставляем только РФ по полю data.country_iso_code ниже. */
    }),
  })

  const raw = await res.text()
  if (!res.ok) {
    if (import.meta.env.DEV) {
      console.warn('[DaData] suggest/address', res.status, raw.slice(0, 280))
    }
    return []
  }

  let json
  try {
    json = JSON.parse(raw)
  } catch {
    if (import.meta.env.DEV) {
      console.warn('[DaData] suggest/address: невалидный JSON')
    }
    return []
  }

  const suggestions = Array.isArray(json.suggestions) ? json.suggestions : []
  const labels = []
  const seen = new Set()
  for (const s of suggestions) {
    const iso = String(s?.data?.country_iso_code || '').trim().toUpperCase()
    if (iso && iso !== 'RU') continue
    const label = suggestionToCityLabel(s)
    const key = label.toLowerCase()
    if (!label || seen.has(key)) continue
    seen.add(key)
    labels.push(label)
  }
  return labels
}
