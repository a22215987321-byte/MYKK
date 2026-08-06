import { useState, useEffect, useRef, useMemo } from "react";
import { db } from "../lib/firebase";
import {
  collection, query, orderBy, limit, getDocs, where,
  doc, updateDoc, increment, arrayUnion, arrayRemove,
} from "firebase/firestore";
import { formatDate } from "../lib/format";
import { toast } from "../lib/toast";

function formatDuration(sec) {
  if (!isFinite(sec) || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function channelHandle(c) {
  const slug = (c.nickname || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  return "@" + (slug || (c.uid || "").slice(0, 8));
}

function ChannelAvatar({ c, size }) {
  return c.avatarImage
    ? <img src={c.avatarImage} alt={c.nickname} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: "50%", background: c.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, flexShrink: 0 }}>{c.avatar || "😊"}</div>;
}

// 推薦頻道 / 全部頻道分頁共用的頻道卡片——頭像＋名稱＋訂閱人數＋訂閱鍵。
function ChannelCard({ channel, viewerUid, onOpen, onToggleSubscribe }) {
  const isSubscribed = !!(viewerUid && (channel.subscribers || []).includes(viewerUid));
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", flexShrink: 0, width: 168 }}>
      <button onClick={() => onOpen(channel)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <ChannelAvatar c={channel} size={64} />
        <div style={{ marginTop: 10, fontWeight: 700, fontSize: 14, color: "var(--text)", maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{channel.nickname}</div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{channelHandle(channel)}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{(channel.subscribers || []).length} 位訂閱者</div>
      </button>
      <div style={{ display: "flex", gap: 6, marginTop: 12, width: "100%" }}>
        <button onClick={() => onToggleSubscribe(channel)}
          style={{ flex: 1, padding: "7px 0", borderRadius: 20, border: isSubscribed ? "1px solid var(--border)" : "none",
            background: isSubscribed ? "var(--panel-alt)" : "var(--accent)", color: isSubscribed ? "var(--text)" : "var(--accent-text)",
            fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          {isSubscribed ? "已訂閱" : "訂閱"}
        </button>
        <button onClick={() => toast("此功能即將推出")} aria-label="更多"
          style={{ width: 30, borderRadius: 20, border: "1px solid var(--border)", background: "var(--panel-alt)", color: "var(--text-faint)", cursor: "pointer", fontSize: 13 }}>
          ⋮
        </button>
      </div>
    </div>
  );
}

// 熱門影片格網用的縮圖卡——跟 ProfileView.js 的 VideoThumb 邏輯一樣（用
// <video preload="metadata"> 讀出真正的時長跟一幀畫面當縮圖），多加了
// 頻道名稱，因為這裡是跨頻道列表，需要標明是誰發的。
function VideoThumbCard({ video, onOpen }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    try { v.currentTime = Math.min(0.1, (v.duration || 1) / 2); } catch (_) {}
  };

  return (
    <button onClick={() => onOpen(video)} type="button"
      style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 12, overflow: "hidden" }}>
        <video ref={videoRef} src={video.videoUrl} muted playsInline preload="metadata"
          onLoadedMetadata={onLoadedMetadata}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
        {duration > 0 && (
          <span style={{ position: "absolute", right: 6, bottom: 6, background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 5px", borderRadius: 4 }}>
            {formatDuration(duration)}
          </span>
        )}
      </div>
      <div style={{ padding: "8px 2px 0" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.35, minHeight: "2.7em" }}>
          {video.text?.trim() || "（無標題）"}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>{video.userNickname}</div>
        <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 1 }}>❤️ {(video.likes || []).length} · {formatDate(video.createdAt)}</div>
      </div>
    </button>
  );
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", marginBottom: 12 }}>{children}</div>;
}

// 影片瀏覽入口：上方搜尋頻道（依暱稱前綴比對，符合的頻道依「被開啟次數」
// channelViews 由高到低排序——每次點進一個頻道就會 +1）；沒有輸入搜尋字時
// 顯示「熱門推薦」分頁：精選頻道橫幅＋本週熱門影片、推薦頻道橫向列表、
// 熱門影片格網，全部都是從真實的 users／posts 資料算出來的（頻道用
// channelViews／訂閱數排序，影片用讚數排序），沒有假數據。「全部」分頁
// 列出所有發過影片的頻道；其餘分類分頁（學習英文／生活娛樂等）還沒有
// 內容分類系統，先做「即將推出」版面，之後有分類資料再接上真正的篩選。
export default function VideoHub({ onOpenChannel, onOpenVideo, viewerUid }) {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [popular, setPopular] = useState([]);
  const [loadingPopular, setLoadingPopular] = useState(true);
  const [recentVideos, setRecentVideos] = useState([]);
  const [loadingVideos, setLoadingVideos] = useState(true);

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
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(150)));
        const list = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(p => p.videoUrl)
          .sort((a, b) => (b.likes || []).length - (a.likes || []).length);
        if (!cancelled) setRecentVideos(list);
      } catch (e) {
        console.error("[VideoHub] load recent videos failed", e);
      } finally {
        if (!cancelled) setLoadingVideos(false);
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
          where("nickname", ">=", q), where("nickname", "<=", q + ""),
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

  // 沒有人開過任何頻道（channelViews 全是 0，例如剛上線）時，退回用「發過
  // 影片的頻道」當作候選清單來源——不然精選頻道／推薦頻道會整排空白。
  const postedChannels = useMemo(() => {
    const map = new Map();
    for (const v of recentVideos) {
      if (!map.has(v.userId)) {
        map.set(v.userId, {
          uid: v.userId, nickname: v.userNickname, avatar: v.userAvatar,
          avatarImage: v.userAvatarImage, color: v.userColor, subscribers: [],
        });
      }
    }
    return [...map.values()];
  }, [recentVideos]);

  const channelPool = popular.length ? popular : postedChannels;
  const heroChannel = channelPool[0] || null;
  const heroVideo = recentVideos[0] || null;
  const recommendedChannels = channelPool.filter(c => c.uid !== heroChannel?.uid).slice(0, 8);
  const trendingVideos = recentVideos.filter(v => v.id !== heroVideo?.id).slice(0, 12);

  const openChannel = (c) => {
    updateDoc(doc(db, "users", c.uid), { channelViews: increment(1) }).catch(e => {
      console.error("[VideoHub] increment channelViews failed", e);
    });
    onOpenChannel(c.uid);
  };

  const openVideo = (v) => {
    updateDoc(doc(db, "users", v.userId), { channelViews: increment(1) }).catch(e => {
      console.error("[VideoHub] increment channelViews failed", e);
    });
    if (onOpenVideo) onOpenVideo(v.userId, v.id);
    else onOpenChannel(v.userId);
  };

  const toggleSubscribe = async (channel) => {
    if (!viewerUid) { toast("請先登入後再訂閱"); return; }
    const isSubscribed = (channel.subscribers || []).includes(viewerUid);
    try {
      await updateDoc(doc(db, "users", channel.uid), {
        subscribers: isSubscribed ? arrayRemove(viewerUid) : arrayUnion(viewerUid),
      });
      const patch = (c) => c.uid === channel.uid
        ? { ...c, subscribers: isSubscribed ? (c.subscribers || []).filter(id => id !== viewerUid) : [...(c.subscribers || []), viewerUid] }
        : c;
      setPopular(prev => prev.map(patch));
    } catch (e) {
      console.error("[VideoHub] toggleSubscribe failed", e);
      toast("操作失敗，請重試");
    }
  };

  const isSearching = searchText.trim().length > 0;
  const list = isSearching ? results : popular;
  const searchLoading = isSearching ? searching : false;

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
      <div style={{ padding: "20px 24px 0", maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          <input
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            placeholder="搜尋頻道、創作者、主題或影片..."
            style={{
              flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 24,
              padding: "12px 18px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box",
            }}
          />
          <button onClick={() => toast("篩選功能即將推出")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "0 16px", borderRadius: 24, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
            ▽ 篩選
          </button>
        </div>
      </div>

      <div style={{ padding: "0 24px 32px", maxWidth: 1100, margin: "0 auto" }}>
        {isSearching ? (
          <>
            {searchLoading && <div style={{ textAlign: "center", color: "var(--text-faint)", padding: "40px 0" }}>載入中...</div>}
            {!searchLoading && list.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "40px 0" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
                找不到相關頻道
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {list.map(u => (
                <button key={u.uid} onClick={() => openChannel(u)}
                  style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--panel)"}>
                  <ChannelAvatar c={u} size={52} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.nickname}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{(u.subscribers || []).length} 位訂閱</div>
                  </div>
                </button>
              ))}
            </div>
          </>
        ) : (
          (loadingPopular || loadingVideos) ? (
            <div style={{ textAlign: "center", color: "var(--text-faint)", padding: "60px 0" }}>載入中...</div>
          ) : !heroChannel ? (
            <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "60px 20px" }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
              目前還沒有人氣頻道，開始搜尋看看吧
            </div>
          ) : (
            <>
              <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
                <div style={{ flex: "2 1 420px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 18, padding: 20, display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                  <button onClick={() => openChannel(heroChannel)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                    <ChannelAvatar c={heroChannel} size={76} />
                  </button>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ fontSize: 19, fontWeight: 800, color: "var(--text)" }}>{heroChannel.nickname}</div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{channelHandle(heroChannel)} · {(heroChannel.subscribers || []).length} 位訂閱者</div>
                    {heroChannel.bio && (
                      <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 8, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {heroChannel.bio}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button onClick={() => toggleSubscribe(heroChannel)}
                        style={{ padding: "8px 20px", borderRadius: 20, border: "none", background: "var(--accent)", color: "var(--accent-text)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                        {(heroChannel.subscribers || []).includes(viewerUid) ? "已訂閱" : "訂閱"}
                      </button>
                      <button onClick={() => toast("此功能即將推出")} aria-label="通知"
                        style={{ width: 36, height: 36, borderRadius: "50%", border: "1px solid var(--border)", background: "var(--panel-alt)", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}>
                        🔔
                      </button>
                    </div>
                  </div>
                </div>

                {heroVideo && (
                  <div style={{ flex: "1 1 260px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 18, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 8 }}>本週熱門影片</div>
                    <VideoThumbCard video={heroVideo} onOpen={openVideo} />
                  </div>
                )}
              </div>

              {recommendedChannels.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <SectionTitle>⭐ 推薦頻道</SectionTitle>
                  <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
                    {recommendedChannels.map(c => (
                      <ChannelCard key={c.uid} channel={c} viewerUid={viewerUid} onOpen={openChannel} onToggleSubscribe={toggleSubscribe} />
                    ))}
                  </div>
                </div>
              )}

              {trendingVideos.length > 0 && (
                <div>
                  <SectionTitle>▶ 熱門影片</SectionTitle>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
                    {trendingVideos.map(v => (
                      <VideoThumbCard key={v.id} video={v} onOpen={openVideo} />
                    ))}
                  </div>
                </div>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
