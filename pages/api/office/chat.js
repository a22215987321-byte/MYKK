// AI Office's "AI 對話" panel — chats normally, and only creates a task
// action when the user explicitly asks for one (ported 1:1 from the
// original desktop app's server/deepseek-api.mjs /api/chat handler).
const MAX_MESSAGES = 24;
const MAX_CONTENT_LENGTH = 4000;

const validAgentIds = new Set(["strategy-agent", "intelligence-agent", "brand-agent", "systems-agent", "analytics-agent", "creative-agent"]);
const chatAgentNames = new Map([
  ["若晴", "strategy-agent"],
  ["澄音", "intelligence-agent"],
  ["璃亞", "brand-agent"],
  ["景曜", "systems-agent"],
  ["阿衡", "analytics-agent"],
  ["老墨", "creative-agent"],
]);

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
    return { result: message.content, model: data.model || model };
  } finally {
    clearTimeout(timer);
  }
}

function explicitlyRequestsTask(content) {
  const value = String(content || "").trim();
  return /(?:請|幫我|替我|現在|立即).{0,24}(?:執行|指派|建立|新增|整理|搜尋|分析|製作|撰寫|處理|完成|抓取)/.test(value)
    || /(?:執行|指派|建立|新增).{0,12}(?:任務|工作)/.test(value)
    || /(?:叫|讓|交給).{0,12}(?:若晴|澄音|璃亞|景曜|阿衡|老墨)/.test(value)
    || /^(?:整理|搜尋|分析|製作|撰寫|處理|抓取)/.test(value);
}

function parseJsonReply(content) {
  const value = String(content || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(value.slice(start, end + 1));
  } catch {
    return null;
  }
}

function fallbackChatAction(content, currentDate) {
  const brief = String(content || "").trim().slice(0, 10_000);
  let assigneeId = "strategy-agent";
  for (const [name, id] of chatAgentNames) {
    if (brief.includes(name)) {
      assigneeId = id;
      break;
    }
  }
  const isGithub = /github/i.test(brief);
  const date = brief.match(/\b\d{4}-\d{2}-\d{2}\b/)?.[0] || "";
  const firstLine = brief.split(/\r?\n/)[0].replace(/^(?:請|幫我|替我|現在|立即)\s*/, "").trim();
  return {
    title: (isGithub ? `GitHub ${date || currentDate} 新開源專案整理` : firstLine || "AI 對話指派任務").slice(0, 200),
    brief,
    assigneeId,
    kind: isGithub ? "github" : "standard",
    targetDate: isGithub ? date || currentDate : date,
  };
}

function sanitizeChatAction(action, fallback) {
  if (!action || typeof action !== "object") return fallback;
  const title = String(action.title || fallback.title || "").trim().slice(0, 200);
  if (!title) return fallback;
  const assigneeId = validAgentIds.has(action.assigneeId) ? action.assigneeId : fallback.assigneeId;
  const kind = ["standard", "github"].includes(action.kind) ? action.kind : fallback.kind;
  const targetDate = /^\d{4}-\d{2}-\d{2}$/.test(String(action.targetDate || "")) ? String(action.targetDate) : fallback.targetDate;
  return { title, brief: String(action.brief || fallback.brief || "").slice(0, 10_000), assigneeId, kind, targetDate };
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const { messages } = req.body || {};
    if (!Array.isArray(messages) || !messages.length) return res.status(400).json({ error: "請輸入對話內容。" });
    const cleaned = messages.slice(-MAX_MESSAGES).map((m) => ({
      role: m.role === "assistant" ? "assistant" : "user",
      content: String(m.content || "").slice(0, MAX_CONTENT_LENGTH),
    }));
    const latestUser = [...cleaned].reverse().find((m) => m.role === "user")?.content || "";
    if (!latestUser.trim()) return res.status(400).json({ error: "請輸入對話內容。" });

    const output = await deepSeekRequest({
      model: "deepseek-v4-flash",
      messages: [
        {
          role: "system",
          content: [
            "你是 AI Office 的任務協調助理，請使用簡潔自然的繁體中文。",
            "六位員工：若晴(strategy-agent，策略協調)、澄音(intelligence-agent，AI情報整合)、璃亞(brand-agent，品牌敘事)、景曜(systems-agent，系統整合)、阿衡(analytics-agent，數據品管)、老墨(creative-agent，創意)。",
            "只有使用者明確要求執行、建立或指派工作時才建立任務；普通問答的 action 必須是 null。",
            "建立任務不代表已完成，不可假裝已有結果。",
            "只輸出合法 JSON，不要 Markdown：{\"reply\":\"給使用者的回覆\",\"action\":null}，或 {\"reply\":\"已準備交給指定員工\",\"action\":{\"title\":\"任務名稱\",\"brief\":\"完整要求\",\"assigneeId\":\"六個 id 之一\",\"kind\":\"standard|github\",\"targetDate\":\"YYYY-MM-DD 或空字串\"}}。",
            "GitHub 日期整理才使用 github；其他一律使用 standard（本機瀏覽器操作在網頁版不支援，不要建立 browser 任務）。",
          ].join("\n"),
        },
        ...cleaned,
      ],
    });

    const parsed = parseJsonReply(output.result);
    const taskRequested = explicitlyRequestsTask(latestUser);
    const currentDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Hong_Kong" }).format(new Date());
    const fallback = taskRequested ? fallbackChatAction(latestUser, currentDate) : null;
    const action = taskRequested ? sanitizeChatAction(parsed?.action, fallback) : null;
    const reply = String(parsed?.reply || output.result || (action ? "已建立任務。" : "收到。")).slice(0, 20_000);
    return res.json({ reply, action, model: output.model });
  } catch (error) {
    console.error("office/chat error:", error);
    return res.status(400).json({ error: safeError(error) });
  }
}
