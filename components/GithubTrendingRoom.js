import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { doc, onSnapshot } from "firebase/firestore";

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
function RepoCard({ repo, rank }) {
  const [open, setOpen] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px" }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-faint)", width: 22, flexShrink: 0, textAlign: "center" }}>{rank}</div>
        <a href={repo.url} target="_blank" rel="noopener noreferrer"
          style={{ display: "flex", gap: 12, flex: 1, minWidth: 0, textDecoration: "none", color: "inherit" }}>
          {repo.ownerAvatar
            ? <img src={repo.ownerAvatar} alt={repo.owner} style={{ width: 40, height: 40, borderRadius: 10, objectFit: "cover", flexShrink: 0 }} />
            : <div style={{ width: 40, height: 40, borderRadius: 10, background: "var(--panel-alt)", flexShrink: 0 }} />
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {repo.fullName}
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
        </a>
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
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>
              {repo.summary || "還沒有總結（等下一次每日更新自動生成）"}
            </div>
          </div>
        </div>
      )}

      {zoomed && (
        <div role="dialog" aria-modal="true" onClick={() => setZoomed(false)}
          style={{ position: "fixed", inset: 0, zIndex: 3000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ maxWidth: 520, width: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{repo.fullName}</div>
              <button onClick={() => setZoomed(false)} aria-label="關閉"
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, padding: 4 }}>✕</button>
            </div>
            <div style={{ fontSize: 16, color: "var(--text)", lineHeight: 1.9 }}>{repo.summary}</div>
          </div>
        </div>
      )}
    </div>
  );
}

// 每天自動更新一次的GitHub熱門新專案（過去7天內建立、星星數最高的10個）——
// 資料是 pages/api/cron/github-trending.js 這支排程每天抓一次寫進 Firestore
// 的快取，這裡單純讀，不會自己去打GitHub API（一堆使用者同時看這頁的話，
// 沒登入的GitHub API一分鐘只能打10次，馬上就會被擋）。
export default function GithubTrendingRoom() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const repos = data?.repos || [];
  const rangeLabel = data?.since && data?.updatedAt
    ? `${formatShortDate(data.since)}-${formatShortDate(data.updatedAt)}`
    : "";

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ maxWidth: 720, padding: "20px 24px 80px" }}>
        <h1 style={{ margin: "4px 0 4px", fontSize: 22, fontWeight: 800 }}>
          🔥 GitHub 每週熱門專案{rangeLabel && ` ${rangeLabel}`}
        </h1>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          {data?.updatedAt && <span>上次更新：{formatUpdatedAt(data.updatedAt)}</span>}
        </div>

        {loading ? (
          <div style={{ textAlign: "center", color: "var(--text-faint)", padding: "60px 0" }}>載入中...</div>
        ) : repos.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "60px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🕐</div>
            還沒有資料，等下一次自動更新（每天一次）
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {repos.map((repo, i) => (
              <RepoCard key={repo.id} repo={repo} rank={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
