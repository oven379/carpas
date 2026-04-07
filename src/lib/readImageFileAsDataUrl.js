/**
 * Чтение локального файла картинки в data URL для черновика лендинга (localStorage).
 * @param {File} file
 * @param {number} maxBytes
 * @returns {Promise<string>}
 */
export function readImageFileAsDataUrl(file, maxBytes) {
  return new Promise((resolve, reject) => {
    if (!file || typeof file.size !== 'number') {
      reject(new Error('Файл не выбран.'))
      return
    }
    if (file.size > maxBytes) {
      reject(new Error(`Файл больше ${Math.round(maxBytes / 1024)} КБ.`))
      return
    }
    if (!/^image\/(jpeg|png|webp|gif)$/i.test(file.type)) {
      reject(new Error('Нужен формат JPEG, PNG, WebP или GIF.'))
      return
    }
    const r = new FileReader()
    r.onload = () => resolve(String(r.result || ''))
    r.onerror = () => reject(r.error || new Error('Не удалось прочитать файл.'))
    r.readAsDataURL(file)
  })
}
