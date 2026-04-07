/** Рекомендуемая длина сниппета в поиске (в среднем до ~155 символов). */
export const META_DESCRIPTION_MAX = 155

export function truncateMetaDescription(raw, maxLen = META_DESCRIPTION_MAX) {
  const s = String(raw || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (s.length <= maxLen) return s
  const cut = s.slice(0, maxLen - 1)
  const lastSpace = cut.lastIndexOf(' ')
  const base = lastSpace > 40 ? cut.slice(0, lastSpace) : cut
  return `${base.trimEnd()}…`
}
