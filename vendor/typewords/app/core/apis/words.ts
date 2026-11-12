// EVONCHAT adaptation, 2026-11-03: bundled vocabulary without an account API.
import type { Word } from '../types'
import { withAppBaseURL } from '../utils/base-url'
let vocabulary: Promise<Map<string, Word>> | undefined
export async function queryWord(params?: { word: string }) {
  try {
    vocabulary ??= fetch(withAppBaseURL('/dicts/en/word/CET4_T.json'))
      .then(response => { if (!response.ok) throw new Error('Vocabulary unavailable'); return response.json() })
      .then((words: Word[]) => new Map(words.map(word => [word.word.toLowerCase(), word])))
      .catch(error => { vocabulary = undefined; throw error })
    const data = (await vocabulary).get((params?.word || '').trim().toLowerCase()) || null
    return { code: data ? 200 : 404, success: Boolean(data), data, msg: data ? '' : '本機詞庫找不到此詞，可自行輸入內容。' }
  } catch {
    return { code: 503, success: false, data: null, msg: '詞庫載入失敗，請重試。' }
  }
}
