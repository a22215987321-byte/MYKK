import { splitLinks } from "../lib/linkify";

// 聊天訊息／貼文／留言裡的網址統一由這裡渲染成可點的 <a>，三邊外觀一致：
//
// - 一律開新分頁（target="_blank" + rel="noopener noreferrer"）：點連結不會
//   把人帶離聊天室，Firestore 的即時訂閱也不會被整頁重載打斷。
// - color: inherit：連結沿用泡泡本身的字色（自己的紫底泡泡是白字、別人的
//   淺色泡泡是深字、貼文是 var(--text)），只靠底線表示「這是連結」。寫死
//   藍色的話在深色泡泡上會糊成一片。
// - wordBreak: break-word：長網址在 72% 寬的泡泡裡要能折行，不然會被泡泡的
//   overflow: hidden 裁掉尾巴。
// - stopPropagation：訊息泡泡外層有 onClick（點一下切換工具列），不攔的話
//   點連結會順便觸發泡泡的展開／收合。
export function linkAnchor(token, key) {
  return (
    <a
      key={key}
      href={token.href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={e => e.stopPropagation()}
      style={{ color: "inherit", textDecoration: "underline", wordBreak: "break-word" }}
    >
      {token.value}
    </a>
  );
}

// 一段純文字 → 夾雜 <a> 的節點陣列。回傳陣列（不是單一元素），呼叫端可以
// 用 parts.push(...linkifyNodes(seg)) 跟既有的切片邏輯拼在一起。
export function linkifyNodes(text, keyPrefix = "lk") {
  if (!text) return text ? [text] : [];
  return splitLinks(text).map((tk, i) =>
    tk.type === "link" ? linkAnchor(tk, `${keyPrefix}-${i}`) : tk.value
  );
}

export default function LinkifiedText({ text }) {
  return <>{linkifyNodes(text)}</>;
}
