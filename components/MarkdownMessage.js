import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check } from "lucide-react";

// 程式碼區塊右上角的複製鈕。AI 回覆裡的 prompt／指令幾乎都包在 ``` 區塊裡，
// 原本只能自己反白拖選，長一點的 prompt 很難選乾淨——GPT 和 Claude 的介面
// 都在這個位置放一顆複製鈕，這裡照做。
//
// 取文字時走 DOM 而不是解析 children：react-markdown 交進來的 children 是
// 巢狀的 React element（語法高亮會再切成更多層），自己遞迴拼字串既繁瑣又
// 容易漏掉換行。直接讀渲染完的 <pre> 的 textContent 拿到的就是使用者眼睛
// 看到的那段字，一字不差。
function CodeBlock({ children, ...rest }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(async (e) => {
    const pre = e.currentTarget.parentElement?.querySelector("pre");
    const text = pre?.textContent || "";
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* 沒有剪貼簿權限（http 或舊瀏覽器）就當作沒發生，不要跳錯誤 */ }
  }, []);
  return (
    <div className="ai-md-pre">
      <pre {...rest}>{children}</pre>
      <button type="button" className="ai-md-copy" onClick={copy}
        title={copied ? "已複製" : "複製"} aria-label="複製程式碼">
        {copied
          ? <Check size={13} strokeWidth={2.2} color="#16a34a" />
          : <Copy size={13} strokeWidth={1.9} />}
      </button>
    </div>
  );
}

const MD_COMPONENTS = { pre: CodeBlock };

// AI 回覆幾乎都是用 markdown 格式寫的（**粗體**、列點、標題、分隔線……），
// 但訊息泡泡原本是整包字串塞進 whiteSpace:pre-wrap 的 <div> 裡，markdown
// 語法完全沒被解析，星號原封不動印出來，而且沒有 block 元素之間的間距，
// 一堆說明擠成一團。這裡統一用 react-markdown 解析，CSS 只補「區塊之間
// 的間距」，顏色/字級跟著泡泡本身的 color/fontSize 走（不在這裡寫死）。
// AiChatRoom.js 跟 AiCompanionRoom.js 的訊息泡泡共用這一份，兩邊都有一樣
// 「星號沒解析、擠成一團」的問題，修一次兩邊都好。
export default function MarkdownMessage({ content }) {
  return (
    <div className="ai-md">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>{content}</ReactMarkdown>
    </div>
  );
}

// 渲染訊息的畫面（AiChatRoom.js／AiCompanionRoom.js）各自在訊息列表外面
// 掛一次這個，不要放進 MarkdownMessage 本身——MarkdownMessage 是每則訊息都
// 會渲染一次，style 標籤放裡面會變成每則訊息各印一份重複的 CSS。
export function MarkdownMessageStyles() {
  return (
    <style>{`
      .ai-md > *:first-child { margin-top: 0; }
      .ai-md > *:last-child { margin-bottom: 0; }
      .ai-md p { margin: 0 0 10px; line-height: 1.65; }
      .ai-md ul, .ai-md ol { margin: 0 0 10px; padding-left: 22px; }
      .ai-md li { margin-bottom: 4px; line-height: 1.6; }
      .ai-md li > p { margin-bottom: 4px; }
      .ai-md h1, .ai-md h2, .ai-md h3, .ai-md h4 { margin: 14px 0 8px; font-weight: 800; line-height: 1.4; }
      .ai-md h1 { font-size: 1.25em; }
      .ai-md h2 { font-size: 1.15em; }
      .ai-md h3, .ai-md h4 { font-size: 1.05em; }
      .ai-md hr { margin: 14px 0; border: none; border-top: 1px solid var(--border); }
      .ai-md strong { font-weight: 800; }
      .ai-md code { background: rgba(127,127,127,0.18); padding: 2px 5px; border-radius: 4px; font-size: 0.9em; }
      .ai-md pre { background: rgba(0,0,0,0.22); padding: 10px 12px; border-radius: 8px; overflow-x: auto; margin: 0 0 10px; }
      .ai-md pre code { background: none; padding: 0; }
      /* 複製鈕貼在區塊右上角。滑鼠不在區塊上時淡出，免得一整排 prompt 看起來
         都是按鈕；鍵盤 focus 時一定顯示，不然只用鍵盤的人找不到它。 */
      .ai-md-pre { position: relative; }
      .ai-md-pre pre { margin: 0 0 10px; }
      .ai-md-copy {
        position: absolute; top: 6px; right: 6px;
        display: flex; align-items: center; justify-content: center;
        width: 26px; height: 26px; padding: 0;
        border-radius: 7px; cursor: pointer;
        background: var(--panel); border: 1px solid var(--border);
        color: var(--text-muted);
        opacity: 0; transition: opacity 0.15s ease;
      }
      .ai-md-pre:hover .ai-md-copy,
      .ai-md-copy:focus-visible { opacity: 1; }
      /* 觸控裝置沒有 hover，永遠顯示 */
      @media (hover: none) { .ai-md-copy { opacity: 1; } }
      .ai-md blockquote { border-left: 3px solid var(--border); padding-left: 10px; opacity: 0.85; margin: 0 0 10px; }
      .ai-md table { border-collapse: collapse; margin: 0 0 10px; font-size: 0.92em; }
      .ai-md th, .ai-md td { border: 1px solid var(--border); padding: 4px 8px; }
      .ai-md a { color: inherit; text-decoration: underline; }
    `}</style>
  );
}
