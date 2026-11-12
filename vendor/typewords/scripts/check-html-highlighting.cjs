// EVONCHAT adaptation regression checks, 2026-11-03.
// Run with: node --test scripts/check-html-highlighting.cjs
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const test = require('node:test')
const ts = require('typescript')

const source = fs.readFileSync(path.join(__dirname, '../app/core/utils/wordLookup.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText
const moduleExports = {}
vm.runInNewContext(compiled, {
  exports: moduleExports,
  require(name) {
    assert.equal(name, '../apis/words.ts')
    return { queryWord() { throw new Error('Network lookup is outside the highlighting test') } }
  },
})
const { buildHighlightedHtml: highlight, isHighlightToken } = moduleExports
const span = text => `<span class="highlight-word">${text}</span>`

test('plain sentence highlights the target and preserves spacing and punctuation', () => {
  assert.equal(highlight('Play, play!\n replay player.', 'play'), `${span('Play')}, ${span('play')}!\n replay player.`)
})

test('all original supported word suffixes remain highlighted', () => {
  assert.equal(highlight('play plays playes played playing', 'play'), ['play', 'plays', 'playes', 'played', 'playing'].map(span).join(' '))
})

test('regex metacharacters are literal and phrases still match', () => {
  assert.equal(highlight('a.b axb', 'a.b'), `${span('a.b')} axb`)
  assert.equal(highlight('A red apple grows.', 'red apple'), `A ${span('red apple')} grows.`)
})

test('case-insensitive highlight token behavior stays unchanged', () => {
  assert.equal(isHighlightToken('PLAYED', 'play'), true)
  assert.equal(isHighlightToken('replay', 'play'), false)
  assert.equal(isHighlightToken('player', 'play'), false)
})

test('dictation and disabled highlighting use only predefined classes', () => {
  assert.equal(highlight('play', 'play', { dictation: true }), '<span class="highlight-word word-shadow">play</span>')
  assert.equal(highlight('play', 'play', { highLight: false, dictation: true }), '<span class="word-shadow">play</span>')
  assert.equal(highlight('play', 'play', { highLight: false }), '<span class="">play</span>')
})

test('empty and whitespace target still escape all imported HTML', () => {
  for (const word of ['', '   ']) {
    assert.equal(highlight('<img src=x onerror="alert(1)"> & \'test\'', word), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;test&#39;')
  }
  assert.equal(highlight('', 'play'), '')
})

test('markup around a highlighted word is displayed as literal text', () => {
  assert.equal(highlight('<script>play</script>', 'play'), `&lt;script&gt;${span('play')}&lt;/script&gt;`)
  assert.equal(highlight('<img src=x onerror="play()">', 'play'), `&lt;img src=x onerror=&quot;${span('play')}()&quot;&gt;`)
})

test('existing HTML entities remain literal input text', () => {
  assert.equal(highlight('&lt;play&gt; &amp; &#60; play', 'play'), `&amp;lt;${span('play')}&amp;gt; &amp;amp; &amp;#60; ${span('play')}`)
})

test('targets matching HTML implementation names cannot alter generated markup', () => {
  assert.equal(highlight('span spans <span>span</span>', 'span'), `${span('span')} ${span('spans')} &lt;${span('span')}&gt;${span('span')}&lt;/${span('span')}&gt;`)
  assert.equal(highlight('highlight highlight-word', 'highlight'), `${span('highlight')} ${span('highlight')}-word`)
})

test('target containing markup cannot introduce tags or attributes', () => {
  assert.equal(highlight('a<img src=x onerror=alert(1)>b', 'a<img src=x onerror=alert(1)>b'), span('a&lt;img src=x onerror=alert(1)&gt;b'))
})

test('all output elements are fixed spans for hostile imported sentence cases', () => {
  for (const payload of [
    '<svg onload=alert(1)>play</svg>',
    '<img src=x onerror=alert(1)>',
    '</span><iframe srcdoc="<script>alert(1)</script>">play',
    '<a href="javascript:alert(1)">play</a>',
    '<math><mtext><table><mglyph><style><!--</style><img title="--><img src=x onerror=alert(1)>">',
  ]) {
    for (const word of ['play', 'span', 'img', 'src', 'script', '']) {
      const html = highlight(payload, word)
      const withoutKnownSpans = html.replace(/<span class="highlight-word">|<\/span>/g, '')
      assert.equal(/[<>]/.test(withoutKnownSpans), false, `${word}: ${payload}`)
    }
  }
})
