// "Remembered accounts" for the settings-menu account switcher — stores
// just enough to show a pickable list (uid/email/nickname/avatar), never a
// password or token. Switching still goes through a real sign-in (see the
// "重新登入" recommendation this was built against) — this only saves the
// user from having to remember/retype which email goes with which account.
const STORAGE_KEY = "evonchat-saved-accounts";
const PENDING_EMAIL_KEY = "evonchat-pending-login-email";
const MAX_SAVED = 8;

export function getSavedAccounts() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

// Called once a login succeeds and the profile doc is loaded — adds/updates
// this account's entry (moved to the front) so the switcher list always
// reflects each account's latest nickname/avatar.
export function saveAccount({ uid, email, nickname, avatar, avatarImage, color }) {
  if (typeof window === "undefined" || !uid) return;
  try {
    const existing = getSavedAccounts().filter(a => a.uid !== uid);
    const next = [{ uid, email: email || "", nickname: nickname || "", avatar: avatar || "", avatarImage: avatarImage || "", color: color || "" }, ...existing].slice(0, MAX_SAVED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {}
}

export function removeSavedAccount(uid) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(getSavedAccounts().filter(a => a.uid !== uid)));
  } catch {}
}

// Set right before signing out to switch accounts, so the login screen can
// pre-fill the email of the account being switched to. Consumed once (see
// consumePendingLoginEmail) so it doesn't linger and pre-fill unrelated
// future visits to the login screen.
export function setPendingLoginEmail(email) {
  if (typeof window === "undefined") return;
  try { sessionStorage.setItem(PENDING_EMAIL_KEY, email || ""); } catch {}
}

export function consumePendingLoginEmail() {
  if (typeof window === "undefined") return "";
  try {
    const v = sessionStorage.getItem(PENDING_EMAIL_KEY) || "";
    sessionStorage.removeItem(PENDING_EMAIL_KEY);
    return v;
  } catch {
    return "";
  }
}
