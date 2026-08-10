// 現生成單一 repo 的「用途」＋「值得關注的原因」兩個欄位——比每日熱門榜
// 那組「項目詳細／功能／運用」三方塊(pages/api/cron/github-trending.js)
// 更簡短，是給收藏卡片／6月Top100卡片展開時用的格式。呼叫時機是使用者真的
// 點開某張卡片、且那張卡片還沒有快取過總結才會打這支，結果由前端寫回
// Firestore（收藏寫回 githubBookmarks 該筆文件；Top100 寫回
// siteData/githubTop100_{month} 那個陣列裡對應的項目），這支本身不碰
// Firestore。
const README_MAX_CHARS = 6000;

async function fetchReadme(fullName) {
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

function parseJson(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    const obj = JSON.parse(cleaned);
    return { purpose: String(obj.purpose || "").trim(), whyNotable: String(obj.whyNotable || "").trim() };
  } catch {
    return { purpose: cleaned, whyNotable: "" };
  }
}

export const config = { maxDuration: 50 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "DeepSeek 服務尚未設定" });

  const { fullName, description, language, stars, license } = req.body || {};
  const cleanFullName = String(fullName || "").trim();
  if (!cleanFullName || !/^[\w.-]+\/[\w.-]+$/.test(cleanFullName)) {
    return res.status(400).json({ error: "缺少有效的 repo 名稱" });
  }

  try {
    const readme = await fetchReadme(cleanFullName);
    const prompt = `專案名稱：${cleanFullName}\n描述：${description || "（作者沒有寫描述）"}\n主要語言：${language || "未標示"}\n授權：${license || "未標示"}\n星星數：${stars || 0}\n${readme ? `\nREADME 內容：\n${readme}\n` : "\n（這個專案抓不到 README，只能根據上面的名稱／描述／語言判斷）\n"}\n請根據上面的 README 內容（不要只看專案名稱瞎猜），用 json 物件回答，格式範例：\n{"purpose": "這個專案的用途，在做什麼、解決什麼問題", "whyNotable": "為什麼值得關注"}\n只輸出 json，不要加 markdown 圍欄或其他文字。`;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 40000);
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
      console.error("[github/summarize-repo] DeepSeek error", r.status, detail);
      return res.status(502).json({ error: "AI 服務暫時無法回應" });
    }
    const data = await r.json();
    const content = (data.choices?.[0]?.message?.content || "").trim();
    if (!content) return res.status(502).json({ error: "AI 沒有回覆內容" });
    return res.json(parseJson(content));
  } catch (err) {
    if (err.name === "AbortError") return res.status(504).json({ error: "AI 回覆逾時，請重試" });
    console.error("[github/summarize-repo] failed", err);
    return res.status(500).json({ error: err.message || "生成失敗" });
  }
}
