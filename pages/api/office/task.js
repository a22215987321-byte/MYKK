// AI Office real task execution — server-side because it needs
// DEEPSEEK_API_KEY (same key pages/api/ai/chat.js already uses). Ported from
// the original desktop app's server/deepseek-api.mjs (buildMessages / GitHub
// daily-digest logic), collapsed into one endpoint since the client now
// writes task state straight to Firestore instead of a local JSON file.
const MAX_TITLE = 200;
const MAX_BRIEF = 10_000;

const personas = {
  "strategy-agent": "你是策略協調師若晴，擅長拆解目標、統籌工作與交付。回答要有結論、行動項目與風險。",
  "intelligence-agent": "你是 AI 情報整合師澄音，擅長彙整市場、GitHub 與研究訊號、資料查證。清楚區分事實、推論與待驗證事項。",
  "brand-agent": "你是品牌敘事師璃亞，擅長繁體中文品牌敘事、企劃與簡報內容，語氣自然精準。",
  "systems-agent": "你是系統整合架構師景曜，擅長工作流程、自動化工具與跨平台系統整合。",
  "analytics-agent": "你是數據與品管分析師阿衡，擅長整理資料、品質檢查、找出漏洞並形成可執行洞察。",
  "creative-agent": "你是創意總監老墨，擅長創意方向、內容企劃、視覺概念與品質把關。",
};

function safeError(error) {
  if (error?.name === "AbortError") return "DeepSeek 回應逾時，請稍後再試。";
  return error instanceof Error ? error.message : "發生未知錯誤。";
}

async function deepSeekRequest({ model, messages }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error("DeepSeek 服務尚未設定");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60_000);
  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, extra_body: { thinking: { type: "disabled" } }, max_tokens: 2400, stream: false }),
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error?.message || `DeepSeek 服務錯誤（${response.status}）`);
    const message = data.choices?.[0]?.message;
    if (!message?.content) throw new Error("DeepSeek 沒有回覆內容");
    return { result: message.content, model: data.model || model, usage: data.usage || null };
  } finally {
    clearTimeout(timer);
  }
}

function buildStandardMessages({ title, brief, assigneeId, agentInstruction, targetDate }) {
  return [
    {
      role: "system",
      content: `${agentInstruction || personas[assigneeId] || personas["analytics-agent"]}\n你在 AI Office 內工作。請一律使用繁體中文，完整遵循使用者本次任務的範圍與輸出格式；若資料不足要直接指出，不要捏造來源。`,
    },
    {
      role: "user",
      content: `任務名稱：${title}\n${targetDate ? `資料日期：${targetDate}\n請以這個日期作為任務的資料時間範圍或基準日期；即使它是過往日期也不要改成今天。\n` : ""}任務說明：${brief || "請依任務名稱完成一份可直接使用的結果。"}`,
    },
  ];
}

function hongKongDateTime(date) {
  return new Intl.DateTimeFormat("zh-HK", {
    timeZone: "Asia/Hong_Kong", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date);
}

function githubSearchWindow(now, hours) {
  const until = new Date(now);
  const since = new Date(until.getTime() - hours * 60 * 60 * 1_000);
  const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
  return { since: iso(since), until: iso(until) };
}

function githubSearchDate(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return null;
  const sinceDate = new Date(`${dateValue}T00:00:00+08:00`);
  if (!Number.isFinite(sinceDate.getTime())) return null;
  const untilDate = new Date(sinceDate.getTime() + 24 * 60 * 60 * 1_000 - 1_000);
  const iso = (d) => d.toISOString().replace(/\.\d{3}Z$/, "Z");
  return { since: iso(sinceDate), until: iso(untilDate) };
}

async function fetchGithubDailyRepositories({ since, until }) {
  const query = encodeURIComponent(`created:${since}..${until} archived:false`);
  const response = await fetch(`https://api.github.com/search/repositories?q=${query}&sort=stars&order=desc&per_page=30`, {
    headers: { Accept: "application/vnd.github+json", "User-Agent": "EvonChat-AI-Office" },
    signal: AbortSignal.timeout(20_000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if ([403, 429].includes(response.status)) throw new Error("GitHub 公開搜尋暫時達到速率限制，請稍後再試。");
    throw new Error(data?.message || `GitHub API 回應 ${response.status}`);
  }
  return (data.items || []).slice(0, 20).map((repo) => ({
    name: repo.full_name,
    url: repo.html_url,
    description: repo.description || "",
    language: repo.language || "未標示",
    stars: repo.stargazers_count || 0,
    forks: repo.forks_count || 0,
    license: repo.license?.spdx_id || "未標示",
  }));
}

async function runGithubTask({ brief, assigneeId, agentInstruction, targetDate }) {
  const now = new Date();
  const exactWindow = githubSearchDate(targetDate);
  const date = exactWindow ? targetDate : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong" }).format(now);
  let windowHours = 24;
  let repositories = await fetchGithubDailyRepositories(exactWindow || githubSearchWindow(now, windowHours));
  if (!repositories.length && !exactWindow) {
    windowHours = 48;
    repositories = await fetchGithubDailyRepositories(githubSearchWindow(now, windowHours));
  }
  if (!repositories.length) {
    throw new Error(exactWindow
      ? `GitHub 在香港時間 ${date} 沒有找到符合條件的新公開專案。`
      : "GitHub 最近 48 小時暫時沒有可整理的新公開專案，請稍後重試。");
  }
  return deepSeekRequest({
    model: "deepseek-v4-flash",
    messages: [
      {
        role: "system",
        content: `${agentInstruction || personas[assigneeId] || personas["intelligence-agent"]}\n你正在整理 GitHub 公開資料。只能根據提供的 GitHub API 資料回答，不得捏造專案、星數、授權或連結。請使用繁體中文，並優先完整遵循使用者本次任務指令。`,
      },
      {
        role: "user",
        content: `${exactWindow ? `資料範圍：香港時間 ${date} 當日新建立的 GitHub 公開專案。` : `資料範圍：截至香港時間 ${hongKongDateTime(now)}、最近 ${windowHours} 小時新建立的 GitHub 公開專案。`}\n\n使用者本次任務指令（範圍、排序與輸出格式優先）：\n${brief || "從最多 20 個候選中選出前 10 名專案。先給三句趨勢摘要，再用編號列出；每項包含名稱、完整連結、用途、主要語言、授權、星數與值得關注的原因。"}\n\nGitHub API 資料（最多 20 個候選）：\n${JSON.stringify(repositories, null, 2)}`,
      },
    ],
  });
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { title, assigneeId, brief, kind, targetDate, agentInstruction } = req.body || {};
    const cleanTitle = String(title || "").trim().slice(0, MAX_TITLE);
    const cleanBrief = String(brief || "").trim().slice(0, MAX_BRIEF);
    const cleanAssignee = Object.prototype.hasOwnProperty.call(personas, assigneeId) ? assigneeId : "analytics-agent";
    const cleanTargetDate = /^\d{4}-\d{2}-\d{2}$/.test(String(targetDate || "")) ? String(targetDate) : "";
    const cleanInstruction = typeof agentInstruction === "string" ? agentInstruction.slice(0, MAX_BRIEF) : "";
    if (!cleanTitle) return res.status(400).json({ error: "請輸入任務名稱。" });

    if (kind === "browser") {
      return res.status(400).json({ error: "本機工具操作只支援 AI Office 桌面版，網頁版無法開啟本機瀏覽器。" });
    }

    const output = kind === "github"
      ? await runGithubTask({ brief: cleanBrief, assigneeId: cleanAssignee, agentInstruction: cleanInstruction, targetDate: cleanTargetDate })
      : await deepSeekRequest({ model: "deepseek-v4-flash", messages: buildStandardMessages({ title: cleanTitle, brief: cleanBrief, assigneeId: cleanAssignee, agentInstruction: cleanInstruction, targetDate: cleanTargetDate }) });

    return res.json(output);
  } catch (error) {
    console.error("office/task error:", error);
    return res.status(400).json({ error: safeError(error) });
  }
}
