import test from 'node:test'
import assert from 'node:assert/strict'

globalThis.window = { location: { origin: 'https://carpasss.ru' } }
const { buildVisitOrderHtml } = await import('./VisitOrderPdf.js').catch(() => ({}))

const XSS = '<img src=x onerror="alert(document.domain)"><script>steal(localStorage)</script>'

test('в печатной форме заказ-наряда введённые пользователем значения экранируются', { skip: !buildVisitOrderHtml }, () => {
  const html = buildVisitOrderHtml({
    event: {
      id: 1,
      orderNumber: XSS,
      at: '2026-10-20T10:00:00Z',
      reason: XSS,
      note: XSS,
      masterName: XSS,
      warrantyText: XSS,
      services: [XSS],
      workItems: [{ title: XSS, qty: 1, price: 100 }],
      partsItems: [{ title: XSS, number: XSS, qty: 1, price: 100 }],
    },
    car: { make: XSS, model: XSS, color: XSS, vin: XSS, year: XSS, plate: XSS, clientName: XSS, clientPhone: XSS },
    detailing: { name: XSS, legalName: XSS, inn: XSS, address: XSS, phone: XSS, logo: 'javascript:alert(1)' },
  })

  // Единственный допустимый <script> — наш собственный window.print() в конце документа.
  const scripts = html.match(/<script\b/gi) || []
  assert.equal(scripts.length, 1, 'в документ попал чужой <script>')
  assert.ok(!html.includes('<img src=x'), 'в документ попал чужой <img>')
  assert.ok(!/onerror\s*=\s*"alert/.test(html), 'обработчик onerror не экранирован')
  assert.ok(html.includes('&lt;script&gt;'), 'вредоносная строка должна выводиться как текст')
  assert.ok(!html.includes('javascript:alert'), 'небезопасный адрес логотипа попал в документ')
})

test('обычный текст не портится экранированием', { skip: !buildVisitOrderHtml }, () => {
  const html = buildVisitOrderHtml({
    event: { id: 2, at: '2026-10-20T10:00:00Z', workItems: [{ title: 'Мойка «Премиум» & полировка', qty: 1, price: 100 }] },
    car: { make: 'Skoda', model: 'Octavia', clientName: 'Иван Петров' },
    detailing: { name: 'NND' },
  })
  assert.ok(html.includes('Мойка «Премиум» &amp; полировка'))
  assert.ok(html.includes('Иван Петров'))
  assert.ok(html.includes('Skoda Octavia'))
})
