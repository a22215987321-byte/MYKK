// UI-only task templates. These prepare an editable message; they do not invoke
// a model, install tools, or grant anonymous users any additional permissions.
export const GUEST_SKILLS = [
  { id: "summarize", title: "整理重點", category: "理解", icon: "summary", description: "長內容變成摘要與待辦事項", prompt: "請用繁體中文整理以下內容，先給一句話摘要，再列出重點與可執行的下一步。不要添加原文沒有的事實。\n\n內容：\n" },
  { id: "write", title: "幫我寫作", category: "寫作", icon: "write", description: "從想法開始，寫出清楚的初稿", prompt: "請根據以下需求撰寫一份繁體中文初稿，語氣自然、段落清楚；缺少的重要資訊請先向我確認。\n\n主題、對象與需求：\n" },
  { id: "translate", title: "翻譯潤飾", category: "寫作", icon: "translate", description: "保留原意，讓表達更自然", prompt: "請翻譯並潤飾以下內容，保留原意與語氣，必要時說明用詞差異。若未指定目標語言，請先詢問。\n\n目標語言與原文：\n" },
  { id: "plan", title: "拆解計畫", category: "規劃", icon: "plan", description: "把目標拆成可以完成的小步驟", prompt: "請將以下目標拆解成可執行的計畫，列出步驟、優先順序、所需資訊與第一個行動；不要假設已替我執行任何步驟。\n\n目標與限制：\n" },
  { id: "ideas", title: "腦力激盪", category: "規劃", icon: "ideas", description: "探索不同方向，找到下一個想法", prompt: "請針對以下主題提出 5 個不同方向的想法，簡短說明各自的優點與適用情境，再建議一個容易開始的方向。\n\n主題：\n" },
  { id: "explain", title: "解釋概念", category: "理解", icon: "explain", description: "用白話與例子理解陌生知識", prompt: "請用繁體中文與容易理解的例子解釋以下概念，先給直覺說明，再分步解釋，最後整理常見誤解；不確定的地方請明確標示。\n\n想了解的概念：\n" },
];

export function filterGuestSkills(search = "") {
  const term = search.trim().toLocaleLowerCase();
  return GUEST_SKILLS.filter(skill => `${skill.title} ${skill.category} ${skill.description}`.toLocaleLowerCase().includes(term));
}

export function prepareGuestSkillMessage(skillId, draft = "") {
  const skill = GUEST_SKILLS.find(item => item.id === skillId);
  return skill ? `${skill.prompt}${draft}` : draft;
}
