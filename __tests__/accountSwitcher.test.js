import { JSDOM } from "jsdom";
import { getSavedAccounts, saveAccount } from "../lib/accountSwitcher";

let dom;
beforeEach(() => {
  dom = new JSDOM("", { url: "http://localhost/" });
  global.window = dom.window; global.localStorage = dom.window.localStorage;
});
afterEach(() => { dom.window.close(); delete global.window; delete global.localStorage; });

test("remembers the verified login provider but never stores credential fields in account metadata", () => {
  saveAccount({ uid: "one", email: "one@example.test", providerIds: ["google.com"], password: "do-not-store", accessToken: "do-not-store" });
  const [account] = getSavedAccounts();
  expect(account.providerIds).toEqual(["google.com"]);
  expect(account).not.toHaveProperty("password");
  expect(account).not.toHaveProperty("accessToken");
  saveAccount({ uid: "one", nickname: "Updated profile" });
  expect(getSavedAccounts()[0].providerIds).toEqual(["google.com"]);
});

test("legacy metadata remains readable without guessing Google from the email address", () => {
  localStorage.setItem("evonchat-saved-accounts", JSON.stringify([{ uid: "old", email: "old@gmail.com" }]));
  expect(getSavedAccounts()[0].providerIds).toBeUndefined();
  saveAccount({ uid: "old", email: "old@gmail.com" });
  expect(getSavedAccounts()[0].providerIds).toEqual([]);
});
