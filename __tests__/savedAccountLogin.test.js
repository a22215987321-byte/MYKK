import { GoogleAuthProvider } from "firebase/auth";
import { auth, signInWithPopup } from "../lib/firebase";
import { restoreAccountSession } from "../lib/accountSessions";
import { continueSavedAccount, signInWithGoogleAccount } from "../lib/savedAccountLogin";

jest.mock("firebase/auth", () => ({ GoogleAuthProvider: jest.fn().mockImplementation(() => ({ setCustomParameters: jest.fn() })) }));
jest.mock("../lib/firebase", () => ({ auth: {}, signInWithPopup: jest.fn(async () => ({})) }));
jest.mock("../lib/accountSessions", () => ({ restoreAccountSession: jest.fn() }));
beforeEach(() => { jest.clearAllMocks(); restoreAccountSession.mockResolvedValue(false); });

test("an existing verified session signs in with one click and no OAuth prompt", async () => {
  restoreAccountSession.mockResolvedValue(true);
  expect(await continueSavedAccount({ uid: "one", providerIds: ["google.com"] })).toBe(true);
  expect(restoreAccountSession).toHaveBeenCalledWith("one");
  expect(signInWithPopup).not.toHaveBeenCalled();
});
test("an expired Google session reauthenticates with Google, not an email/password form", async () => {
  expect(await continueSavedAccount({ uid: "one", email: "one@example.test", providerIds: ["google.com"] })).toBe(true);
  const provider = GoogleAuthProvider.mock.results[0].value;
  expect(provider.setCustomParameters).toHaveBeenCalledWith({ login_hint: "one@example.test" });
  expect(signInWithPopup).toHaveBeenCalledWith(auth, provider);
});
test.each([{}, { providerIds: ["password"] }])("metadata alone never authenticates or guesses a provider: %p", async metadata => {
  expect(await continueSavedAccount({ uid: "one", email: "example@gmail.com", ...metadata })).toBe(false);
  expect(signInWithPopup).not.toHaveBeenCalled();
});
test("network failure does not silently switch to a different authentication flow", async () => {
  restoreAccountSession.mockRejectedValueOnce({ code: "auth/network-request-failed" });
  await expect(continueSavedAccount({ uid: "one", providerIds: ["google.com"] })).rejects.toMatchObject({ code: "auth/network-request-failed" });
  expect(signInWithPopup).not.toHaveBeenCalled();
});
test("Google popup cancellation does not claim login succeeded", async () => {
  signInWithPopup.mockRejectedValueOnce({ code: "auth/popup-closed-by-user" });
  await expect(continueSavedAccount({ uid: "one", providerIds: ["google.com"] })).rejects.toMatchObject({ code: "auth/popup-closed-by-user" });
});
test("a fresh general Google login does not retain another account's login hint", async () => {
  await signInWithGoogleAccount("one@example.test");
  await signInWithGoogleAccount();
  expect(GoogleAuthProvider.mock.results[1].value.setCustomParameters).toHaveBeenCalledWith({ prompt: "select_account" });
});
