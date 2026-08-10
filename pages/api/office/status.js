// AI Office's "DeepSeek 已連線" badge on the web build just reflects whether
// the server has a key configured — there's no desktop keystore here (no
// firebase-admin/session auth in this project either), matching how
// pages/api/ai/chat.js already treats DEEPSEEK_API_KEY as the sole source of
// truth for "configured".
export default function handler(req, res) {
  if (req.method !== "GET") return res.status(405).json({ error: "Method not allowed" });
  const configured = Boolean(process.env.DEEPSEEK_API_KEY);
  res.setHeader("Cache-Control", "no-store");
  return res.json({ configured, connected: configured, model: "deepseek-v4-flash" });
}
