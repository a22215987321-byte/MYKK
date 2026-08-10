/**
 * HTTP 拜访命令调度模式
 * - queue：入队串行，任务稀疏时不丢
 * - skip：繁忙时丢弃新命令，任务密集时减负
 * - hybrid：繁忙丢弃 + 空闲串行消费（不积压繁忙期命令）
 */
export type OfficeDispatchMode = 'queue' | 'skip' | 'hybrid'

// 原本是 Vite 專案，用 import.meta.env.VITE_* 讀環境變數——Next.js／webpack
// 沒有 import.meta.env 這個東西（那是 Vite 專屬的），直接讀會在模組載入的
// 當下就丟例外，害後面整條 import 鏈（SpineOfficeCanvas → OfficeScene →
// officeSceneBridge → officeActionDispatcher → 這個檔案）全部失敗，
// dynamic() 的 loading 畫面因此卡住轉不出來，永遠停在「載入中」。改成
// Next.js 慣用的 process.env.NEXT_PUBLIC_*，行為（含預設值）維持一樣。
const dispatchRaw = process.env.NEXT_PUBLIC_OFFICE_DISPATCH_MODE

export const OFFICE_HTTP_ACTIONS_URL =
  process.env.NEXT_PUBLIC_OFFICE_HTTP_ACTIONS_URL ?? 'http://localhost:8765/actions'

export const OFFICE_DISPATCH_MODE: OfficeDispatchMode =
  dispatchRaw === 'skip' || dispatchRaw === 'hybrid'
    ? dispatchRaw
    : 'queue'
