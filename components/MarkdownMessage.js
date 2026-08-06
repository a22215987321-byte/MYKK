import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
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
      .ai-md blockquote { border-left: 3px solid var(--border); padding-left: 10px; opacity: 0.85; margin: 0 0 10px; }
      .ai-md table { border-collapse: collapse; margin: 0 0 10px; font-size: 0.92em; }
      .ai-md th, .ai-md td { border: 1px solid var(--border); padding: 4px 8px; }
      .ai-md a { color: inherit; text-decoration: underline; }
    `}</style>
  );
}
