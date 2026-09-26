import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import { onAuthStateChanged } from "firebase/auth";
import { subscribeIncomingMessages } from "../lib/incomingMessages";
import MessageNotificationHost from "../components/MessageNotificationHost";

jest.mock("../lib/firebase", () => ({ auth: {}, db: {} }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: jest.fn() }));
jest.mock("../lib/incomingMessages", () => ({ subscribeIncomingMessages: jest.fn() }));

let dom, root, authChanged, notify, stopMessages, stopAuth;
const item = (id = "new") => ({ id, senderId: "friend", senderName: "小明", avatarImage: "/friend.png", text: "你好，這是新的訊息" });
beforeEach(async () => {
  jest.useFakeTimers();
  dom = new JSDOM("<div id='root'></div>", { pretendToBeVisual: true, url: "http://localhost/feed" });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  stopMessages = jest.fn();
  stopAuth = jest.fn();
  onAuthStateChanged.mockImplementation((_, callback) => { authChanged = callback; return stopAuth; });
  subscribeIncomingMessages.mockImplementation((_, uid, callback) => { notify = callback; return stopMessages; });
  root = createRoot(document.getElementById("root"));
  await act(async () => root.render(<MessageNotificationHost />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  dom.window.close();
  delete global.window;
  delete global.document;
  delete global.IS_REACT_ACT_ENVIRONMENT;
  jest.clearAllMocks();
  jest.useRealTimers();
});

test("guests never subscribe; sign-out clears previews and rejects late callbacks from the prior account", async () => {
  await act(async () => authChanged({ uid: "guest", isAnonymous: true }));
  expect(subscribeIncomingMessages).not.toHaveBeenCalled();
  await act(async () => authChanged({ uid: "member", isAnonymous: false }));
  await act(async () => notify(item()));
  expect(document.body.textContent).toContain("小明");
  const previousNotify = notify;
  await act(async () => authChanged(null));
  expect(document.querySelector("img")).toBeNull();
  expect(stopMessages).toHaveBeenCalledTimes(1);
  await act(async () => previousNotify(item("late")));
  expect(document.body.textContent).not.toContain("小明");
});

test("notification dismisses automatically and has a working manual close action", async () => {
  await act(async () => authChanged({ uid: "member" }));
  await act(async () => notify(item()));
  expect(document.querySelector('aside[aria-live="polite"]')).not.toBeNull();
  await act(async () => jest.advanceTimersByTime(6000));
  expect(document.body.textContent).toContain("小明");
  await act(async () => jest.advanceTimersByTime(1000));
  expect(document.body.textContent).not.toContain("小明");
  await act(async () => notify(item("second")));
  await act(async () => Simulate.click(document.querySelector('[aria-label="關閉訊息通知"]')));
  expect(document.querySelector("img")).toBeNull();
});

test("rapid arrivals stay bounded and hidden tabs do not accumulate message previews", async () => {
  await act(async () => authChanged({ uid: "member" }));
  await act(async () => { notify(item("one")); notify(item("two")); notify(item("three")); });
  expect(document.querySelectorAll("img")).toHaveLength(2);
  Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
  await act(async () => notify({ ...item("hidden"), senderName: "背景訊息" }));
  expect(document.body.textContent).not.toContain("背景訊息");
});
