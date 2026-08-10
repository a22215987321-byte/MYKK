import { db } from "../../../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// 一次性抓「指定月份建立、星星數最高的 100 個」GitHub 專案，寫進
// siteData/githubTop100_{YYYY-MM}——跟每天自動跑的 cron/github-trending.js
// (只抓最近 7 天 10 個) 是不同的資料集，這支是回顧某個已經過去的整月，不用
// 排程重複執行，手動打一次就好。GitHub search API per_page 上限剛好是
// 100，一次呼叫就拿得到，不用分頁。
//
// 不在這裡先幫全部 100 個生成 AI 總結——README 抓取 + DeepSeek deep think
// 100 次會遠遠超過 Vercel 60s 的函式時限，也很燒 GitHub/DeepSeek 額度。改成
// 前端點開單一卡片時才呼叫 /api/github/summarize-repo 現生成、生成後存回
// 這份文件（見 components/GithubTrendingRoom.js），只有真的被看到的專案才
// 花這個成本。
export const config = { maxDuration: 30 };

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const month = /^\d{4}-\d{2}$/.test(String(req.query.month || "")) ? String(req.query.month) : "2026-06";
  const [year, mon] = month.split("-").map(Number);
  const since = `${month}-01`;
  const lastDay = new Date(year, mon, 0).getDate();
  const until = `${month}-${String(lastDay).padStart(2, "0")}`;

  try {
    const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(`created:${since}..${until}`)}&sort=stars&order=desc&per_page=100`;
    const headers = { Accept: "application/vnd.github+json" };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `token ${process.env.GITHUB_TOKEN}`;

    const r = await fetch(url, { headers });
    const data = await r.json();
    if (!r.ok) throw new Error(data?.message || "GitHub API 請求失敗");

    const repos = (data.items || []).map((item) => ({
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
      summaryPurpose: "",
      summaryWhyNotable: "",
    }));

    await setDoc(doc(db, "siteData", `githubTop100_${month}`), {
      repos, month, since, until, updatedAt: serverTimestamp(),
    });

    return res.status(200).json({ ok: true, month, count: repos.length });
  } catch (err) {
    console.error("[github/fetch-month] failed", err);
    return res.status(500).json({ error: err.message || "抓取失敗" });
  }
}
