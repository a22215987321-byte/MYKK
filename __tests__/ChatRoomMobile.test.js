import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import ChatRoom from "../components/ChatRoom";
import Feed from "../components/Feed";
import { auth } from "../lib/firebase";
import { onSnapshot, getDoc, updateDoc, addDoc, setDoc } from "firebase/firestore";
import { uploadToR2 } from "../lib/uploadToR2";
import { useRouter } from "next/router";

jest.mock("next/router", () => {
  const router = { isReady: true, query: {}, push: jest.fn(), replace: jest.fn() };
  return { useRouter: () => router };
});
jest.mock("next/link", () => {
  return function MockLink({ href, children, ...props }) { return <a href={href} {...props}>{children}</a>; };
});
jest.mock("next/dynamic", () => (loader) => {
  if (loader.toString().includes("AiChatRoom")) return function MockAiRoom() { return <div data-testid="ai-room">AI 測試內容</div>; };
  if (loader.toString().includes("MobileHomeList")) {
    return function MockHomeList(props) {
      const Component = require("../components/MobileHomeList").default;
      return <Component {...props} />;
    };
  }
  return () => null;
});
jest.mock("../lib/firebase", () => ({ db: {}, auth: { currentUser: { uid: "test-owner" }, signOut: jest.fn() } }));
jest.mock("firebase/auth", () => ({ onAuthStateChanged: (_, callback) => { callback({ uid: "test-owner" }); return () => {}; } }));
jest.mock("../lib/accountSessions", () => ({
  restoreAccountSession: jest.fn(), beginAccountLogin: jest.fn(),
  logoutCurrentAccount: () => require("../lib/firebase").auth.signOut(),
}));
jest.mock("firebase/firestore", () => ({
  doc: (_, ...parts) => ({ parts, kind: "doc" }),
  collection: (_, ...parts) => ({ parts, kind: "collection" }),
  query: ref => ref, where: () => ({}), orderBy: () => ({}), limit: () => ({}), limitToLast: () => ({}),
  onSnapshot: jest.fn(), getDoc: jest.fn(), getDocs: async () => ({ docs: [] }),
  updateDoc: jest.fn(async () => {}), setDoc: jest.fn(async () => {}), addDoc: jest.fn(async () => ({ id: "sent" })), increment: () => ({}),
  serverTimestamp: () => ({}), arrayUnion: () => ({}), arrayRemove: () => ({}),
}));
jest.mock("../lib/uploadToR2", () => ({ uploadToR2: jest.fn(async () => "https://example.test/photo.png") }));
jest.mock("../components/doc-convert", () => ({ DocConvertRoomLazy: () => null }));
jest.mock("../components/UpgradeMembership", () => ({ __esModule: true, default: () => null, UpgradeHighlights: () => null }));
jest.mock("../components/CalendarMemo", () => function MockCalendar() { return <div>日曆測試內容</div>; });
jest.mock("../components/AvatarCreator", () => function MockAvatarCreator({ onClose }) {
  return <div data-testid="avatar-creator"><button>男生</button><button>女生</button><button onClick={onClose}>儲存頭像</button></div>;
});
jest.mock("../components/PageNotes", () => () => null);
jest.mock("../components/ChatMoreMenu", () => () => null);
jest.mock("../components/VocabRoom", () => () => null);
jest.mock("../components/SpanishRoom", () => () => null);
jest.mock("../components/SpanishCourseRoom", () => () => null);
jest.mock("../components/CustomVocabRoom", () => () => null);
jest.mock("../components/DictionaryRoom", () => () => null);
jest.mock("../components/GithubTrendingRoom", () => () => null);
jest.mock("../components/ProfileView", () => function MockProfile({ onClose }) {
  return <section data-testid="embedded-profile"><button onClick={onClose} aria-label="返回動態消息">返回</button></section>;
});
jest.mock("../components/VideoHub", () => () => null);
jest.mock("../components/ChannelProfileView", () => () => null);
jest.mock("../components/SpanishPronunciation", () => () => null);
jest.mock("../components/SpanishGrammar", () => () => null);
jest.mock("../components/SpanishVerbConjugator", () => () => null);
jest.mock("../components/SpanishMcqPractice", () => () => null);
jest.mock("../components/EnglishPronunciation", () => () => null);
jest.mock("../components/EnglishMcqPractice", () => () => null);
jest.mock("../components/IeltsBand4", () => () => null);
jest.mock("../components/ImageEditorRoom", () => () => null);
jest.mock("../components/AiCompanionCreator", () => () => null);
jest.mock("../components/EmojiStickerPicker", () => function MockEmojiPicker({ onInsertEmoji, onSendItem }) {
  return <><button onClick={() => onInsertEmoji("😊")}>測試表情</button><button onClick={() => onSendItem({ id: "test-sticker", type: "sticker", src: "/test.png" })}>測試貼圖</button></>;
});
jest.mock("../components/FloatingAiChat", () => () => null);
jest.mock("../components/FloatingAudioPlayer", () => () => null);
jest.mock("../components/AudioRoom", () => () => null);
jest.mock("../components/VideoPlayer", () => () => null);
jest.mock("../components/SharePostModal", () => () => null);
jest.mock("../components/media-editor/MediaAttachPreview", () => () => null);

const profile = { nickname: "測試用戶", avatar: "😊", friends: ["test-friend"], status: "online" };
const friend = { nickname: "懶人很長的好友名稱測試", avatar: "😊", status: "away", statusText: "今天想聽音樂" };
const group = { id: "group-one", name: "213", avatar: "👥", members: ["test-owner"], createdBy: "test-owner" };
const post = { id: "post-one", userId: "test-owner", userNickname: "測試用戶", text: "測試動態內容", visibility: "public", likes: [], createdAt: new Date("2026-09-26") };
const snapshotDoc = (id, data) => ({ id, exists: () => !!data, data: () => data });
let dom, root, container;

beforeEach(() => {
  dom = new JSDOM("<!doctype html><html><body><div id='test-root'></div></body></html>", { url: "http://localhost/", pretendToBeVisual: true });
  global.window = dom.window;
  global.document = dom.window.document;
  global.localStorage = dom.window.localStorage;
  global.HTMLElement = dom.window.HTMLElement;
  global.requestAnimationFrame = () => 1;
  global.cancelAnimationFrame = () => {};
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.innerWidth = 390;
  window.matchMedia = () => ({ matches: false });
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLElement.prototype.scrollTo = () => {};
  onSnapshot.mockImplementation((ref, callback) => {
    if (ref.kind === "doc") callback(snapshotDoc(ref.parts.at(-1), ref.parts[0] === "users" ? (ref.parts[1] === "test-friend" ? friend : profile) : undefined));
    else {
      const path = ref.parts.join("/");
      const rows = path === "groups" ? [group] : path === "posts" ? [post] : path === "hall_messages" ? [
        { id: "hall-one", senderId: "test-owner", text: "", imageUrl: "/test-wide-image.png", createdAt: new Date() },
        { id: "hall-two", senderId: "test-friend", sender: friend.nickname, text: "測試大廳訊息", createdAt: new Date() },
      ] : [];
      callback({ docs: rows.map(row => snapshotDoc(row.id, row)), docChanges: () => [], empty: !rows.length, size: rows.length });
    }
    return () => {};
  });
  getDoc.mockImplementation(async ref => snapshotDoc(ref.parts.at(-1), ref.parts[1] === "test-friend" ? friend : profile));
  container = document.getElementById("test-root");
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  dom.window.close();
  delete global.window;
  delete global.document;
  delete global.localStorage;
  delete global.HTMLElement;
  delete global.requestAnimationFrame;
  delete global.cancelAnimationFrame;
  delete global.IS_REACT_ACT_ENVIRONMENT;
  jest.clearAllMocks();
  useRouter().query = {};
});

async function renderChat() { await act(async () => root.render(<ChatRoom user={{ uid: "test-owner", email: "test@example.test" }} />)); }
async function click(element) {
  expect(element).not.toBeNull();
  await act(async () => Simulate.click(element));
}
async function openGroup() {
  await click([...container.querySelectorAll(".cr-tabbar button")].find(el => el.textContent === "首頁"));
  await click([...container.querySelectorAll(".cr-main button.fb")].find(el => el.textContent.includes("213")));
}

test("embedded feed uses the topbar title without the old subtitle and keeps filtering", async () => {
  await renderChat();
  expect(container.querySelector(".cr-mobile-topbar").textContent).toContain("動態消息");
  expect(container.querySelector(".cr-mobile-topbar").textContent).not.toContain("Evonchat");
  expect(container.textContent).not.toContain("看看朋友近況");
  expect(container.textContent).toContain("測試動態內容");
  const search = container.querySelector('[aria-label="搜尋貼文"]');
  expect(search).not.toBeNull();
  await act(async () => Simulate.change(search, { target: { value: "不存在的字" } }));
  expect(container.textContent).not.toContain("測試動態內容");
  await click([...container.querySelectorAll("button")].find(el => el.textContent === "熱門"));
  expect(container.querySelector('button[aria-pressed="true"]').textContent).toBe("熱門");
});

test("mobile embedded profile removes the global calendar/settings bar and restores it on return", async () => {
  await renderChat();
  const author = [...container.querySelectorAll('.cr-main button')].find(el => el.textContent.startsWith('測試用戶'));
  await click(author);
  expect(container.querySelector('[data-testid="embedded-profile"]')).not.toBeNull();
  expect(container.querySelector('.cr-mobile-topbar')).toBeNull();
  expect(container.querySelector('.cr-tabbar')).not.toBeNull();
  await click(container.querySelector('[aria-label="返回動態消息"]'));
  expect(container.querySelector('.cr-mobile-topbar').textContent).toContain('動態消息');
  expect(container.querySelector('[aria-label="開啟日曆"]')).not.toBeNull();
});

test("mobile group has just one identity row with the same info/avatar/calendar/settings controls, with logout inside settings", async () => {
  await renderChat();
  await openGroup();
  expect(container.querySelectorAll(".cr-group-avatar")).toHaveLength(1);
  expect(container.querySelectorAll(".cr-chat-header")).toHaveLength(0);
  const header = container.querySelector(".cr-mobile-topbar");
  expect(header.textContent).toContain("213");
  expect(header.textContent).toContain("1 位成員");
  expect(header.querySelectorAll('input[type="file"]')).toHaveLength(1);
  const upload = header.querySelector('input[type="file"]');
  const fileClick = jest.spyOn(upload, "click").mockImplementation(() => {});
  await click(header.querySelector('[aria-label="更換群組頭像"]'));
  expect(fileClick).toHaveBeenCalledTimes(1);
  await click(header.querySelector('[aria-label="開啟日曆"]'));
  expect(container.querySelector(".cr-cal-open")).not.toBeNull();
  await click([...container.querySelectorAll("button")].find(el => el.textContent.includes("關閉")));
  await click(header.querySelector('[aria-label="查看群組資訊"]'));
  expect(container.textContent).toContain("群組設定");
  expect(header.querySelector('[aria-label="登出"]')).toBeNull();
  await click(header.querySelector('[aria-label="設定選單"]'));
  await click([...document.querySelectorAll("button")].find(el => el.textContent.trim() === "🚪 登出"));
  expect(auth.signOut).toHaveBeenCalledTimes(1);
});

test("the same group controls move back to the thread header on desktop without duplicates", async () => {
  await renderChat();
  await openGroup();
  window.innerWidth = 1440;
  await act(async () => window.dispatchEvent(new window.Event("resize")));
  expect(container.querySelectorAll(".cr-group-avatar")).toHaveLength(1);
  expect(container.querySelector(".cr-mobile-topbar .cr-group-avatar")).toBeNull();
  expect(container.querySelector(".cr-chat-header .cr-group-avatar")).not.toBeNull();
  expect(container.querySelector(".cr-chat-header").textContent).toContain("1 位成員");
});

test("standalone feed retains its mobile navigation, composer, search and sort", async () => {
  await act(async () => root.render(<Feed user={{ uid: "test-owner" }} />));
  expect(container.querySelector(".feed-mobile-topnav").textContent).toContain("動態消息");
  expect(container.textContent).not.toContain("看看朋友近況");
  expect(container.querySelector("textarea")).not.toBeNull();
  expect(container.querySelector('[aria-label="搜尋貼文"]')).not.toBeNull();
  expect(container.querySelector(".cr-tabbar")).not.toBeNull();
});

test("mobile AI tab removes the duplicate global toolbar without expanding account access", async () => {
  await renderChat();
  await click([...container.querySelectorAll(".cr-tabbar button")].find(el => el.textContent === "AI 助手"));
  expect(container.querySelector(".cr-mobile-topbar")).toBeNull();
  expect(container.textContent).toContain("此功能暫時僅限管理員帳號使用");
  expect(container.querySelector('[data-testid="ai-room"]')).toBeNull();
  expect(container.querySelector('.cr-tabbar[data-ai-glass="true"]')).toBeNull();
  expect(container.querySelector('.cr-tabbar [aria-current="page"]').textContent).toBe("AI 助手");
  await click([...container.querySelectorAll(".cr-tabbar button")].find(el => el.textContent === "首頁"));
  expect(container.querySelector(".cr-mobile-topbar")).not.toBeNull();
});

test("AI deep link opens the existing permitted room and can return home", async () => {
  useRouter().query = { view: "ai" };
  await act(async () => root.render(<ChatRoom user={{ uid: "test-owner", email: "a22215987321@gmail.com" }} />));
  expect(container.querySelector('[data-testid="ai-room"]')).not.toBeNull();
  expect(container.querySelector(".cr-mobile-topbar")).toBeNull();
  expect(container.querySelector(".cr-ai-glass-active")).not.toBeNull();
  expect(container.querySelector('.cr-tabbar[data-ai-glass="true"]')).not.toBeNull();
  expect(useRouter().replace).toHaveBeenCalledWith("/", undefined, { shallow: true });
  await click([...container.querySelectorAll(".cr-tabbar button")].find(el => el.textContent === "首頁"));
  expect(container.querySelector(".cr-mobile-topbar")).not.toBeNull();
  expect(container.querySelector('[data-testid="ai-room"]')).toBeNull();
  expect(container.querySelector(".cr-ai-glass-active")).toBeNull();
  expect(container.querySelector('.cr-tabbar[data-ai-glass="true"]')).toBeNull();
});

async function openHall() {
  await click([...container.querySelectorAll(".cr-tabbar button")].find(el => el.textContent === "首頁"));
  await click([...container.querySelectorAll(".cr-main button")].find(el => el.textContent.includes("# 公共大廳")));
}

test("mobile lobby has one header, constrained media, and one combined composer entry", async () => {
  await renderChat();
  await openHall();
  const header = container.querySelector(".cr-mobile-topbar");
  expect(header.textContent).toContain("公共大廳");
  expect(header.querySelectorAll("button")).toHaveLength(3); // back, calendar, settings
  expect(container.querySelectorAll(".cr-chat-header")).toHaveLength(0);
  expect(container.querySelectorAll('[data-conversation="hall"]')).toHaveLength(1);
  expect(container.querySelector('.cr-chat-panel img[alt="圖片"]').style.maxWidth).toBe("min(260px, 100%)");
  expect(container.textContent).toContain("測試大廳訊息");
  expect(container.querySelectorAll('[aria-label="新增附件或表情"]')).toHaveLength(1);
  expect(container.querySelector('button[title="表情/手勢"]')).toBeNull();
  const input = container.querySelector('.cr-input-bar input[type="file"]');
  const fileClick = jest.spyOn(input, "click").mockImplementation(() => {});
  await click(container.querySelector('[aria-label="新增附件或表情"]'));
  await click([...document.querySelectorAll("button")].find(el => el.textContent === "圖片／影片／檔案"));
  expect(fileClick).toHaveBeenCalledTimes(1);
  await click(container.querySelector('[aria-label="新增附件或表情"]'));
  await click([...document.querySelectorAll("button")].find(el => el.textContent === "表情／貼圖"));
  await click([...document.querySelectorAll("button")].find(el => el.textContent === "測試表情"));
  expect(container.querySelector('.cr-input-bar input[type="text"]').value).toBe("😊");
  await click(header.querySelector('[aria-label="返回列表"]'));
  expect(container.querySelector('.cr-chat-panel')).toBeNull();
});

test("private chat merges avatar/status into the mobile header and retains profile access", async () => {
  await renderChat();
  await click([...container.querySelectorAll(".cr-tabbar button")].find(el => el.textContent === "首頁"));
  await click([...container.querySelectorAll(".cr-main button.fb")].find(el => el.textContent.includes(friend.nickname)));
  const header = container.querySelector(".cr-mobile-topbar");
  expect(header.textContent).toContain(friend.nickname);
  expect(header.textContent).not.toContain("離開");
  expect(header.textContent).toContain("今天想聽音樂");
  expect(header.querySelectorAll('[aria-label="查看好友資訊"]')).toHaveLength(1);
  expect(container.querySelector(".cr-chat-header")).toBeNull();
  expect(container.querySelectorAll('[aria-label="新增附件或表情"]')).toHaveLength(1);
  await click(header.querySelector('[aria-label="查看好友資訊"]'));
  expect(container.querySelector('a[href="/profile/test-friend"]').textContent).toBe("查看個人檔案");
  await click(container.querySelector('[aria-label="返回"]'));
  expect(container.querySelector('[data-conversation="private:test-friend"]')).not.toBeNull();
  window.innerWidth = 1440;
  await act(async () => window.dispatchEvent(new window.Event("resize")));
  expect(container.querySelector('.cr-chat-header [aria-label="查看好友資訊"]')).not.toBeNull();
  expect(container.querySelector('.cr-mobile-topbar [aria-label="查看好友資訊"]')).toBeNull();
  expect(container.querySelector('.cr-sidebar').style.transform).toBe('');
  window.innerWidth = 390;
  await act(async () => window.dispatchEvent(new window.Event("resize")));
  expect(container.querySelector('.cr-sidebar').style.transform).toBe('translateX(-100%)');
});

test("cancelled native scrolling restores the drawer without navigating or opening it", async () => {
  await renderChat();
  await openHall();
  const pushState = jest.spyOn(window.history, "pushState");
  const shell = container.querySelector(".cr-shell");
  await act(async () => Simulate.pointerDown(shell, { pointerId: 1, pointerType: "touch", clientX: 100, clientY: 300 }));
  await act(async () => Simulate.pointerMove(shell, { pointerId: 1, clientX: 240, clientY: 310 }));
  await act(async () => Simulate.pointerCancel(shell, { pointerId: 1 }));
  expect(pushState).not.toHaveBeenCalled();
  expect(container.querySelector(".cr-main").style.transform).toBe("translateX(0px)");
  expect(container.querySelector('[data-conversation="hall"]')).not.toBeNull();
});

test.each([390, 1440])("friend invitation entries share the sage palette and retain both actions at %ipx", async width => {
  window.innerWidth = width;
  const defaultSnapshot = onSnapshot.getMockImplementation();
  onSnapshot.mockImplementation((ref, callback) => {
    if (ref.kind === "doc" && ref.parts.join("/") === "users/test-owner") {
      callback(snapshotDoc("test-owner", { ...profile, pendingIn: ["test-invite"] }));
      return () => {};
    }
    return defaultSnapshot(ref, callback);
  });
  await renderChat();
  if (width < 768) await click([...container.querySelectorAll(".cr-tabbar button")].find(el => el.textContent.startsWith("首頁")));
  const entries = [...container.querySelectorAll(".cr-friend-invite")];
  expect(entries).toHaveLength(2);
  const banner = container.querySelector(".cr-friend-invite-banner");
  expect(window.getComputedStyle(banner).textAlign).toBe("left");
  expect(window.getComputedStyle(banner).justifyContent).toBe("flex-start");
  for (const entry of entries) {
    const style = window.getComputedStyle(entry);
    expect(style.backgroundColor).toBe("rgb(229, 242, 233)");
    expect(style.color).toBe("rgb(54, 94, 70)");
    await click(entry);
    expect(container.querySelector(".cr-sheet h3").textContent).toBe("好友邀請 (1)");
    await click(container.querySelector(".cr-sheet .cr-close-btn"));
  }
  expect(banner.textContent).not.toContain("點擊查看");
});

test.each([390, 1440])("profile avatar options start collapsed and backdrop dismissal does not save at %ipx", async width => {
  window.innerWidth = width;
  useRouter().query = { view: "editProfile" };
  await renderChat();
  const dialog = container.querySelector('[role="dialog"][aria-label="個人資料設定"]');
  const toggle = dialog.querySelector('[aria-controls="profile-default-avatar"]');
  const options = dialog.querySelector('#profile-default-avatar');
  expect(toggle.parentElement.className).toBe('cr-profile-avatar-actions');
  expect(toggle.previousElementSibling.textContent).toContain('上傳頭像圖片');
  expect(toggle.textContent).toBe("預設頭像");
  expect(toggle.getAttribute('aria-expanded')).toBe('false');
  expect(options.hidden).toBe(true);
  await click(toggle);
  expect(toggle.getAttribute('aria-expanded')).toBe('true');
  expect(options.hidden).toBe(false);
  await click(options.querySelector('button'));
  expect(container.contains(dialog)).toBe(true);
  await click([...options.querySelectorAll('button')].find(button => button.textContent === '儲存頭像'));
  expect(options.hidden).toBe(true);
  expect(container.contains(dialog)).toBe(true);
  await act(async () => Simulate.change(dialog.querySelector('#profile-nickname'), { target: { value: '未儲存的暱稱' } }));
  updateDoc.mockClear();
  await click(dialog);
  expect(container.contains(dialog)).toBe(true);
  await click(container.querySelector('.cr-profile-overlay'));
  expect(container.querySelector('[role="dialog"][aria-label="個人資料設定"]')).toBeNull();
  expect(updateDoc).not.toHaveBeenCalled();
});

test("profile settings can close with Escape and still save explicitly", async () => {
  useRouter().query = { view: "editProfile" };
  await renderChat();
  const dialog = container.querySelector('[role="dialog"][aria-label="個人資料設定"]');
  updateDoc.mockClear();
  await act(async () => Simulate.keyDown(dialog, { key: 'Escape' }));
  expect(container.contains(dialog)).toBe(false);
  expect(updateDoc).not.toHaveBeenCalled();
  await click(container.querySelector('.cr-mobile-topbar [aria-label="設定選單"]'));
  await click([...document.querySelectorAll('button')].find(button => button.textContent.trim() === '👤 個人資料設定'));
  const reopened = container.querySelector('[role="dialog"][aria-label="個人資料設定"]');
  await act(async () => Simulate.change(reopened.querySelector('#profile-nickname'), { target: { value: '已儲存的暱稱' } }));
  await click([...reopened.querySelectorAll('button')].find(button => button.textContent === '儲存設定'));
  expect(updateDoc).toHaveBeenCalledWith(expect.objectContaining({ parts: ['users', 'test-owner'] }), expect.objectContaining({ nickname: '已儲存的暱稱' }));
  expect(container.contains(reopened)).toBe(false);
});

test("empty groups keep the heading and create action without the old placeholder", async () => {
  window.innerWidth = 1440;
  const defaultSnapshot = onSnapshot.getMockImplementation();
  onSnapshot.mockImplementation((ref, callback) => {
    if (ref.kind === 'collection' && ref.parts.join('/') === 'groups') {
      callback({ docs: [], docChanges: () => [], empty: true, size: 0 });
      return () => {};
    }
    return defaultSnapshot(ref, callback);
  });
  await renderChat();
  expect(container.textContent).toContain('群組 0');
  expect(container.textContent).not.toContain('還沒有群組');
  await click(container.querySelector('[title="建立群組"]'));
  expect(container.textContent).toContain('群組名稱');
});

async function renderTwoFriends() {
  window.innerWidth = 1440;
  const second = { ...friend, nickname: '第二位好友' };
  const originalSnapshot = onSnapshot.getMockImplementation();
  const listeners = new Map();
  const unsubscribers = new Map();
  onSnapshot.mockImplementation((ref, callback) => {
    const path = ref.parts.join('/');
    if (path === 'users/test-owner') {
      callback(snapshotDoc('test-owner', { ...profile, friends: ['test-friend', 'second-friend'] }));
      return () => {};
    }
    if (path.startsWith('private_chats/')) {
      listeners.set(path, callback);
      if (ref.kind === 'doc') callback(snapshotDoc(ref.parts[1], { unreadCount: { 'test-owner': 2 } }));
      else callback({ docs: [snapshotDoc('message', { senderId: ref.parts[1].split('_')[0], text: `專屬訊息 ${ref.parts[1]}` })], docChanges: () => [] });
      const unsubscribe = jest.fn();
      unsubscribers.set(path, unsubscribe);
      return unsubscribe;
    }
    return originalSnapshot(ref, callback);
  });
  getDoc.mockImplementation(async ref => snapshotDoc(ref.parts.at(-1), ref.parts[1] === 'second-friend' ? second : ref.parts[1] === 'test-friend' ? friend : profile));
  await renderChat();
  return { listeners, unsubscribers };
}
const friendButton = name => [...container.querySelectorAll('.cr-cal button.fb')].find(el => el.textContent.includes(name));
const privatePane = id => container.querySelector(`[data-workspace-pane="private:${id}"]`);
const draftInput = id => privatePane(id).querySelector('.cr-input-bar input[type="text"]');
async function typeDraft(id, value) { await act(async () => Simulate.change(draftInput(id), { target: { value } })); }

test('multiple friend tabs isolate messages, drafts, sends and subscriptions without replacing the hall', async () => {
  const { unsubscribers } = await renderTwoFriends();
  await click(friendButton(friend.nickname));
  await typeDraft('test-friend', '給第一位好友');
  await click(friendButton('第二位好友'));
  await typeDraft('second-friend', '給第二位好友');
  expect(privatePane('test-friend').textContent).toContain('專屬訊息 test-friend_test-owner');
  expect(privatePane('test-friend').textContent).not.toContain('專屬訊息 second-friend');
  expect(container.querySelector('[data-workspace-pane="conversations"] [data-conversation="hall"]')).not.toBeNull();
  await click(friendButton(friend.nickname));
  expect(container.querySelectorAll(`[data-workspace-tabs] button[title="${friend.nickname}"]`)).toHaveLength(1);
  expect(draftInput('test-friend').value).toBe('給第一位好友');
  expect(draftInput('second-friend').value).toBe('給第二位好友');
  await click(privatePane('test-friend').querySelector('.sb'));
  expect(addDoc).toHaveBeenLastCalledWith(expect.objectContaining({ parts: ['private_chats', 'test-friend_test-owner', 'messages'] }), expect.objectContaining({ text: '給第一位好友' }));
  expect(draftInput('test-friend').value).toBe('');
  expect(draftInput('second-friend').value).toBe('給第二位好友');
  await click(container.querySelector(`[aria-label="關閉${friend.nickname}"]`));
  expect(privatePane('test-friend')).toBeNull();
  expect(draftInput('second-friend').value).toBe('給第二位好友');
  expect(unsubscribers.get('private_chats/test-friend_test-owner/messages')).toHaveBeenCalledTimes(1);
  expect(unsubscribers.get('private_chats/second-friend_test-owner/messages')).not.toHaveBeenCalled();
});

test('moving a friend tab to the second block preserves its draft and marks only visible chats read', async () => {
  const { listeners } = await renderTwoFriends();
  await click(friendButton(friend.nickname));
  await typeDraft('test-friend', '移動後保留');
  await click(friendButton('第二位好友'));
  setDoc.mockClear();
  await act(async () => listeners.get('private_chats/test-friend_test-owner')(snapshotDoc('summary', { unreadCount: { 'test-owner': 3 } })));
  expect(setDoc.mock.calls.some(([ref]) => ref.parts[1] === 'test-friend_test-owner')).toBe(false);
  const tab = container.querySelector(`[data-workspace-tabs="A"] button[title="${friend.nickname}"]`);
  const target = container.querySelector('[data-workspace-tabs="B"] .cr-blocktabs');
  target.getBoundingClientRect = () => ({ left: 400, right: 700, top: 0, bottom: 60, width: 300, height: 60 });
  await act(async () => { Simulate.mouseDown(tab, { button: 0, clientX: 50, clientY: 20, stopPropagation() {} }); await new Promise(resolve => setTimeout(resolve, 520)); });
  await act(async () => document.dispatchEvent(new window.MouseEvent('mousemove', { clientX: 600, clientY: 30 })));
  await act(async () => document.dispatchEvent(new window.MouseEvent('mouseup', { clientX: 600, clientY: 30 })));
  expect(privatePane('test-friend').closest('[data-workspace-block]').dataset.workspaceBlock).toBe('B');
  expect(privatePane('second-friend').style.display).toBe('flex');
  expect(draftInput('test-friend').value).toBe('移動後保留');
  expect(setDoc.mock.calls.some(([ref]) => ref.parts[1] === 'test-friend_test-owner')).toBe(true);
  await click(privatePane('test-friend').querySelector('.sb'));
  expect(addDoc).toHaveBeenLastCalledWith(expect.objectContaining({ parts: ['private_chats', 'test-friend_test-owner', 'messages'] }), expect.objectContaining({ text: '移動後保留' }));
});

test('in-flight attachments and stickers stay addressed to their original friend after another tab opens', async () => {
  await renderTwoFriends();
  await click(friendButton(friend.nickname));
  let finishUpload;
  uploadToR2.mockImplementationOnce(() => new Promise(resolve => { finishUpload = resolve; }));
  await act(async () => Simulate.change(privatePane('test-friend').querySelector('input[type="file"]'), { target: { files: [{ name: 'photo.png', type: 'image/png', size: 100 }], value: 'photo.png' } }));
  await click(friendButton('第二位好友'));
  await act(async () => finishUpload('https://example.test/photo.png'));
  expect(addDoc).toHaveBeenLastCalledWith(expect.objectContaining({ parts: ['private_chats', 'test-friend_test-owner', 'messages'] }), expect.objectContaining({ imageUrl: 'https://example.test/photo.png' }));
  await click(friendButton(friend.nickname));
  await click(privatePane('test-friend').querySelector('[aria-label="新增附件或表情"]'));
  await click([...document.querySelectorAll('button')].find(el => el.textContent.includes('表情／貼圖')));
  await click([...privatePane('test-friend').querySelectorAll('button')].find(el => el.textContent === '測試貼圖'));
  expect(addDoc).toHaveBeenLastCalledWith(expect.objectContaining({ parts: ['private_chats', 'test-friend_test-owner', 'messages'] }), expect.objectContaining({ stickerId: 'test-sticker' }));
  await click(friendButton('第二位好友'));
  expect(container.textContent).not.toContain('測試貼圖');
});

test('maximized hall tabs start hidden, reveal on upward wheel anywhere, hide downward, and restore in split view', async () => {
  window.innerWidth = 1440;
  await renderChat();
  const tab = container.querySelector('[data-workspace-tabs="A"] button[title="對話"]');
  const tabs = container.querySelector('[data-workspace-tabs="A"]');
  const hall = container.querySelector('[data-conversation="hall"]');
  expect(tabs.hidden).toBe(false);
  await act(async () => Simulate.doubleClick(tab));
  expect(tabs.hidden).toBe(true);
  const composer = container.querySelector('[data-workspace-pane="conversations"] input[type="text"]');
  await act(async () => Simulate.wheel(composer, { deltaY: -30, deltaX: 0 }));
  expect(tabs.hidden).toBe(true);
  await act(async () => Simulate.touchStart(hall, { touches: [{ clientY: 200 }] }));
  await act(async () => Simulate.touchMove(hall, { touches: [{ clientY: 240 }] }));
  expect(tabs.hidden).toBe(false);
  await act(async () => Simulate.touchMove(hall, { touches: [{ clientY: 180 }] }));
  expect(tabs.hidden).toBe(true);
  await act(async () => Simulate.touchEnd(hall));
  hall.scrollTop = 400;
  await act(async () => Simulate.scroll(hall));
  expect(tabs.hidden).toBe(true);
  await act(async () => Simulate.wheel(hall, { deltaY: -30, deltaX: 0 }));
  expect(tabs.hidden).toBe(false);
  hall.scrollTop = 600; // resizing/pinning must not undo the reveal
  await act(async () => Simulate.scroll(hall));
  expect(tabs.hidden).toBe(false);
  await act(async () => Simulate.wheel(hall, { deltaY: 30, deltaX: 0 }));
  expect(tabs.hidden).toBe(true);
  await act(async () => Simulate.focus(container.querySelector('[aria-label="顯示分頁列"]')));
  expect(tabs.hidden).toBe(false);
  await act(async () => Simulate.doubleClick(tab));
  expect(tabs.hidden).toBe(false);
  await act(async () => Simulate.wheel(hall, { deltaY: 30, deltaX: 0 }));
  expect(tabs.hidden).toBe(false);
});

test('failed private sends restore only that friend draft', async () => {
  await renderTwoFriends();
  await click(friendButton(friend.nickname));
  await typeDraft('test-friend', '保留失敗訊息');
  await click(friendButton('第二位好友'));
  await typeDraft('second-friend', '另一個草稿');
  addDoc.mockRejectedValueOnce(new Error('test network failure'));
  await click(privatePane('test-friend').querySelector('.sb'));
  expect(draftInput('test-friend').value).toBe('保留失敗訊息');
  expect(draftInput('second-friend').value).toBe('另一個草稿');
});
