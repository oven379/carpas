import test from 'node:test'
import assert from 'node:assert/strict'
import { OWNER_MAX_FREE_GARAGE_CARS, dedupeCarsById, ownerGarageLimits } from './garageLimits.js'

const cars = (n, extra = {}) => Array.from({ length: n }, (_, i) => ({ id: String(i + 1), ...extra }))

test('бесплатно — одно авто', () => {
  assert.equal(OWNER_MAX_FREE_GARAGE_CARS, 1)
})

test('пустой гараж: добавить можно', () => {
  const l = ownerGarageLimits([])
  assert.equal(l.canAddManual, true)
  assert.equal(l.canVinClaim, true)
  assert.equal(l.carLimit, 1)
})

test('одно авто при лимите 1: добавлять нельзя', () => {
  const l = ownerGarageLimits(cars(1))
  assert.equal(l.totalCount, 1)
  assert.equal(l.canAddManual, false)
  assert.equal(l.canVinClaim, false)
})

test('личный лимит, поднятый админом, позволяет добавить второе, но не третье авто', () => {
  assert.equal(ownerGarageLimits(cars(1), { carLimit: 2 }).canAddManual, true)
  assert.equal(ownerGarageLimits(cars(2), { carLimit: 2 }).canAddManual, false)
  assert.equal(ownerGarageLimits(cars(2), { carLimit: 3 }).canAddManual, true)
  assert.equal(ownerGarageLimits(cars(3), { carLimit: 3 }).canAddManual, false)
})

test('Premium без ограничений', () => {
  assert.equal(ownerGarageLimits(cars(10), { isPremium: true }).canAddManual, true)
})

test('мусорный лимит не даёт обойти правило: минимум 1', () => {
  assert.equal(ownerGarageLimits(cars(1), { carLimit: 0 }).carLimit, 1)
  assert.equal(ownerGarageLimits(cars(1), { carLimit: -5 }).canAddManual, false)
  assert.equal(ownerGarageLimits(cars(1), { carLimit: 'abc' }).carLimit, 1)
})

test('авто от сервиса (с detailingId) считаются в общем лимите, но не в ручных', () => {
  const l = ownerGarageLimits([{ id: '1', detailingId: '7' }, { id: '2' }])
  assert.equal(l.totalCount, 2)
  assert.equal(l.manualCount, 1)
})

test('dedupeCarsById убирает повторы и записи без id, не мутируя вход', () => {
  const input = [{ id: 1 }, { id: '1' }, { id: 2 }, { id: null }, { id: '' }, {}]
  const out = dedupeCarsById(input)
  assert.deepEqual(out.map((c) => String(c.id)), ['1', '2'])
  assert.equal(input.length, 6)
  assert.deepEqual(dedupeCarsById(undefined), [])
})
