import { GUEST_SKILLS, filterGuestSkills, prepareGuestSkillMessage } from "../lib/guestSkills";
import { filterGuestChats, isGuestSubmitKey } from "../components/GuestChatRoom";

describe("guest task templates", () => {
  test("offers six distinct, non-empty editable instruction templates", () => {
    expect(GUEST_SKILLS).toHaveLength(6);
    expect(new Set(GUEST_SKILLS.map(skill => skill.id)).size).toBe(6);
    GUEST_SKILLS.forEach(skill => {
      expect(skill.prompt.trim().length).toBeGreaterThan(30);
      expect(prepareGuestSkillMessage(skill.id)).toBe(skill.prompt);
    });
  });
  test("keeps the complete existing draft when adding a skill", () => {
    const draft = "  原有內容\n第二行 😀\n";
    const prepared = prepareGuestSkillMessage("summarize", draft);
    expect(prepared).toBe(GUEST_SKILLS[0].prompt + draft);
  });
  test("unknown skills cannot replace a draft", () => {
    expect(prepareGuestSkillMessage("unknown", "我的文字")).toBe("我的文字");
  });
  test("searches by category and title, and handles empty results", () => {
    expect(filterGuestSkills(" 寫作 ").map(skill => skill.id)).toEqual(["write", "translate"]);
    expect(filterGuestSkills("摘要").map(skill => skill.id)).toEqual(["summarize"]);
    expect(filterGuestSkills("安裝程式")).toEqual([]);
    expect(filterGuestSkills()).toHaveLength(6);
  });
});

describe("guest mobile interactions", () => {
  const chats = [{ id: "a", title: "學習計畫", lastMessage: "週末重溫" }, { id: "b", title: "英語寫作", lastMessage: "Hello" }];
  test("filters chats without changing conversation data", () => {
    const original = JSON.stringify(chats);
    expect(filterGuestChats(chats, "學習").map(chat => chat.id)).toEqual(["a"]);
    expect(filterGuestChats(chats, "hello").map(chat => chat.id)).toEqual(["b"]);
    expect(filterGuestChats(chats, "EVON")).toEqual(chats);
    expect(filterGuestChats(chats, "不存在")).toEqual([]);
    expect(JSON.stringify(chats)).toBe(original);
  });
  test("protects the Safari/IME 229 key even after compositionend", () => {
    expect(isGuestSubmitKey({ key: "Enter", isComposing: false, keyCode: 229 })).toBe(false);
    expect(isGuestSubmitKey({ key: "Enter", keyCode: 13 })).toBe(true);
  });
});
