// EVONCHAT adaptation regression checks, 2026-11-03.
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const ts = require('typescript')
const moduleExports = {}
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../app/core/utils/wordImport.ts'), 'utf8'), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText, { exports: moduleExports })
const parse = (...args) => JSON.parse(JSON.stringify(moduleExports.parseImportedWords(...args)))
test('TXT accepts BOM, CRLF, phrases, optional tab translations and blank lines', () => {
  const { words } = parse('\uFEFFapple\t蘋果\r\n\r\npull an all-nighter', 'words.TXT')
  assert.deepEqual(words.map(w => w.word), ['apple', 'pull an all-nighter'])
  assert.deepEqual(words[0].trans, [{ pos: '', cn: '蘋果' }])
})
test('JSON accepts strings or word objects and word dictionary export containers', () => {
  const a = parse('["apple",{"word":"pear","trans":"梨"}]', 'word.json')
  assert.equal(a.words.length, 2)
  const b = parse('{"words":[{"word":"apple","sentences":[{"c":"An apple.","cn":"蘋果。"}]}]}', 'word.json')
  assert.equal(b.words[0].sentences[0].c, 'An apple.')
})
test('duplicates are skipped without modifying an existing word', () => {
  const r = parse('Apple\napple\npear\nPEAR', 'words.txt', ['apple'])
  assert.equal(r.duplicates, 3)
  assert.deepEqual(r.words.map(w => w.word), ['pear'])
})
test('malformed JSON, shape, unknown extensions and invalid words fail atomically', () => {
  for (const content of ['{', '{}', '[null]', '[{"word":42}]', '["good",""]', '[{"word":"word","sentences":"wrong"}]']) {
    assert.throws(() => parse(content, 'words.json'))
  }
  assert.throws(() => parse('word', 'words.exe'))
  assert.throws(() => parse('a'.repeat(101), 'words.txt'))
  assert.throws(() => parse('', 'words.txt'))
})
test('import never accepts upstream IDs, prototype fields or custom flags', () => {
  const r = parse('[{"id":"existing","word":"apple","custom":false,"__proto__":{"polluted":true}}]', 'words.json')
  assert.equal(r.words[0].id, undefined)
  assert.equal(r.words[0].custom, true)
  assert.equal(Object.prototype.polluted, undefined)
})
test('HTML is retained as inert text fields for the safe rendering path', () => {
  const r = parse('[{"word":"apple","sentences":[{"c":"<img src=x onerror=alert(1)>","cn":"文字"}]}]', 'words.json')
  assert.equal(r.words[0].sentences[0].c, '<img src=x onerror=alert(1)>')
})
test('oversized files and excessive word lists are bounded', () => {
  assert.throws(() => parse('a'.repeat(5 * 1024 * 1024 + 1), 'words.txt'))
  assert.throws(() => parse(Array.from({ length: 10001 }, (_, i) => `word${i}`).join('\n'), 'words.txt'))
})
