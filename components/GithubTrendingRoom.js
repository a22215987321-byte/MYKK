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

const LANG_COLORS = {
  JavaScript: "#f1e05a", TypeScript: "#3178c6", Python: "#3572A5", Go: "#00ADD8",
  Rust: "#dea584", Java: "#b07219", "C++": "#f34b7d", C: "#555555", Swift: "#F05138",
  Kotlin: "#A97BFF", Ruby: "#701516", PHP: "#4F5D95", Shell: "#89e051", HTML: "#e34c26",
  CSS: "#563d7c", Vue: "#41b883", Dart: "#00B4AB",
};

// 每天自動更新一次的GitHub熱門新專案（過去7天內建立、星星數最高的10個）——
// 資料是 pages/api/cron/github-trending.js 這支排程每天抓一次寫進 Firestore
// 的快取，這裡單純讀，不會自己去打GitHub API（一堆使用者同時看這頁的話，
// 沒登入的GitHub API一分鐘只能打10次，馬上就會被擋）。
export default function GithubTrendingRoom({ onNav }) {
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

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 24px 80px" }}>
        <button onClick={() => onNav && onNav()}
          style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: 0, fontSize: 13, marginBottom: 8 }}>
          ← 返回
        </button>
        <h1 style={{ margin: "4px 0 4px", fontSize: 22, fontWeight: 800 }}>🔥 GitHub 每日熱門新專案</h1>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>
          過去7天內建立、星星數最高的10個repo，每天自動更新一次。
          {data?.updatedAt && <span> 上次更新：{formatUpdatedAt(data.updatedAt)}</span>}
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
              <a key={repo.id} href={repo.url} target="_blank" rel="noopener noreferrer"
                style={{ display: "flex", gap: 12, padding: "14px 16px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, textDecoration: "none", color: "inherit" }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text-faint)", width: 22, flexShrink: 0, textAlign: "center" }}>{i + 1}</div>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
