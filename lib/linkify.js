// 聊天訊息、貼文、留言裡的網址原本都是純文字，別人貼了連結只能反白複製，
// 點不動。這裡用同一份規則把字串切成「純文字」和「連結」兩種 token，三個
// 地方（ChatRoom / Feed / PostComments）共用，行為才會一致；真正的 <a> 由
// components/LinkifiedText.js 統一渲染。
//
// 只認 http:// https:// 與 www. 開頭（www. 補上 https:// 當 href）。其他
// scheme 一律留成純文字——javascript: data: 之類的東西不該因為有人把它打
// 在聊天室裡，就變成一個可以點的連結。

const URL_RE = /(?:https?:\/\/|www\.)[^\s]+/gi;

// 網址尾巴常常黏著句子的標點：「看這個 https://x.com/a。」、「(https://x.com/a)」。
// 這些字元屬於句子不屬於網址，要還給後面的純文字。
const TRAILING = ".,;:!?'\"、。，；：！？「」『』“”‘’…";

// 成對括號要判斷：/wiki/Foo_(bar) 的右括號是網址的一部分，
// 「(https://x.com/a)」的右括號不是。只有右比左多的時候才切掉。
const PAIRS = { ")": "(", "]": "[", "}": "{" };

function trimTail(raw) {
  let url = raw;
  while (url) {
    const last = url[url.length - 1];
    if (TRAILING.includes(last)) { url = url.slice(0, -1); continue; }
    const open = PAIRS[last];
    if (open) {
      const closes = url.split(last).length - 1;
      const opens = url.split(open).length - 1;
      if (closes > opens) { url = url.slice(0, -1); continue; }
    }
    break;
  }
  return url;
}

// 切完標點後還要像個網址才算數，不然「www.」後面接一個句號會被切成 "www"，
// 變成一個指向 https://www 的死連結。
function isUsable(url) {
  if (/^https?:\/\//i.test(url)) return /^https?:\/\/[a-z0-9]/i.test(url);
  return /^www\.[a-z0-9-]+\.[a-z0-9]/i.test(url);
}

export function toHref(url) {
  return /^www\./i.test(url) ? `https://${url}` : url;
}

// 回傳 [{ type: "text", value }, { type: "link", value, href }, ...]
// 純資料、不含 JSX，方便單元測試。
export function splitLinks(text) {
  if (!text) return [];
  const tokens = [];
  let last = 0;
  let m;
  URL_RE.lastIndex = 0;
  while ((m = URL_RE.exec(text))) {
    const url = trimTail(m[0]);
    if (!isUsable(url)) {
      // 這一段不是網址，指標往前推一格繼續找，避免無限迴圈。
      URL_RE.lastIndex = m.index + 1;
      continue;
    }
    if (m.index > last) tokens.push({ type: "text", value: text.slice(last, m.index) });
    tokens.push({ type: "link", value: url, href: toHref(url) });
    last = m.index + url.length;
    URL_RE.lastIndex = last;
  }
  if (last < text.length) tokens.push({ type: "text", value: text.slice(last) });
  return tokens;
}
