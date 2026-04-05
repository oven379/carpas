import { PHOTO_LANDSCAPE_HINT_SENTENCE } from './historyVisitHints.js'

/** Если детейлинг не заполнил «Важно» — показываем на карточке этот текст (последний визит от сервиса). */
export const DEFAULT_DETAILING_CARE_IMPORTANT =
  'Первые сутки после визита не мойте авто под высоким давлением и не натирайте ЛКП сухой тряпкой. Если что‑то смущает — напишите сервису, подскажем по уходу.'

/** Если все три поля «Совет» пусты — показываем эти два совета вместо персональных. */
export const DEFAULT_DETAILING_CARE_TIPS = [
  'После мойки промакивайте стёкла и уплотнители мягкой тканью — меньше разводов и влаги в щелях.',
  'Пыль с кузова лучше сдувать или сметать мягкой щёткой: сухая тряпка без воды может оставлять микроцарапины.',
]

function daysBetween(aIso, bIso) {
  const a = new Date(aIso)
  const b = new Date(bIso)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null
  const ms = b.getTime() - a.getTime()
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

function hasService(services, needle) {
  return Array.isArray(services) && services.some((s) => String(s).toLowerCase().includes(needle))
}

function findLastEvent(events, predicate) {
  for (const e of events) {
    if (predicate(e)) return e
  }
  return null
}

/**
 * Карточки «важно» / «совет» из последнего по дате визита детейлинга (source === 'service').
 * Пустые поля в визите подменяем дефолтами для владельца; если хотя бы один совет заполнен — показываем только заполненные.
 */
function latestManualCareRecs(evtsSortedNewestFirst) {
  const lastService = evtsSortedNewestFirst.find((e) => e.source === 'service')
  if (!lastService) return []
  const ct = lastService.careTips && typeof lastService.careTips === 'object' ? lastService.careTips : null
  const importantCustom = ct ? String(ct.important || '').trim() : ''
  const tipsRaw = ct && Array.isArray(ct.tips) ? ct.tips : []
  const tipsCustom = [0, 1, 2].map((i) => String(tipsRaw[i] || '').trim()).filter(Boolean)

  const important = importantCustom || DEFAULT_DETAILING_CARE_IMPORTANT
  const tips =
    tipsCustom.length > 0 ? tipsCustom : DEFAULT_DETAILING_CARE_TIPS.slice(0, 2)

  const out = []
  out.push({ tone: 'accent', title: important, why: '' })
  for (const t of tips) out.push({ tone: 'neutral', title: t, why: '' })
  return out
}

export function getCareRecommendations({ car, events }) {
  const list = []
  const evts = Array.isArray(events) ? events.filter((e) => !e?.isDraft).slice() : []
  evts.sort((a, b) => String(b.at || '').localeCompare(String(a.at || '')))
  const manual = latestManualCareRecs(evts)

  const lastAny = evts[0] || null
  const lastWash = findLastEvent(evts, (e) => hasService(e.services, 'мойк'))
  const lastInspection = findLastEvent(evts, (e) => hasService(e.services, 'осмотр'))
  const lastPolish = findLastEvent(evts, (e) => hasService(e.services, 'полиров'))
  const lastCeramic = findLastEvent(evts, (e) => hasService(e.services, 'керамик'))
  const lastInterior = findLastEvent(evts, (e) => hasService(e.services, 'химчист'))

  const now = new Date().toISOString()

  if (!lastAny) {
    list.push({
      tone: 'accent',
      title: 'Первичный визит: мойка + осмотр ЛКП',
      why: 'С этого удобно начинать историю ухода, чтобы дальше фиксировать динамику.',
    })
    list.push({
      tone: 'neutral',
      title: 'Добавь фото/документы',
      why: `Фото кузова/салона после визита помогают видеть изменения и подтверждать состояние. ${PHOTO_LANDSCAPE_HINT_SENTENCE}`,
    })
    return [...manual, ...list]
  }

  const dWash = lastWash ? daysBetween(lastWash.at, now) : null
  if (dWash == null || dWash >= 14) {
    list.push({
      tone: 'accent',
      title: 'Пора на мойку',
      why: lastWash ? `Последняя мойка была ${dWash} дн. назад.` : 'В истории нет отметки о мойке.',
    })
  }

  const dInspect = lastInspection ? daysBetween(lastInspection.at, now) : null
  if (dInspect == null || dInspect >= 30) {
    list.push({
      tone: 'neutral',
      title: 'Осмотр ЛКП и зон риска',
      why: lastInspection
        ? `Последний осмотр был ${dInspect} дн. назад — удобно раз в месяц фиксировать состояние.`
        : 'Нет отметок об осмотре — добавь, чтобы вести историю сколов/царапин.',
    })
  }

  const dPolish = lastPolish ? daysBetween(lastPolish.at, now) : null
  if (dPolish != null && dPolish >= 180) {
    list.push({
      tone: 'neutral',
      title: 'Лёгкая полировка / обновление блеска',
      why: `Полировка была ${dPolish} дн. назад — можно освежить покрытие.`,
    })
  }

  const dCeramic = lastCeramic ? daysBetween(lastCeramic.at, now) : null
  if (dCeramic != null && dCeramic >= 240) {
    list.push({
      tone: 'neutral',
      title: 'Проверить керамику / обновить гидрофоб',
      why: `Керамика была ${dCeramic} дн. назад — проверь гидрофоб и стойкость.`,
    })
  }

  const dInterior = lastInterior ? daysBetween(lastInterior.at, now) : null
  if (dInterior == null) {
    list.push({
      tone: 'neutral',
      title: 'Химчистка салона по сезону',
      why: 'В истории нет химчистки — обычно её делают 1–2 раза в год.',
    })
  }

  if (list.length === 0) {
    list.push({
      tone: 'neutral',
      title: 'Уход в норме',
      why: `Недавние визиты есть — продолжай фиксировать работы и добавляй фото при необходимости. ${PHOTO_LANDSCAPE_HINT_SENTENCE}`,
    })
  }

  // лёгкая персонализация по пробегу
  if (car?.mileageKm && Number(car.mileageKm) >= 30000) {
    list.push({
      tone: 'neutral',
      title: 'Регулярно фиксируй пробег при визите',
      why: 'История “по пробегу” помогает быстрее оценивать состояние и планировать уход.',
    })
  }

  return [...manual, ...list]
}

