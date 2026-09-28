import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { JSDOM } from "jsdom";
import ExpandablePostText, { POST_PREVIEW_LENGTH } from "../components/ExpandablePostText";

let dom, root, container;
beforeEach(() => {
  dom = new JSDOM("<div id='root'></div>");
  global.window = dom.window; global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;
  container = document.getElementById("root"); root = createRoot(container);
});
afterEach(async () => {
  await act(async () => root.unmount()); dom.window.close();
  delete global.window; delete global.document; delete global.IS_REACT_ACT_ENVIRONMENT;
});

test.each(["短貼文", "文".repeat(POST_PREVIEW_LENGTH)])("short posts have no expand button: %s", async text => {
  await act(async () => root.render(<ExpandablePostText text={text} />));
  expect(container.textContent).toBe(text);
  expect(container.querySelector("button")).toBeNull();
});

test("long posts expand and collapse per post without losing newlines or exposing HTML", async () => {
  const text = "第一段\n" + "內容".repeat(170) + "\n<script>末段</script>";
  await act(async () => root.render(<><ExpandablePostText text={text} /><ExpandablePostText text={text} /></>));
  const [first, second] = container.querySelectorAll("button");
  expect(first.textContent).toBe("展開全文");
  expect(first.getAttribute("aria-expanded")).toBe("false");
  expect(document.getElementById(first.getAttribute("aria-controls")).textContent).toBe(text.slice(0, 260) + "…");
  await act(async () => first.click());
  expect(first.textContent).toBe("收合");
  expect(first.getAttribute("aria-expanded")).toBe("true");
  expect(second.getAttribute("aria-expanded")).toBe("false");
  expect(document.getElementById(first.getAttribute("aria-controls")).textContent).toBe(text);
  expect(container.querySelector("script")).toBeNull();
  await act(async () => first.click());
  expect(first.textContent).toBe("展開全文");
});
