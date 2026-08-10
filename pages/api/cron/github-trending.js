import { db } from "../../../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// 每天抓一次「最近建立、星星數最多」的10個GitHub專案，寫進 Firestore的
// siteData/githubTrending，前端（components/GithubTrendingRoom.js）只讀
// 這份快取，不會每個使用者自己各打一次GitHub API（GitHub 的 search API
// 對沒登入的請求限制很嚴——每分鐘只有10次，一堆使用者同時打就會被擋）。
//
// 「新建立」的定義：過去7天內建立的repo，用星星數排序取前10——單看「今天
// 建立」的話幾乎不會有星星（太新，還沒被發現），7天給它一點時間累積關注度，
// 同時還算「新」。since 這個日期也存起來，前端拿來顯示「本週範圍」用。
//
// 每個repo額外請 DeepSeek 回答「這個專案是做什麼的」，拆成三個欄位存起來
// （repo.summaryDetail／summaryFeatures／summaryUsage——項目詳細／功能／
// 運用，畫面上是左到右三個方塊，見 GithubTrendingRoom.js）。
//
// 第一版只給 DeepSeek repo 的名稱/一行描述/語言/星星數，完全沒有 README
// 內容——使用者實測發現這樣 DeepSeek 幾乎是憑專案名稱「猜」內容，猜錯了
// 也講得煞有介事（例如 asm-hall-of-shame 被猜成「故意寫爛程式碼的教材」，
// 但這個專案實際上是在找「最慢的單一 x86 指令」排行榜，完全是另一回事）。
// 使用者拿同樣的專案去 DeepSeek 官網問，因為官網那邊有網頁瀏覽能力能真的
// 讀到 README，答案完全正確又詳細——這裡補上同樣的資訊來源：多打一次
// GitHub API 抓 README 全文（純文字，不用另一個key，GitHub REST API 一般
// 端點沒登入也有 60次/小時額度，10個repo一次用不完），truncate 到 6000字
// 塞進 prompt，DeepSeek 才有真正的專案內容可以總結，不是憑名稱腦補。
//
// 10個repo平行呼叫，其中任何一個失敗（README抓不到、DeepSeek逾時等）都
// 不會讓整支排程掛掉，只是那個repo沒有總結或總結只根據簡介生成。
//
// 用 deepseek-v4-pro 開深度思考（DEEPTHINK）而不是 flash——deep think
// 通常會比 flash 慢不少，README fetch(≤10s) + DeepSeek(≤42s) 兩段加起來
// 抓在 60s 以內。10個repo平行跑，總時間取決於最慢的那個，不是全部加總，
// 所以還在 maxDuration=60s 的預算內。
//
// 排程設定見專案根目錄 vercel.json 的 crons 區塊（Vercel Cron，每天觸發
// 一次）。CRON_SECRET 是選填的——如果之後想鎖住這個網址不讓外人亂打，去
// Vercel 環境變數加一個 CRON_SECRET，這裡才會真的檢查；沒設的話這個端點
// 目前是開放的（風險很低：不管誰打，最多就是多耗用一次GitHub/DeepSeek
// API額度，不會洩漏任何使用者資料）。
export const config = { maxDuration: 60 };

const README_MAX_CHARS = 6000;

async function fetchReadme(fullName) {
  try {
    const headers = { Accept: "application/vnd.github.raw+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(`https://api.github.com/repos/${fullName}/readme`, { headers, signal: ctrl.signal });
    clearTimeout(timer);
    if (!r.ok) return ""; // 沒有 README 或抓不到——不當成致命錯誤，回退用簡介
    const text = await r.text();
    return text.slice(0, README_MAX_CHARS);
  } catch (err) {
    console.error("[cron/github-trending] fetchReadme error", fullName, err.message);
    return "";
  }
}

const EMPTY_SUMMARY = { detail: "", features: "", usage: "" };

// 解析 DeepSeek 回傳的 JSON——大部分時候乖乖照 response_format 指定的格式
// 回純 JSON，但保險起見也處理「包了一層 ```json 圍欄」的情況。三個欄位
// 缺任何一個就補空字串，前端那三個方塊各自有「還沒有內容」的 placeholder。
function parseSummaryJson(raw) {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "");
  try {
    const obj = JSON.parse(cleaned);
    return {
      detail: String(obj.detail || "").trim(),
      features: String(obj.features || "").trim(),
      usage: String(obj.usage || "").trim(),
    };
  } catch {
    // 解析失敗就整段塞進「項目詳細」，好過整個丟掉——使用者至少看得到內容，
    // 只是沒分成三塊。
    return { detail: cleaned, features: "", usage: "" };
  }
}

// 總結拆成三個方塊（項目詳細／功能／運用），左到右排在畫面上（見
// components/GithubTrendingRoom.js 的 RepoCard）。用 response_format
// json_object 讓 DeepSeek 直接吐結構化資料，不用自己再切字串。
async function summarize(repo) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return EMPTY_SUMMARY;
  const readme = await fetchReadme(repo.fullName);
  const prompt = `專案名稱：${repo.fullName}\n描述：${repo.description || "（作者沒有寫描述）"}\n主要語言：${repo.language || "未標示"}\n星星數：${repo.stars}\n${readme ? `\nREADME 內容：\n${readme}\n` : "\n（這個專案抓不到 README，只能根據上面的名稱／描述／語言判斷）\n"}\n請根據上面的 README 內容（不要只看專案名稱瞎猜），用 json 物件回答，格式範例：\n{"detail": "這個專案整體在做什麼、解決什麼問題（項目詳細）", "features": "主要功能特色（功能）", "usage": "適合什麼人用、實際使用情境（運用）"}\n只輸出 json，不要加 markdown 圍欄或其他文字。`;
  try {
    const ctrl = new AbortController();
    // fetchReadme 上面已經用掉最多 10s，這裡壓到 42s——兩段加起來還在
    // maxDuration=60s 的預算內留一點餘裕給 Firestore 寫入跟其他開銷。
    const timer = setTimeout(() => ctrl.abort(), 42000);
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-v4-pro",
        messages: [
          { role: "system", content: "你是幫忙介紹GitHub開源專案的助手，回答只用繁體中文，不要出現英文以外的其他語言。根據使用者提供的README內容回答，不要自己憑專案名稱猜測，README沒提到的事不要編。永遠只回傳一個JSON物件，不要有多餘文字。" },
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
    if (!r.ok) { console.error("[cron/github-trending] summarize failed", repo.fullName, r.status); return EMPTY_SUMMARY; }
    const data = await r.json();
    const content = (data.choices?.[0]?.message?.content || "").trim();
    if (!content) return EMPTY_SUMMARY;
    return parseSummaryJson(content);
  } catch (err) {
    console.error("[cron/github-trending] summarize error", repo.fullName, err.message);
    return EMPTY_SUMMARY;
  }
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const sinceDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const since = sinceDate.toISOString().slice(0, 10);
    const url = `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=10`;
    const headers = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;

    const r = await fetch(url, { headers });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.message || "GitHub API 請求失敗");

    const baseRepos = (data.items || []).map(item => ({
      id: item.id,
      name: item.name,
      fullName: item.full_name,
      owner: item.owner?.login || "",
      ownerAvatar: item.owner?.avatar_url || "",
      description: item.description || "",
      url: item.html_url,
      stars: item.stargazers_count || 0,
      language: item.language || "",
      license: item.license?.spdx_id || "",
      createdAt: item.created_at,
    }));

    const summaries = await Promise.all(baseRepos.map(summarize));
    const repos = baseRepos.map((repo, i) => ({
      ...repo,
      summaryDetail: summaries[i]?.detail || "",
      summaryFeatures: summaries[i]?.features || "",
      summaryUsage: summaries[i]?.usage || "",
    }));

    await setDoc(doc(db, "siteData", "githubTrending"), {
      repos, since, updatedAt: serverTimestamp(),
    });

    return res.status(200).json({ ok: true, count: repos.length, summarized: summaries.filter(s => s?.detail || s?.features || s?.usage).length });
  } catch (err) {
    console.error("[cron/github-trending] failed", err);
    return res.status(500).json({ error: err.message || "抓取失敗" });
  }
}
