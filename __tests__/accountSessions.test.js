import { getAuth, updateCurrentUser, signOut } from "firebase/auth";
import { auth } from "../lib/firebase";
import { rememberAccountSession, restoreAccountSession, forgetAccountSession, beginAccountLogin, logoutCurrentAccount } from "../lib/accountSessions";
import { removeSavedAccount, setPendingLoginEmail } from "../lib/accountSwitcher";

jest.mock("firebase/app", () => ({ getApps: () => [], initializeApp: (options, name) => ({ options, name }) }));
jest.mock("firebase/auth", () => ({ getAuth: jest.fn(), updateCurrentUser: jest.fn(async (target, user) => { target.currentUser = user; }), signOut: jest.fn(async target => { target.currentUser = null; }) }));
jest.mock("../lib/firebase", () => ({ auth: { app: { options: { projectId: "test-only" } }, currentUser: null } }));
jest.mock("../lib/accountSwitcher", () => ({ removeSavedAccount: jest.fn(), setPendingLoginEmail: jest.fn() }));
let sessions, first, second;
beforeEach(() => {
  jest.clearAllMocks(); sessions = new Map();
  first = { uid: "first", isAnonymous: false, getIdToken: jest.fn(async () => "test-token") };
  second = { uid: "second", isAnonymous: false, getIdToken: jest.fn(async () => "test-token") };
  auth.currentUser = first;
  getAuth.mockImplementation(app => {
    if (!sessions.has(app.name)) sessions.set(app.name, { currentUser: null, authStateReady: jest.fn(async () => {}) });
    return sessions.get(app.name);
  });
});

test("retains each account using SDK persistence, and restores the selected UID without passwords", async () => {
  await rememberAccountSession(second);
  expect(await restoreAccountSession("second")).toBe(true);
  expect(second.getIdToken).toHaveBeenCalledWith(true);
  expect(auth.currentUser).toBe(second);
  expect(sessions.get("evonchat-account-first").currentUser).toBe(first);
  expect(signOut).not.toHaveBeenCalled();
});
test("legacy metadata without a retained session needs real login", async () => {
  expect(await restoreAccountSession("second")).toBe(false);
  expect(auth.currentUser).toBe(first);
});
test("revoked identity is cleared and cannot become the active account", async () => {
  second.getIdToken.mockRejectedValue({ code: "auth/user-token-expired" });
  await rememberAccountSession(second);
  expect(await restoreAccountSession("second")).toBe(false);
  expect(auth.currentUser).toBe(first);
  expect(sessions.get("evonchat-account-second").currentUser).toBeNull();
});
test("network error preserves both identities and does not force logout", async () => {
  second.getIdToken.mockRejectedValue({ code: "auth/network-request-failed" });
  await rememberAccountSession(second);
  await expect(restoreAccountSession("second")).rejects.toMatchObject({ code: "auth/network-request-failed" });
  expect(auth.currentUser).toBe(first);
  expect(signOut).not.toHaveBeenCalled();
});
test("adding an account keeps the old session while returning to real login", async () => {
  await beginAccountLogin("second@example.test");
  expect(sessions.get("evonchat-account-first").currentUser).toBe(first);
  expect(auth.currentUser).toBeNull();
  expect(setPendingLoginEmail).toHaveBeenCalledWith("second@example.test");
});
test("explicit logout clears the active retained session but not other accounts", async () => {
  await rememberAccountSession(first); await rememberAccountSession(second);
  await logoutCurrentAccount();
  expect(auth.currentUser).toBeNull();
  expect(sessions.get("evonchat-account-first").currentUser).toBeNull();
  expect(sessions.get("evonchat-account-second").currentUser).toBe(second);
  expect(removeSavedAccount).toHaveBeenCalledWith("first");
});
test("forget removes both SDK session and display metadata", async () => {
  await rememberAccountSession(second); await forgetAccountSession("second");
  expect(sessions.get("evonchat-account-second").currentUser).toBeNull();
  expect(removeSavedAccount).toHaveBeenCalledWith("second");
});
test("anonymous identity is never retained as a member account", async () => {
  await rememberAccountSession({ uid: "guest", isAnonymous: true });
  expect(getAuth).not.toHaveBeenCalled();
});

test("evicted metadata cannot leave an inaccessible retained account", async () => {
  await rememberAccountSession(second);
  await rememberAccountSession(first, [second.uid]);
  expect(sessions.get("evonchat-account-second").currentUser).toBeNull();
  expect(sessions.get("evonchat-account-first").currentUser).toBe(first);
});

test("logout waits for an in-flight remember operation and cannot leave that session retained", async () => {
  const remembering = rememberAccountSession(first);
  const loggingOut = logoutCurrentAccount();
  await Promise.all([remembering, loggingOut]);
  expect(sessions.get("evonchat-account-first").currentUser).toBeNull();
  expect(auth.currentUser).toBeNull();
});
