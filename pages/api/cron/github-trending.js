import { db } from "../../../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp, arrayUnion } from "firebase/firestore";
import { summarizeRepoWithAI } from "../../../lib/githubSummarize";

// 每天抓一次「最近建立、星星數最多」的30個GitHub專案，「用途」「為何值得
// 關注」在這裡就先一次性全部生成好，寫進 Firestore——使用者打開「熱門」
// 分頁看到的是已經生成好的內容，不用自己一張卡片一張卡片點開等AI生成
// （之前拿掉排程生成、改成使用者點開才現點現生成，被使用者抓出來這樣體驗
// 很差：想要的是「打開程式→一次看完今天更新的項目→收藏有用的→結束」，
// 不是「點第一個等生成→點第二個等生成」）。
//
// 生成前先查一次全站共用快取（siteData/githubRepoSummaries）——同一個repo
// 如果昨天才生成過、或剛好被收藏／出現在6月Top100裡生成過，直接沿用，
// 不用重新呼叫AI；只有真的沒生成過的repo才會呼叫 DeepSeek。生成完的結果
// 也會寫回這份共用快取，讓收藏／Top100那邊之後點到同一個repo一樣不用
// 重新生成。
//
// 存資料的方式改成「當天一份快照」（siteData/githubTrending_YYYY-MM-DD），
// 不是每天覆蓋同一份文件——使用者反應想看之前（例如上星期）的熱門榜，
// 原本每天整批覆蓋掉舊資料，過去的就永久看不到了。另外維護一份
// siteData/githubTrendingDates 存「有哪些日期有資料」的清單，前端讀這份
// 清單做日期選單，不用自己去猜/枚舉有哪些文件存在。
//
// 30個repo平行呼叫 DeepSeek（只有快取沒命中的才要呼叫），其中任何一個
// 失敗（README抓不到、DeepSeek逾時等）都不會讓整支排程掛掉，只是那個
// repo沒有生成好的內容，使用者點開卡片時會退回現點現生成當作補救。
//
// 用 deepseek-v4-pro 開深度思考（DEEPTHINK）而不是 flash——deep think
// 通常會比 flash 慢不少，README fetch(≤10s) + DeepSeek(≤42s) 兩段加起來
// 抓在 60s 以內。30個repo平行跑，總時間取決於最慢的那個，不是全部加總，
// 所以還在 maxDuration=60s 的預算內（快取命中的repo不用等這兩段，幾乎
// 是瞬間）。
//
// 排程設定見專案根目錄 vercel.json 的 crons 區塊（Vercel Cron，每天觸發
// 一次）。CRON_SECRET 是選填的——如果之後想鎖住這個網址不讓外人亂打，去
// Vercel 環境變數加一個 CRON_SECRET，這裡才會真的檢查；沒設的話這個端點
// 目前是開放的（風險很低：不管誰打，最多就是多耗用一次GitHub/DeepSeek
// API額度，不會洩漏任何使用者資料）。
export const config = { maxDuration: 60 };

const SUMMARY_CACHE_DOC = () => doc(db, "siteData", "githubRepoSummaries");

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
    const today = new Date().toISOString().slice(0, 10);
    const url = `https://api.github.com/search/repositories?q=created:>${since}&sort=stars&order=desc&per_page=30`;
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

    // 先查一次共用快取，查得到的repo不用重新生成。快取讀失敗（例如規則
    // 還沒開放）就當作全部沒快取，退回全部重新生成——不能讓排程整支掛掉。
    let cacheData = {};
    try {
      const cacheSnap = await getDoc(SUMMARY_CACHE_DOC());
      cacheData = cacheSnap.exists() ? cacheSnap.data() : {};
    } catch (err) {
      console.error("[cron/github-trending] cache read failed", err.message);
    }

    const newlyGenerated = {};
    const repos = await Promise.all(baseRepos.map(async (repo) => {
      const cached = cacheData[repo.fullName];
      if (cached && (cached.purpose || cached.whyNotable)) {
        return { ...repo, summaryPurpose: cached.purpose || "", summaryWhyNotable: cached.whyNotable || "" };
      }
      const result = await summarizeRepoWithAI(repo);
      if (result.purpose || result.whyNotable) {
        newlyGenerated[repo.fullName] = { purpose: result.purpose, whyNotable: result.whyNotable, generatedAt: serverTimestamp() };
      }
      return { ...repo, summaryPurpose: result.purpose || "", summaryWhyNotable: result.whyNotable || "" };
    }));

    if (Object.keys(newlyGenerated).length > 0) {
      try {
        await setDoc(SUMMARY_CACHE_DOC(), newlyGenerated, { merge: true });
      } catch (err) {
        console.error("[cron/github-trending] cache write failed", err.message);
      }
    }

    await setDoc(doc(db, "siteData", `githubTrending_${today}`), {
      repos, since, date: today, updatedAt: serverTimestamp(),
    });
    // 保留 siteData/githubTrending 這份不分日期的「最新一份」——舊版前端
    // 快取／任何忘了改的參照如果還在讀這份，至少還讀得到今天的資料。
    await setDoc(doc(db, "siteData", "githubTrending"), {
      repos, since, updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, "siteData", "githubTrendingDates"), {
      dates: arrayUnion(today),
    }, { merge: true });

    return res.status(200).json({ ok: true, count: repos.length, generated: Object.keys(newlyGenerated).length, cached: repos.length - Object.keys(newlyGenerated).length });
  } catch (err) {
    console.error("[cron/github-trending] failed", err);
    return res.status(500).json({ error: err.message || "抓取失敗" });
  }
}
