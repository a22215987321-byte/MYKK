import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ProfileAvatar from "../components/ProfileAvatar";

describe("profile avatar entry point", () => {
  const profile = { nickname: "EVON", avatarImage: "/evon-avatar.png", avatar: "😊" };

  test("offers owners an accessible actions button instead of an upload overlay", () => {
    const html = renderToStaticMarkup(<ProfileAvatar profile={profile} isOwner status={{ label: "離線", color: "gray" }} onRequestChange={() => {}} />);
    expect(html).toContain('aria-label="頭像選項"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('title="離線"');
    expect(html).not.toContain('type="file"');
  });

  test("keeps viewing available on another person's profile without edit actions", () => {
    const html = renderToStaticMarkup(<ProfileAvatar profile={profile} isOwner={false} />);
    expect(html).toContain('aria-label="查看頭像"');
    expect(html).not.toContain('更換頭像');
  });

  test("supports an emoji avatar without a broken image", () => {
    const html = renderToStaticMarkup(<ProfileAvatar profile={{ avatar: "😊" }} isOwner />);
    expect(html).toContain('😊');
    expect(html).not.toContain('<img');
  });
});
