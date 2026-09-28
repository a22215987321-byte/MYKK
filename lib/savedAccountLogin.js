import { GoogleAuthProvider } from "firebase/auth";
import { auth, signInWithPopup } from "./firebase";
import { restoreAccountSession } from "./accountSessions";

export function signInWithGoogleAccount(email = "") {
  // A fresh provider prevents one account's hint leaking into another attempt.
  // login_hint only helps Google's picker; Firebase still verifies the identity.
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters(email ? { login_hint: email } : { prompt: "select_account" });
  return signInWithPopup(auth, provider);
}

export async function continueSavedAccount(account) {
  if (await restoreAccountSession(account.uid)) return true;
  if (account.providerIds?.includes("google.com")) {
    await signInWithGoogleAccount(account.email);
    return true;
  }
  // Legacy display-only entries have no proof of identity or provider. Do not
  // guess from an email domain, invent a password, or authenticate from metadata.
  return false;
}
