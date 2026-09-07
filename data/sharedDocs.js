// 站長要自動送給新朋友的文件。新帳號一註冊完成，就會在跟站長的私訊裡收到
// 這裡列出的每一份（見 lib/welcomeDocs.js）。
//
// 內容本身放在 public/shared-docs/<id>.md，不打包進 JS bundle：這兩份加起來
// 40KB，塞進 bundle 等於每個訪客不管有沒有要看都先下載一次。訊息卡片只存
// id 跟名字，內容要等使用者真的點開閱讀視窗時才抓。
//
// 要新增一份：把 .md 放進 public/shared-docs/，在下面加一列。id 就是檔名
// （不含副檔名），只用 ASCII——中文檔名在網址裡要編碼，容易在某些環境出錯。
export const SHARED_DOCS = [
  {
    id: "game-prompts-1",
    name: "遊戲 PROMPT 1.md",
    note: "8 個可直接複製的遊戲 prompt",
  },
  {
    id: "game-prompts-2",
    name: "遊戲 PROMPT 2.md",
    note: "12 個可直接複製的遊戲 prompt",
  },
];

export function sharedDocUrl(id) {
  return "/shared-docs/" + encodeURIComponent(id) + ".md";
}

export function findSharedDoc(id) {
  return SHARED_DOCS.find((d) => d.id === id) || null;
}
