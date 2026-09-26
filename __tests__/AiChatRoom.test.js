import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import AiChatRoom from "../components/AiChatRoom";
import ChatMobileTabBar from "../components/ChatMobileTabBar";
import { useRouter } from "next/router";

jest.mock("../components/MarkdownMessage", () => ({
  __esModule: true, default: ({ content }) => <div className="ai-md">{content}</div>, MarkdownMessageStyles: () => null,
}));
jest.mock("../lib/firebase", () => ({ auth: { currentUser: { uid: "test-owner" } } }));
jest.mock("next/router", () => {
  const router = { push: jest.fn() };
  return { useRouter: () => router };
});
jest.mock("next/link", () => ({ href, children, ...props }) => <a href={href} {...props}>{children}</a>);
jest.mock("firebase/firestore", () => ({
  doc: (_, ...parts) => ({ parts }), collection: (_, ...parts) => ({ parts }),
  query: ref => ref, orderBy: () => ({}), limit: () => ({}), serverTimestamp: () => ({}),
  onSnapshot: (_, callback) => {
    callback({ docs: [{ id: "saved", data: () => ({ title: "原有對話", messages: [{ role: "user", content: "原有問題" }, { role: "assistant", content: "原有回覆" }] }) }] });
    return () => {};
  },
  getDoc: async () => ({ exists: () => false }),
  addDoc: async () => ({ id: "new" }), updateDoc: async () => {}, deleteDoc: async () => {},
}));

let dom, root, container, originalFetch;
beforeEach(() => {
  dom = new JSDOM("<div id='root'></div>", { url: "http://localhost/", pretendToBeVisual: true });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.innerWidth = 390;
  window.HTMLElement.prototype.scrollIntoView = () => {};
  originalFetch = global.fetch;
  global.fetch = jest.fn(async (_, options) => ({ ok: true, json: async () => options.method === "GET" ? { freellmapiEnabled: false } : { reply: "測試回覆" } }));
  container = document.getElementById("root");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  dom.window.close();
  global.fetch = originalFetch;
  delete global.window;
  delete global.document;
  delete global.IS_REACT_ACT_ENVIRONMENT;
  jest.clearAllMocks();
});
const render = async element => { await act(async () => root.render(element)); };
const click = async element => { expect(element).not.toBeNull(); await act(async () => Simulate.click(element)); };
const button = text => [...document.querySelectorAll("button")].find(el => el.textContent === text);

test("AI tab replaces Video, highlights the selection and routes correctly from standalone pages", async () => {
  await render(<ChatMobileTabBar activeTab="ai" />);
  expect(button("影片")).toBeUndefined();
  expect(button("AI 助手").getAttribute("aria-current")).toBe("page");
  await click(button("AI 助手"));
  expect(useRouter().push).toHaveBeenCalledWith("/?view=ai");
  const selectAi = jest.fn();
  await render(<ChatMobileTabBar onSelectAi={selectAi} />);
  await click(button("AI 助手"));
  expect(selectAi).toHaveBeenCalledTimes(1);
  expect(useRouter().push).toHaveBeenCalledTimes(1);
});

test("responsive toolbar preserves saved messages, modes, thinking and model selection", async () => {
  await render(<AiChatRoom user={{ uid: "test-owner" }} db={{}} />);
  expect(container.querySelectorAll('header[aria-label="AI 助手工具列"]')).toHaveLength(1);
  expect(container.textContent).toContain("原有回覆");
  await click(button("深度思考"));
  expect(button("深度思考").getAttribute("aria-pressed")).toBe("true");
  await click(button("圖片生成"));
  expect(container.querySelector('[aria-label="描述你想要的圖片"]')).not.toBeNull();
  await click(button("聊天模式"));
  expect(container.textContent).toContain("原有回覆");
  await click(container.querySelector('[aria-label="選擇 AI 模型"]'));
  await click(button("GPT-5"));
  expect(button("深度思考")).toBeUndefined();
  const input = container.querySelector('[aria-label="輸入訊息"]');
  await act(async () => Simulate.change(input, { target: { value: "新的問題" } }));
  await click(button("傳送"));
  expect(global.fetch).toHaveBeenCalledWith("/api/ai/chat", expect.objectContaining({
    method: "POST", body: JSON.stringify({ messages: [{ role: "user", content: "原有問題" }, { role: "assistant", content: "原有回覆" }, { role: "user", content: "新的問題" }], model: "gpt-5", thinking: false }),
  }));
  expect(container.textContent).toContain("測試回覆");
  expect(input.value).toBe("");
});

test("history can open and close using Escape, and a new conversation keeps empty sending disabled", async () => {
  await render(<AiChatRoom user={{ uid: "test-owner" }} db={{}} />);
  const history = container.querySelector('[aria-label="歷史對話（1）"]');
  await click(history);
  expect(history.getAttribute("aria-expanded")).toBe("true");
  expect(document.body.textContent).toContain("原有對話");
  await act(async () => document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(history.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(history);
  await click(container.querySelector('[aria-label="新對話"]'));
  expect(container.textContent).not.toContain("原有回覆");
  expect(button("傳送").disabled).toBe(true);
  expect(container.querySelector('[aria-label="新對話"]').disabled).toBe(true);
});

test("compact floating assistant keeps its original header and close/minimize controls", async () => {
  const onClose = jest.fn();
  const onMinimize = jest.fn();
  await render(<AiChatRoom user={{ uid: "test-owner" }} db={{}} compact onClose={onClose} onMinimize={onMinimize} />);
  expect(container.querySelector('header[aria-label="AI 助手工具列"]')).toBeNull();
  expect(container.querySelector('[aria-label="選擇 AI 模型"]')).toBeNull();
  await click(container.querySelector('[aria-label="縮小視窗"]'));
  await click(container.querySelector('[aria-label="關閉"]'));
  expect(onMinimize).toHaveBeenCalledTimes(1);
  expect(onClose).toHaveBeenCalledTimes(1);
});
