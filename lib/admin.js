// Client-side allowlist — every paid-feature gate in the app should read
// through isAdminEmail() instead of hardcoding its own check, so there's
// exactly one place to add/remove an admin account. This is NOT a real
// entitlement system (a user can see this file in the JS bundle); it just
// means "unlock everything for the site owner" without needing a real
// Firestore admin write for every gated feature.
const ADMIN_EMAILS = ["a22215987321@gmail.com"];

export function isAdminEmail(email) {
  return !!email && ADMIN_EMAILS.includes(email);
}
