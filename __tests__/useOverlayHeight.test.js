import React, { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import useOverlayHeight from "../lib/useOverlayHeight";

function Fixture({ enabled = true }) {
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  useOverlayHeight(headerRef, containerRef, "--ai-header-height", enabled);
  return <section ref={containerRef}><header ref={headerRef}>工具列</header><div data-ai-messages="true">對話</div></section>;
}

let dom, root, container, height, callbacks, disconnect;
beforeEach(() => {
  dom = new JSDOM("<div id='root'></div>");
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  height = 112;
  window.HTMLElement.prototype.getBoundingClientRect = function () { return { height: this.tagName === "HEADER" ? height : 0 }; };
  callbacks = [];
  disconnect = jest.fn();
  global.ResizeObserver = class {
    constructor(callback) { callbacks.push(callback); }
    observe() {}
    disconnect() { disconnect(); }
  };
  container = document.getElementById("root");
  root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount());
  dom.window.close();
  delete global.ResizeObserver;
  delete global.window;
  delete global.document;
  delete global.IS_REACT_ACT_ENVIRONMENT;
});
const render = async (enabled = true) => { await act(async () => root.render(<Fixture enabled={enabled} />)); };
const resize = async () => { await act(async () => callbacks.forEach(callback => callback())); };

test("measures expanded/collapsed header without hardcoding heights and cleans up on exit", async () => {
  await render();
  const room = container.querySelector("section");
  expect(room.style.getPropertyValue("--ai-header-height")).toBe("112px");
  height = 64.5;
  await resize();
  expect(room.style.getPropertyValue("--ai-header-height")).toBe("65px");
  height = 148; // zoomed text / changed safe area
  await act(async () => window.dispatchEvent(new window.Event("resize")));
  expect(room.style.getPropertyValue("--ai-header-height")).toBe("148px");
  await render(false);
  expect(room.style.getPropertyValue("--ai-header-height")).toBe("");
  expect(disconnect).toHaveBeenCalledTimes(1);
});

test("resizing overlays keeps the last message visible but never pulls a reader out of history", async () => {
  await render();
  const viewport = container.querySelector('[data-ai-messages="true"]');
  Object.defineProperties(viewport, {
    clientHeight: { get: () => 500 }, scrollHeight: { get: () => 1500 },
  });
  viewport.scrollTop = 1000;
  height = 64;
  await resize();
  expect(viewport.scrollTop).toBe(1500);
  viewport.scrollTop = 200;
  height = 112;
  await resize();
  expect(viewport.scrollTop).toBe(200);
});

test("hidden overlays do not replace CSS fallbacks with zero, and disabled layouts stay untouched", async () => {
  height = 0;
  await render();
  expect(container.querySelector("section").style.getPropertyValue("--ai-header-height")).toBe("");
  await render(false);
  height = 112;
  await act(async () => window.dispatchEvent(new window.Event("resize")));
  expect(container.querySelector("section").style.getPropertyValue("--ai-header-height")).toBe("");
});
