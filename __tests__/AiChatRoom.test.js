import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import AiChatRoom from "../components/AiChatRoom";
import ChatMobileTabBar from "../components/ChatMobileTabBar";
import { useRouter } from "next/router";
import { onSnapshot, writeBatch, updateDoc } from "firebase/firestore";

jest.mock("../components/MarkdownMessage", () => ({
  __esModule: true, default: ({ content }) => <div className="ai-md">{content}</div>, MarkdownMessageStyles: () => null,
}));
jest.mock("../lib/firebase", () => ({ auth: { currentUser: { uid: "test-owner" } } }));
jest.mock("next/router", () => {
  const router = { push: jest.fn() };
  return { useRouter: () => router };
});
jest.mock("next/link", () => function MockLink({ href, children, ...props }) { return <a href={href} {...props}>{children}</a>; });
jest.mock("firebase/firestore", () => ({
  doc: (_, ...parts) => ({ parts }), collection: (_, ...parts) => ({ parts }),
  query: ref => ref, orderBy: () => ({}), limit: () => ({}), serverTimestamp: () => ({}),
  onSnapshot: jest.fn(), writeBatch: jest.fn(),
  getDoc: async () => ({ exists: () => false }),
  addDoc: async () => ({ id: "new" }), updateDoc: jest.fn(async () => {}),
}));

const saved = { id: "saved", title: "原有對話", messages: [{ role: "user", content: "原有問題" }, { role: "assistant", content: "原有回覆" }] };
const second = { id: "second", title: "另一份對話", messages: [{ role: "user", content: "另一個問題" }] };
const third = { id: "third", title: "保留的對話", messages: [{ role: "user", content: "不能刪掉" }] };
const snapshot = records => ({ docs: records.map(record => ({ id: record.id, data: () => record })) });
let dom, root, container, originalFetch, batchDelete, batchCommit;
beforeEach(() => {
  onSnapshot.mockImplementation((_, callback) => { callback(snapshot([saved])); return () => {}; });
  batchDelete = jest.fn();
  batchCommit = jest.fn(async () => {});
  writeBatch.mockImplementation(() => ({ delete: batchDelete, commit: batchCommit }));
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
const selectConversation = async (title, checked = true) => {
  const input = container.querySelector(`input[aria-label="選取對話：${title}"]`);
  expect(input).not.toBeNull();
  await act(async () => Simulate.change(input, { target: { checked } }));
};
const openHistory = async (records = [saved, second, third]) => {
  onSnapshot.mockImplementation((_, callback) => { callback(snapshot(records)); return () => {}; });
  await render(<AiChatRoom user={{ uid: "test-owner" }} db={{}} />);
  await click(container.querySelector(`[aria-label="歷史對話（${records.length}）"]`));
};

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

test("model picker sits between modes and thinking; collapse preserves model, thinking and draft", async () => {
  await render(<AiChatRoom user={{ uid: "test-owner" }} db={{}} />);
  const picker = container.querySelector('[aria-label="選擇 AI 模型"]');
  expect(picker.closest("header")).not.toBeNull();
  expect(container.querySelector('.cr-input-bar [aria-label="選擇 AI 模型"]')).toBeNull();
  const row = container.querySelector('[aria-label="聊天模式與模型設定"]');
  expect([...row.children].map(element => element.textContent)).toEqual(["聊天模式圖片生成", "DeepSeek-V4-Flash", "深度思考"]);
  await click(button("深度思考"));
  const input = container.querySelector('[aria-label="輸入訊息"]');
  await act(async () => Simulate.change(input, { target: { value: "尚未送出的草稿" } }));
  await click(picker);
  expect(document.querySelector('[role="menu"]')).not.toBeNull();
  await click(container.querySelector('[aria-label="收合聊天工具列"]'));
  expect(row.hidden).toBe(true);
  expect(document.querySelector('[role="menu"]')).toBeNull();
  expect(container.querySelector('[aria-label="展開聊天工具列"]').getAttribute("aria-expanded")).toBe("false");
  expect(input.value).toBe("尚未送出的草稿");
  await click(container.querySelector('[aria-label="展開聊天工具列"]'));
  expect(row.hidden).toBe(false);
  expect(picker.textContent).toBe("DeepSeek-V4-Flash");
  expect(button("深度思考").getAttribute("aria-pressed")).toBe("true");
  expect(updateDoc).not.toHaveBeenCalled();
  expect(global.fetch.mock.calls.every(([, options]) => options.method === "GET")).toBe(true);
});

test("history opens over the chat area; selecting does not open or delete a conversation", async () => {
  await openHistory();
  const dialog = container.querySelector('[role="dialog"]');
  expect(dialog).not.toBeNull();
  expect(container.querySelector('.cr-input-bar').parentElement.hasAttribute("inert")).toBe(true);
  expect(dialog.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
  expect(button("刪除選取的對話").disabled).toBe(true);
  await selectConversation("另一份對話");
  expect(button("刪除選取的對話（1）").disabled).toBe(false);
  expect(writeBatch).not.toHaveBeenCalled();
  expect(container.querySelector('[role="dialog"]')).toBe(dialog);
  await click(container.querySelector('[aria-label="開啟對話：另一份對話"]'));
  expect(container.querySelector('[role="dialog"]')).toBeNull();
  expect(container.querySelector('.cr-input-bar').parentElement.hasAttribute("inert")).toBe(false);
  expect(container.textContent).toContain("另一個問題");
});

test("bulk delete requires confirmation, then atomically deletes only selected IDs for the signed-in user", async () => {
  await openHistory();
  await selectConversation("原有對話");
  await selectConversation("另一份對話");
  await click(button("刪除選取的對話（2）"));
  expect(writeBatch).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(button("取消"));
  await click(button("取消"));
  expect(writeBatch).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(button("刪除選取的對話（2）"));
  await click(button("刪除選取的對話（2）"));
  await click(button("確認刪除"));
  expect(batchCommit).toHaveBeenCalledTimes(1);
  expect(batchDelete.mock.calls.map(([ref]) => ref.parts)).toEqual([
    ["aiChats", "test-owner", "conversations", "saved"],
    ["aiChats", "test-owner", "conversations", "second"],
  ]);
  expect(container.querySelector('[aria-label="開啟對話：保留的對話"]')).not.toBeNull();
  expect(container.querySelector('[aria-label="開啟對話：原有對話"]')).toBeNull();
  await click(container.querySelector('[aria-label="關閉對話記錄"]'));
  expect(container.textContent).not.toContain("原有回覆");
  expect(button("傳送").disabled).toBe(true);
  expect(updateDoc).not.toHaveBeenCalled();
});

test("failed deletion keeps the current conversation and selected records available for retry", async () => {
  await openHistory();
  batchCommit.mockRejectedValueOnce(new Error("permission-denied"));
  await selectConversation("原有對話");
  await click(button("刪除選取的對話（1）"));
  await click(button("確認刪除"));
  expect(container.querySelector('[role="alert"]').textContent).toContain("刪除失敗");
  expect(container.querySelector('[aria-label="選取對話：原有對話"]').checked).toBe(true);
  expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(3);
  await click(container.querySelector('[aria-label="關閉對話記錄"]'));
  expect(container.textContent).toContain("原有回覆");
});

test("deleting other records does not clear the current conversation", async () => {
  await openHistory();
  await selectConversation("另一份對話");
  await click(button("刪除選取的對話（1）"));
  await click(button("確認刪除"));
  await click(container.querySelector('[aria-label="關閉對話記錄"]'));
  expect(container.textContent).toContain("原有回覆");
  expect(batchDelete).toHaveBeenCalledTimes(1);
});

test("a pending delete cannot be submitted twice, and rollback keeps the selected checkbox", async () => {
  await openHistory();
  let rejectBatch;
  batchCommit.mockImplementation(() => new Promise((_, reject) => { rejectBatch = reject; }));
  await selectConversation("原有對話");
  await click(button("刪除選取的對話（1）"));
  const confirm = button("確認刪除");
  await click(confirm);
  await click(confirm);
  expect(batchCommit).toHaveBeenCalledTimes(1);
  expect(container.querySelector('[aria-label="關閉對話記錄"]').disabled).toBe(true);
  const receive = onSnapshot.mock.calls[0][1];
  await act(async () => receive(snapshot([second, third])));
  await act(async () => {
    receive(snapshot([saved, second, third]));
    rejectBatch(new Error("unavailable"));
  });
  expect(container.querySelector('[role="alert"]')).not.toBeNull();
  expect(container.querySelector('[aria-label="選取對話：原有對話"]').checked).toBe(true);
  expect(container.querySelector('[aria-label="關閉對話記錄"]').disabled).toBe(false);
});

test("sending blocks history switching and deletion until the existing reply completes", async () => {
  await render(<AiChatRoom user={{ uid: "test-owner" }} db={{}} />);
  let reply;
  global.fetch.mockImplementationOnce(() => new Promise(resolve => { reply = resolve; }));
  await act(async () => Simulate.change(container.querySelector('[aria-label="輸入訊息"]'), { target: { value: "等待回答" } }));
  await click(button("傳送"));
  await click(container.querySelector('[aria-label="歷史對話（1）"]'));
  expect(container.querySelector('[aria-label="選取對話：原有對話"]').disabled).toBe(true);
  expect(container.querySelector('[aria-label="開啟對話：原有對話"]').disabled).toBe(true);
  expect(writeBatch).not.toHaveBeenCalled();
  await act(async () => reply({ ok: true, json: async () => ({ reply: "原本的回答" }) }));
  expect(container.querySelector('[aria-label="選取對話：原有對話"]').disabled).toBe(false);
  await click(container.querySelector('[aria-label="關閉對話記錄"]'));
  expect(container.textContent).toContain("原本的回答");
});

test.each([0, 1, 10, 50])("history handles %i records with selection and empty state", async count => {
  const records = Array.from({ length: count }, (_, index) => ({ id: `test-${index}`, title: `對話 ${index}`, messages: [] }));
  await openHistory(records);
  expect(container.querySelectorAll('input[type="checkbox"]')).toHaveLength(count);
  if (!count) {
    expect(container.textContent).toContain("還沒有過去的對話");
    expect(button("全選").disabled).toBe(true);
  } else {
    await click(button("全選"));
    expect(container.querySelectorAll('input:checked')).toHaveLength(count);
    await click(button("取消全選"));
    expect(container.querySelectorAll('input:checked')).toHaveLength(0);
  }
  expect(writeBatch).not.toHaveBeenCalled();
});
