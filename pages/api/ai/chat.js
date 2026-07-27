// DeepSeek chat completion, server-side only — the API key must never reach
// the client. Mirrors the plain-fetch style already used for the Claude
// fallback in pages/api/examples.js rather than pulling in an SDK for a
// single provider.
const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 4000;
const ALLOWED_MODELS = ["deepseek-v4-flash", "deepseek-v4-pro"];
const DEFAULT_MODEL = ALLOWED_MODELS[0];

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "AI 服務尚未設定" });

  const { messages, model } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "invalid messages" });
  }
  // Never forward an arbitrary client-supplied string straight into the
  // upstream request — fall back to the default for anything not on the
  // allow-list instead of rejecting outright, since a stale/unknown value
  // shouldn't hard-fail the whole chat.
  const selectedModel = ALLOWED_MODELS.includes(model) ? model : DEFAULT_MODEL;
  const cleaned = messages.slice(-MAX_MESSAGES).map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, MAX_CONTENT_LENGTH),
  }));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: selectedModel,
        messages: [{ role: "system", content: "你是 EVONCHAT 裡的 AI 助手，用繁體中文回覆，語氣自然親切。" }, ...cleaned],
        stream: false,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("DeepSeek API error:", r.status, detail);
      return res.status(502).json({ error: "AI 服務暫時無法回應" });
    }
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: "AI 沒有回覆內容" });
    return res.json({ reply });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === "AbortError") return res.status(504).json({ error: "AI 回覆逾時" });
    console.error("DeepSeek chat error:", e);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
