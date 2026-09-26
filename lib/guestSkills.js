// UI-only task templates. These prepare an editable message; they do not invoke
// a model, install tools, or grant anonymous users any additional permissions.
export const GUEST_SKILLS = [
  { id: "summarize", title: "整理重點", category: "理解", icon: "summary", description: "長內容變成摘要與待辦事項", prompt: "請用繁體中文整理以下內容，先給一句話摘要，再列出重點與可執行的下一步。不要添加原文沒有的事實。\n\n內容：\n" },
  { id: "write", title: "幫我寫作", category: "寫作", icon: "write", description: "從想法開始，寫出清楚的初稿", prompt: "請根據以下需求撰寫一份繁體中文初稿，語氣自然、段落清楚；缺少的重要資訊請先向我確認。\n\n主題、對象與需求：\n" },
  { id: "translate", title: "翻譯潤飾", category: "寫作", icon: "translate", description: "保留原意，讓表達更自然", prompt: "請翻譯並潤飾以下內容，保留原意與語氣，必要時說明用詞差異。若未指定目標語言，請先詢問。\n\n目標語言與原文：\n" },
  { id: "plan", title: "拆解計畫", category: "規劃", icon: "plan", description: "把目標拆成可以完成的小步驟", prompt: "請將以下目標拆解成可執行的計畫，列出步驟、優先順序、所需資訊與第一個行動；不要假設已替我執行任何步驟。\n\n目標與限制：\n" },
  { id: "ideas", title: "腦力激盪", category: "規劃", icon: "ideas", description: "探索不同方向，找到下一個想法", prompt: "請針對以下主題提出 5 個不同方向的想法，簡短說明各自的優點與適用情境，再建議一個容易開始的方向。\n\n主題：\n" },
  { id: "explain", title: "解釋概念", category: "理解", icon: "explain", description: "用白話與例子理解陌生知識", prompt: "請用繁體中文與容易理解的例子解釋以下概念，先給直覺說明，再分步解釋，最後整理常見誤解；不確定的地方請明確標示。\n\n想了解的概念：\n" },
  {
    id: "academic-argument",
    title: "學術論證架構",
    category: "學術研究",
    icon: "academic",
    description: "把題目拆成論點、證據缺口與反駁位置",
    keywords: "大綱 essay outline thesis evidence",
    professional: true,
    prompt: "請協助我設計學術論證架構，但不要直接代寫完整論文。先判斷題目的操作詞（比較、評估、解釋或論證），再輸出：1. 暫定論旨；2. 主要論點與推論關係；3. 每個論點所需的證據類型；4. 證據缺口；5. 反方最強意見及適合回應的位置。只根據我提供的內容，不要虛構文獻或引用。\n\n題目、課程要求與已有資料：\n",
  },
  {
    id: "account-research",
    title: "客戶研究證據",
    category: "商業研究",
    icon: "account",
    description: "整理單一公司事實、假設與訪談問題",
    keywords: "公司 客戶 account sales discovery",
    professional: true,
    prompt: "請把我提供的單一客戶／公司資料整理成拜訪前研究摘要。請嚴格分開：1. 已驗證事實；2. 有依據的推論；3. 尚待驗證的假設；4. 資料缺口；5. 可在會議中詢問的 discovery questions。每項事實標示我提供的來源與日期；沒有資料的營收、預算或決策人請寫「未公開／待確認」，不要猜測。\n\n公司名稱、研究目的與現有資料：\n",
  },
  {
    id: "competitive-intelligence",
    title: "競爭情報分析",
    category: "商業研究",
    icon: "competitive",
    description: "用相同期間、區域與產品層級比較競品",
    keywords: "競品 competitor comparison matrix",
    professional: true,
    prompt: "請根據我提供的資料建立競品比較。先檢查各資料的期間、區域與產品層級是否一致，再輸出：1. 可比較性檢查；2. 競品摘要；3. 同基準比較矩陣；4. 證據紀錄；5. 對我的策略啟示。只有摘要片段的資料請標為「線索」，無可靠來源的數字或內部策略請標為「未公開」，不要自行補值。\n\n競品、比較目的與資料來源：\n",
  },
  {
    id: "decision-analysis",
    title: "決策分析寫作",
    category: "決策規劃",
    icon: "decision",
    description: "建立選項矩陣，分開事實、假設與未知",
    keywords: "決策 memo options matrix MECE",
    professional: true,
    prompt: "請把以下問題整理成可覆核的決策備忘錄。輸出：1. 決策問題與限制；2. 互斥且涵蓋合理範圍的選項（包含維持現狀／延後取得資料）；3. 評估準則；4. 選項矩陣，每格標示為事實、假設或未知；5. 建議與理由；6. 可逆性、風險及反方最強論點；7. 下一步。不要用沒有依據的分數填補未知。\n\n決策問題、選項與已知資料：\n",
  },
  {
    id: "evidence-academic-writing",
    title: "證據式學術寫作",
    category: "學術研究",
    icon: "evidence",
    description: "讓段落主張可追溯到使用者提供的來源",
    keywords: "論文 citation claim source 學術寫作",
    professional: true,
    prompt: "請協助我依據所提供的來源撰寫或修訂學術內容。先建立 claim-to-source 對照，再撰寫段落，並把來源證據與你的分析清楚分開。改寫時保留原文的主體、方向、幅度、限定條件與適用範圍。只能引用我實際提供的來源；缺少來源的主張請標示「需要證據」，不要虛構引用、作者、年份或頁碼。\n\n題目、格式要求、草稿與來源內容：\n",
  },
  {
    id: "market-expansion",
    title: "市場擴張分析",
    category: "決策規劃",
    icon: "expansion",
    description: "以門檻、評分錨點與敏感度比較市場",
    keywords: "市場拓展 entry expansion scoring ranking",
    professional: true,
    prompt: "請根據我提供的資料比較兩個以上候選市場。依序輸出：1. 法規、交付與必要資源的 hard gates；2. 市場吸引力、獲勝能力、進入摩擦／風險三層準則；3. 每項準則的可觀察評分錨點；4. 分數、理由與信心程度分開的評分表；5. 基準、吸引力優先、執行風險優先三組敏感度分析；6. 有條件的建議。未知資料保留空值，不可自動填中間分。\n\n候選市場、目標、限制與資料：\n",
  },
  {
    id: "market-research",
    title: "市場研究分析",
    category: "商業研究",
    icon: "market",
    description: "正規化市場數據並處理互相衝突的估計",
    keywords: "市場規模 CAGR pricing research",
    professional: true,
    prompt: "請把我提供的市場資料整理成可用於決策的研究。每個數據標示：指標、市場定義、地區、細分、期間、單位與幣值基準；條件不一致的數字不可直接比較。若估計互相衝突，依序檢查定義、期間、地區、細分、單位／幣值與方法，並保留合理範圍及分歧原因。競品請區分直接、間接與替代方案。沒有可靠資料時標為未知，不要製造精確數字。\n\n研究問題、市場範圍與現有資料：\n",
  },
  {
    id: "opportunity-scoring",
    title: "商機證據評分",
    category: "銷售決策",
    icon: "opportunity",
    description: "用客戶行為檢查交易健康度與預測信心",
    keywords: "商機 pipeline deal health forecast CRM",
    professional: true,
    prompt: "請根據我提供的商機資料評估交易健康度。請分開客戶可觀察行為、內部資料與業務主觀判斷；計算最近一次有效客戶互動天數與目前階段停留天數，但只有在我提供門檻或歷史基準時才判定停滯。檢查使用者、決策權、預算權及技術／安全角色的關係覆蓋，另列 single-threading 風險。最後分開輸出銷售階段、預測信心、證據與下一步。\n\n商機階段、活動紀錄、關係人與內部判斷：\n",
  },
];

export function filterGuestSkills(search = "") {
  const term = search.trim().toLocaleLowerCase();
  return GUEST_SKILLS.filter(skill => `${skill.title} ${skill.category} ${skill.description} ${skill.keywords || ""}`.toLocaleLowerCase().includes(term));
}

export function prepareGuestSkillMessage(skillId, draft = "") {
  const skill = GUEST_SKILLS.find(item => item.id === skillId);
  return skill ? `${skill.prompt}${draft}` : draft;
}
