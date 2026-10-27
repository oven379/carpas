import test from 'node:test'
import assert from 'node:assert/strict'
import { GOALS, reachGoal, shouldTrackPath, trackHit } from './metrika.js'

test('админка не отправляется в Метрику, остальное — да', () => {
  assert.equal(shouldTrackPath('/admin'), false)
  assert.equal(shouldTrackPath('/admin/panel'), false)
  assert.equal(shouldTrackPath('/admin/379team'), false)
  assert.equal(shouldTrackPath('/'), true)
  assert.equal(shouldTrackPath('/blog/prigon-avto-cifrovoy-pasport'), true)
  assert.equal(shouldTrackPath('/detailing/clients'), true)
  // Похожие по началу адреса не должны попадать под правило.
  assert.equal(shouldTrackPath('/administrator-guide'), true)
})

test('идентификаторы целей уникальны и в нижнем регистре', () => {
  const ids = Object.values(GOALS)
  assert.equal(new Set(ids).size, ids.length)
  for (const id of ids) assert.match(id, /^[a-z_]+$/)
})

test('без window функции аналитики не падают (SSR, тесты)', () => {
  assert.doesNotThrow(() => reachGoal(GOALS.appStoreClick))
})

test('trackHit отправляет хит сразу, когда заголовок уже изменился, и по таймауту, когда нет', async () => {
  const sent = []
  globalThis.window = { ym: (id, method, ...args) => sent.push({ method, args }) }
  globalThis.document = { title: 'Новая страница' }
  try {
    trackHit({ url: 'https://carpasss.ru/blog', referer: 'https://carpasss.ru/', prevTitle: 'Старая страница' })
    assert.equal(sent.length, 1)
    assert.deepEqual(sent[0].args[1], { title: 'Новая страница', referer: 'https://carpasss.ru/' })

    sent.length = 0
    trackHit({ url: 'https://carpasss.ru/', referer: '', prevTitle: 'Новая страница', maxWaitMs: 150 })
    assert.equal(sent.length, 0, 'заголовок не менялся — ждём')
    await new Promise((r) => setTimeout(r, 300))
    assert.equal(sent.length, 1, 'по таймауту хит всё равно уходит')
  } finally {
    delete globalThis.window
    delete globalThis.document
  }
})
