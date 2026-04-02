/**
 * Выполняет синхронный вызов через замыкание, чтобы методы repo сохранили `this`.
 * Игнорируем Promise (режим real) и исключения — иначе ломается вся шапка / экран.
 */
export function safeSyncRepo(run) {
  try {
    if (typeof run !== 'function') return { ok: false }
    const v = run()
    if (v != null && typeof v.then === 'function') return { ok: false, asyncResult: true }
    return { ok: true, value: v }
  } catch (err) {
    console.warn('[КарПас] repo call failed', err)
    return { ok: false, error: err }
  }
}
