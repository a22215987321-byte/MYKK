// Shared Firestore-timestamp formatting — used to be defined identically
// in components/Feed.js and pages/profile/[uid].js.
export function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "剛剛";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} 天前`;
  return d.toLocaleDateString("zh-TW", { month: "long", day: "numeric" });
}

// Full absolute datetime — used as a hover tooltip alongside the relative
// formatDate() above, so users can still see exactly when something happened.
export function formatFullDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleString("zh-TW", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
}
