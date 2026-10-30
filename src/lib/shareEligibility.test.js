import test from 'node:test'
import assert from 'node:assert/strict'
import { shareEligibilityHint } from './shareEligibility.js'

test('когда ссылка доступна, подсказка пустая', () => {
  assert.equal(shareEligibilityHint({ eligible: true, visits: 7 }), '')
})

test('без визитов: объясняет оба условия и показывает прогресс', () => {
  const t = shareEligibilityHint({ eligible: false, visits: 0, requiredVisits: 6, requiredMonths: 3, eligibleSince: null })
  assert.match(t, /6 ваших визитов/)
  assert.match(t, /через 3 месяца/)
  assert.match(t, /0 из 6/)
})

test('есть дата, когда исполнится 3 месяца — она показывается', () => {
  const t = shareEligibilityHint({ eligible: false, visits: 2, requiredVisits: 6, requiredMonths: 3, eligibleSince: '2027-01-30T10:00:00Z' })
  assert.match(t, /2 из 6/)
  assert.match(t, /или с .*2027/)
})
