export function fmtInt(n) {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0
  return new Intl.NumberFormat('ru-RU').format(Math.round(v))
}

export function fmtKm(n) {
  return `${fmtInt(n)} км`
}

export function fmtUsd(n) {
  return `${fmtInt(n)} $`
}

export function fmtRub(n) {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0
  return `${new Intl.NumberFormat('ru-RU').format(Math.round(v))} ₽`
}

export function fmtDateTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
}

