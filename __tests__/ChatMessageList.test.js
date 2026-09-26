import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { Simulate } from "react-dom/test-utils";
import { JSDOM } from "jsdom";
import ChatMessageList from "../components/ChatMessageList";

let dom, root, container, resize, disconnect, viewport;
let height, scroll, scrollAssignments;
const original = [{ id: "one", senderId: "friend" }];
const render = async (messages = original, conversationKey = "hall") => {
  await act(async () => root.render(
    <ChatMessageList conversationKey={conversationKey} messages={messages} currentUserId="me">
      {messages.map(message => <div key={message.id}>{message.id}</div>)}
      <img src="/test.png" alt="測試圖片" />
    </ChatMessageList>
  ));
  viewport = container.querySelector(".cr-chat-panel");
};

beforeEach(() => {
  dom = new JSDOM("<div id='root'></div>", { pretendToBeVisual: true });
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  height = 1200;
  scroll = 0;
  scrollAssignments = [];
  Object.defineProperties(window.HTMLElement.prototype, {
    clientHeight: { configurable: true, get: () => 400 },
    scrollHeight: { configurable: true, get: () => height },
    scrollTop: { configurable: true, get: () => scroll, set: value => {
      scrollAssignments.push(value);
      scroll = Math.min(value, height - 400);
    } },
  });
  window.HTMLElement.prototype.scrollIntoView = jest.fn();
  disconnect = jest.fn();
  global.ResizeObserver = class {
    constructor(callback) { resize = callback; }
    observe() {}
    disconnect() { disconnect(); }
  };
  container = document.getElementById("root");
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  expect(disconnect).toHaveBeenCalledTimes(1);
  expect(window.HTMLElement.prototype.scrollIntoView).not.toHaveBeenCalled();
  dom.window.close();
  delete global.ResizeObserver;
  delete global.window;
  delete global.document;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});

const scrollUp = async () => {
  scroll = 100;
  await act(async () => Simulate.scroll(viewport));
};

test("opening a room follows its own bottom, including late images and keyboard resizing", async () => {
  await render();
  expect(scroll).toBe(800);
  height = 1500;
  await act(async () => resize());
  expect(scroll).toBe(1100);
  height = 1800;
  await act(async () => container.querySelector("img").dispatchEvent(new window.Event("load")));
  expect(scroll).toBe(1400);
  height = 1900;
  await act(async () => window.dispatchEvent(new window.Event("resize")));
  expect(scroll).toBe(1500);
});

test("incoming messages follow only while the reader is at the bottom", async () => {
  await render();
  height = 1300;
  const incoming = [...original, { id: "two", senderId: "friend" }];
  await render(incoming);
  expect(scroll).toBe(900);
  await scrollUp();
  await render([...incoming, { id: "three", senderId: "friend" }]);
  expect(scroll).toBe(100);
  height = 2000;
  await act(async () => resize());
  await act(async () => container.querySelector("img").dispatchEvent(new window.Event("load")));
  expect(scroll).toBe(100);
});

test("background rerenders and reactions never force a scroll", async () => {
  await render();
  const calls = scrollAssignments.length;
  await render([...original]);
  await render([{ ...original[0], reactions: { smile: ["me"] } }]);
  expect(scrollAssignments).toHaveLength(calls);
  await scrollUp();
  await render([...original]);
  expect(scroll).toBe(100);
});

test("sending your own message and switching rooms restore bottom following", async () => {
  await render();
  await scrollUp();
  const own = [...original, { id: "mine", senderId: "me" }];
  await render(own);
  expect(scroll).toBe(800);
  await scrollUp();
  await render(own, "private:friend");
  expect(scroll).toBe(800);
});

test("initial empty snapshots follow messages arriving later", async () => {
  await render([]);
  height = 1700;
  await render(original);
  expect(scroll).toBe(1300);
});
