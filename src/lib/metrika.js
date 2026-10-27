/**
 * Яндекс.Метрика: хиты и цели в одном месте.
 *
 * Счётчик подключён в index.html с `defer: true` — автоматический хит при загрузке отключён, все просмотры шлёт
 * MetrikaRouteTracker через trackHit. Раньше первый хит уходил до того, как React выставил заголовок страницы,
 * и в отчётах копились «КарПас» / «КарПас — история обслуживания авто» вместо реальных заголовков.
 *
 * Цели нужно создать в интерфейсе Метрики («Цели» → «JavaScript-событие»), идентификатор = значение из GOALS.
 */
export const YM_COUNTER_ID = 113104738

/** Идентификаторы целей (создаются в Метрике с тем же именем). */
export const GOALS = {
  appStoreClick: 'app_store_click', // клик «Скачать в App Store»
  androidApkClick: 'android_apk_click', // клик «Скачать для Android»
  ownerRegister: 'owner_register', // владелец зарегистрировался
  partnerApplySubmit: 'partner_apply_submit', // партнёр отправил заявку
  partnerPhoneClick: 'partner_phone_click', // звонок со страницы партнёра /d/…
  blogCtaOwner: 'blog_cta_owner', // кнопка для владельцев в конце статьи
  blogCtaBusiness: 'blog_cta_business', // кнопка для бизнеса в конце статьи
}

/** Админку не отправляем: это внутренний трафик, он искажает отчёты. */
export function shouldTrackPath(pathname) {
  return !/^\/admin(\/|$)/.test(String(pathname || ''))
}

function ym(...args) {
  try {
    if (typeof window !== 'undefined' && typeof window.ym === 'function') window.ym(YM_COUNTER_ID, ...args)
  } catch {
    /* аналитика не должна ломать сайт */
  }
}

/** Достигнута цель. params — необязательные параметры визита. */
export function reachGoal(goal, params) {
  ym('reachGoal', goal, params)
}

/**
 * Просмотр страницы. Ждём, пока страница обновит document.title (отличится от prevTitle), но не дольше maxWaitMs —
 * у страниц с тем же заголовком (и пререндеренных) он не меняется, их отправляем по таймауту.
 */
export function trackHit({ url, referer, prevTitle, maxWaitMs = 1200 }) {
  const started = Date.now()
  const tick = () => {
    if (document.title !== prevTitle || Date.now() - started >= maxWaitMs) {
      ym('hit', url, { title: document.title, referer })
    } else {
      setTimeout(tick, 100)
    }
  }
  tick()
}
