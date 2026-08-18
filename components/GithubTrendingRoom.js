import { useState, useEffect, useRef } from "react";
import { db } from "../lib/firebase";
import { doc, setDoc, updateDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, orderBy } from "firebase/firestore";
import { toast } from "../lib/toast";

function timeAgo(iso) {
  if (!iso) return "";
  const diffMs = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (days <= 0) return "今天建立";
  if (days === 1) return "昨天建立";
  return `${days} 天前建立`;
}

function formatUpdatedAt(ts) {
  const d = ts?.toDate ? ts.toDate() : null;
  if (!d) return "";
  return d.toLocaleString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// "2026-08-02" → "8/2"；updatedAt 是 Firestore Timestamp，since 是純日期字串，
// 兩種輸入都要能處理。
function formatShortDate(input) {
  const d = input?.toDate ? input.toDate() : (input ? new Date(input) : null);
  if (!d || isNaN(d)) return "";
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

async function apiRequest(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `服務錯誤（${response.status}）`);
  return data;
}

const LANG_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Go: "#00ADD8",
  Rust: "#dea584", Java: "#b07219", "C++": "#f34b7d", C: "#555555", Swift: "#F05138",
  Kotlin: "#A97BFF", Ruby: "#701516", PHP: "#4F5D95", Shell: "#89e051", HTML: "#e34c26",
  CSS: "#563d7c", Vue: "#41b883", Dart: "#00B4AB",
};

function DetailRow({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)", whiteSpace: "pre-wrap" }}>{children}</div>
    </div>
  );
}

// 熱門／收藏／6月Top100 三個分頁共用同一套卡片——一行3個小方塊，點擊會
// 彈出一個獨立的置中詳情彈窗，不是原地在網格裡展開（那個排版試過，使用者
// 反應像表格、很難讀）。彈窗內容照使用者指定的格式由上到下直排：連結／
// 用途／主要語言／授權／星數／為何值得關注，不分左右欄。用途／為何值得
// 關注是現點現生成（見 /api/github/summarize-repo.js），那支 API 自己有
// 一份全站共用的快取（siteData/githubRepoSummaries），同一個 repo不管
// 被哪個使用者、在熱門／收藏／Top100哪個分頁點開，全部只會真的生成一次，
// 之後都是直接讀快取——生成完這裡再另外寫回呼叫端自己的文件（收藏寫回
// githubBookmarks 該筆文件、Top100/熱門寫回 siteData 對應文件），純粹是
// 讓同一次瀏覽裡再次點開同一張卡片不用連快取文件都再查一次，不影響「只
// 生成一次」這件事本身。
function GithubGridCard({ repo, rank, bookmarked, onToggleBookmark, expanded, onToggleExpand, generating, pinnable, onPin }) {
  const [menuPos, setMenuPos] = useState(null);
  const nameRef = useRef(null);

  // 專案名稱常見連字號（expo-content-transition），瀏覽器預設雙擊選字
  // 只會選到連字號分隔的其中一段，不是整個名稱——這裡雙擊直接選整個名稱
  // 節點的文字內容，選好使用者自己按 Ctrl+C 複製。
  const selectWholeName = () => {
    const el = nameRef.current;
    if (!el || typeof window.getSelection !== "function") return;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  return (
    <>
      <div
        onClick={() => onToggleExpand(repo)}
        onDoubleClick={pinnable ? (e) => { e.stopPropagation(); onPin(repo); } : undefined}
        onContextMenu={e => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); }}
        title={pinnable ? "點擊查看詳情，左鍵雙擊置頂" : "點擊查看詳情"}
        style={{
          background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14,
          padding: 14, cursor: "pointer", display: "flex", flexDirection: "column", gap: 10,
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {rank != null && <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text-faint)", width: 20, flexShrink: 0, textAlign: "center" }}>{rank}</div>}
          {repo.ownerAvatar
            ? <img src={repo.ownerAvatar} alt={repo.owner} style={{ width: 36, height: 36, borderRadius: 9, objectFit: "cover", flexShrink: 0 }} />
            : <div style={{ width: 36, height: 36, borderRadius: 9, background: "var(--panel-alt)", flexShrink: 0 }} />}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {repo.fullName}
              {bookmarked && <span style={{ marginLeft: 5, fontSize: 11 }} title="已收藏">⭐</span>}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <span>⭐ {repo.stars?.toLocaleString?.() ?? repo.stars}</span>
              {repo.language && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: LANG_COLORS[repo.language] || "var(--text-faint)" }} />
                  {repo.language}
                </span>
              )}
              {repo.createdAt && <span>{timeAgo(repo.createdAt)}</span>}
            </div>
          </div>
        </div>

        {menuPos && (
          <>
            <div onClick={(e) => { e.stopPropagation(); setMenuPos(null); }} style={{ position: "fixed", inset: 0, zIndex: 3099 }} />
            <div style={{
              position: "fixed", left: menuPos.x, top: menuPos.y, zIndex: 3100,
              background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10,
              boxShadow: "var(--card-shadow)", overflow: "hidden", minWidth: 120,
            }}>
              <button onClick={(e) => { e.stopPropagation(); onToggleBookmark(repo); setMenuPos(null); }}
                style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text)", fontSize: 13, textAlign: "left", cursor: "pointer" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
                onMouseLeave={e => e.currentTarget.style.background = "none"}>
                {bookmarked ? "❌ 取消收藏" : "⭐ 收藏"}
              </button>
            </div>
          </>
        )}
      </div>

      {expanded && (
        <div role="dialog" aria-modal="true" onClick={(e) => { if (e.detail > 1) return; onToggleExpand(repo); }}
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ maxWidth: 760, width: "100%", maxHeight: "86vh", overflowY: "auto", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 22 }}>
              {repo.ownerAvatar
                ? <img src={repo.ownerAvatar} alt={repo.owner} style={{ width: 44, height: 44, borderRadius: 11, objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 44, height: 44, borderRadius: 11, background: "var(--panel-alt)", flexShrink: 0 }} />}
              <div ref={nameRef} onDoubleClick={selectWholeName}
                style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 800, color: "var(--text)", lineHeight: 1.4, wordBreak: "break-word" }}>
                {rank != null ? `${rank}. ` : ""}{repo.fullName}
              </div>
              <button onClick={() => onToggleExpand(repo)} aria-label="關閉"
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, padding: 4, flexShrink: 0 }}>✕</button>
            </div>

            {generating ? (
              <div style={{ fontSize: 13, color: "var(--text-faint)", padding: "16px 0" }}>🤖 AI 生成中…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                <DetailRow label="連結">
                  <a href={repo.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "none", wordBreak: "break-all" }}>{repo.url}</a>
                </DetailRow>
                <DetailRow label="用途">{repo.summaryPurpose || "（還沒有介紹，點這張卡片會自動生成）"}</DetailRow>
                <DetailRow label="主要語言">{repo.language || "未標示"}</DetailRow>
                <DetailRow label="授權">{repo.license || "未標示"}</DetailRow>
                <DetailRow label="星數">{repo.stars?.toLocaleString?.() ?? repo.stars}</DetailRow>
                {repo.createdAt && (
                  <DetailRow label="建立時間">
                    {new Date(repo.createdAt).toLocaleDateString("zh-TW", { year: "numeric", month: "numeric", day: "numeric" })}（{timeAgo(repo.createdAt)}）
                  </DetailRow>
                )}
                <DetailRow label="為何值得關注">{repo.summaryWhyNotable || "（無）"}</DetailRow>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const MONTH_KEY = "2026-06";

// 每天自動更新一次的GitHub熱門新專案（過去7天內建立、星星數最高的30個）——
// 資料是 pages/api/cron/github-trending.js 這支排程每天抓一次寫進 Firestore
// 的快取，這裡單純讀，不會自己去打GitHub API（一堆使用者同時看這頁的話，
// 沒登入的GitHub API一分鐘只能打10次，馬上就會被擋）。這個分頁跟收藏／
// 6月Top100 共用同一套 GithubGridCard／DetailRow 格式（見上面那個元件的
// 註解），排程那邊也不再自己先跑一輪 AI 生成——用途／為何值得關注一律現點
// 現生成、全站共用快取，跟其他兩個分頁完全一致。
//
// 「6月Top100」是另一份獨立資料——2026年6月整月建立、星星數最高的100個，
// 一次性抓好放 siteData/githubTop100_2026-06（見
// pages/api/github/fetch-month.js），不像熱門榜每天更新。
//
// 收藏是每個使用者自己的，存在 githubBookmarks/{uid}/items/{repoId}——存的
// 是收藏當下的完整 repo 內容（不是只存個 id 回頭查 siteData），因為熱門榜
// 每天會被排程整批覆蓋，被收藏的專案隔天可能就掉出前30名，這樣收藏頁才
// 還看得到完整資料。
export default function GithubTrendingRoom({ uid }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthData, setMonthData] = useState(null);
  const [monthLoading, setMonthLoading] = useState(true);
  const [tab, setTab] = useState("hot"); // "hot" | "bookmarks" | "top100"
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksReady, setBookmarksReady] = useState(false);
  const [expandedHotId, setExpandedHotId] = useState(null);
  const [expandedBookmarkId, setExpandedBookmarkId] = useState(null);
  const [expandedTop100Id, setExpandedTop100Id] = useState(null);
  const [generatingId, setGeneratingId] = useState(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "siteData", "githubTrending"), snap => {
      setData(snap.exists() ? snap.data() : null);
      setLoading(false);
    }, err => {
      console.error("[GithubTrendingRoom] snapshot failed", err);
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "siteData", `githubTop100_${MONTH_KEY}`), snap => {
      setMonthData(snap.exists() ? snap.data() : null);
      setMonthLoading(false);
    }, err => {
      console.error("[GithubTrendingRoom] month snapshot failed", err);
      setMonthLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    if (!uid) { setBookmarksReady(true); return; }
    const q = query(collection(db, "githubBookmarks", uid, "items"), orderBy("bookmarkedAt", "desc"));
    const unsub = onSnapshot(q, snap => {
      setBookmarks(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setBookmarksReady(true);
    }, err => {
      console.error("[GithubTrendingRoom] bookmarks snapshot failed", err);
      setBookmarksReady(true);
    });
    return unsub;
  }, [uid]);

  const bookmarkedIds = new Set(bookmarks.map(b => String(b.id)));

  const toggleBookmark = async (repo) => {
    if (!uid) { toast("請先登入後再收藏"); return; }
    const repoId = String(repo.id);
    try {
      if (bookmarkedIds.has(repoId)) {
        await deleteDoc(doc(db, "githubBookmarks", uid, "items", repoId));
      } else {
        const { id, name, fullName, owner, ownerAvatar, description, url, stars, language, license, createdAt, summaryPurpose, summaryWhyNotable } = repo;
        await setDoc(doc(db, "githubBookmarks", uid, "items", repoId), {
          id, name, fullName, owner, ownerAvatar, description: description || "", url, stars, language: language || "", license: license || "",
          createdAt: createdAt || "",
          summaryPurpose: summaryPurpose || "", summaryWhyNotable: summaryWhyNotable || "",
          bookmarkedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("[GithubTrendingRoom] toggleBookmark failed", err);
      toast(err?.code === "permission-denied" ? "收藏失敗：Firestore 規則還沒加 githubBookmarks" : "收藏失敗，請重試");
    }
  };

  // 雙擊收藏卡片置頂——收藏清單本來就是照 bookmarkedAt 由新到舊排序，把
  // bookmarkedAt 重新蓋成現在，自然就排到最前面，不用另外加一個排序欄位。
  const pinBookmark = async (repo) => {
    if (!uid) return;
    try {
      await updateDoc(doc(db, "githubBookmarks", uid, "items", String(repo.id)), { bookmarkedAt: serverTimestamp() });
      toast(`已把「${repo.fullName}」移到最前面`);
    } catch (err) {
      console.error("[GithubTrendingRoom] pinBookmark failed", err);
      toast("置頂失敗，請重試");
    }
  };

  const generateSummary = async (repo, writeBack) => {
    setGeneratingId(repo.id);
    try {
      const result = await apiRequest("/api/github/summarize-repo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: repo.fullName, description: repo.description, language: repo.language, stars: repo.stars, license: repo.license }),
      });
      await writeBack(result);
    } catch (err) {
      console.error("[GithubTrendingRoom] generateSummary failed", err);
      toast(err.message || "AI 總結生成失敗，請重試");
    } finally {
      setGeneratingId(null);
    }
  };

  const toggleBookmarkExpand = (repo) => {
    if (expandedBookmarkId === repo.id) { setExpandedBookmarkId(null); return; }
    setExpandedBookmarkId(repo.id);
    if (!repo.summaryPurpose && !repo.summaryWhyNotable && uid) {
      void generateSummary(repo, async (result) => {
        await updateDoc(doc(db, "githubBookmarks", uid, "items", String(repo.id)), {
          summaryPurpose: result.purpose || "", summaryWhyNotable: result.whyNotable || "",
        });
      });
    }
  };

  const toggleTop100Expand = (repo) => {
    if (expandedTop100Id === repo.id) { setExpandedTop100Id(null); return; }
    setExpandedTop100Id(repo.id);
    if (!repo.summaryPurpose && !repo.summaryWhyNotable) {
      void generateSummary(repo, async (result) => {
        const updatedRepos = (monthData?.repos || []).map(r => r.id === repo.id
          ? { ...r, summaryPurpose: result.purpose || "", summaryWhyNotable: result.whyNotable || "" }
          : r);
        await setDoc(doc(db, "siteData", `githubTop100_${MONTH_KEY}`), { ...monthData, repos: updatedRepos }, { merge: true });
      });
    }
  };

  const toggleHotExpand = (repo) => {
    if (expandedHotId === repo.id) { setExpandedHotId(null); return; }
    setExpandedHotId(repo.id);
    if (!repo.summaryPurpose && !repo.summaryWhyNotable) {
      void generateSummary(repo, async (result) => {
        const updatedRepos = (data?.repos || []).map(r => r.id === repo.id
          ? { ...r, summaryPurpose: result.purpose || "", summaryWhyNotable: result.whyNotable || "" }
          : r);
        await setDoc(doc(db, "siteData", "githubTrending"), { ...data, repos: updatedRepos }, { merge: true });
      });
    }
  };

  const repos = data?.repos || [];
  const monthRepos = monthData?.repos || [];
  const rangeLabel = data?.since && data?.updatedAt
    ? `${formatShortDate(data.since)}-${formatShortDate(data.updatedAt)}`
    : "";

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ padding: "20px 24px 80px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <h1 style={{ margin: "4px 0", fontSize: 22, fontWeight: 800 }}>
            🔥 GitHub 每週熱門專案{rangeLabel && ` ${rangeLabel}`}
          </h1>
          {tab === "hot" && data?.updatedAt && (
            <div style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>上次更新：{formatUpdatedAt(data.updatedAt)}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          {[["hot", "🔥 熱門"], ["bookmarks", "⭐ 收藏"], ["top100", "🏆 6月 Top100"]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              style={{
                border: "1px solid var(--border)", borderRadius: 999, padding: "6px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                background: tab === key ? "var(--accent)" : "var(--panel)",
                color: tab === key ? "var(--accent-text)" : "var(--text-muted)",
              }}>
              {label}{key === "bookmarks" && bookmarks.length > 0 ? ` (${bookmarks.length})` : ""}
            </button>
          ))}
        </div>

        {tab === "hot" && (
          loading ? (
            <div style={{ textAlign: "center", color: "var(--text-faint)", padding: "60px 0" }}>載入中...</div>
          ) : repos.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "60px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🕐</div>
              還沒有資料，等下一次自動更新（每天一次）
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {repos.map((repo, i) => (
                <GithubGridCard key={repo.id} repo={repo} rank={i + 1}
                  bookmarked={bookmarkedIds.has(String(repo.id))}
                  expanded={expandedHotId === repo.id} onToggleExpand={toggleHotExpand}
                  generating={generatingId === repo.id} onToggleBookmark={toggleBookmark} />
              ))}
            </div>
          )
        )}

        {tab === "bookmarks" && (
          !bookmarksReady ? (
            <div style={{ textAlign: "center", color: "var(--text-faint)", padding: "60px 0" }}>載入中...</div>
          ) : bookmarks.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "60px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
              還沒有收藏任何專案——右鍵點專案卡片就能收藏
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
              {bookmarks.map((repo, i) => (
                <GithubGridCard key={repo.id} repo={repo} rank={i + 1}
                  bookmarked pinnable onPin={pinBookmark}
                  expanded={expandedBookmarkId === repo.id} onToggleExpand={toggleBookmarkExpand}
                  generating={generatingId === repo.id} onToggleBookmark={toggleBookmark} />
              ))}
            </div>
          )
        )}

        {tab === "top100" && (
          monthLoading ? (
            <div style={{ textAlign: "center", color: "var(--text-faint)", padding: "60px 0" }}>載入中...</div>
          ) : monthRepos.length === 0 ? (
            <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "60px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏆</div>
              還沒有 {MONTH_KEY} 的資料
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 12 }}>{MONTH_KEY} 建立、星數最高的 {monthRepos.length} 個開源專案</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 12 }}>
                {monthRepos.map((repo, i) => (
                  <GithubGridCard key={repo.id} repo={repo} rank={i + 1}
                    bookmarked={bookmarkedIds.has(String(repo.id))}
                    expanded={expandedTop100Id === repo.id} onToggleExpand={toggleTop100Expand}
                    generating={generatingId === repo.id} onToggleBookmark={toggleBookmark} />
                ))}
              </div>
            </>
          )
        )}
      </div>
    </div>
  );
}
