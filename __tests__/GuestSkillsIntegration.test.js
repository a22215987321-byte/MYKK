import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import GuestChatRoom from "../components/GuestChatRoom";
import { GUEST_SKILLS, prepareGuestSkillMessage } from "../lib/guestSkills";
import { DATA_FINANCE_SALES_SKILLS } from "../lib/dataFinanceSalesSkills";
import { EXCEL_GENERATOR_SKILL } from "../lib/excelGeneratorSkill";
import { addDoc, updateDoc, deleteDoc, writeBatch } from "firebase/firestore";

jest.mock("../lib/firebase", () => ({ db: {}, auth: { signOut: jest.fn() } }));
jest.mock("firebase/firestore", () => ({
  doc: (_, ...parts) => ({ parts }), collection: (_, ...parts) => ({ parts }),
  query: ref => ref, orderBy: () => ({}), serverTimestamp: () => ({}),
  onSnapshot: (ref, callback) => {
    if (ref.parts.includes("chats")) callback({ docs: [{ id: "existing-chat", data: () => ({ title: "原有聊天" }) }] });
    else if (ref.parts.includes("messages")) callback({ docs: [] });
    else callback({ exists: () => false });
    return () => {};
  },
  addDoc: jest.fn(), updateDoc: jest.fn(), deleteDoc: jest.fn(), writeBatch: jest.fn(), getDocs: jest.fn(),
}));

let dom, root, container, originalFetch, originalRaf;
beforeEach(async () => {
  dom = new JSDOM("<div id='root'></div>", { url: "http://localhost/", pretendToBeVisual: true });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.innerWidth = 390;
  window.HTMLElement.prototype.scrollIntoView = () => {};
  window.HTMLDialogElement.prototype.showModal = function () { this.setAttribute("open", ""); };
  window.HTMLDialogElement.prototype.close = function () { this.removeAttribute("open"); };
  originalFetch = global.fetch;
  originalRaf = global.requestAnimationFrame;
  global.fetch = jest.fn();
  global.requestAnimationFrame = callback => { callback(); return 1; };
  container = document.getElementById("root");
  root = createRoot(container);
  await act(async () => root.render(<GuestChatRoom user={{ uid: "guest-skills-test" }} />));
});
afterEach(async () => {
  await act(async () => root.unmount());
  dom.window.close();
  global.fetch = originalFetch;
  global.requestAnimationFrame = originalRaf;
  delete global.window;
  delete global.document;
  delete global.IS_REACT_ACT_ENVIRONMENT;
  jest.clearAllMocks();
});

const click = async element => { expect(element).not.toBeNull(); await act(async () => Simulate.click(element)); };
const openSkills = () => click(container.querySelector('[aria-label="開啟 Skills 任務範本"]'));
const search = async value => { await act(async () => Simulate.change(document.querySelector('[aria-label="搜尋 Skills"]'), { target: { value } })); };

test.each([...DATA_FINANCE_SALES_SKILLS, EXCEL_GENERATOR_SKILL])("selecting $title fills the real guest composer without sending or overwriting", async skill => {
  const textarea = container.querySelector('[aria-label="訊息"]');
  const draft = "保留我的原有資料\nHKD 100.25";
  textarea.value = draft;
  await act(async () => Simulate.change(textarea));
  await openSkills();
  await search(skill.title);
  const card = [...document.querySelectorAll("dialog button")].find(element => element.querySelector("strong")?.textContent === skill.title);
  await click(card);
  expect(document.querySelector("dialog")).toBeNull();
  expect(textarea.value).toBe(prepareGuestSkillMessage(skill.id, draft));
  expect(document.activeElement).toBe(textarea);
  expect(container.textContent).toContain("AI 回覆稍後開放");
  expect(global.fetch).not.toHaveBeenCalled();
  [addDoc, updateDoc, deleteDoc, writeBatch].forEach(write => expect(write).not.toHaveBeenCalled());
});

test("all 27 choices stay accessible; search can clear, close and reopen without losing a draft", async () => {
  await openSkills();
  expect(document.querySelectorAll("dialog strong")).toHaveLength(GUEST_SKILLS.length);
  await search("找不到的任務");
  expect(document.querySelector('dialog [role="status"]').textContent).toContain("沒有符合");
  await search("財務控制");
  expect(document.querySelectorAll("dialog strong")).toHaveLength(5);
  await click(document.querySelector('[aria-label="關閉 Skills"]'));
  expect(document.querySelector("dialog")).toBeNull();
  await openSkills();
  expect(document.querySelector('[aria-label="搜尋 Skills"]').value).toBe("");
  expect(document.querySelectorAll("dialog strong")).toHaveLength(27);
  await act(async () => Simulate.cancel(document.querySelector("dialog")));
  expect(document.querySelector("dialog")).toBeNull();
});
