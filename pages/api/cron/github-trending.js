import { db } from "../../../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// 每天抓一次「最近建立、星星數最多」的10個GitHub專案，寫進 Firestore的
// siteData/githubTrending，前端（components/GithubTrendingRoom.js）只讀
// 這份快取，不會每個使用者自己各打一次GitHub API（GitHub 的 search API
// 對沒登入的請求限制很嚴——每分鐘只有10次，一堆使用者同時打就會被擋）。
//
// 「新建立」的定義：過去7天內建立的repo，用星星數排序取前10——單看「今天
// 建立」的話幾乎不會有星星（太新，還沒被發現），7天給它一點時間累積關注度，
// 同時還算「新」。
//
// 排程設定見專案根目錄 vercel.json 的 crons 區塊（Vercel Cron，每天觸發
// 一次）。CRON_SECRET 是選填的——如果之後想鎖住這個網址不讓外人亂打，去
// Vercel 環境變數加一個 CRON_SECRET，這裡才會真的檢查；沒設的話這個端點
// 目前是開放的（風險很低：不管誰打，最多就是多耗用一次GitHub API額度，
// 不會洩漏任何使用者資料）。
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const url = `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=10`;
    const headers = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;

    const r = await fetch(url, { headers });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.message || "GitHub API 請求失敗");

    const repos = (data.items || []).map(item => ({
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

    await setDoc(doc(db, "siteData", "githubTrending"), { repos, updatedAt: serverTimestamp() });

    return res.status(200).json({ ok: true, count: repos.length });
  } catch (err) {
    console.error("[cron/github-trending] failed", err);
    return res.status(500).json({ error: err.message || "抓取失敗" });
  }
}
