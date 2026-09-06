// Client-side allowlist — every paid-feature gate in the app should read
// through isAdminEmail() instead of hardcoding its own check, so there's
// exactly one place to add/remove an admin account. This is NOT a real
// entitlement system (a user can see this file in the JS bundle); it just
// means "unlock everything for the site owner" without needing a real
// Firestore admin write for every gated feature.
const ADMIN_EMAILS = ["a22215987321@gmail.com"];

// 站長本人。新帳號註冊時會自動跟這個帳號互加好友（見 lib/autoFriend.js），
// 沿用這裡的名單當唯一來源，不另外寫一份會跟它不同步的設定。
export const OWNER_EMAIL = ADMIN_EMAILS[0];

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email);
}
