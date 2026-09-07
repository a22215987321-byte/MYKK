// 文件內文的排版樣式。專案檔案的閱讀區（.pf-doc）跟分享文件的閱讀視窗
// 共用這一份——兩邊必須看起來完全一樣，各留一份複製品遲早會漂移。
//
// 兩個地方都會渲染這個元件；同名的 CSS 規則重複出現對瀏覽器沒有影響，
// 但同時只會有一份真的被用到（同一時間只開得了其中一個視窗）。
export default function DocStyles() {
  return (
    <style>{`
      /* 內文字體。中文由 _document.js 載入的 Noto Serif TC 負責（英文仍是
         本機 Georgia）。刻意不再指名 Songti TC（macOS 專有）與 PMingLiU
         （新細明體，筆畫細到讀不舒服）——真正的修正是把網頁字體載進來，
         不要靠使用者本機裝了什麼。
         weight 500 是 Noto Serif TC 實際有載入的字重，不是瀏覽器合成的假粗；
         Georgia 沒有 500，CSS 比對規則會讓它退回真實的 400，也不會假粗。 */
      /* margin:0 auto——最大化或左欄收合時右欄會變得比 74ch 寬很多，文章
         靠左會整段偏到一邊。預設寬度下右欄實際可用約 663px、74ch 在 18px
         Georgia 下約 666px，兩者幾乎相等，所以這行對預設外觀是 no-op，
         只在真的變寬時才發揮作用。 */
      /* 數字專用字面。Georgia 用的是「舊式數字」（oldstyle figures）：
         3 4 5 7 9 天生就設計成掉到基線以下、6 8 又比較高。當內文只是隨手
         提到一個年份還好，但一進表格就整欄高高低低對不齊，量測到最大下沉
         有 9px。系統版 Georgia 沒有等高數字可以切換（那是商業版 Georgia Pro
         才有的功能），所以 font-variant-numeric 對它完全無效——唯一的辦法
         是讓 U+0030-0039 這 10 個字元改由別的字體來畫，字母仍舊走 Georgia。
         順序是實測挑的：Book Antiqua 的數字高度 33px 跟 Georgia 完全一致，
         擺在 Georgia 的字母旁邊看不出接縫；Times New Roman 差 1px，但幾乎
         每台 Windows／Mac 都有，是主力保險；後兩個是 Linux／ChromeOS 上
         metric 相容的替代品。都沒有的話會落回 Georgia，就是現在的樣子，
         不會壞掉。
         （Cambria、Constantia、Palatino 實測也是舊式數字，不能用。） */
      @font-face {
        font-family: "PfLiningNum";
        src: local("Book Antiqua"), local("Times New Roman"),
             local("Tinos"), local("Liberation Serif");
        unicode-range: U+0030-0039;
      }
      .pf-doc { font-family: "PfLiningNum", Georgia, "Times New Roman", "Noto Serif TC", serif;
        font-size: 18px; font-weight: 500; line-height: 1.85; color: var(--text);
        font-variant-numeric: lining-nums;
        max-width: 74ch; margin: 0 auto; }
      .pf-doc > *:first-child { margin-top: 0; }
      .pf-doc p { margin: 0 0 1.05em; }
      .pf-doc strong { font-weight: 800; }
      .pf-doc h1 { font-size: 1.85em; font-weight: 800; margin: 1.4em 0 0.5em; line-height: 1.3; }
      .pf-doc h2 { font-size: 1.5em; font-weight: 800; margin: 1.35em 0 0.45em; line-height: 1.35; }
      .pf-doc h3 { font-size: 1.22em; font-weight: 800; margin: 1.3em 0 0.4em; }
      .pf-doc ul { list-style: disc; padding-left: 1.5em; margin: 0 0 1.05em; }
      .pf-doc ol { padding-left: 1.5em; margin: 0 0 1.05em; }
      .pf-doc li { margin-bottom: 0.4em; }
      .pf-doc a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
      .pf-doc blockquote { margin: 0 0 1.05em; padding-left: 1em;
        border-left: 2px solid var(--border); color: var(--text-muted); }
      .pf-doc hr { border: none; border-top: 1px solid var(--border); margin: 1.8em 0; }
      .pf-doc code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        font-size: 0.86em; background: var(--panel-alt); padding: 2px 5px; border-radius: 5px; }
      .pf-doc pre { background: var(--panel-alt); padding: 14px 16px; border-radius: 10px;
        overflow-x: auto; margin: 0 0 1.05em; }
      .pf-doc pre code { background: none; padding: 0; }
      .pf-doc table { border-collapse: collapse; margin: 0 0 1.05em; font-size: 0.92em; }
      /* tabular-nums 讓每個數字佔一樣寬——表格欄位才會上下切齊。只加在
         儲存格，內文不加：等寬數字在句子裡會讓 1 的左右空得很明顯。 */
      .pf-doc th, .pf-doc td { border: 1px solid var(--border); padding: 6px 10px;
        font-variant-numeric: lining-nums tabular-nums; }
    `}</style>
  );
}
