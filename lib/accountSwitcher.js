// "Remembered accounts" for the settings-menu account switcher — stores
// just enough to show a pickable list (uid/email/nickname/avatar), never a
// password or token. Retained sessions are managed separately by Firebase's
// SDK in accountSessions.js; legacy entries may still require one sign-in.
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
export function saveAccount({ uid, email, nickname, avatar, avatarImage, color, providerIds }) {
  if (typeof window === "undefined" || !uid) return [];
  try {
    const saved = getSavedAccounts();
    const existing = saved.filter(a => a.uid !== uid);
    const providers = providerIds || saved.find(a => a.uid === uid)?.providerIds || [];
    const next = [{ uid, email: email || "", nickname: nickname || "", avatar: avatar || "", avatarImage: avatarImage || "", color: color || "", providerIds: providers }, ...existing].slice(0, MAX_SAVED);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    return existing.slice(MAX_SAVED - 1).map(account => account.uid);
  } catch {}
  return [];
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
