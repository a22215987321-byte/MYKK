// 貼文可視範圍——公開（預設，所有人）／好友可見／僅自己。ProfileView.js的
// 個人頁「貼文」分頁其實已經有這套機制（VISIBILITY_OPTS／VisibilityMenu／
// visiblePosts 過濾，都是先前就做好的），這裡的 id／label／順序刻意照抄
// 一樣的文字，讓 Feed.js（動態消息）新加的選擇器跟個人頁看起來、用起來是
// 同一套東西，不是另外發明一套不同措辭的萬用字義。
export const VISIBILITY_OPTIONS = [
  { id: "public", label: "公開", icon: "🌐", hint: "所有人都能看到" },
  { id: "friends", label: "好友可見", icon: "👥", hint: "只有你的好友看得到" },
  { id: "private", label: "僅自己", icon: "🔒", hint: "只有你自己看得到" },
];

export function visibilityMeta(id) {
  return VISIBILITY_OPTIONS.find(o => o.id === id) || VISIBILITY_OPTIONS[0];
}

// 貼文對某個瀏覽者是否可見——貼文作者永遠看得到自己的貼文；沒有 visibility
// 欄位（舊貼文，這個功能上線前發的）一律當公開處理。這是「前端這一層」的
// 把關，畫面上不會顯示不該給這個人看的貼文；真正滴水不漏的隱私保護還是要靠
// Firestore 安全規則擋住讀取本身——這份規則設定在 Firebase 後台，不在這個
// 程式碼倉庫裡，這裡改不到，需要另外去 Firebase Console 補上。
export function canViewPost(post, viewerUid, viewerFriends) {
  const vis = post.visibility || "public";
  if (vis === "public") return true;
  if (post.userId === viewerUid) return true;
  if (vis === "friends") return (viewerFriends || []).includes(post.userId);
  return false; // private，而且不是作者本人
}
