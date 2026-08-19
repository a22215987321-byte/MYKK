import { db } from "../../../lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { summarizeRepoWithAI } from "../../../lib/githubSummarize";

// 現生成單一 repo 的「用途」＋「值得關注的原因」兩個欄位——是給收藏卡片／
// 6月Top100卡片展開時用的格式，也是熱門榜卡片的格式（三個分頁現在共用
// 同一套 GithubGridCard）。正常情況熱門榜的30個repo在排程階段
// （pages/api/cron/github-trending.js）就已經先生成好、直接存在repo
// 資料裡了，使用者點開卡片是看已經生成好的內容，不會呼叫到這支——這支
// 存在的意義是：(1) 收藏／6月Top100 裡使用者自己點開、還沒生成過的
// 個別repo，(2) 排程萬一某個repo生成失敗的補救管道。呼叫時機是使用者
// 真的點開某張卡片、且那張卡片還沒有快取過總結才會打這支，結果由前端
// 寫回 Firestore（收藏寫回 githubBookmarks 該筆文件；Top100/熱門寫回
// siteData 對應文件）。
//
// 這支自己另外維護一份「全站共用」快取（siteData/githubRepoSummaries，
// 一個文件、用 repo fullName 當 map key）——不管是這支現點現生成、還是
// 排程那邊先生成好的，都會寫進這份共用快取，同一個repo不管在哪個分頁、
// 被誰先看到，全部只會真的呼叫一次AI，之後都是直接讀快取。
const SUMMARY_CACHE_DOC = () => doc(db, "siteData", "githubRepoSummaries");

export const config = { maxDuration: 50 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  if (!process.env.DEEPSEEK_API_KEY) return res.status(500).json({ error: "DeepSeek 服務尚未設定" });

  const { fullName, description, language, stars, license } = req.body || {};
  const cleanFullName = String(fullName || "").trim();
  if (!cleanFullName || !/^[\w.-]+\/[\w.-]+$/.test(cleanFullName)) {
    return res.status(400).json({ error: "缺少有效的 repo 名稱" });
  }

  try {
    // 讀共用快取失敗（例如 Firestore 規則還沒開放 siteData/githubRepoSummaries
    // 這份文件）不該讓整支 API 掛掉——退回原本「每次都重新生成」的行為，
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

    const result = await summarizeRepoWithAI({ fullName: cleanFullName, description, language, stars, license });
    if (!result.purpose && !result.whyNotable) {
      return res.status(502).json({ error: "AI 總結生成失敗，請重試" });
    }

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
    console.error("[github/summarize-repo] failed", err);
    return res.status(500).json({ error: err.message || "生成失敗" });
  }
}
