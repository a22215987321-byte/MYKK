import { db } from "../../../lib/firebase";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";

// 每天抓一次「最近建立、星星數最多」的30個GitHub專案，寫進 Firestore的
// siteData/githubTrending，前端（components/GithubTrendingRoom.js）只讀
// 這份快取，不會每個使用者自己各打一次GitHub API（GitHub 的 search API
// 對沒登入的請求限制很嚴——每分鐘只有10次，一堆使用者同時打就會被擋）。
//
// 「新建立」的定義：過去7天內建立的repo，用星星數排序取前30——單看「今天
// 建立」的話幾乎不會有星星（太新，還沒被發現），7天給它一點時間累積關注度，
// 同時還算「新」。since 這個日期也存起來，前端拿來顯示「本週範圍」用；每個
// repo自己的 createdAt 也存著，前端卡片/詳情彈窗會顯示「幾天前建立」，不是
// 只有整批的「本週」範圍、看不出個別項目確切是哪一天。原本只抓10個，使用者
// 反應想看到「一整週」的熱門專案份量不只10個，改成30個。
//
// 這支之前還會另外多打一次 DeepSeek，把每個repo的「項目詳細/功能/運用」
// 生成好存進 summaryDetail/summaryFeatures/summaryUsage 三個欄位——這是舊
// 版格式，現在「熱門」分頁已經改用跟「收藏」「6月Top100」同一套
// GithubGridCard／DetailRow 格式（連結/用途/主要語言/授權/星數/建立時間/
// 為何值得關注），對應的「用途」「為何值得關注」是使用者真的點開卡片時才
// 現點現生成（見 components/GithubTrendingRoom.js 呼叫 /api/github/
// summarize-repo.js，那支自己有全站共用快取，同一個repo不管誰先點開、
// 之後都不用再生成）。這支排程如果還先幫全部30個repo都跑一次AI生成，
// 大部分repo可能根本沒人點開看，等於每天白白燒AI額度——拿掉這段，改成
// 單純抓GitHub API資料、寫Firestore，不再呼叫AI。
//
// 排程設定見專案根目錄 vercel.json 的 crons 區塊（Vercel Cron，每天觸發
// 一次）。CRON_SECRET 是選填的——如果之後想鎖住這個網址不讓外人亂打，去
// Vercel 環境變數加一個 CRON_SECRET，這裡才會真的檢查；沒設的話這個端點
// 目前是開放的（風險很低：不管誰打，最多就是多耗用一次GitHub API額度，
// 不會洩漏任何使用者資料，現在也不再牽涉AI額度了）。
export const config = { maxDuration: 20 };

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
    const url = `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=30`;
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
      license: item.license?.spdx_id || "",
      createdAt: item.created_at,
    }));

    await setDoc(doc(db, "siteData", "githubTrending"), {
      repos, since, updatedAt: serverTimestamp(),
    });

    return res.status(200).json({ ok: true, count: repos.length });
  } catch (err) {
    console.error("[cron/github-trending] failed", err);
    return res.status(500).json({ error: err.message || "抓取失敗" });
  }
}
