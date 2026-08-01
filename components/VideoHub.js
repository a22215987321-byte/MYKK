import { useState, useEffect } from "react";
import { db } from "../lib/firebase";
import { collection, query, where, limit, getDocs, doc, updateDoc, increment } from "firebase/firestore";

// 影片瀏覽入口：上方搜尋頻道（依暱稱前綴比對，符合的頻道依「被開啟次數」
// channelViews 由高到低排序——每次點進一個頻道就會 +1，這樣「搜尋次數最多的
// 頻道優先顯示」才有真的資料可以排，不是排好看的假資料）；沒有輸入搜尋字時
// 顯示「熱門頻道」預設清單（同樣依 channelViews，沒有人開過的帳號就不會出現）。
export default function VideoHub({ onOpenChannel }) {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [popular, setPopular] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "users"), limit(60)));
        const list = snap.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .filter(u => (u.channelViews || 0) > 0)
          .sort((a, b) => (b.channelViews || 0) - (a.channelViews || 0))
          .slice(0, 20);
        if (!cancelled) setPopular(list);
      } catch (e) {
        console.error("[VideoHub] load popular channels failed", e);
      } finally {
        if (!cancelled) setLoadingPopular(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const q = searchText.trim();
    if (!q) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const snap = await getDocs(query(
          collection(db, "users"),
          where("nickname", ">=", q), where("nickname", "<=", q + ""),
          limit(20),
        ));
        const list = snap.docs
          .map(d => ({ uid: d.id, ...d.data() }))
          .sort((a, b) => (b.channelViews || 0) - (a.channelViews || 0));
        setResults(list);
      } catch (e) {
        console.error("[VideoHub] search failed", e);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  const openChannel = (u) => {
    updateDoc(doc(db, "users", u.uid), { channelViews: increment(1) }).catch(e => {
      console.error("[VideoHub] increment channelViews failed", e);
    });
    onOpenChannel(u.uid);
  };

  const isSearching = searchText.trim().length > 0;
  const list = isSearching ? results : popular;
  const loading = isSearching ? searching : loadingPopular;

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <input
          value={searchText}
          onChange={e => setSearchText(e.target.value)}
          placeholder="搜尋頻道..."
          style={{
            width: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 24,
            padding: "12px 18px", color: "var(--text)", fontSize: 15, outline: "none", boxSizing: "border-box", marginBottom: 20,
          }}
        />

        {!isSearching && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 12 }}>🔥 熱門頻道</div>
        )}

        {loading && (
          <div style={{ textAlign: "center", color: "var(--text-faint)", padding: "40px 0" }}>載入中...</div>
        )}

        {!loading && list.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "40px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
            {isSearching ? "找不到相關頻道" : "目前還沒有人氣頻道，開始搜尋看看吧"}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {list.map(u => (
            <button key={u.uid} onClick={() => openChannel(u)}
              style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, cursor: "pointer", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "var(--panel)"}>
              {u.avatarImage
                ? <img src={u.avatarImage} alt={u.nickname} style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 52, height: 52, borderRadius: "50%", background: u.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0 }}>{u.avatar || "😊"}</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.nickname}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{(u.subscribers || []).length} 位訂閱</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
