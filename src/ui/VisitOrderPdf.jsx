import { resolvePublicMediaUrl } from '../lib/mediaUrl.js'

/**
 * Генерация печатной формы заказ-наряда.
 * Открывает новое окно с документом и вызывает window.print().
 */

function fmt(n) {
  const v = Number.isFinite(Number(n)) ? Number(n) : 0
  return new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0, useGrouping: true })
    .format(Math.round(v))
    .replace(/ | /g, ' ')
}

function fmtRub(n) {
  return `${fmt(n)} ₽`
}

function parseNum(raw) {
  const n = Number(String(raw || '0').replace(/\s/g, '').replace(',', '.'))
  return Number.isFinite(n) && n >= 0 ? n : 0
}

function fmtDateStr(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(d)
}

function fmtDateOnly(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

function calcWorkTotal(items) {
  if (!Array.isArray(items)) return 0
  return items.reduce((s, it) => s + parseNum(it.qty) * parseNum(it.price), 0)
}

function calcPartTotal(it) {
  return Math.max(0, parseNum(it.qty) * parseNum(it.price) - parseNum(it.discount))
}

function calcPartsTotal(items) {
  if (!Array.isArray(items)) return 0
  return items.reduce((s, it) => s + calcPartTotal(it), 0)
}

function calcPartsDiscount(items) {
  if (!Array.isArray(items)) return 0
  return items.reduce((s, it) => s + parseNum(it.discount), 0)
}

function buildHtml({ event, car, detailing }) {
  const workItems = Array.isArray(event.workItems) ? event.workItems.filter((it) => it.title) : []
  const partsItems = Array.isArray(event.partsItems) ? event.partsItems.filter((it) => it.title) : []
  const workTotal = calcWorkTotal(workItems)
  const partsTotal = calcPartsTotal(partsItems)
  const partsDiscount = calcPartsDiscount(partsItems)
  const grandTotal = workTotal + partsTotal
  const masterName = event.masterName || detailing?.masterName || detailing?.contactName || ''
  const orderNum = event.orderNumber || `ЗН-${event.id}`
  const clientName = car.clientName || car.ownerName || '—'
  const clientPhone = car.clientPhone || car.ownerAccountPhone || ''
  const logoResolved = resolvePublicMediaUrl(detailing?.logo || '')
  const logoUrl = logoResolved && logoResolved.startsWith('/')
    ? `${window.location.origin}${logoResolved}`
    : logoResolved
  const inn = detailing?.inn || ''
  const legalName = detailing?.legalName || detailing?.name || ''
  const address = detailing?.address || ''
  const phone = detailing?.phone || ''
  const warrantyText = detailing?.warrantyText || ''

  const plate = [car.plate, car.plateRegion].filter(Boolean).join(' ')

  const workRowsHtml = workItems.map((it, i) => {
    const qty = parseNum(it.qty)
    const price = parseNum(it.price)
    const total = qty * price
    return `<tr>
      <td class="center">${i + 1}</td>
      <td>${it.title || ''}</td>
      <td class="center">${qty % 1 === 0 ? qty : qty.toFixed(2)}</td>
      <td class="right">${fmtRub(price)}</td>
      <td class="right">${fmtRub(total)}</td>
    </tr>`
  }).join('')

  const partsRowsHtml = partsItems.map((it, i) => {
    const qty = parseNum(it.qty)
    const price = parseNum(it.price)
    const discount = parseNum(it.discount)
    const total = calcPartTotal(it)
    return `<tr>
      <td class="center">${i + 1}</td>
      <td>${it.number || ''}</td>
      <td>${it.title || ''}</td>
      <td class="center">${qty % 1 === 0 ? qty : qty.toFixed(2)} шт</td>
      <td class="right">${fmtRub(price)}</td>
      <td class="right">${discount > 0 ? fmtRub(discount) : '—'}</td>
      <td class="right">${fmtRub(total)}</td>
    </tr>`
  }).join('')

  const services = [
    ...(Array.isArray(event.maintenanceServices) ? event.maintenanceServices : []),
    ...(Array.isArray(event.services) ? event.services : []),
  ].filter(Boolean)

  return `<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${orderNum}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'PT Sans', Arial, sans-serif; font-size: 10pt; color: #111; background: #fff; }
  .page { max-width: 210mm; margin: 0 auto; padding: 12mm 14mm; }

  /* Шапка */
  .header { display: flex; align-items: flex-start; gap: 14px; border-bottom: 2px solid #111; padding-bottom: 10px; margin-bottom: 10px; }
  .header__logo { width: 60px; height: 60px; object-fit: contain; flex-shrink: 0; }
  .header__logo-placeholder { width: 60px; height: 60px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; background: #f0f0f0; border-radius: 6px; font-size: 8pt; color: #888; text-align: center; }
  .header__info { flex: 1; }
  .header__name { font-size: 13pt; font-weight: bold; }
  .header__sub { font-size: 8.5pt; color: #444; margin-top: 2px; }
  .header__doc { text-align: right; flex-shrink: 0; }
  .header__doc-title { font-size: 14pt; font-weight: bold; }
  .header__doc-num { font-size: 10pt; color: #333; }
  .header__doc-status { font-size: 8.5pt; color: #555; margin-top: 4px; }

  /* Блок дат и клиента */
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 20px; margin-bottom: 10px; font-size: 9pt; }
  .meta__label { color: #555; }
  .meta__value { font-weight: 600; }
  .meta__sep { grid-column: 1/-1; border-top: 1px solid #ddd; margin: 4px 0; }

  /* Авто */
  .car-block { border: 1px solid #ddd; border-radius: 4px; padding: 7px 10px; margin-bottom: 10px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 3px 16px; font-size: 9pt; }
  .car-block__label { color: #666; }
  .car-block__value { font-weight: 600; }
  .car-block__title { grid-column: 1/-1; font-weight: bold; font-size: 10pt; margin-bottom: 4px; }

  /* Причина */
  .section-label { font-weight: bold; font-size: 10pt; margin-top: 10px; margin-bottom: 4px; }
  .section-text { font-size: 9pt; line-height: 1.5; border: 1px solid #ddd; padding: 5px 8px; border-radius: 3px; white-space: pre-wrap; }

  /* Таблицы */
  table { width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 4px; }
  th { background: #f5f5f5; font-weight: bold; padding: 5px 7px; border: 1px solid #ccc; text-align: left; }
  td { padding: 4px 7px; border: 1px solid #ddd; vertical-align: top; }
  tr:nth-child(even) td { background: #fafafa; }
  .center { text-align: center; }
  .right { text-align: right; white-space: nowrap; }
  .total-row td { font-weight: bold; background: #f5f5f5; }

  /* Итоги */
  .totals { margin: 8px 0; text-align: right; font-size: 9.5pt; }
  .totals__line { display: flex; justify-content: flex-end; gap: 16px; padding: 2px 0; }
  .totals__line--grand { font-weight: bold; font-size: 11pt; border-top: 2px solid #111; padding-top: 5px; margin-top: 3px; }
  .totals__label { color: #555; min-width: 180px; text-align: right; }
  .totals__val { min-width: 100px; text-align: right; }

  /* Гарантия */
  .warranty { font-size: 7.5pt; color: #444; line-height: 1.45; margin-top: 12px; padding-top: 8px; border-top: 1px solid #ccc; white-space: pre-wrap; }

  /* Подписи */
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 18px; }
  .sig__label { font-size: 8.5pt; color: #555; }
  .sig__line { border-top: 1px solid #555; margin-top: 24px; padding-top: 3px; font-size: 8pt; color: #555; }

  /* Сервисы из системы */
  .services-list { font-size: 9pt; line-height: 1.6; }

  .no-print-notice { display: none; }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { padding: 8mm 10mm; max-width: 100%; }
    .no-break { break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="page">

  <!-- Шапка -->
  <div class="header">
    ${logoUrl
      ? `<img class="header__logo" src="${logoUrl}" alt="Логотип">`
      : `<div class="header__logo-placeholder">Лого</div>`}
    <div class="header__info">
      <div class="header__name">${legalName || detailing?.name || 'Сервис'}</div>
      ${inn ? `<div class="header__sub">ИНН ${inn}</div>` : ''}
      ${address ? `<div class="header__sub">${address}</div>` : ''}
      ${phone ? `<div class="header__sub">Тел.: ${phone}</div>` : ''}
    </div>
    <div class="header__doc">
      <div class="header__doc-title">ЗАКАЗ-НАРЯД</div>
      <div class="header__doc-num">${orderNum}</div>
      <div class="header__doc-status">Дата: ${fmtDateOnly(event.at)}</div>
      ${event.createdAt && event.createdAt !== event.at
        ? `<div class="header__doc-status">Принят: ${fmtDateStr(event.createdAt)}</div>`
        : ''}
    </div>
  </div>

  <!-- Клиент -->
  <div class="meta">
    <div>
      <span class="meta__label">Заказчик:&nbsp;</span>
      <span class="meta__value">${clientName}</span>
    </div>
    <div>
      ${clientPhone ? `<span class="meta__label">Телефон:&nbsp;</span><span class="meta__value">${clientPhone}</span>` : ''}
    </div>
    <div>
      <span class="meta__label">Плательщик:&nbsp;</span>
      <span class="meta__value">${clientName}</span>
    </div>
  </div>

  <!-- Авто -->
  <div class="car-block no-break">
    <div class="car-block__title">Автомобиль</div>
    <div>
      <div class="car-block__label">Марка / модель</div>
      <div class="car-block__value">${[car.make, car.model].filter(Boolean).join(' ') || '—'}</div>
    </div>
    <div>
      <div class="car-block__label">Год выпуска</div>
      <div class="car-block__value">${car.year || '—'}</div>
    </div>
    <div>
      <div class="car-block__label">Цвет</div>
      <div class="car-block__value">${car.color || '—'}</div>
    </div>
    <div>
      <div class="car-block__label">Гос. номер</div>
      <div class="car-block__value">${plate || '—'}</div>
    </div>
    <div>
      <div class="car-block__label">VIN</div>
      <div class="car-block__value">${car.vin || '—'}</div>
    </div>
    <div>
      <div class="car-block__label">Пробег</div>
      <div class="car-block__value">${event.mileageKm ? `${fmt(event.mileageKm)} км` : '—'}</div>
    </div>
  </div>

  ${event.reason ? `<div class="section-label">Причины обращения:</div><div class="section-text">${event.reason}</div>` : ''}
  ${event.specialNotes ? `<div class="section-label">Особые отметки и рекомендации:</div><div class="section-text">${event.specialNotes}</div>` : ''}

  <!-- Выполненные работы -->
  ${workItems.length > 0 ? `
  <div class="section-label" style="margin-top:12px;">Выполненные работы</div>
  <div class="no-break">
  <table>
    <thead>
      <tr>
        <th style="width:30px" class="center">№</th>
        <th>Наименование работы</th>
        <th style="width:60px" class="center">Кол-во</th>
        <th style="width:100px" class="right">Цена</th>
        <th style="width:100px" class="right">Сумма</th>
      </tr>
    </thead>
    <tbody>${workRowsHtml}</tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="4" class="right">Итого работ:</td>
        <td class="right">${fmtRub(workTotal)}</td>
      </tr>
    </tfoot>
  </table>
  </div>` : ''}

  <!-- Услуги из системы (если нет work_items) -->
  ${workItems.length === 0 && services.length > 0 ? `
  <div class="section-label" style="margin-top:12px;">Выполненные работы / услуги</div>
  <div class="services-list section-text">${services.map((s, i) => `${i + 1}. ${s}`).join('\n')}</div>` : ''}

  <!-- Запасные части -->
  ${partsItems.length > 0 ? `
  <div class="section-label" style="margin-top:12px;">Запасные части и материалы</div>
  <div class="no-break">
  <table>
    <thead>
      <tr>
        <th style="width:30px" class="center">№</th>
        <th style="width:80px">Артикул</th>
        <th>Наименование</th>
        <th style="width:70px" class="center">Количество</th>
        <th style="width:90px" class="right">Цена</th>
        <th style="width:80px" class="right">Скидка</th>
        <th style="width:100px" class="right">Сумма</th>
      </tr>
    </thead>
    <tbody>${partsRowsHtml}</tbody>
    <tfoot>
      <tr class="total-row">
        <td colspan="5" class="right">Итого запчастей:</td>
        <td class="right">${partsDiscount > 0 ? fmtRub(partsDiscount) : '—'}</td>
        <td class="right">${fmtRub(partsTotal)}</td>
      </tr>
    </tfoot>
  </table>
  </div>` : ''}

  <!-- Итоги -->
  ${(workItems.length > 0 || partsItems.length > 0) ? `
  <div class="totals no-break">
    ${workItems.length > 0 ? `
    <div class="totals__line">
      <span class="totals__label">Итого работы:</span>
      <span class="totals__val">${fmtRub(workTotal)}</span>
    </div>` : ''}
    ${partsItems.length > 0 ? `
    <div class="totals__line">
      <span class="totals__label">Итого запчасти и материалы:</span>
      <span class="totals__val">${fmtRub(partsTotal)}</span>
    </div>
    ${partsDiscount > 0 ? `
    <div class="totals__line">
      <span class="totals__label">В том числе скидка:</span>
      <span class="totals__val">${fmtRub(partsDiscount)}</span>
    </div>` : ''}` : ''}
    <div class="totals__line totals__line--grand">
      <span class="totals__label">Сумма документа (Без НДС):</span>
      <span class="totals__val">${fmtRub(grandTotal)}</span>
    </div>
  </div>` : ''}

  <!-- Рекомендации мастера -->
  ${event.note ? `<div class="section-label" style="margin-top:12px;">Рекомендации мастера:</div><div class="section-text">${event.note}</div>` : ''}

  <!-- Гарантия -->
  ${warrantyText ? `<div class="warranty">${warrantyText}</div>` : ''}

  <!-- Подписи -->
  <div class="signatures no-break" style="margin-top:20px;">
    <div>
      <div class="sig__label">Мастер-приёмщик${masterName ? ': ' + masterName : ''}</div>
      <div class="sig__line">подпись / расшифровка</div>
    </div>
    <div>
      <div class="sig__label">Заказчик: ${clientName}</div>
      <div class="sig__line">подпись / расшифровка</div>
    </div>
  </div>

  <div style="text-align:center;font-size:7.5pt;color:#aaa;margin-top:14px;">
    Документ сформирован в системе КарПас
  </div>

</div>

<div class="no-print-notice" style="display:flex;justify-content:center;padding:20px;gap:12px;background:#f8f8f8;border-top:1px solid #ddd;position:sticky;bottom:0;">
  <button onclick="window.print()" style="padding:10px 28px;background:#111;color:#fff;border:none;border-radius:6px;font-size:14px;cursor:pointer;font-family:inherit;">
    Сохранить PDF / Печать
  </button>
  <button onclick="window.close()" style="padding:10px 20px;background:transparent;color:#555;border:1px solid #ccc;border-radius:6px;font-size:14px;cursor:pointer;font-family:inherit;">
    Закрыть
  </button>
</div>
<style>@media print { .no-print-notice { display: none !important; } }</style>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`
}

export function openVisitOrderPrint({ event, car, detailing }) {
  const html = buildHtml({ event, car, detailing })
  const w = window.open('', '_blank')
  if (!w) {
    alert('Не удалось открыть вкладку. Разрешите всплывающие окна для этого сайта.')
    return
  }
  w.document.open()
  w.document.write(html)
  w.document.close()
}
