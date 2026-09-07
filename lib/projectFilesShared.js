// 專案檔案的幾個常數。獨立成一個模組是因為分享文件的閱讀視窗
// （components/DocReaderModal.js）也要用——直接從 ProjectFilesPanel 匯入會把
// 整個面板（Tiptap 編輯器、marked、DOMPurify）一起拉進 bundle，那個面板本來
// 是 dynamic(ssr:false) 延後載入的，這樣等於白費。
//
// ProjectFilesPanel 仍然對外 re-export 這幾個名字，既有的匯入不受影響。

// 資料模型從第一天就帶 projectId，雖然現在還沒有「專案」這個概念，
// 全部檔案都掛在同一個 id 底下。將來要分專案時不用改資料結構。
export const DEFAULT_PROJECT_ID = "default";

// 每個使用者的總容量。
export const PROJECT_CAPACITY_BYTES = 5 * 1024 * 1024;

// 單檔上限——這個數字必須跟 Firestore 規則裡 projectFiles 的
// `request.resource.data['size'] <= 524288` 一致，改這裡就要一起改規則，
// 否則寫入會被規則擋掉而不是在前端擋掉。
export const FILE_MAX_BYTES = 512 * 1024;

export function byteLen(text) {
  try { return new Blob([text]).size; } catch { return text.length; }
}
