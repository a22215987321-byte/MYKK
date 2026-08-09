import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, setDoc, deleteDoc, serverTimestamp, onSnapshot, collection, query, orderBy } from "firebase/firestore";
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

const LANG_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Go: "#00ADD8",
  Rust: "#dea584", Java: "#b07219", "C++": "#f34b7d", C: "#555555", Swift: "#F05138",
  Kotlin: "#A97BFF", Ruby: "#701516", PHP: "#4F5D95", Shell: "#89e051", HTML: "#e34c26",
  CSS: "#563d7c", Vue: "#41b883", Dart: "#00B4AB",
};

// 單一 repo 卡片——右邊有個下拉鈕，展開會看到 AI 每天生成的總結（DeepSeek，
// 排程那邊 pages/api/cron/github-trending.js 生成，這裡純顯示），總結區塊
// 自己還有一顆「放大」鈕，開一個全螢幕疊層把總結文字放大顯示，方便看長一點
// 的總結。
//
// 卡片主體點下去不再直接跳轉 GitHub（怕手滑誤觸就跳走），改成彈一個小方塊
// 預覽（名稱＋網址），真的要去 GitHub 要在方塊裡再點一次連結。右鍵點卡片
// 會彈出「收藏」選單，左鍵點裡面那顆按鈕才會真的收藏/取消收藏。
function RepoCard({ repo, rank, bookmarked, onToggleBookmark }) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);
  const [preview, setPreview] = useState(false);
  const [menuPos, setMenuPos] = useState(null);

  return (
    <div
      onContextMenu={e => { e.preventDefault(); setMenuPos({ x: e.clientX, y: e.clientY }); }}
      style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-faint)", width: 22, flexShrink: 0, textAlign: "center" }}>{rank}</div>
        <div onClick={() => setPreview(true)}
          style={{ display: "flex", gap: 12, flex: 1, minWidth: 0, cursor: "pointer" }}>
          {repo.ownerAvatar
            ? <img src={repo.ownerAvatar} alt={repo.owner} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
            : <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--panel-alt)", flexShrink: 0 }} />
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {repo.fullName}
              {bookmarked && <span style={{ marginLeft: 6, fontSize: 11 }} title="已收藏">⭐</span>}
            </div>
            {repo.description && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                {repo.description}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, fontSize: 11, color: "var(--text-faint)" }}>
              <span>⭐ {repo.stars.toLocaleString()}</span>
              {repo.language && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: LANG_COLORS[repo.language] || "var(--text-faint)" }} />
                  {repo.language}
                </span>
              )}
              <span>{timeAgo(repo.createdAt)}</span>
            </div>
          </div>
        </div>
        <button onClick={() => setOpen(v => !v)} aria-label={open ? "收合AI總結" : "展開AI總結"}
          style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 8, width: 28, height: 28, flexShrink: 0, color: "var(--text-muted)", cursor: "pointer", fontSize: 12, transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>
          ▾
        </button>
      </div>

      {open && (
        <div style={{ padding: "0 16px 16px" }}>
          <div style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase" }}>🤖 AI 總結</span>
              {repo.summary && (
                <button onClick={() => setZoomed(true)} title="放大"
                  style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 13, padding: 2 }}>
                  🔍
                </button>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap", maxHeight: 260, overflowY: "auto" }}>
              {repo.summary || "還沒有總結（等下一次每日更新自動生成）"}
            </div>
          </div>
        </div>
      )}

      {zoomed && (
        <div role="dialog" aria-modal="true" onClick={() => setZoomed(false)}
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ maxWidth: 520, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{repo.fullName}</div>
              <button onClick={() => setZoomed(false)} aria-label="關閉"
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
            </div>
            <div style={{ fontSize: 16, color: "var(--text)", lineHeight: 1.9, whiteSpace: "pre-wrap", overflowY: "auto", minHeight: 0 }}>{repo.summary}</div>
          </div>
        </div>
      )}

      {/* 點卡片主體彈出的預覽方塊：上面名稱、網址（真的可以點去 GitHub 的
          連結，不再是點卡片就整個跳走），下面是 AI 總結——內容可能很長
          （DEEPTHINK 生成的回答通常比之前的短總結長很多），用固定高度
          +overflowY:auto 讓它自己捲動，不要把整個方塊撐爆。 */}
      {preview && (
        <div role="dialog" aria-modal="true" onClick={() => setPreview(false)}
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ maxWidth: 460, width: "100%", maxHeight: "80vh", display: "flex", flexDirection: "column", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexShrink: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{repo.fullName}</div>
              <button onClick={() => setPreview(false)} aria-label="關閉"
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
            </div>
            <a href={repo.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", flexShrink: 0, fontSize: 13, color: "var(--accent)", wordBreak: "break-all", textDecoration: "none", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
              {repo.url} →
            </a>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", margin: "14px 0 6px", flexShrink: 0 }}>🤖 AI 總結</div>
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, whiteSpace: "pre-wrap", overflowY: "auto", minHeight: 0 }}>
              {repo.summary || "還沒有總結（等下一次每日更新自動生成）"}
            </div>
          </div>
        </div>
      )}

      {/* 右鍵收藏選單：貼在滑鼠點下去的座標，點外面關掉。 */}
      {menuPos && (
        <>
          <div onClick={() => setMenuPos(null)} style={{ position: "fixed", inset: 0, zIndex: 3099 }} />
          <div style={{
            position: "fixed", left: menuPos.x, top: menuPos.y, zIndex: 3100,
            background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10,
            boxShadow: "var(--card-shadow)", overflow: "hidden", minWidth: 120,
          }}>
            <button onClick={() => { onToggleBookmark(repo); setMenuPos(null); }}
              style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", padding: "10px 14px", background: "none", border: "none", color: "var(--text)", fontSize: 13, textAlign: "left", cursor: "pointer" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              {bookmarked ? "❌ 取消收藏" : "⭐ 收藏"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// 每天自動更新一次的GitHub熱門新專案（過去7天內建立、星星數最高的10個）——
// 資料是 pages/api/cron/github-trending.js 這支排程每天抓一次寫進 Firestore
// 的快取，這裡單純讀，不會自己去打GitHub API（一堆使用者同時看這頁的話，
// 沒登入的GitHub API一分鐘只能打10次，馬上就會被擋）。
//
// 收藏是每個使用者自己的，存在 githubBookmarks/{uid}/items/{repoId}——存的
// 是收藏當下的完整 repo 內容（不是只存個 id 回頭查 siteData），因為熱門榜
// 每天會被排程整批覆蓋，被收藏的專案隔天可能就掉出前10名，這樣收藏頁才
// 還看得到完整資料。
export default function GithubTrendingRoom({ uid }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("hot"); // "hot" | "bookmarks"
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksReady, setBookmarksReady] = useState(false);

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
        const { id, name, fullName, owner, ownerAvatar, description, url, stars, language, createdAt, summary } = repo;
        await setDoc(doc(db, "githubBookmarks", uid, "items", repoId), {
          id, name, fullName, owner, ownerAvatar, description: description || "", url, stars, language: language || "",
          createdAt: createdAt || "", summary: summary || "", bookmarkedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("[GithubTrendingRoom] toggleBookmark failed", err);
      toast(err?.code === "permission-denied" ? "收藏失敗：Firestore 規則還沒加 githubBookmarks" : "收藏失敗，請重試");
    }
  };

  const repos = data?.repos || [];
  const rangeLabel = data?.since && data?.updatedAt
    ? `${formatShortDate(data.since)}-${formatShortDate(data.updatedAt)}`
    : "";
  const list = tab === "hot" ? repos : bookmarks;

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ maxWidth: 720, padding: "20px 24px 80px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 14 }}>
          <h1 style={{ margin: "4px 0", fontSize: 22, fontWeight: 800 }}>
            🔥 GitHub 每週熱門專案{rangeLabel && ` ${rangeLabel}`}
          </h1>
          {data?.updatedAt && (
            <div style={{ fontSize: 13, color: "var(--text-muted)", whiteSpace: "nowrap" }}>上次更新：{formatUpdatedAt(data.updatedAt)}</div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["hot", "🔥 熱門"], ["bookmarks", "⭐ 收藏"]].map(([key, label]) => (
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

        {(tab === "hot" ? loading : !bookmarksReady) ? (
          <div style={{ textAlign: "center", color: "var(--text-faint)", padding: "60px 0" }}>載入中...</div>
        ) : list.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>{tab === "hot" ? "🕐" : "⭐"}</div>
            {tab === "hot" ? "還沒有資料，等下一次自動更新（每天一次）" : "還沒有收藏任何專案——右鍵點專案卡片就能收藏"}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((repo, i) => (
              <RepoCard key={repo.id} repo={repo} rank={i + 1}
                bookmarked={bookmarkedIds.has(String(repo.id))} onToggleBookmark={toggleBookmark} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
