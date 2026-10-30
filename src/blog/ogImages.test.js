import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'

const root = new URL('../../', import.meta.url)

test('у каждой статьи блога есть превью для соцсетей public/og/<slug>.jpg', () => {
  const src = readFileSync(new URL('src/blog/posts.jsx', root), 'utf8')
  const slugs = [...src.matchAll(/\n\s*slug:\s*'([^']+)'/g)].map((m) => m[1])
  assert.ok(slugs.length >= 15, 'не удалось прочитать список статей из posts.jsx')

  const missing = slugs.filter((s) => !existsSync(new URL(`public/og/${s}.jpg`, root)))
  assert.deepEqual(missing, [], `нет картинок для статей: ${missing.join(', ')}. Запустите: npm run og`)
})

test('каждая статья блога есть в scripts/routes.mjs (prerender и sitemap)', async () => {
  const { ROUTES } = await import(new URL('scripts/routes.mjs', root))
  const src = readFileSync(new URL('src/blog/posts.jsx', root), 'utf8')
  const slugs = [...src.matchAll(/\n\s*slug:\s*'([^']+)'/g)].map((m) => m[1])
  const missing = slugs.filter((s) => !ROUTES.includes(`/blog/${s}`))
  assert.deepEqual(missing, [], `нет в scripts/routes.mjs: ${missing.join(', ')}`)
})
