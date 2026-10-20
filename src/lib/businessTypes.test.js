import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BUSINESS_TYPES,
  DEFAULT_BUSINESS_TYPE,
  businessTypeCall,
  businessTypeLabel,
  businessTypeSeo,
  staleVisitDays,
} from './businessTypes.js'

test('в списке пять типов бизнеса, по умолчанию — детейлинг', () => {
  assert.deepEqual(
    BUSINESS_TYPES.map((t) => t.key),
    ['detailing', 'sto', 'wash', 'tuning', 'prigon'],
  )
  assert.equal(DEFAULT_BUSINESS_TYPE, 'detailing')
})

test('подписи для известных типов и запасной вариант для неизвестного', () => {
  assert.equal(businessTypeLabel('prigon'), 'Пригон авто')
  assert.equal(businessTypeCall('prigon'), 'компанию по пригону авто')
  assert.equal(businessTypeSeo('wash'), 'Автомойка')
  // Старые записи без типа не должны ломать страницу.
  assert.equal(businessTypeLabel(undefined), 'Детейлинг')
  assert.equal(businessTypeLabel('что-то-левое'), 'Детейлинг')
})

test('порог «Давно не были»: 19 дней для детейлинга и автомойки, 25 для остальных', () => {
  assert.equal(staleVisitDays('detailing'), 19)
  assert.equal(staleVisitDays('wash'), 19)
  assert.equal(staleVisitDays('sto'), 25)
  assert.equal(staleVisitDays('tuning'), 25)
  assert.equal(staleVisitDays('prigon'), 25)
  assert.equal(staleVisitDays(undefined), 25)
})

test('список типов совпадает с бэкендом (Detailing::BUSINESS_TYPES)', () => {
  const php = readFileSync(new URL('../../backend/app/Models/Detailing.php', import.meta.url), 'utf8')
  const block = /const BUSINESS_TYPES = \[([\s\S]*?)\];/.exec(php)
  assert.ok(block, 'в Detailing.php не найдена константа BUSINESS_TYPES')
  const backend = [...block[1].matchAll(/'(\w+)'\s*=>\s*'([^']+)'/g)].map((m) => ({ key: m[1], label: m[2] }))

  assert.deepEqual(
    BUSINESS_TYPES.map((t) => t.key),
    backend.map((t) => t.key),
    'ключи типов бизнеса во фронтенде и бэкенде разошлись',
  )
  for (const b of backend) {
    assert.equal(businessTypeLabel(b.key), b.label, `подпись «${b.key}» во фронтенде и бэкенде разошлась`)
  }
})
