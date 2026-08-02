import { useState, useEffect, useCallback, useMemo } from "react";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import {
  doc, onSnapshot, collection, query, where, getDocs,
  updateDoc, arrayUnion, arrayRemove,
} from "firebase/firestore";
import LoadingState from "./LoadingState";
import VideoPlayer from "./VideoPlayer";
import { formatDate, formatFullDate } from "../lib/format";
import { toast } from "../lib/toast";
import { Avatar, CommentSection } from "./PostComments";
import SharePostModal from "./SharePostModal";

const TABS = [
  { id: "videos", label: "影片" },
  { id: "shorts", label: "Shorts" },
  { id: "live", label: "直播" },
  { id: "playlists", label: "播放清單" },
  { id: "community", label: "社群" },
  { id: "about", label: "關於" },
];

const SORTS = [
  { id: "latest", label: "最新" },
  { id: "popular", label: "熱門" },
  { id: "oldest", label: "最早" },
];

// 從「影片」入口點進某個人的頻道——刻意不沿用一般個人頁（ProfileView）的
// 版面：YouTube 頻道那種橫幅+大頭貼+訂閱／管理按鈕+分頁+排序過的影片格網，
// 跟原本社群導向的個人頁在版面上要能一眼分辨是「來看影片」還是「來看動態」。
// 點進某支影片後換成「觀看頁」（播放器+標題+頻道列+說明+更多推薦+留言），
// 同樣是獨立於 ProfileView 之外的版面，參考 YouTube 觀看頁的結構。
// 資料沿用同一套 users/{uid} 個人資料跟 posts（videoUrl 有值的），沒有另外
// 開一套 schema。除了「影片」分頁有實際內容，其餘分頁先做版面（顯示「即將
// 推出」），這是使用者明確同意的範圍（先做版面就好，功能之後再說）。
export default function ChannelProfileView({ uid, onClose, onOpenChannel }) {
  const [viewerUid, setViewerUid] = useState(undefined);
  const [viewerProfile, setViewerProfile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [videos, setVideos] = useState([]);
  const [tab, setTab] = useState("videos");
  const [sort, setSort] = useState("latest");
  const [bioExpanded, setBioExpanded] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const [watchVideoId, setWatchVideoId] = useState(null);
  const [showShare, setShowShare] = useState(false);

  const isOwner = viewerUid != null && viewerUid === uid;

  useEffect(() => onAuthStateChanged(auth, u => setViewerUid(u ? u.uid : null)), []);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const unsub = onSnapshot(doc(db, "users", uid), snap => {
      if (!cancelled && snap.exists()) setProfile({ uid: snap.id, ...snap.data() });
      if (!cancelled) setLoading(false);
    }, (e) => {
      console.error("[ChannelProfileView] failed to load profile", e);
      if (!cancelled) { setLoadError(true); setLoading(false); }
    });
    return () => { cancelled = true; unsub(); };
  }, [uid]);

  // 留言／按讚要用「目前登入者」自己的個人資料（不是正在看的這個頻道）——
  // 自己看自己頻道時 profile 本身就是 myProfile，不用另外抓一次。
  useEffect(() => {
    if (!viewerUid || viewerUid === uid) { setViewerProfile(null); return; }
    return onSnapshot(doc(db, "users", viewerUid), snap => {
      if (snap.exists()) setViewerProfile({ uid: snap.id, ...snap.data() });
    });
  }, [viewerUid, uid]);

  const myProfile = isOwner ? profile : viewerProfile;

  const loadVideos = useCallback(async () => {
    if (!uid) return;
    try {
      const snap = await getDocs(query(collection(db, "posts"), where("userId", "==", uid)));
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.videoUrl);
      setVideos(list);
    } catch (e) {
      console.error("[ChannelProfileView] failed to load videos", e);
    }
  }, [uid]);

  useEffect(() => { loadVideos(); }, [loadVideos]);

  const sortedVideos = useMemo(() => {
    const toDate = (p) => (p.createdAt?.toDate ? p.createdAt.toDate() : new Date(p.createdAt || 0));
    const list = videos.slice();
    if (sort === "popular") list.sort((a, b) => (b.likes || []).length - (a.likes || []).length);
    else if (sort === "oldest") list.sort((a, b) => toDate(a) - toDate(b));
    else list.sort((a, b) => toDate(b) - toDate(a));
    return list;
  }, [videos, sort]);

  const watchVideo = watchVideoId ? videos.find(v => v.id === watchVideoId) || null : null;
  const recommended = watchVideo ? videos.filter(v => v.id !== watchVideo.id) : [];

  const isSubscribed = !!(viewerUid && (profile?.subscribers || []).includes(viewerUid));
  const toggleSubscribe = async () => {
    if (!viewerUid || !profile) { toast("請先登入後再訂閱"); return; }
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        subscribers: isSubscribed ? arrayRemove(viewerUid) : arrayUnion(viewerUid),
      });
    } catch (e) {
      console.error("[ChannelProfileView] toggleSubscribe failed", e);
      toast("操作失敗，請重試");
    }
  };

  const toggleLike = async (video) => {
    if (!viewerUid) { toast("請先登入後再按讚"); return; }
    const liked = (video.likes || []).includes(viewerUid);
    try {
      await updateDoc(doc(db, "posts", video.id), { likes: liked ? arrayRemove(viewerUid) : arrayUnion(viewerUid) });
      setVideos(prev => prev.map(v => v.id === video.id
        ? { ...v, likes: liked ? (v.likes || []).filter(id => id !== viewerUid) : [...(v.likes || []), viewerUid] }
        : v));
    } catch (e) {
      console.error("[ChannelProfileView] toggleLike failed", e);
      toast("操作失敗，請重試");
    }
  };

  const openVideo = (video) => { setWatchVideoId(video.id); setDescExpanded(false); };

  if (loading) return <LoadingState label="載入頻道..." minHeight="100%" />;

  if (loadError || !profile) {
    return (
      <div style={{ minHeight: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ fontSize: 48 }}>😶</div>
        <div style={{ color: "var(--text-muted)", fontSize: 16 }}>找不到此頻道</div>
        <button onClick={onClose} style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>← 返回</button>
      </div>
    );
  }

  // ---- 觀看頁：點了某支影片之後，取代掉頻道版面（播放器＋標題＋頻道列＋
  // 說明＋更多推薦＋留言），關閉時回到剛剛那個頻道（不是整個離開）。
  if (watchVideo) {
    const liked = !!(viewerUid && (watchVideo.likes || []).includes(viewerUid));
    return (
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "var(--bg)" }}>
        <div style={{ padding: "10px 20px 0" }}>
          <button onClick={() => setWatchVideoId(null)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 4 }}>
            ← 返回頻道
          </button>
        </div>
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "10px 20px 40px" }}>
          <div style={{ borderRadius: 12, overflow: "hidden", background: "#000" }}>
            <VideoPlayer key={watchVideo.id} src={watchVideo.videoUrl} autoPlay />
          </div>

          <h1 style={{ fontSize: 19, fontWeight: 800, color: "var(--text)", margin: "16px 0 10px" }}>
            {watchVideo.text?.trim() || "（無標題）"}
          </h1>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <button onClick={() => onOpenChannel?.(uid)} style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
              <Avatar avatar={profile.avatar} avatarImage={profile.avatarImage} color={profile.color} size={40} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{profile.nickname}</div>
                <div style={{ fontSize: 12, color: "var(--text-faint)" }} title={formatFullDate(watchVideo.createdAt)}>{formatDate(watchVideo.createdAt)}</div>
              </div>
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {!isOwner && (
                <button onClick={toggleSubscribe}
                  style={{
                    background: isSubscribed ? "var(--panel-alt)" : "var(--accent)",
                    border: isSubscribed ? "1px solid var(--border)" : "none",
                    borderRadius: 20, padding: "7px 16px",
                    color: isSubscribed ? "var(--text)" : "var(--accent-text)",
                    fontSize: 13, fontWeight: 700, cursor: "pointer",
                  }}>
                  {isSubscribed ? "已訂閱" : "訂閱"}
                </button>
              )}
              <button onClick={() => toggleLike(watchVideo)}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 20, padding: "7px 14px", color: liked ? "var(--accent)" : "var(--text-muted)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                {liked ? "❤️" : "🤍"} {(watchVideo.likes || []).length}
              </button>
              <button onClick={() => setShowShare(true)}
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 20, padding: "7px 14px", color: "var(--text-muted)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                🔗 分享
              </button>
            </div>
          </div>

          {showShare && <SharePostModal post={watchVideo} onClose={() => setShowShare(false)} />}

          {watchVideo.text && (
            <div style={{ background: "var(--panel-alt)", borderRadius: 12, padding: "10px 14px", marginTop: 14, fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
              {descExpanded || watchVideo.text.length <= 120 ? watchVideo.text : `${watchVideo.text.slice(0, 120)}…`}
              {watchVideo.text.length > 120 && (
                <button onClick={() => setDescExpanded(v => !v)} style={{ display: "block", background: "none", border: "none", color: "var(--text)", cursor: "pointer", fontSize: 12, fontWeight: 700, marginTop: 4, padding: 0 }}>
                  {descExpanded ? "顯示較少" : "顯示更多 ›"}
                </button>
              )}
            </div>
          )}

          {recommended.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>更多推薦</div>
              <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6 }}>
                {recommended.map(v => (
                  <div key={v.id} onClick={() => openVideo(v)} style={{ cursor: "pointer", width: 180, flexShrink: 0 }}>
                    <div style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 10, overflow: "hidden", background: "#000" }}>
                      <video src={v.videoUrl} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", marginTop: 6, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {v.text?.trim() || "（無標題）"}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>❤️ {(v.likes || []).length} · {formatDate(v.createdAt)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {myProfile
            ? <CommentSection postId={watchVideo.id} myProfile={myProfile} />
            : <div style={{ marginTop: 20, fontSize: 13, color: "var(--text-faint)", textAlign: "center" }}>登入後才能留言</div>
          }
        </div>
      </div>
    );
  }

  const bannerStyle = profile.profileBgType === "image"
    ? { backgroundImage: `url(${profile.profileBg})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: profile.profileBg || "linear-gradient(135deg,#1e3a5f,#2d1f6e)" };
  const handle = `@${(profile.nickname || "user").replace(/\s+/g, "").toLowerCase()}`;
  const subscriberCount = (profile.subscribers || []).length;

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 20px 0" }}>
        <button onClick={onClose} aria-label="返回" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, padding: 4 }}>
          ← 返回搜尋
        </button>
      </div>

      {/* Banner */}
      <div style={{ width: "100%", aspectRatio: "7 / 1", minHeight: 100, maxHeight: 220, ...bannerStyle, marginTop: 6 }} />

      {/* Header */}
      <div style={{ padding: "0 24px", maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 18, flexWrap: "wrap", marginTop: -36 }}>
          {profile.avatarImage
            ? <img src={profile.avatarImage} alt={profile.nickname} style={{ width: 100, height: 100, borderRadius: "50%", objectFit: "cover", border: "4px solid var(--bg)", flexShrink: 0, background: "var(--panel)" }} />
            : <div style={{ width: 100, height: 100, borderRadius: "50%", border: "4px solid var(--bg)", background: profile.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, flexShrink: 0 }}>{profile.avatar || "😊"}</div>
          }
          <div style={{ flex: 1, minWidth: 220, paddingBottom: 6 }}>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: 0 }}>{profile.nickname}</h1>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>
              {handle} · {subscriberCount} 位訂閱 · {videos.length} 部影片
            </div>
            {profile.bio && (
              <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 6, maxWidth: 640 }}>
                {bioExpanded ? profile.bio : profile.bio.slice(0, 80)}
                {profile.bio.length > 80 && (
                  <button onClick={() => setBioExpanded(v => !v)} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, fontWeight: 700, marginLeft: 4, padding: 0 }}>
                    {bioExpanded ? "收合" : "更多 ›"}
                  </button>
                )}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, paddingBottom: 6, flexShrink: 0 }}>
            {isOwner ? (
              <>
                <button style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 20, padding: "8px 16px", color: "var(--text)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>自訂頻道</button>
                <button style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 20, padding: "8px 16px", color: "var(--text)", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>管理影片</button>
                <button style={{ background: "var(--accent)", border: "none", borderRadius: 20, padding: "8px 16px", color: "var(--accent-text)", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>🔴 建立直播</button>
              </>
            ) : (
              <button onClick={toggleSubscribe}
                style={{
                  background: isSubscribed ? "var(--panel-alt)" : "var(--accent)",
                  border: isSubscribed ? "1px solid var(--border)" : "none",
                  borderRadius: 20, padding: "8px 20px",
                  color: isSubscribed ? "var(--text)" : "var(--accent-text)",
                  fontSize: 13, fontWeight: 700, cursor: "pointer",
                }}>
                {isSubscribed ? "已訂閱" : "訂閱"}
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 20, borderBottom: "1px solid var(--border)", overflowX: "auto" }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: "10px 16px", fontSize: 14, fontWeight: 700, whiteSpace: "nowrap",
                color: tab === t.id ? "var(--text)" : "var(--text-faint)",
                borderBottom: tab === t.id ? "2px solid var(--accent)" : "2px solid transparent",
              }}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === "videos" ? (
          <>
            {/* Sort row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", gap: 8 }}>
                {SORTS.map(s => (
                  <button key={s.id} onClick={() => setSort(s.id)}
                    style={{
                      background: sort === s.id ? "var(--text)" : "var(--panel-alt)",
                      color: sort === s.id ? "var(--bg)" : "var(--text-muted)",
                      border: "1px solid var(--border)", borderRadius: 20, padding: "6px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    }}>
                    {s.label}
                  </button>
                ))}
              </div>
              <select value={sort} onChange={e => setSort(e.target.value)}
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text-muted)", fontSize: 13, padding: "6px 10px" }}>
                {SORTS.map(s => <option key={s.id} value={s.id}>排序依據：{s.label}</option>)}
              </select>
            </div>

            {/* Video grid */}
            {sortedVideos.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-dim)" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
                <div style={{ fontSize: 15 }}>這個頻道還沒有影片</div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px 16px", padding: "20px 0 40px" }}>
                {sortedVideos.map(v => (
                  <div key={v.id} onClick={() => openVideo(v)} style={{ cursor: "pointer" }}>
                    <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 12, overflow: "hidden", background: "#000" }}>
                      <video src={v.videoUrl} muted preload="metadata" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    </div>
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {v.text?.trim() || "（無標題）"}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
                          ❤️ {(v.likes || []).length} · {formatDate(v.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-dim)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚧</div>
            <div style={{ fontSize: 15 }}>「{TABS.find(t => t.id === tab)?.label}」即將推出</div>
          </div>
        )}
      </div>
    </div>
  );
}
