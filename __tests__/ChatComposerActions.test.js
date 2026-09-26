import React, { act, createRef } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import ChatComposerActions from "../components/ChatComposerActions";

let dom, root, container, anchorRef, upload, emoji, onOpen;
beforeEach(() => {
  dom = new JSDOM("<div id='root'></div>", { pretendToBeVisual: true });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  window.innerWidth = 390;
  container = document.getElementById("root");
  root = createRoot(container);
  anchorRef = createRef();
  upload = jest.fn(); emoji = jest.fn(); onOpen = jest.fn();
});
afterEach(async () => {
  await act(async () => root.unmount());
  dom.window.close();
  delete global.window;
  delete global.document;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
const render = async (uploading = false) => {
  await act(async () => root.render(<ChatComposerActions anchorRef={anchorRef}
    onUpload={upload} onEmoji={emoji} onOpen={onOpen} uploading={uploading} isMobile />));
};
const click = async el => { expect(el).not.toBeNull(); await act(async () => Simulate.click(el)); };
const button = text => [...document.querySelectorAll("button")].find(el => el.textContent === text);

test("one entry opens the upload and emoji actions, preserving both handlers", async () => {
  await render();
  expect(container.querySelectorAll("button")).toHaveLength(1);
  await click(anchorRef.current);
  expect(anchorRef.current.getAttribute("aria-expanded")).toBe("true");
  expect(onOpen).toHaveBeenCalledTimes(1);
  await click(button("圖片／影片／檔案"));
  expect(upload).toHaveBeenCalledTimes(1);
  expect(emoji).not.toHaveBeenCalled();
  expect(document.querySelector('[role="group"]')).toBeNull();
  await click(anchorRef.current);
  await click(button("表情／貼圖"));
  expect(emoji).toHaveBeenCalledTimes(1);
  expect(anchorRef.current.getAttribute("aria-expanded")).toBe("false");
});

test("Escape returns keyboard focus and outside click dismisses without performing actions", async () => {
  await render();
  await click(anchorRef.current);
  expect(document.activeElement).toBe(button("圖片／影片／檔案"));
  await act(async () => document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })));
  expect(document.activeElement).toBe(anchorRef.current);
  expect(document.querySelector('[role="group"]')).toBeNull();
  await click(anchorRef.current);
  await act(async () => document.body.dispatchEvent(new window.MouseEvent("mousedown", { bubbles: true })));
  expect(document.querySelector('[role="group"]')).toBeNull();
  expect(upload).not.toHaveBeenCalled();
  expect(emoji).not.toHaveBeenCalled();
});

test("uploading disables the entry", async () => {
  await render(true);
  expect(anchorRef.current.disabled).toBe(true);
  expect(anchorRef.current.getAttribute("aria-label")).toBe("正在上傳附件");
  expect(document.querySelector('[role="group"]')).toBeNull();
});
