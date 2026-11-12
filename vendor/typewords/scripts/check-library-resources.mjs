import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createServer } from 'node:http'
import { fetchLibraryJson, validateLibraryCatalog } from '../app/core/utils/libraryResource.ts'

const publicRoot = new URL('../public/', import.meta.url)
const json = path => JSON.parse(readFileSync(new URL(path, publicRoot), 'utf8'))
const counts = {}
for (const kind of ['word', 'article']) {
  const catalog = json(`list/${kind}.json`)
  assert.ok(validateLibraryCatalog(catalog), `${kind} catalog`)
  const hashes = new Set()
  for (const book of catalog) {
    const items = json(`dicts/${book.language}/${kind}/${book.url}`)
    assert.equal(items.length, book.length, `${book.name} must report its actual count`)
    const keys = items.map(item => kind === 'word' ? item.word : item.text)
    assert.ok(keys.every(value => typeof value === 'string' && value.trim()), book.name)
    if (kind === 'word') assert.equal(new Set(keys.map(key => key.toLowerCase())).size, keys.length, book.name)
    const hash = createHash('sha256').update(JSON.stringify(keys)).digest('hex')
    assert.ok(!hashes.has(hash), `${book.name} must not duplicate another book`)
    hashes.add(hash)
    counts[book.name] = items.length
  }
  for (const book of json(`list/recommend_${kind}.json`)) {
    assert.deepEqual(book, catalog.find(item => item.id === book.id), `recommendation ${book.id}`)
  }
}
const source = json('ecdict-sources.json')
for (const book of source.books) {
  const hash = createHash('sha256').update(readFileSync(new URL(book.path, publicRoot))).digest('hex')
  assert.equal(hash, book.sha256, book.name)
}
assert.equal(json('list/word.json')[0].id, 1, 'Existing CET-4 identity must remain stable')
assert.equal(json('list/article.json')[0].id, 246, 'Existing NCE-1 identity must remain stable')

let attempts = 0
const server = createServer((req, res) => {
  if (req.url === '/failed') { res.writeHead(503); res.end('unavailable') }
  else if (req.url === '/retry' && ++attempts === 1) { res.writeHead(503); res.end('unavailable') }
  else if (req.url === '/timeout') setTimeout(() => res.end('[{}]'), 15500)
  else if (req.url === '/fallback') { res.setHeader('content-type', 'text/html'); res.end('<html>SPA fallback</html>') }
  else if (req.url === '/empty') res.end('[]')
  else if (req.url === '/object') res.end('{}')
  else res.end('[{"word":"hello"}]')
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
try {
  const origin = `http://127.0.0.1:${server.address().port}`
  assert.deepEqual(await fetchLibraryJson(origin), [{ word: 'hello' }])
  for (const path of ['/failed', '/fallback', '/empty', '/object']) {
    await assert.rejects(fetchLibraryJson(origin + path), path)
  }
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(fetchLibraryJson(origin, controller.signal))
  await assert.rejects(fetchLibraryJson(origin + '/retry'))
  assert.deepEqual(await fetchLibraryJson(origin + '/retry'), [{ word: 'hello' }])
  await assert.rejects(fetchLibraryJson(origin + '/timeout'), { name: 'AbortError' })
  assert.equal(validateLibraryCatalog([{ id: 1 }]), false)
} finally {
  await new Promise(resolve => server.close(resolve))
}
console.log(JSON.stringify({ passed: true, counts, errorCancellationRetryTimeoutChecks: 8 }, null, 2))
