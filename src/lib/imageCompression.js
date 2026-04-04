export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('read_failed'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(file)
  })
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error || new Error('blob_read_failed'))
    reader.onload = () => resolve(String(reader.result || ''))
    reader.readAsDataURL(blob)
  })
}

async function renderToBlob(img, { maxW, maxH, quality, mime }) {
  const w = img.naturalWidth || 0
  const h = img.naturalHeight || 0
  if (!w || !h) return null

  const scale = Math.min(1, maxW / w, maxH / h)
  const outW = Math.max(1, Math.round(w * scale))
  const outH = Math.max(1, Math.round(h * scale))

  const canvas = document.createElement('canvas')
  canvas.width = outW
  canvas.height = outH
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.drawImage(img, 0, 0, outW, outH)

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, mime, quality))
  return blob || null
}

export async function compressImageDataUrl(
  dataUrl,
  { maxW = 1200, maxH = 800, quality = 0.78, mime = 'image/jpeg', maxBytes = null } = {},
) {
  const img = new Image()
  img.decoding = 'async'
  img.src = dataUrl
  await new Promise((resolve, reject) => {
    img.onload = () => resolve()
    img.onerror = () => reject(new Error('img_load_failed'))
  })

  // Если лимит по размеру не задан — один проход.
  if (!maxBytes) {
    const blob = await renderToBlob(img, { maxW, maxH, quality, mime })
    if (!blob) return dataUrl
    return await blobToDataUrl(blob)
  }

  // Пытаемся уложиться в maxBytes: уменьшаем качество, затем — размеры.
  let q = Math.min(0.92, Math.max(0.4, quality))
  let wLim = maxW
  let hLim = maxH

  for (let attempt = 0; attempt < 12; attempt++) {
    const blob = await renderToBlob(img, { maxW: wLim, maxH: hLim, quality: q, mime })
    if (!blob) return dataUrl
    if (blob.size <= maxBytes) return await blobToDataUrl(blob)

    if (q > 0.55) {
      q = Math.max(0.4, q * 0.85)
      continue
    }

    // уже низкое качество — уменьшаем размеры и пробуем снова
    wLim = Math.max(320, Math.round(wLim * 0.85))
    hLim = Math.max(320, Math.round(hLim * 0.85))
    q = Math.min(0.78, q + 0.08) // немного поднимаем качество после уменьшения размеров
  }

  // Если совсем не удалось — вернём последнюю попытку (пользователь всё равно увидит фото).
  const last = await renderToBlob(img, { maxW: wLim, maxH: hLim, quality: q, mime })
  if (!last) return dataUrl
  return await blobToDataUrl(last)
}

function inferOutputMime(file, explicitMime) {
  if (explicitMime != null && String(explicitMime).trim() !== '') return explicitMime
  const t = String(file?.type || '').toLowerCase()
  if (t === 'image/png' || t === 'image/webp') return t
  return 'image/jpeg'
}

export async function compressImageFile(file, opts = {}) {
  const { mime: explicitMime, ...rest } = opts
  const raw = await fileToDataUrl(file)
  const mime = inferOutputMime(file, explicitMime)
  return await compressImageDataUrl(raw, { ...rest, mime })
}

