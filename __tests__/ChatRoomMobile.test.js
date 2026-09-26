import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import ChatRoom from "../components/ChatRoom";
import Feed from "../components/Feed";
import { auth } from "../lib/firebase";
import { onSnapshot, getDoc } from "firebase/firestore";
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
jest.mock("firebase/firestore", () => ({
  doc: (_, ...parts) => ({ parts, kind: "doc" }),
  collection: (_, ...parts) => ({ parts, kind: "collection" }),
  query: ref => ref, where: () => ({}), orderBy: () => ({}), limit: () => ({}), limitToLast: () => ({}),
  onSnapshot: jest.fn(), getDoc: jest.fn(), getDocs: async () => ({ docs: [] }),
  updateDoc: async () => {}, setDoc: async () => {},
  serverTimestamp: () => ({}), arrayUnion: () => ({}), arrayRemove: () => ({}),
}));
jest.mock("../components/doc-convert", () => ({ DocConvertRoomLazy: () => null }));
jest.mock("../components/UpgradeMembership", () => ({ __esModule: true, default: () => null, UpgradeHighlights: () => null }));
jest.mock("../components/CalendarMemo", () => function MockCalendar() { return <div>日曆測試內容</div>; });
jest.mock("../components/AvatarCreator", () => () => null);
jest.mock("../components/PageNotes", () => () => null);
jest.mock("../components/ChatMoreMenu", () => () => null);
jest.mock("../components/VocabRoom", () => () => null);
jest.mock("../components/SpanishRoom", () => () => null);
jest.mock("../components/SpanishCourseRoom", () => () => null);
jest.mock("../components/CustomVocabRoom", () => () => null);
jest.mock("../components/DictionaryRoom", () => () => null);
jest.mock("../components/GithubTrendingRoom", () => () => null);
jest.mock("../components/ProfileView", () => () => null);
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
jest.mock("../components/EmojiStickerPicker", () => function MockEmojiPicker({ onInsertEmoji }) {
  return <button onClick={() => onInsertEmoji("😊")}>測試表情</button>;
});
jest.mock("../components/FloatingAiChat", () => () => null);
jest.mock("../components/FloatingAudioPlayer", () => () => null);
jest.mock("../components/AudioRoom", () => () => null);
jest.mock("../components/VideoPlayer", () => () => null);
jest.mock("../components/SharePostModal", () => () => null);
jest.mock("../components/media-editor/MediaAttachPreview", () => () => null);

const profile = { nickname: "測試用戶", avatar: "😊", friends: ["test-friend"], status: "online" };
const friend = { nickname: "懶人很長的好友名稱測試", avatar: "😊", status: "away" };
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
  expect(container.querySelector('.cr-tabbar [aria-current="page"]').textContent).toBe("AI 助手");
  await click([...container.querySelectorAll(".cr-tabbar button")].find(el => el.textContent === "首頁"));
  expect(container.querySelector(".cr-mobile-topbar")).not.toBeNull();
});

test("AI deep link opens the existing permitted room and can return home", async () => {
  useRouter().query = { view: "ai" };
  await act(async () => root.render(<ChatRoom user={{ uid: "test-owner", email: "a22215987321@gmail.com" }} />));
  expect(container.querySelector('[data-testid="ai-room"]')).not.toBeNull();
  expect(container.querySelector(".cr-mobile-topbar")).toBeNull();
  expect(useRouter().replace).toHaveBeenCalledWith("/", undefined, { shallow: true });
  await click([...container.querySelectorAll(".cr-tabbar button")].find(el => el.textContent === "首頁"));
  expect(container.querySelector(".cr-mobile-topbar")).not.toBeNull();
  expect(container.querySelector('[data-testid="ai-room"]')).toBeNull();
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
  expect(header.textContent).toContain("離開");
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
