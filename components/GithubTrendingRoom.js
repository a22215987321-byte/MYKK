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

// AI 總結拆成三個方塊，左到右排：項目詳細／功能／運用（對應 Firestore 的
// summaryDetail／summaryFeatures／summaryUsage，排程那邊生成時就已經是
// 分開的三個欄位，這裡純排版）。每個方塊各自 maxHeight+overflowY:auto，
// 免得某一塊特別長（deep think 生成的內容篇幅常常不平均）把整排撐爆。
function SummaryBoxes({ detail, features, usage, maxBoxHeight = 200, fontSize = 13 }) {
  const cols = [
    { key: "detail", label: "項目詳細", text: detail },
    { key: "features", label: "功能", text: features },
    { key: "usage", label: "運用", text: usage },
  ];
  if (!detail && !features && !usage) {
    return <div style={{ fontSize, color: "var(--text)", lineHeight: 1.7 }}>還沒有總結（等下一次每日更新自動生成）</div>;
  }
  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
      {cols.map(c => (
        <div key={c.key} style={{ flex: "1 1 160px", minWidth: 150, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 10px" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", marginBottom: 4 }}>{c.label}</div>
          <div style={{ fontSize, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap", maxHeight: maxBoxHeight, overflowY: "auto" }}>
            {c.text || "（無）"}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const zoomedNameRef = useRef(null);
  const previewNameRef = useRef(null);

  // 專案名稱常見連字號，瀏覽器預設雙擊選字只會選到連字號分隔的其中一段，
  // 不是整個名稱——雙擊直接選整個名稱節點的文字內容，方便使用者 Ctrl+C 複製。
  const selectWholeName = (ref) => {
    const el = ref.current;
    if (!el || typeof window.getSelection !== "function") return;
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(el);
    selection.removeAllRanges();
    selection.addRange(range);
  };

  // 卡片本身用單擊打開這個全螢幕疊層，疊層背景又是單擊關閉——連續雙擊時，
  // 第二下的座標剛好落在剛冒出來、蓋住卡片原本位置的背景上，原本會被當成
  // 「點背景關閉」，方塊等於一開就被自己的雙擊關掉。用 e.detail（瀏覽器
  // 原生的連續點擊次數）擋掉 >1 的那次，只有真正單獨一下的點擊才關閉。
  const closeOnBackdropClick = (closeFn) => (e) => { if (e.detail > 1) return; closeFn(); };

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
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, fontSize: 11, color: "var(--text-faint)", flexWrap: "wrap" }}>
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
              {(repo.summaryDetail || repo.summaryFeatures || repo.summaryUsage) && (
                <button onClick={() => setZoomed(true)} title="放大"
                  style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 13, padding: 2 }}>
                  🔍
                </button>
              )}
            </div>
            <SummaryBoxes detail={repo.summaryDetail} features={repo.summaryFeatures} usage={repo.summaryUsage} maxBoxHeight={160} fontSize={12} />
          </div>
        </div>
      )}

      {zoomed && (
        <div role="dialog" aria-modal="true" onClick={closeOnBackdropClick(() => setZoomed(false))}
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ maxWidth: 880, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexShrink: 0 }}>
              <div ref={zoomedNameRef} onDoubleClick={() => selectWholeName(zoomedNameRef)}
                style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{repo.fullName}</div>
              <button onClick={() => setZoomed(false)} aria-label="關閉"
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
            </div>
            <div style={{ overflowY: "auto", minHeight: 0 }}>
              <SummaryBoxes detail={repo.summaryDetail} features={repo.summaryFeatures} usage={repo.summaryUsage} maxBoxHeight={400} fontSize={14} />
            </div>
          </div>
        </div>
      )}

      {/* 點卡片主體彈出的預覽方塊：上面名稱、網址（真的可以點去 GitHub 的
          連結，不再是點卡片就整個跳走），下面是 AI 總結——內容可能很長
          （DEEPTHINK 生成的回答通常比之前的短總結長很多），用固定高度
          +overflowY:auto 讓它自己捲動，不要把整個方塊撐爆。 */}
      {preview && (
        <div role="dialog" aria-modal="true" onClick={closeOnBackdropClick(() => setPreview(false))}
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ maxWidth: 820, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexShrink: 0 }}>
              <div ref={previewNameRef} onDoubleClick={() => selectWholeName(previewNameRef)}
                style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>{repo.fullName}</div>
              <button onClick={() => setPreview(false)} aria-label="關閉"
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
            </div>
            <a href={repo.url} target="_blank" rel="noopener noreferrer"
              style={{ display: "block", flexShrink: 0, fontSize: 13, color: "var(--accent)", wordBreak: "break-all", textDecoration: "none", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 8, padding: "10px 12px" }}>
              {repo.url} →
            </a>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", margin: "14px 0 6px", flexShrink: 0 }}>🤖 AI 總結</div>
            <div style={{ overflowY: "auto", minHeight: 0 }}>
              <SummaryBoxes detail={repo.summaryDetail} features={repo.summaryFeatures} usage={repo.summaryUsage} maxBoxHeight={260} fontSize={13} />
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

function Field({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{value || "（無）"}</div>
    </div>
  );
}

function DetailRow({ label, children }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", marginBottom: 4, textTransform: "uppercase" }}>{label}</div>
      <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)", whiteSpace: "pre-wrap" }}>{children}</div>
    </div>
  );
}

// 收藏／6月Top100 共用的網格卡片——一行3個小方塊，點擊會彈出一個獨立的
// 置中詳情彈窗（跟每日熱門榜的預覽彈窗、AI Office 的結果彈窗同一種模式），
// 不是原地在網格裡展開（那個排版試過，使用者反應像表格、很難讀）。彈窗
// 內容照使用者指定的格式由上到下直排：連結／用途／主要語言／授權／星數／
// 為何值得關注，不分左右欄。用途／為何值得關注是現點現生成（見
// /api/github/summarize-repo.js），生成一次後由呼叫端寫回 Firestore 快取，
// 之後同一個 repo 不用再生成一次。
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
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
              <span>⭐ {repo.stars?.toLocaleString?.() ?? repo.stars}</span>
              {repo.language && (
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: LANG_COLORS[repo.language] || "var(--text-faint)" }} />
                  {repo.language}
                </span>
              )}
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

// 每天自動更新一次的GitHub熱門新專案（過去7天內建立、星星數最高的10個）——
// 資料是 pages/api/cron/github-trending.js 這支排程每天抓一次寫進 Firestore
// 的快取，這裡單純讀，不會自己去打GitHub API（一堆使用者同時看這頁的話，
// 沒登入的GitHub API一分鐘只能打10次，馬上就會被擋）。
//
// 「6月Top100」是另一份獨立資料——2026年6月整月建立、星星數最高的100個，
// 一次性抓好放 siteData/githubTop100_2026-06（見
// pages/api/github/fetch-month.js），不像熱門榜每天更新。
//
// 收藏是每個使用者自己的，存在 githubBookmarks/{uid}/items/{repoId}——存的
// 是收藏當下的完整 repo 內容（不是只存個 id 回頭查 siteData），因為熱門榜
// 每天會被排程整批覆蓋，被收藏的專案隔天可能就掉出前10名，這樣收藏頁才
// 還看得到完整資料。
export default function GithubTrendingRoom({ uid }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [monthData, setMonthData] = useState(null);
  const [monthLoading, setMonthLoading] = useState(true);
  const [tab, setTab] = useState("hot"); // "hot" | "bookmarks" | "top100"
  const [bookmarks, setBookmarks] = useState([]);
  const [bookmarksReady, setBookmarksReady] = useState(false);
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
        const { id, name, fullName, owner, ownerAvatar, description, url, stars, language, license, createdAt, summaryDetail, summaryFeatures, summaryUsage, summaryPurpose, summaryWhyNotable } = repo;
        await setDoc(doc(db, "githubBookmarks", uid, "items", repoId), {
          id, name, fullName, owner, ownerAvatar, description: description || "", url, stars, language: language || "", license: license || "",
          createdAt: createdAt || "", summaryDetail: summaryDetail || "", summaryFeatures: summaryFeatures || "", summaryUsage: summaryUsage || "",
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
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {repos.map((repo, i) => (
                <RepoCard key={repo.id} repo={repo} rank={i + 1}
                  bookmarked={bookmarkedIds.has(String(repo.id))} onToggleBookmark={toggleBookmark} />
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
