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
// 每個repo額外請 DeepSeek 回答「這個專案是做什麼的」，存在 repo.summary——
// 只根據 GitHub API 現成的名稱/描述/語言生成，沒有另外去抓 README 全文
// （抓 README 要另一個API呼叫+處理Markdown，這裡先用GitHub本來就有的簡介
// 欄位就夠寫出有用的答案了）。10個repo平行呼叫，其中任何一個失敗都不會讓
// 整支排程掛掉，只是那個repo沒有總結。
//
// 原本用 deepseek-v4-flash + 「寫2到3句話總結」的固定格式指令，使用者反映
// 內容很差、太籠統——改成用 deepseek-v4-pro 開深度思考（DEEPTHINK），直接
// 問「這個專案是做什麼的」讓模型自己決定要寫多長、怎麼寫，不再用死板的
// 句數限制綁住它。deep think 通常會比 flash 慢不少，per-call timeout 從
// 25s 拉到 50s（10個repo平行跑，總時間取決於最慢的那個，不是全部加總，
// 所以還在 maxDuration=60s 的預算內）。
//
// 排程設定見專案根目錄 vercel.json 的 crons 區塊（Vercel Cron，每天觸發
// 一次）。CRON_SECRET 是選填的——如果之後想鎖住這個網址不讓外人亂打，去
// Vercel 環境變數加一個 CRON_SECRET，這裡才會真的檢查；沒設的話這個端點
// 目前是開放的（風險很低：不管誰打，最多就是多耗用一次GitHub/DeepSeek
// API額度，不會洩漏任何使用者資料）。
export const config = { maxDuration: 60 };

async function summarize(repo) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return "";
  const prompt = `專案名稱：${repo.fullName}\n描述：${repo.description || "（作者沒有寫描述）"}\n主要語言：${repo.language || "未標示"}\n星星數：${repo.stars}\n\n這個開源專案是做什麼的？講清楚它實際的功能、解決什麼問題、適合什麼人用。`;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 50000);
    const r = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "deepseek-v4-pro",
        messages: [
          { role: "system", content: "你是幫忙介紹GitHub開源專案的助手，回答只用繁體中文，不要出現英文以外的其他語言，不要用「這是一個」開頭。" },
          { role: "user", content: prompt },
        ],
        stream: false,
        reasoning_effort: "high",
        extra_body: { thinking: { type: "enabled" } },
      }),
      signal: ctrl.signal,
    });
    clearTimeout(timer);
    if (!r.ok) { console.error("[cron/github-trending] summarize failed", repo.fullName, r.status); return ""; }
    const data = await r.json();
    return (data.choices?.[0]?.message?.content || "").trim();
  } catch (err) {
    console.error("[cron/github-trending] summarize error", repo.fullName, err.message);
    return "";
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
      createdAt: item.created_at,
    }));

    const summaries = await Promise.all(baseRepos.map(summarize));
    const repos = baseRepos.map((repo, i) => ({ ...repo, summary: summaries[i] || "" }));

    await setDoc(doc(db, "siteData", "githubTrending"), {
      repos, since, updatedAt: serverTimestamp(),
    });

    return res.status(200).json({ ok: true, count: repos.length, summarized: summaries.filter(Boolean).length });
  } catch (err) {
    console.error("[cron/github-trending] failed", err);
    return res.status(500).json({ error: err.message || "抓取失敗" });
  }
}
