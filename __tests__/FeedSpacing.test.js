import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PostCard } from "../components/Feed";
import { MessageNotification } from "../components/MessageNotificationHost";

jest.mock("next/router", () => ({ useRouter: () => ({}) }));
jest.mock("../lib/firebase", () => ({ auth: { currentUser: { uid: "me" } }, db: {} }));

const post = { id: "test-post", userId: "friend", userNickname: "朋友", userAvatar: "😊", text: "第一行\n第二行\n\n\n下一段", audioUrl: "/demo.mp3", likes: [], createdAt: new Date("2026-09-27") };

test("feed audio retains native playback without the music icon or decorative player card", () => {
  const html = renderToStaticMarkup(<PostCard post={post} myUid="me" />);
  expect(html).toContain('src="/demo.mp3"');
  expect(html).toContain('controls=""');
  expect(html).toContain('height:34px');
  expect(html).toContain('aria-label="貼文音訊"');
  expect(html).not.toContain("🎵");
  expect(html).not.toContain('height:6px');
  expect(html).toContain("第一行");
  expect(html).toContain("下一段");
  expect(html).toContain('font-size:15px');
});

test("plain posts do not create empty audio wrappers or alter their text", () => {
  const html = renderToStaticMarkup(<PostCard post={{ ...post, audioUrl: null }} myUid="me" />);
  expect(html).not.toContain("<audio");
  expect(html).toContain("第二行");
});

test("notification renders the sender avatar followed by an escaped plain-text preview and dismiss button", () => {
  const html = renderToStaticMarkup(<MessageNotification item={{ id: "preview", senderName: "小明", avatarImage: "/friend.png", text: "<script>alert(1)</script>" }} onDismiss={() => {}} />);
  expect(html.indexOf('src="/friend.png"')).toBeLessThan(html.indexOf("<strong"));
  expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
  expect(html).not.toContain("<script>");
  expect(html).toContain('aria-label="關閉訊息通知"');
});
