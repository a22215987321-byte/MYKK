// EVONCHAT adaptation, 2026-11-03: local TXT/JSON dictionary import.
import type { Word } from '../types/types'

type ImportedWord = Omit<Word, 'id'>
const MAX_WORDS = 10000
const invalid = () => new Error('檔案格式不正確，請選擇 TXT 或 JSON 詞典。')
const text = (value: unknown, fallback = ''): string => {
  if (value === undefined || value === null) return fallback
  if (typeof value !== 'string') throw invalid()
  return value
}
const list = <T>(value: unknown, map: (row: any) => T): T[] => {
  if (value === undefined || value === null) return []
  if (!Array.isArray(value)) throw invalid()
  return value.map(row => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw invalid()
    return map(row)
  })
}
const pair = (row: any) => ({ c: text(row.c), cn: text(row.cn) })

export function parseImportedWords(content: string, filename: string, existing: string[] = []) {
  if (content.length > 5 * 1024 * 1024) throw new Error('檔案不可超過 5 MB。')
  const clean = content.replace(/^\uFEFF/, '').trim()
  if (!clean) throw new Error('檔案沒有單詞。')
  let rows: unknown[]
  if (/\.json$/i.test(filename)) {
    let decoded: any
    try { decoded = JSON.parse(clean) } catch { throw invalid() }
    rows = Array.isArray(decoded) ? decoded : decoded?.words
    if (!Array.isArray(rows)) throw invalid()
  } else if (/\.txt$/i.test(filename)) {
    rows = clean.split(/\r?\n/).filter(row => row.trim()).map(row => {
      const [word, ...translation] = row.split('\t')
      return { word, trans: translation.length ? [{ pos: '', cn: translation.join('\t').trim() }] : [] }
    })
  } else throw invalid()
  if (!rows.length) throw new Error('檔案沒有單詞。')
  if (rows.length > MAX_WORDS) throw new Error('一次最多匯入 10,000 個單詞。')
  const seen = new Set(existing.map(word => word.trim().toLocaleLowerCase()))
  const words: ImportedWord[] = []
  let duplicates = 0
  for (const value of rows) {
    const row = typeof value === 'string' ? { word: value } : value as any
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw invalid()
    const word = text(row.word).trim()
    if (!word || word.length > 100 || /[\u0000-\u001f\u007f]/.test(word)) throw invalid()
    const key = word.toLocaleLowerCase()
    if (seen.has(key)) { duplicates++; continue }
    let trans = row.trans
    if (typeof trans === 'string') trans = [{ pos: '', cn: trans }]
    const parsed: ImportedWord = {
      word, custom: true,
      phonetic0: text(row.phonetic0), phonetic1: text(row.phonetic1),
      trans: list(trans, item => ({ pos: text(item.pos), cn: text(item.cn) })),
      sentences: list(row.sentences, pair), phrases: list(row.phrases, pair),
      synos: list(row.synos, item => {
        if (item.ws !== undefined && (!Array.isArray(item.ws) || item.ws.some(word => typeof word !== 'string'))) throw invalid()
        return { pos: text(item.pos), cn: text(item.cn), ws: item.ws ?? [] }
      }),
      relWords: {
        root: text(row.relWords?.root),
        rels: list(row.relWords?.rels, item => ({ pos: text(item.pos), words: list(item.words, pair) })),
      },
      etymology: list(row.etymology, item => ({ t: text(item.t), d: text(item.d) })),
    }
    seen.add(key)
    words.push(parsed)
  }
  return { words, duplicates }
}
