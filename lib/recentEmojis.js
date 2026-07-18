// 最近使用的表情/貼圖，存在 localStorage，用來填「常用」分類。
const KEY = "evonchat_recent_emojis";
const MAX = 20;

export function getRecentEmojis() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (_) {
    return [];
  }
}

// item: 完整的手勢包項目物件（含 id/type/label/emoji 或 src/keywords）
export function addRecentEmoji(item) {
  if (typeof window === "undefined" || !item?.id) return;
  try {
    const list = getRecentEmojis().filter(i => i.id !== item.id);
    list.unshift(item);
    window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)));
  } catch (_) {}
}
