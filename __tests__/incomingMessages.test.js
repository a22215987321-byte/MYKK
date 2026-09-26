import { getDoc, onSnapshot } from "firebase/firestore";
import { createIncomingSummaryTracker, messagePreviewText, subscribeIncomingMessages } from "../lib/incomingMessages";

jest.mock("../lib/firebase", () => ({ db: {} }));
jest.mock("firebase/firestore", () => ({
  doc: (_, ...parts) => ({ path: parts.join("/") }),
  collection: (_, ...parts) => ({ path: parts.join("/") }),
  query: (ref, filter) => ({ ...ref, filter }),
  where: (...args) => args,
  onSnapshot: jest.fn(), getDoc: jest.fn(),
}));

const summary = (time, sender = "friend", text = "新的訊息") => ({
  lastMessageAt: { seconds: time, nanoseconds: 123 }, lastSenderId: sender, lastMessage: text,
});
const snapshot = data => ({ exists: () => !!data, data: () => data, metadata: {} });

test("only new server-confirmed incoming summaries notify; history, self, counts and duplicates do not", () => {
  const notify = jest.fn();
  const track = createIncomingSummaryTracker("me", notify);
  track(summary(1), { fromCache: true });
  track(summary(2));
  expect(notify).not.toHaveBeenCalled();
  track(summary(3, "me"));
  track({ ...summary(3, "me"), unreadCount: { me: 0 } });
  track(summary(4), { hasPendingWrites: true });
  expect(notify).not.toHaveBeenCalled();
  track(summary(4));
  track(summary(4));
  track({ ...summary(4), unreadCount: { me: 0 } });
  expect(notify).toHaveBeenCalledTimes(1);
  track(summary(5, "friend", "新的訊息"));
  expect(notify).toHaveBeenCalledTimes(2);
});

test("a new private conversation can notify after the initial missing document", () => {
  const notify = jest.fn();
  const track = createIncomingSummaryTracker("me", notify);
  track(null);
  track(summary(1));
  expect(notify).toHaveBeenCalledTimes(1);
  track({ lastSenderId: "friend", lastMessage: "pending", lastMessageAt: null });
  expect(notify).toHaveBeenCalledTimes(1);
});

test("previews have bounded plain text, preserving meaningful line breaks", () => {
  expect(messagePreviewText("  第一行\n第二行  ")).toBe("第一行\n第二行");
  expect(messagePreviewText("x".repeat(300))).toBe("x".repeat(180) + "…");
  expect(messagePreviewText(null)).toBe("傳來一則新訊息");
});

let listeners;
beforeEach(() => {
  listeners = new Map();
  onSnapshot.mockImplementation((ref, ...args) => {
    const callbacks = args.filter(value => typeof value === "function");
    const listener = { ref, next: callbacks[0], error: callbacks[1], stop: jest.fn() };
    listeners.set(ref.path, listener);
    return listener.stop;
  });
  getDoc.mockResolvedValue(snapshot({ nickname: "小明", avatarImage: "/avatar.png", avatar: "😊" }));
});
afterEach(() => jest.clearAllMocks());
const flush = async () => { for (let i = 0; i < 6; i += 1) await Promise.resolve(); };
const groupsSnapshot = rows => ({ docs: rows.map(([id, data]) => ({ id, data: () => data })), metadata: {} });

test("subscribes only to permitted friend summaries and member groups, without reading all private chats", async () => {
  const notify = jest.fn();
  const stop = subscribeIncomingMessages({}, "me", notify);
  listeners.get("users/me").next(snapshot({ friends: ["friend", "blocked"], blocked: ["blocked"] }));
  expect(listeners.has("private_chats/blocked_me")).toBe(false);
  expect(listeners.get("groups").ref.filter).toEqual(["members", "array-contains", "me"]);
  const privateChat = listeners.get("private_chats/friend_me");
  privateChat.next(snapshot(summary(1)));
  privateChat.next(snapshot(summary(2)));
  await flush();
  expect(notify).toHaveBeenCalledWith(expect.objectContaining({ senderName: "小明", avatarImage: "/avatar.png", text: "新的訊息" }));
  expect([...listeners.keys()]).not.toContain("private_chats");
  stop();
  for (const listener of listeners.values()) expect(listener.stop).toHaveBeenCalledTimes(1);
});

test("new group messages notify but joining, leaving, blocked senders and non-member groups do not", async () => {
  const notify = jest.fn();
  const stop = subscribeIncomingMessages({}, "me", notify);
  listeners.get("users/me").next(snapshot({ friends: [], blocked: ["blocked"] }));
  const publish = (time, sender = "friend", members = ["me"]) => listeners.get("groups").next(groupsSnapshot([
    ["team", { ...summary(time, sender), members, name: "朋友群組" }],
  ]));
  publish(1);
  publish(2);
  await flush();
  expect(notify).toHaveBeenCalledWith(expect.objectContaining({ groupName: "朋友群組" }));
  publish(3, "blocked");
  publish(4, "friend", ["someone-else"]);
  await flush();
  expect(notify).toHaveBeenCalledTimes(1);
  stop();
});

test.each(["sign-out", "removed-friend"])("drops pending avatar lookups after %s", async action => {
  let resolveProfile;
  getDoc.mockImplementation(() => new Promise(resolve => { resolveProfile = resolve; }));
  const notify = jest.fn();
  const stop = subscribeIncomingMessages({}, "me", notify);
  listeners.get("users/me").next(snapshot({ friends: ["friend"] }));
  const chat = listeners.get("private_chats/friend_me");
  chat.next(snapshot(summary(1)));
  chat.next(snapshot(summary(2)));
  if (action === "sign-out") stop();
  else listeners.get("users/me").next(snapshot({ friends: [] }));
  resolveProfile(snapshot({ nickname: "不應顯示" }));
  await flush();
  expect(notify).not.toHaveBeenCalled();
  if (action !== "sign-out") stop();
});
