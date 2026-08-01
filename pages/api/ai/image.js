// Image generation, server-side only — same OPENROUTER_API_KEY as chat.js,
// but a different upstream request shape (modalities: ["image","text"] on
// the chat/completions endpoint, per OpenRouter's native image-gen models)
// and a different response shape to parse back out.
const MAX_PROMPT_LENGTH = 2000;
const MODEL = "openai/gpt-image-2";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { prompt } = req.body || {};
  if (typeof prompt !== "string" || !prompt.trim()) {
    return res.status(400).json({ error: "invalid prompt" });
  }
  const cleanedPrompt = prompt.trim().slice(0, MAX_PROMPT_LENGTH);

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "OpenRouter 服務尚未設定" });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 60000);
  try {
    const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://evonchat.com",
        "X-Title": "EVONCHAT",
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content: cleanedPrompt }],
        modalities: ["image", "text"],
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      console.error("openrouter image API error:", r.status, detail);
      return res.status(502).json({ error: "圖片生成服務暫時無法回應" });
    }
    const data = await r.json();
    const message = data.choices?.[0]?.message;
    // OpenRouter's documented shape for image-gen chat-completions models is
    // message.images[].image_url.url — but this hasn't been confirmed against
    // a live successful response yet, so fall back to a couple of other
    // plausible shapes and log the raw payload on total failure (checked via
    // `vercel logs` the same way the wrong model-id strings got caught).
    const imageUrl =
      message?.images?.[0]?.image_url?.url ||
      message?.images?.[0]?.url ||
      (typeof message?.content === "string" && message.content.startsWith("data:image/") ? message.content : null) ||
      (typeof message?.content === "string" && /^https?:\/\//.test(message.content.trim()) ? message.content.trim() : null);
    if (!imageUrl) {
      console.error("openrouter image response had no recognizable image field:", JSON.stringify(data).slice(0, 2000));
      return res.status(502).json({ error: "圖片生成沒有回傳圖片，請重試" });
    }
    return res.json({ imageUrl });
  } catch (e) {
    clearTimeout(timer);
    if (e.name === "AbortError") return res.status(504).json({ error: "圖片生成逾時" });
    console.error("openrouter image error:", e);
    return res.status(500).json({ error: "伺服器錯誤" });
  }
}
