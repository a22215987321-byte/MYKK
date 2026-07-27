// Chat completion, server-side only — API keys must never reach the client.
// Two upstream providers: DeepSeek direct (cheap, already funded), and
// OpenRouter (one key, routes to Claude/GPT/anything else). Each model id
// the frontend can pick maps to exactly one provider + the provider's own
// model string.
const MAX_MESSAGES = 20;
const MAX_CONTENT_LENGTH = 4000;

const PROVIDERS = {
  deepseek: {
    url: "https://api.deepseek.com/chat/completions",
    apiKey: () => process.env.DEEPSEEK_API_KEY,
    missingKeyError: "DeepSeek 服務尚未設定",
  },
  openrouter: {
    url: "https://openrouter.ai/api/v1/chat/completions",
    apiKey: () => process.env.OPENROUTER_API_KEY,
    missingKeyError: "OpenRouter 服務尚未設定",
    extraHeaders: {
      "HTTP-Referer": "https://evonchat.com",
      "X-Title": "EVONCHAT",
    },
  },
};

// id: what the frontend sends/displays. provider: which entry in PROVIDERS
// above. model: the actual model string that provider expects.
const MODELS = {
  "deepseek-v4-flash": { provider: "deepseek", model: "deepseek-v4-flash" },
  "deepseek-v4-pro": { provider: "deepseek", model: "deepseek-v4-pro" },
  "claude-sonnet": { provider: "openrouter", model: "anthropic/claude-sonnet-4.6" },
  "gpt-5": { provider: "openrouter", model: "openai/gpt-5.2" },
};
const DEFAULT_MODEL_ID = "deepseek-v4-flash";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { messages, model } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "invalid messages" });
  }
  // Never forward an arbitrary client-supplied string straight into the
  // upstream request — fall back to the default for anything not on the
  // allow-list instead of rejecting outright, since a stale/unknown value
  // shouldn't hard-fail the whole chat.
  const modelId = Object.prototype.hasOwnProperty.call(MODELS, model) ? model : DEFAULT_MODEL_ID;
  const { provider: providerId, model: upstreamModel } = MODELS[modelId];
  const provider = PROVIDERS[providerId];

  const apiKey = provider.apiKey();
  if (!apiKey) return res.status(500).json({ error: provider.missingKeyError });

  const cleaned = messages.slice(-MAX_MESSAGES).map(m => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: String(m.content || "").slice(0, MAX_CONTENT_LENGTH),
  }));

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30000);
  try {
    const r = await fetch(provider.url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...(provider.extraHeaders || {}),
      },
      body: JSON.stringify({
        model: upstreamModel,
        messages: [{ role: "system", content: "你是 EVONCHAT 裡的 AI 助手，用繁體中文回覆，語氣自然親切。" }, ...cleaned],
        stream: false,
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error(`${providerId} API error:`, r.status, detail);
      return res.status(502).json({ error: "AI 服務暫時無法回應" });
    }
    const data = await r.json();
    const reply = data.choices?.[0]?.message?.content;
    if (!reply) return res.status(502).json({ error: "AI 沒有回覆內容" });
    return res.json({ reply });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === "AbortError") return res.status(504).json({ error: "AI 回覆逾時" });
    console.error(`${providerId} chat error:`, e);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
