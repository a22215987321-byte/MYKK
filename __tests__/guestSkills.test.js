import { GUEST_SKILLS, filterGuestSkills, prepareGuestSkillMessage } from "../lib/guestSkills";
import { DATA_FINANCE_SALES_SKILLS } from "../lib/dataFinanceSalesSkills";
import { EXCEL_GENERATOR_SKILL } from "../lib/excelGeneratorSkill";
import { filterGuestChats, isGuestSubmitKey } from "../components/GuestChatRoom";

describe("guest task templates", () => {
  test("offers general and professional non-empty editable instruction templates", () => {
    expect(GUEST_SKILLS).toHaveLength(27);
    expect(new Set(GUEST_SKILLS.map(skill => skill.id)).size).toBe(27);
    GUEST_SKILLS.forEach(skill => {
      expect(skill.prompt.trim().length).toBeGreaterThan(30);
      expect(prepareGuestSkillMessage(skill.id)).toBe(skill.prompt);
    });
    expect(GUEST_SKILLS.filter(skill => skill.professional)).toHaveLength(21);
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
    expect(filterGuestSkills(" 寫作 ").map(skill => skill.id)).toEqual(["write", "translate", "decision-analysis", "evidence-academic-writing"]);
    expect(filterGuestSkills("摘要").map(skill => skill.id)).toEqual(["summarize"]);
    expect(filterGuestSkills("安裝程式")).toEqual([]);
    expect(filterGuestSkills("學術").map(skill => skill.id)).toEqual(["academic-argument", "evidence-academic-writing"]);
    expect(filterGuestSkills("CRM").map(skill => skill.id)).toEqual(["opportunity-scoring", "pipeline-coverage-analysis", "sales-forecast-scenario-modeling"]);
    expect(filterGuestSkills()).toHaveLength(27);
    expect(JSON.stringify(GUEST_SKILLS)).not.toMatch(/AppData|dsh-workspace|SKILL\.md|api\/ai/i);
  });
});

describe("data, finance and sales methods", () => {
  test("adds all twelve supplied methods without replacing the existing catalog", () => {
    expect(DATA_FINANCE_SALES_SKILLS.map(skill => skill.id)).toEqual([
      "budget-modeling-controls", "capacity-modeling", "commission-rule-formalization",
      "data-query-methodology", "financial-variance-method", "formula-specification-verification",
      "invoice-draft-validation", "pipeline-coverage-analysis", "reconciliation-control-method",
      "sales-call-strategy", "sales-forecast-scenario-modeling", "sales-quote-pricing-control",
    ]);
    expect(GUEST_SKILLS.slice(14, 26)).toEqual(DATA_FINANCE_SALES_SKILLS);
    expect(filterGuestSkills("財務控制")).toHaveLength(5);
    expect(filterGuestSkills("資料與模型")).toHaveLength(3);
    expect(filterGuestSkills("銷售規劃")).toHaveLength(4);
    expect(filterGuestSkills(" dUcKdB ").map(skill => skill.id)).toEqual(["data-query-methodology"]);
  });

  test.each(DATA_FINANCE_SALES_SKILLS)("$title keeps the draft and evidence limitations", skill => {
    const draft = "  自己的數據，不要覆蓋\nHKD 100.25\n";
    expect(prepareGuestSkillMessage(skill.id, draft)).toBe(skill.prompt + draft);
    expect(skill.professional).toBe(true);
    expect(skill.prompt).toContain("待驗證");
    expect(skill.prompt).toContain("不得冒稱已查詢資料庫");
    expect(skill.prompt).toContain("未覆核不得標為正式完成");
    expect(skill.prompt.length).toBeLessThan(2000);
  });

  test.each([
    ["budget-modeling-controls", ["期初＋流入－流出＝期末", "reconciliation_gap", "未捨入"]],
    ["capacity-modeling", ["同一公式", "分母為零", "不得借用"]],
    ["commission-rule-formalization", ["A／B", "不是獨立驗證", "薪酬負責人"]],
    ["data-query-methodology", ["count(field)", "扇出", "待執行"]],
    ["financial-variance-method", ["基準為 0", "未驗證假設", "捨入一次"]],
    ["formula-specification-verification", ["name／type／unit／domain", "量綱", "獨立推導"]],
    ["invoice-draft-validation", ["tax-base-undetermined", "issued-external-evidence", "外部實際開立證據"]],
    ["pipeline-coverage-analysis", ["Data Quality Issues", "目標為零", "不發明"]],
    ["reconciliation-control-method", ["原始列 ID", "一對多", "不自動沖銷"]],
    ["sales-call-strategy", ["分鐘總和", "不擅自承諾", "跟進草稿"]],
    ["sales-forecast-scenario-modeling", ["最小－最大區間", "±10%", "不自行補"]],
    ["sales-quote-pricing-control", ["assumption-pending-approval", "核准證據", "有效起迄"]],
  ])("%s retains its source method's essential safeguards", (id, safeguards) => {
    const prepared = prepareGuestSkillMessage(id);
    safeguards.forEach(text => expect(prepared).toContain(text));
  });
});

describe("Excel Generator method", () => {
  test("is searchable in English and Chinese and preserves the complete draft", () => {
    [" EXCEL ", "試算表", "xlsx", "製表"].forEach(term => {
      expect(filterGuestSkills(term).map(skill => skill.id)).toContain("excel-generator");
    });
    expect(GUEST_SKILLS.at(-1)).toBe(EXCEL_GENERATOR_SKILL);
    const draft = "\n姓名,數量\n甲,0\n乙,\n";
    expect(prepareGuestSkillMessage("excel-generator", draft)).toBe(EXCEL_GENERATOR_SKILL.prompt + draft);
  });

  test("retains spreadsheet requirements without claiming file-generation capabilities", () => {
    ["Overview", "B2", "number_format", "包含公式結果", "不能補成 0", "KEY INSIGHTS",
      "Elegant Black", "凍結表頭", "篩選", "資料驗證", "不得互相重疊",
      "finance-pro-playbooks", "未提供該規範時先索取", "尚未產生 Excel 檔案", "假的下載連結",
    ].forEach(text => expect(EXCEL_GENERATOR_SKILL.prompt).toContain(text));
    expect(EXCEL_GENERATOR_SKILL.prompt.length).toBeLessThan(4000);
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
