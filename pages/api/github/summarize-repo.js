import { db } from "../../../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

// 現生成單一 repo 的「用途」＋「值得關注的原因」兩個欄位——比每日熱門榜
// 那組「項目詳細／功能／運用」三方塊(pages/api/cron/github-trending.js)
// 更簡短，是給收藏卡片／6月Top100卡片展開時用的格式。呼叫時機是使用者真的
// 點開某張卡片、且那張卡片還沒有快取過總結才會打這支，結果由前端寫回
// Firestore（收藏寫回 githubBookmarks 該筆文件；Top100 寫回
// siteData/githubTop100_{month} 那個陣列裡對應的項目）。
//
// 這支自己另外維護一份「全站共用」快取（siteData/githubRepoSummaries，
// 一個文件、用 repo fullName 當 map key）——收藏是每個使用者自己獨立一份
// snapshot，A使用者收藏某個repo觸發生成之後，B使用者收藏同一個repo原本會
// 完全不知道A已經生成過、自己再花一次AI額度重新生成同一份內容。呼叫這支
// 之前先查這份共用快取，查得到就直接回傳、完全不打AI；查不到才真的呼叫
// DeepSeek，生成完寫回共用快取，下一個使用者（不管收藏還是Top100）就不用
// 再生成同一個repo了。
const README_MAX_CHARS = 6000;

const SUMMARY_CACHE_DOC = () => doc(db, "siteData", "githubRepoSummaries");

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
    // 讀共用快取失敗（例如 Firestore 規則還沒開放 siteData/githubRepoSummaries
    // 這份新文件）不該讓整支 API 掛掉——退回原本「每次都重新生成」的行為，
    // 至少功能還能動，只是還沒省到 token。
    try {
      const cacheSnap = await getDoc(SUMMARY_CACHE_DOC());
      const cached = cacheSnap.exists() ? cacheSnap.data()[cleanFullName] : null;
      if (cached && (cached.purpose || cached.whyNotable)) {
        return res.json({ purpose: cached.purpose || "", whyNotable: cached.whyNotable || "" });
      }
    } catch (cacheReadErr) {
      console.error("[github/summarize-repo] cache read failed, generating without cache", cacheReadErr);
    }

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
    const result = parseJson(content);

    try {
      await setDoc(SUMMARY_CACHE_DOC(), {
        [cleanFullName]: { purpose: result.purpose || "", whyNotable: result.whyNotable || "", generatedAt: serverTimestamp() },
      }, { merge: true });
    } catch (cacheErr) {
      // 寫共用快取失敗不該讓這次生成的結果白費——照樣把已經生成好的內容
      // 回給使用者，只是下一個人可能會再生成一次。
      console.error("[github/summarize-repo] cache write failed", cacheErr);
    }

    return res.json(result);
  } catch (err) {
    if (err.name === "AbortError") return res.status(504).json({ error: "AI 回覆逾時，請重試" });
    console.error("[github/summarize-repo] failed", err);
    return res.status(500).json({ error: err.message || "生成失敗" });
  }
}
