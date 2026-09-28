import { getApps, initializeApp } from "firebase/app";
import { getAuth, updateCurrentUser, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { removeSavedAccount, setPendingLoginEmail } from "./accountSwitcher";

// Credentials are persisted and refreshed by Firebase, never copied into our
// metadata/localStorage list. Each remembered account owns a named Auth app.
function sessionFor(uid) {
  const name = `evonchat-account-${uid}`;
  const app = getApps().find(item => item.name === name) || initializeApp(auth.app.options, name);
  return getAuth(app);
}

const pending = new Map();
function withSession(uid, action) {
  const operation = (pending.get(uid) || Promise.resolve()).catch(() => {}).then(() => action(sessionFor(uid)));
  pending.set(uid, operation);
  const clear = () => { if (pending.get(uid) === operation) pending.delete(uid); };
  operation.then(clear, clear);
  return operation;
}

export async function rememberAccountSession(user = auth.currentUser, evictedUids = []) {
  if (!user || user.isAnonymous) return;
  await withSession(user.uid, async retained => {
    await retained.authStateReady();
    await updateCurrentUser(retained, user);
  });
  // Do not leave an invisible retained login when the eight-account list evicts it.
  await Promise.all(evictedUids.filter(uid => uid !== user.uid).map(forgetAccountSession));
}

export async function restoreAccountSession(uid) {
  if (!uid) return false;
  const retained = sessionFor(uid);
  await retained.authStateReady();
  const user = retained.currentUser;
  if (!user || user.uid !== uid || user.isAnonymous) return false;
  try {
    // Refresh before changing the active account. Expired/revoked sessions must
    // return to real authentication, not be mistaken for a successful switch.
    await user.getIdToken(true);
  } catch (error) {
    if (["auth/user-token-expired", "auth/invalid-user-token", "auth/user-disabled", "auth/user-not-found"].includes(error.code)) {
      await signOut(retained);
      return false;
    }
    throw error; // A network failure must not sign the current account out.
  }
  await rememberAccountSession();
  await updateCurrentUser(auth, user);
  return true;
}

export async function beginAccountLogin(email = "") {
  await rememberAccountSession();
  setPendingLoginEmail(email);
  await signOut(auth);
}

export async function forgetAccountSession(uid) {
  await withSession(uid, async retained => {
    await retained.authStateReady();
    await signOut(retained);
    removeSavedAccount(uid);
  });
}

export async function logoutCurrentAccount() {
  const current = auth.currentUser;
  await signOut(auth);
  if (current && !current.isAnonymous) await forgetAccountSession(current.uid);
}
