// 共用給 pages/api/github/summarize-repo.js（使用者真的點開卡片、快取沒
// 命中時現點現生成）跟 pages/api/cron/github-trending.js（每天排程幫當天
// 30個熱門repo「一次性」先生成好，使用者打開頁面就已經是生成好的內容，
// 不用一個一個點開等）共用——同一套 README 抓取／DeepSeek prompt／JSON
// 解析邏輯只寫一份，兩邊呼叫時機不同，但生成出來的內容（用途／為何值得
// 關注）要是同一種格式，不能各寫一份、之後改prompt還要改兩個地方、
// 容易兩邊慢慢長歪。
const README_MAX_CHARS = 6000;

export async function fetchReadme(fullName) {
  try {
    const headers = { Accept: "application/vnd.github.raw+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(`https://api.github.com/repos/${fullName}/readme`, { headers, signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return "";
    const text = await r.text();
    return text.slice(0, README_MAX_CHARS);
  } catch {
    return "";
  }
}

export function parseSummaryJson(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    const obj = JSON.parse(cleaned);
    return { purpose: String(obj.purpose || "").trim(), whyNotable: String(obj.whyNotable || "").trim() };
  } catch {
    return { purpose: cleaned, whyNotable: "" };
  }
}

// 回傳 { purpose, whyNotable }，失敗回傳 { purpose: "", whyNotable: "" }——
// 呼叫端（cron／API）自己決定失敗要怎麼處理，這裡不拋錯讓整批作業掛掉。
export async function summarizeRepoWithAI({ fullName, description, language, stars, license }) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return { purpose: "", whyNotable: "" };

  const readme = await fetchReadme(fullName);
  const prompt = `專案名稱：${fullName}\n描述：${description || "（作者沒有寫描述）"}\n主要語言：${language || "未標示"}\n授權：${license || "未標示"}\n星星數：${stars || 0}\n${readme ? `\nREADME 內容：\n${readme}\n` : "\n（這個專案抓不到 README，只能根據上面的名稱／描述／語言判斷）\n"}\n請根據上面的 README 內容（不要只看專案名稱瞎猜），用 json 物件回答，格式範例：\n{"purpose": "這個專案的用途，在做什麼、解決什麼問題", "whyNotable": "為什麼值得關注"}\n只輸出 json，不要加 markdown 圍欄或其他文字。`;

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 42000);
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-v4-pro",
        messages: [
          { role: "system", content: "你是幫忙介紹GitHub開源專案的助手，回答只用繁體中文。根據使用者提供的README內容回答，不要自己憑專案名稱猜測，README沒提到的事不要編。永遠只回傳一個JSON物件，不要有多餘文字。" },
          { role: "user", content: prompt },
        ],
        stream: false,
        reasoning_effort: "high",
        extra_body: { thinking: { type: "enabled" } },
        response_format: { type: "json_object" },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("[githubSummarize] DeepSeek error", fullName, r.status, detail);
      return { purpose: "", whyNotable: "" };
    }
    const data = await r.json();
    const content = (data.choices?.[0]?.message?.content || "").trim();
    if (!content) return { purpose: "", whyNotable: "" };
    return parseSummaryJson(content);
  } catch (err) {
    console.error("[githubSummarize] failed", fullName, err.message);
    return { purpose: "", whyNotable: "" };
  }
}
