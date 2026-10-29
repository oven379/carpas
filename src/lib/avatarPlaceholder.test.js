import test from 'node:test'
import assert from 'node:assert/strict'
import { avatarPlaceholderColors, avatarPlaceholderLetter, AVATAR_PLACEHOLDER_COLORS } from './avatarPlaceholder.js'

test('два слова дают две буквы', () => {
  assert.equal(avatarPlaceholderLetter('', 'Александр Дегтярёв'), 'АД')
  assert.equal(avatarPlaceholderLetter('', 'Демо Студия Детейлинга'), 'ДС')
  assert.equal(avatarPlaceholderLetter('', 'Noname Detailing'), 'ND')
})

test('одно слово даёт одну букву', () => {
  assert.equal(avatarPlaceholderLetter('', 'Сашка'), 'С')
})

test('имя важнее почты, без имени берётся почта, иначе вопрос', () => {
  assert.equal(avatarPlaceholderLetter('owner@demo.car', 'Сашка'), 'С')
  assert.equal(avatarPlaceholderLetter('owner@demo.car', ''), 'O')
  assert.equal(avatarPlaceholderLetter('', ''), '?')
  assert.equal(avatarPlaceholderLetter('', '  —  '), '?')
})

test('цифры в названии учитываются, знаки препинания нет', () => {
  assert.equal(avatarPlaceholderLetter('', '5 Звёзд'), '5З')
  assert.equal(avatarPlaceholderLetter('', '«Авто-Мастер»'), 'АМ')
})

test('цвет стабилен и всегда из палитры', () => {
  const a = avatarPlaceholderColors('', 'Александр Дегтярёв')
  assert.deepEqual(a, avatarPlaceholderColors('x@y.z', 'александр дегтярёв '))
  assert.ok(AVATAR_PLACEHOLDER_COLORS.includes(a))
  assert.ok(AVATAR_PLACEHOLDER_COLORS.includes(avatarPlaceholderColors('', '')))
})
