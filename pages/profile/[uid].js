import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { auth, db } from "../../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import MobileTabBarLayout from "../../components/MobileTabBarLayout";
import MyStickersPanel from "../../components/MyStickersPanel";
import LoadingState from "../../components/LoadingState";
import ImageCropModal from "../../components/ImageCropModal";
import ThemeToggle from "../../components/ThemeToggle";
import useIsMobile from "../../lib/useIsMobile";
import { uploadToR2 } from "../../lib/uploadToR2";
import { formatDate } from "../../lib/format";
import { toast } from "../../lib/toast";
import {
  doc, getDoc, onSnapshot, collection, query, where, getDocs, addDoc,
  updateDoc, serverTimestamp, arrayUnion, arrayRemove,
} from "firebase/firestore";

function getStatus(status) {
  switch (status) {
    case "online": return { label: "線上",    color: "#22c55e" };
    case "away":   return { label: "暫時離開", color: "#eab308" };
    case "dnd":    return { label: "請勿打擾", color: "#ef4444" };
    default:       return { label: "離線",    color: "#6b7280" };
  }
}

function formatJoinDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("zh-TW", { year: "numeric", month: "long" });
}

const VISIBILITY_OPTS = [
  { id: "public",  label: "公開",     icon: "🌐" },
  { id: "friends", label: "好友可見", icon: "👥" },
  { id: "private", label: "僅自己",   icon: "🔒" },
];

const LANGUAGE_OPTIONS = ["西班牙語", "英語（IELTS）", "法語"];

// Every badge is computed from data the app already tracks elsewhere
// (Spanish course progress, Feed hashtags, friend count, join date) —
// no separate achievements collection to keep in sync.
const ACHIEVEMENTS = [
  { id: "streak7",      icon: "🔥", label: "連續打卡7天", tooltip: "西語課程連續學習達 7 天",
    check: (p) => (p.spanishCourseStreak || 0) >= 7 },
  { id: "spanishStart", icon: "🇪🇸", label: "西語入門",   tooltip: "完成至少一堂西語課程",
    check: (p) => (p.spanishCourseCompleted || []).length >= 1 },
  { id: "ieltsRookie",  icon: "📝", label: "IELTS 新手", tooltip: "在動態消息發布過 IELTS 練習相關貼文",
    check: (p, posts) => posts.some(post => (post.text || "").includes("#IELTS 練習")) },
  { id: "social",       icon: "🤝", label: "社交達人",   tooltip: "好友數達到 5 人",
    check: (p) => (p.friends || []).length >= 5 },
  { id: "veteran",      icon: "🎖️", label: "元老用戶",   tooltip: "加入 EVONCHAT 超過 90 天",
    check: (p) => {
      if (!p.createdAt) return false;
      const d = p.createdAt.toDate ? p.createdAt.toDate() : new Date(p.createdAt);
      return (Date.now() - d.getTime()) >= 90 * 86400000;
    } },
];

function AchievementsRow({ profile, posts }) {
  const unlocked = ACHIEVEMENTS.filter(a => a.check(profile, posts));
  if (unlocked.length === 0) return null;
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 2px 10px", marginBottom: 4 }}>
      {unlocked.map(a => (
        <div key={a.id} title={a.tooltip}
          style={{ flexShrink: 0, display: "flex", alignItems: "center", gap: 6, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, boxShadow: "var(--card-shadow)", padding: "6px 10px" }}>
          <span style={{ fontSize: 16 }} aria-hidden="true">{a.icon}</span>
          <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", whiteSpace: "nowrap" }}>{a.label}</span>
        </div>
      ))}
    </div>
  );
}

function VisibilityMenu({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const current = VISIBILITY_OPTS.find(o => o.id === value) || VISIBILITY_OPTS[0];
  return (
    <div style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} type="button"
        style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 10px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
        {current.icon} {current.label} <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
          <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 6, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 61, minWidth: 140, overflow: "hidden" }}>
            {VISIBILITY_OPTS.map(o => (
              <button key={o.id} onClick={() => { onChange(o.id); setOpen(false); }} type="button"
                style={{ display: "flex", alignItems: "center", gap: 6, width: "100%", textAlign: "left", background: o.id === value ? "var(--panel-hover)" : "none", border: "none", padding: "9px 12px", color: "var(--text)", cursor: "pointer", fontSize: 13 }}>
                {o.icon} {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function NewPostForm({ profile, onPosted }) {
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef();

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
    setPreview(URL.createObjectURL(file));
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaType(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const submit = async () => {
    if (!text.trim() && !mediaFile) { toast("請輸入內容"); return; }
    if (!auth.currentUser || !profile?.uid) {
      console.error("[ProfilePage.NewPostForm] submit blocked: no authenticated user", { authCurrentUser: auth.currentUser, profileUid: profile?.uid });
      toast("請先登入後再發布");
      return;
    }
    if (auth.currentUser.uid !== profile.uid) {
      console.error("[ProfilePage.NewPostForm] submit blocked: viewing another user's profile", { authUid: auth.currentUser.uid, profileUid: profile.uid });
      toast("發布失敗：沒有發布權限，請檢查登入狀態");
      return;
    }
    setPosting(true);
    const payload = {
      userId: profile.uid,
      userNickname: profile.nickname,
      userAvatar: profile.avatar || "😊",
      userAvatarImage: profile.avatarImage || "",
      userColor: profile.color || "var(--accent)",
      text: text.trim(),
      imageUrl: null,
      videoUrl: null,
      likes: [],
      visibility,
      pinned: false,
      createdAt: serverTimestamp(),
    };
    try {
      if (mediaFile) {
        console.log("[ProfilePage.NewPostForm] uploading media", { name: mediaFile.name, type: mediaFile.type, size: mediaFile.size });
        const url = await uploadToR2(mediaFile);
        if (mediaType === "video") payload.videoUrl = url;
        else payload.imageUrl = url;
      }
      console.log("[ProfilePage.NewPostForm] submitting post", {
        uid: auth.currentUser.uid, hasImage: !!payload.imageUrl, hasVideo: !!payload.videoUrl,
        textLength: payload.text.length, payload,
      });
      const ref = await addDoc(collection(db, "posts"), payload);
      console.log("[ProfilePage.NewPostForm] post created", { id: ref.id });
      setText("");
      removeMedia();
      setVisibility("public");
      onPosted?.();
    } catch (err) {
      console.error("[ProfilePage.NewPostForm] publish failed", {
        code: err?.code, message: err?.message, name: err?.name, stack: err?.stack,
        uid: auth.currentUser?.uid, payload,
      });
      if (err?.code === "permission-denied") {
        toast("發布失敗：沒有發布權限，請檢查登入狀態");
      } else if (err?.code === "unavailable" || err?.message?.includes("network")) {
        toast("網絡錯誤，請稍後再試");
      } else if (err?.code) {
        toast(`發布失敗：資料庫寫入失敗 (${err.code})`);
      } else {
        toast("發布失敗，請重試");
      }
    } finally {
      setPosting(false);
    }
  };

  const canPost = (text.trim() || mediaFile) && !posting;

  return (
    <div style={{ borderBottom: "1px solid var(--panel)", padding: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {profile.avatarImage
          ? <img src={profile.avatarImage} alt="頭像" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          : <div style={{ width: 40, height: 40, borderRadius: "50%", background: profile.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{profile.avatar || "😊"}</div>
        }
        <div style={{ flex: 1 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="有什麼想分享的嗎？"
            aria-label="貼文內容"
            rows={3}
            style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}
          />
          {preview && (
            <div style={{ position: "relative", marginTop: 8, borderRadius: 10, overflow: "hidden", display: "inline-block" }}>
              {mediaType === "video"
                ? <video src={preview} controls style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, display: "block" }} />
                : <img src={preview} alt="預覽" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, display: "block" }} />
              }
              <button onClick={removeMedia} aria-label="移除附加媒體"
                style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 26, height: 26, color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => fileRef.current?.click()}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", color: "var(--text-faint)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
                📎 加入圖片/影片
              </button>
              <VisibilityMenu value={visibility} onChange={setVisibility} />
            </div>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={onFile} style={{ display: "none" }} />
            <button onClick={submit} disabled={!canPost}
              style={{ background: canPost ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "var(--panel)", border: "none", borderRadius: 10, padding: "8px 20px", color: canPost ? "#fff" : "var(--text-dim)", cursor: canPost ? "pointer" : "default", fontSize: 14, fontWeight: 700 }}>
              {posting ? "發佈中..." : "發佈"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function PostItem({ post, profile, isOwner, onTogglePin, onOpenImage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const visInfo = VISIBILITY_OPTS.find(o => o.id === (post.visibility || "public"));

  return (
    <div style={{ borderBottom: "1px solid var(--panel)", background: post.pinned ? "var(--panel-alt)" : "transparent" }}>
      <div style={{ padding: "16px 16px 12px" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          {profile.avatarImage
            ? <img src={profile.avatarImage} alt="頭像" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
            : <div style={{ width: 40, height: 40, borderRadius: "50%", background: profile.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{profile.avatar}</div>
          }
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{profile.nickname}</span>
              <span style={{ fontSize: 13, color: "var(--text-muted)" }}>· {formatDate(post.createdAt)}</span>
              {post.pinned && (
                <span style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", background: "var(--accent-active)", borderRadius: 20, padding: "1px 8px" }}>📌 置頂</span>
              )}
              {isOwner && post.visibility && post.visibility !== "public" && (
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{visInfo.icon} {visInfo.label}</span>
              )}
              {isOwner && (
                <div style={{ position: "relative", marginLeft: "auto" }}>
                  <button onClick={() => setMenuOpen(v => !v)} aria-label="貼文選項"
                    style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 16, padding: 4 }}>⋯</button>
                  {menuOpen && (
                    <>
                      <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
                      <div style={{ position: "absolute", top: "100%", right: 0, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 61, minWidth: 120, overflow: "hidden" }}>
                        <button onClick={() => { onTogglePin(post); setMenuOpen(false); }}
                          style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 14px", color: "var(--text)", cursor: "pointer", fontSize: 13 }}>
                          {post.pinned ? "取消置頂" : "📌 置頂"}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
            {post.text && (
              <div style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: (post.imageUrl || post.videoUrl) ? 10 : 0 }}>
                {post.text}
              </div>
            )}
            {post.videoUrl && (
              <div style={{ borderRadius: 16, overflow: "hidden", marginTop: 10 }}>
                <video src={post.videoUrl} controls style={{ width: "100%", maxHeight: 400, display: "block" }} />
              </div>
            )}
            {post.imageUrl && (
              <div style={{ borderRadius: 16, overflow: "hidden", marginTop: 10, cursor: "zoom-in" }}
                onClick={() => onOpenImage(post.imageUrl)}>
                <img src={post.imageUrl} alt="貼文圖片" style={{ width: "100%", maxHeight: 400, objectFit: "cover", display: "block", transition: "filter 0.2s" }}
                  onMouseEnter={e => e.currentTarget.style.filter = "brightness(0.85)"}
                  onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"} />
              </div>
            )}
            <div style={{ display: "flex", gap: 20, marginTop: 12 }}>
              <span style={{ fontSize: 13, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 4 }}>
                ❤️ {(post.likes || []).length}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FriendsTab({ friendUids, isMobile }) {
  const [friendProfiles, setFriendProfiles] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const entries = await Promise.all(friendUids.map(async fid => {
        try {
          const snap = await getDoc(doc(db, "users", fid));
          return snap.exists() ? [fid, { uid: fid, ...snap.data() }] : null;
        } catch { return null; }
      }));
      if (!cancelled) {
        setFriendProfiles(Object.fromEntries(entries.filter(Boolean)));
        setLoaded(true);
      }
    }
    if (friendUids.length > 0) load(); else setLoaded(true);
    return () => { cancelled = true; };
  }, [friendUids.join(",")]);

  if (!loaded) return <LoadingState label="載入好友中..." minHeight="200px" />;

  if (friendUids.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-dim)" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🧑‍🤝‍🧑</div>
        <div style={{ fontSize: 16 }}>還沒有好友</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "repeat(3, 1fr)" : "repeat(4, 1fr)", gap: 12, padding: 16 }}>
      {friendUids.map(fid => {
        const f = friendProfiles[fid];
        if (!f) return null;
        return (
          <Link key={fid} href={`/profile/${fid}`}
            style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, textDecoration: "none", padding: 10, borderRadius: 12, transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--panel)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            {f.avatarImage
              ? <img src={f.avatarImage} alt={f.nickname} style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover" }} />
              : <div style={{ width: 64, height: 64, borderRadius: "50%", background: f.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 30 }}>{f.avatar || "😊"}</div>
            }
            <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" }}>{f.nickname}</span>
          </Link>
        );
      })}
    </div>
  );
}

function AboutTab({ profile, isOwner }) {
  const languages = profile.learningLanguages || [];

  const toggleLanguage = async (lang) => {
    const has = languages.includes(lang);
    await updateDoc(doc(db, "users", profile.uid), {
      learningLanguages: has ? arrayRemove(lang) : arrayUnion(lang),
    });
  };

  return (
    <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>加入時間</div>
        <div style={{ fontSize: 14, color: "var(--text)" }}>{profile.createdAt ? `📅 加入於 ${formatJoinDate(profile.createdAt)}` : "—"}</div>
      </div>
      <div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>學習語言偏好</div>
        {isOwner ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {LANGUAGE_OPTIONS.map(lang => {
              const active = languages.includes(lang);
              return (
                <button key={lang} onClick={() => toggleLanguage(lang)}
                  style={{
                    borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer",
                    background: active ? "var(--accent)" : "var(--panel)",
                    color: active ? "#fff" : "var(--text-muted)",
                    border: active ? "1px solid var(--accent)" : "1px solid var(--border)",
                  }}>
                  {lang}
                </button>
              );
            })}
          </div>
        ) : languages.length > 0 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {languages.map(lang => (
              <span key={lang} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 600, color: "var(--text-muted)" }}>{lang}</span>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 13, color: "var(--text-dim)" }}>尚未設定</div>
        )}
      </div>
      <div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 6 }}>簡介</div>
        <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{profile.bio || "尚未填寫簡介"}</div>
      </div>
    </div>
  );
}

// Hover-to-edit overlay shown on the cover/avatar only for the profile owner.
function EditOverlay({ shape = "rect", label, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <button onClick={onClick} title={label} aria-label={label}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "absolute", inset: 0, border: "none", cursor: "pointer",
        borderRadius: shape === "circle" ? "50%" : 12,
        background: hover ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "background 0.15s", color: "#fff",
      }}>
      {hover && <span style={{ fontSize: shape === "circle" ? 24 : 20 }} aria-hidden="true">📷</span>}
    </button>
  );
}

export default function ProfilePublicPage() {
  const router = useRouter();
  const { uid } = router.query;
  const [viewerUid, setViewerUid] = useState(undefined); // undefined = auth not resolved yet, null = guest
  const [viewerProfile, setViewerProfile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState("posts");
  const [lightboxImg, setLightboxImg] = useState(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const [hoveredMedia, setHoveredMedia] = useState(null);
  const [stickersPanelOpen, setStickersPanelOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState(null); // "avatar" | "cover" | null
  const [pendingFile, setPendingFile] = useState(null);
  const avatarFileRef = useRef();
  const coverFileRef = useRef();
  const isMobile = useIsMobile();

  const isOwner = viewerUid != null && viewerUid === uid;

  useEffect(() => onAuthStateChanged(auth, u => setViewerUid(u ? u.uid : null)), []);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    const unsub = onSnapshot(doc(db, "users", uid), snap => {
      if (!cancelled && snap.exists()) setProfile({ uid: snap.id, ...snap.data() });
      if (!cancelled) setLoading(false);
    }, (e) => {
      console.error("[ProfilePage] failed to load profile", e);
      if (!cancelled) { setLoadError(true); setLoading(false); }
    });
    return () => { cancelled = true; unsub(); };
  }, [uid]);

  // Only need a separate subscription to my own doc when I'm viewing someone
  // else's page (friend-status button etc.) — on my own page `profile` already
  // *is* my doc, no need to fetch it twice.
  useEffect(() => {
    if (!viewerUid || viewerUid === uid) { setViewerProfile(null); return; }
    return onSnapshot(doc(db, "users", viewerUid), snap => {
      if (snap.exists()) setViewerProfile({ uid: snap.id, ...snap.data() });
    });
  }, [viewerUid, uid]);

  const myProfile = isOwner ? profile : viewerProfile;

  const reloadPosts = useCallback(async () => {
    if (!uid) return;
    try {
      const postsSnap = await getDocs(query(collection(db, "posts"), where("userId", "==", uid)));
      const sorted = postsSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => {
          const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return tb - ta;
        });
      setPosts(sorted);
    } catch (e) { console.error("[ProfilePage] failed to load posts", e); }
  }, [uid]);

  useEffect(() => { if (uid) reloadPosts(); }, [uid, reloadPosts]);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") setLightboxImg(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const togglePin = useCallback(async (post) => {
    try {
      await updateDoc(doc(db, "posts", post.id), { pinned: !post.pinned });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, pinned: !p.pinned } : p));
    } catch (e) {
      console.error("[ProfilePage] togglePin failed", e);
      toast("操作失敗，請重試");
    }
  }, []);

  // ---- Friend / message / block / report (visitor actions) ----
  const friendState = useMemo(() => {
    if (isOwner || !profile) return null;
    if (!viewerUid) return "guest";
    if ((viewerProfile?.blocked || []).includes(profile.uid)) return "blocked";
    if ((profile.friends || []).includes(viewerUid)) return "friends";
    if ((profile.pendingIn || []).includes(viewerUid)) return "requestSent"; // I'm in their pendingIn = I sent them a request
    if ((viewerProfile?.pendingIn || []).includes(profile.uid)) return "requestReceived"; // they sent me one
    return "none";
  }, [isOwner, profile, viewerProfile, viewerUid]);

  const sendFriendRequest = async () => {
    if (!viewerUid || !profile) return;
    try {
      await updateDoc(doc(db, "users", viewerUid), { pendingOut: arrayUnion(profile.uid) });
      await updateDoc(doc(db, "users", profile.uid), { pendingIn: arrayUnion(viewerUid) });
      toast("已送出好友邀請", "success");
    } catch (e) {
      console.error("[ProfilePage] sendFriendRequest failed", e);
      toast("送出失敗，請重試");
    }
  };

  const acceptFriendRequest = async () => {
    if (!viewerUid || !profile) return;
    try {
      await updateDoc(doc(db, "users", viewerUid), { friends: arrayUnion(profile.uid), pendingIn: arrayRemove(profile.uid) });
      await updateDoc(doc(db, "users", profile.uid), { friends: arrayUnion(viewerUid), pendingOut: arrayRemove(viewerUid) });
      toast("已成為好友", "success");
    } catch (e) {
      console.error("[ProfilePage] acceptFriendRequest failed", e);
      toast("操作失敗，請重試");
    }
  };

  const reportUser = async () => {
    if (!viewerUid || !profile) return;
    try {
      await addDoc(collection(db, "reports"), { reporterUid: viewerUid, targetUid: profile.uid, createdAt: serverTimestamp() });
      toast("已送出檢舉，我們會盡快處理", "success");
    } catch (e) {
      console.error("[ProfilePage] reportUser failed", e);
      toast("送出失敗，請重試");
    }
    setMoreMenuOpen(false);
  };

  const blockUser = async () => {
    if (!viewerUid || !profile) return;
    try {
      await updateDoc(doc(db, "users", viewerUid), { blocked: arrayUnion(profile.uid) });
      toast("已封鎖此用戶", "success");
    } catch (e) {
      console.error("[ProfilePage] blockUser failed", e);
      toast("操作失敗，請重試");
    }
    setMoreMenuOpen(false);
  };

  const unblockUser = async () => {
    if (!viewerUid || !profile) return;
    try {
      await updateDoc(doc(db, "users", viewerUid), { blocked: arrayRemove(profile.uid) });
      toast("已解除封鎖", "success");
    } catch (e) {
      console.error("[ProfilePage] unblockUser failed", e);
      toast("操作失敗，請重試");
    }
  };

  // ---- Cover / avatar crop upload ----
  const openCrop = (target) => (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingFile(file);
    setCropTarget(target);
  };

  const confirmCrop = async (blob) => {
    if (!profile) return;
    const file = new File([blob], `${cropTarget}.jpg`, { type: "image/jpeg" });
    try {
      const url = await uploadToR2(file);
      if (cropTarget === "avatar") {
        await updateDoc(doc(db, "users", profile.uid), { avatarImage: url });
      } else {
        await updateDoc(doc(db, "users", profile.uid), { profileBg: url, profileBgType: "image" });
      }
      toast("已更新圖片", "success");
    } catch (e) {
      console.error("[ProfilePage] confirmCrop upload failed", e);
      toast("上傳失敗，請重試");
    } finally {
      setCropTarget(null);
      setPendingFile(null);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };

  if (loading) {
    return <LoadingState label="載入中..." />;
  }

  if (loadError && !profile) {
    return (
      <LoadingState
        error="無法載入此用戶，請檢查網路連線"
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (!profile) {
    return (
      <main style={{ minHeight: "100vh", background: "var(--panel-alt)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div aria-hidden="true" style={{ fontSize: 48 }}>😶</div>
        <div style={{ color: "var(--text-muted)", fontSize: 18 }}>找不到此用戶</div>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14 }}>← 返回聊天室</Link>
      </main>
    );
  }

  const st = getStatus(profile.status);
  const bannerStyle = profile.profileBgType === "image"
    ? { backgroundImage: `url(${profile.profileBg})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: profile.profileBg || "linear-gradient(135deg,#1e3a5f,#2d1f6e)" };

  const visiblePosts = posts.filter(p => {
    if (isOwner) return true;
    const vis = p.visibility || "public";
    if (vis === "private") return false;
    if (vis === "friends") return (profile.friends || []).includes(viewerUid);
    return true;
  });
  const pinnedPosts = visiblePosts.filter(p => p.pinned);
  const restPosts = visiblePosts.filter(p => !p.pinned);
  const orderedPosts = [...pinnedPosts, ...restPosts];
  const mediaPosts = visiblePosts.filter(p => p.imageUrl || p.videoUrl);
  const totalLikes = visiblePosts.reduce((sum, p) => sum + (p.likes || []).length, 0);
  const friendUids = profile.friends || [];

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--panel-alt); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        .pp-stat-clickable { cursor: pointer; }
        .pp-stat-clickable .pp-stat-num { color: #3ee0f5; }
        .pp-stat-clickable:hover .pp-stat-num { text-decoration: underline; }

        @media (max-width: 767px) {
          /* Prevent iOS Safari auto-zoom on input focus (needs >=16px) */
          input, textarea, select { font-size: 16px !important; }

          .pp-banner { height: 140px !important; }
          .pp-avatar { width: 84px !important; height: 84px !important; }
          .pp-avatar-row { margin-top: -42px !important; }
          .pp-root { padding-bottom: calc(var(--mobile-tabbar-h) + env(safe-area-inset-bottom)); }
        }
      `}</style>

      {/* Lightbox */}
      {lightboxImg && (
        <div role="dialog" aria-modal="true" aria-label="圖片檢視" onClick={() => setLightboxImg(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={lightboxImg} alt="放大檢視的圖片" onClick={e => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, objectFit: "contain", cursor: "default", boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }} />
          <button onClick={() => setLightboxImg(null)} aria-label="關閉圖片檢視"
            style={{ position: "absolute", top: 20, right: 20, background: "rgba(30,41,59,0.9)", border: "1px solid var(--border)", color: "#f1f5f9", fontSize: 20, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>
      )}

      {/* 我的貼圖包 */}
      {stickersPanelOpen && isOwner && (
        <div role="dialog" aria-modal="true" aria-label="我的貼圖包" onClick={() => setStickersPanelOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--panel)", borderRadius: 16, padding: 20, width: 420, maxWidth: "100%", maxHeight: "80vh", overflowY: "auto", boxSizing: "border-box" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>🖼️ 我的貼圖包</div>
              <button onClick={() => setStickersPanelOpen(false)} aria-label="關閉" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 20 }}>✕</button>
            </div>
            <MyStickersPanel uid={uid} isMobile={isMobile} />
          </div>
        </div>
      )}

      {/* Crop modal */}
      {cropTarget && pendingFile && (
        <ImageCropModal
          file={pendingFile}
          aspect={cropTarget === "avatar" ? 1 : 3}
          outputWidth={cropTarget === "avatar" ? 512 : 1200}
          title={cropTarget === "avatar" ? "調整頭像" : "調整封面"}
          onCancel={() => { setCropTarget(null); setPendingFile(null); }}
          onConfirm={confirmCrop}
        />
      )}

      <div className="pp-root" style={{ minHeight: "100vh", background: "var(--panel-alt)", color: "var(--text)", fontFamily: "var(--font-body)", boxSizing: "border-box" }}>

        {/* Sticky top bar */}
        <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(15,23,42,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", gap: 16, padding: "0 16px", height: 52 }}>
          <Link href="/" aria-label="返回聊天室" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", color: "var(--text)", textDecoration: "none", fontSize: 18, background: "transparent", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--panel)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            ←
          </Link>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{profile.nickname}</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{visiblePosts.length} 則貼文</div>
          </div>
        </header>

        <main>
        {/* Banner */}
        <div className="pp-banner" style={{ height: 200, position: "relative", ...bannerStyle }}>
          {isOwner && (
            <>
              <EditOverlay label="更換封面" onClick={() => coverFileRef.current?.click()} />
              <input ref={coverFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={openCrop("cover")} />
            </>
          )}
        </div>

        {/* Avatar + actions row */}
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px" }}>
          <div className="pp-avatar-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: -52, marginBottom: 12 }}>
            <div className="pp-avatar" style={{ flexShrink: 0, position: "relative", cursor: (!isOwner && profile.avatarImage) ? "pointer" : "default", width: 104, height: 104 }}
              onClick={() => !isOwner && profile.avatarImage && setLightboxImg(profile.avatarImage)}
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}>
              {profile.avatarImage
                ? <img src={profile.avatarImage} alt="頭像" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "4px solid var(--panel-alt)", display: "block", transition: "filter 0.2s", filter: (!isOwner && avatarHover) ? "brightness(0.75)" : "brightness(1)" }} />
                : <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: profile.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, border: "4px solid var(--panel-alt)" }}>{profile.avatar || "😊"}</div>
              }
              {!isOwner && profile.avatarImage && avatarHover && (
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <span style={{ fontSize: 28 }}>🔍</span>
                </div>
              )}
              {/* Online status dot */}
              <span title={st.label} style={{ position: "absolute", bottom: 4, right: 4, width: 20, height: 20, borderRadius: "50%", background: st.color, border: "3px solid var(--panel-alt)" }} />
              {isOwner && (
                <>
                  <EditOverlay shape="circle" label="更換頭像" onClick={() => avatarFileRef.current?.click()} />
                  <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={openCrop("avatar")} />
                </>
              )}
            </div>

            {isOwner ? (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 8, alignItems: "center" }}>
                <Link href="/?view=editProfile" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "7px 16px", color: "var(--text)", textDecoration: "none", fontSize: 14, fontWeight: 700, display: "inline-block" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--panel)"}>
                  ⚙️ 編輯個人資料
                </Link>
                <button onClick={() => setStickersPanelOpen(true)}
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "7px 16px", color: "var(--text)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--panel)"}>
                  🖼️ 我的貼圖包
                </button>
                <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "3px 10px", display: "flex", alignItems: "center" }}>
                  <ThemeToggle mode="inline" openUp />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginLeft: 2 }}>設定</span>
                </div>
              </div>
            ) : friendState === "blocked" ? (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: "var(--text-faint)" }}>已封鎖</span>
                <button onClick={unblockUser}
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: 20, padding: "7px 14px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                  解除封鎖
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, position: "relative" }}>
                {friendState === "none" && (
                  <button onClick={sendFriendRequest}
                    style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "8px 16px", color: "var(--text)", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                    ➕ 加好友
                  </button>
                )}
                {friendState === "requestSent" && (
                  <button disabled
                    style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "8px 16px", color: "var(--text-dim)", cursor: "default", fontSize: 14, fontWeight: 700 }}>
                    ⏳ 已送出邀請
                  </button>
                )}
                {friendState === "requestReceived" && (
                  <button onClick={acceptFriendRequest}
                    style={{ background: "var(--accent)", border: "none", borderRadius: 20, padding: "8px 16px", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                    ✅ 接受好友邀請
                  </button>
                )}
                <Link href={`/?chat=${uid}`} style={{ background: "var(--accent)", border: "none", borderRadius: 20, padding: "8px 18px", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700, transition: "background 0.15s", display: "inline-block" }}
                  onMouseEnter={e => e.currentTarget.style.background = "#2563eb"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}>
                  💬 傳訊息
                </Link>
                <div style={{ position: "relative" }}>
                  <button onClick={() => setMoreMenuOpen(v => !v)} aria-label="更多選項"
                    style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "50%", width: 36, height: 36, color: "var(--text-faint)", cursor: "pointer", fontSize: 18 }}>
                    ⋯
                  </button>
                  {moreMenuOpen && (
                    <>
                      <div onClick={() => setMoreMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
                      <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 6, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 61, minWidth: 120, overflow: "hidden" }}>
                        <button onClick={reportUser}
                          style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 14px", color: "var(--text)", cursor: "pointer", fontSize: 13 }}>
                          🚩 檢舉
                        </button>
                        <button onClick={blockUser}
                          style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 14px", color: "#ef4444", cursor: "pointer", fontSize: 13 }}>
                          🚫 封鎖
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Name + status */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", lineHeight: 1.2 }}>{profile.nickname}</h1>
              {profile.status === "offline" ? (
                <span style={{ color: "var(--text-muted)", fontSize: 12, fontWeight: 600 }}>
                  {profile.lastActiveAt ? `最後上線於 ${formatDate(profile.lastActiveAt)}` : "離線"}
                </span>
              ) : (
                <span style={{ background: `${st.color}22`, border: `1px solid ${st.color}55`, color: st.color, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                  ● {st.label}
                </span>
              )}
            </div>
            {profile.signature && (
              <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 2, fontStyle: "italic" }}>「{profile.signature}」</div>
            )}
          </div>

          <AchievementsRow profile={profile} posts={posts} />

          {profile.bio && (
            <div style={{ fontSize: 15, color: "var(--text-subtle)", marginBottom: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{profile.bio}</div>
          )}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 12 }}>
            {profile.statusText && (
              <span style={{ fontSize: 13, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 4 }}>💬 {profile.statusText}</span>
            )}
            {profile.createdAt && (
              <span style={{ fontSize: 13, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 4 }}>📅 加入於 {formatJoinDate(profile.createdAt)}</span>
            )}
          </div>

          <div style={{ display: "flex", gap: 20, marginBottom: 16 }}>
            <div className="pp-stat-clickable" onClick={() => setTab("friends")} style={{ display: "flex", gap: 4 }}>
              <span className="pp-stat-num" style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{friendUids.length}</span>
              <span style={{ fontSize: 14, color: "var(--text-faint)" }}>好友</span>
            </div>
            <div className="pp-stat-clickable" onClick={() => setTab("posts")} style={{ display: "flex", gap: 4 }}>
              <span className="pp-stat-num" style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{visiblePosts.length}</span>
              <span style={{ fontSize: 14, color: "var(--text-faint)" }}>貼文</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{totalLikes}</span>
              <span style={{ fontSize: 14, color: "var(--text-faint)" }}>獲讚總數</span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--panel)" }}>
            {[
              ["posts", "貼文"],
              ["media", `媒體${mediaPosts.length > 0 ? ` (${mediaPosts.length})` : ""}`],
              ["friends", "好友"],
              ["about", "關於"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ flex: 1, padding: "14px 0", background: "none", border: "none", borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent", color: tab === key ? "#f1f5f9" : "var(--text-faint)", fontSize: 14, fontWeight: tab === key ? 700 : 500, cursor: "pointer", transition: "color 0.15s" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          {tab === "posts" && (
            <>
              {isOwner && (
                <NewPostForm profile={profile} onPosted={reloadPosts} />
              )}

              {orderedPosts.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-dim)" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <div style={{ fontSize: 16 }}>{isOwner ? "還沒有貼文，發第一篇吧！" : "還沒有任何貼文"}</div>
                </div>
              )}
              {orderedPosts.filter(p => p.text || p.imageUrl || p.videoUrl).map(post => (
                <PostItem key={post.id} post={post} profile={profile} isOwner={isOwner} onTogglePin={togglePin} onOpenImage={setLightboxImg} />
              ))}
            </>
          )}
          {tab === "media" && (
            <>
              {mediaPosts.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-dim)" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
                  <div style={{ fontSize: 16 }}>還沒有媒體貼文</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, padding: "2px" }}>
                {mediaPosts.map(post => (
                  <div key={post.id}
                    onClick={() => post.imageUrl && setLightboxImg(post.imageUrl)}
                    onMouseEnter={() => setHoveredMedia(post.id)}
                    onMouseLeave={() => setHoveredMedia(null)}
                    style={{ aspectRatio: "1", overflow: "hidden", background: "var(--panel)", cursor: post.imageUrl ? "zoom-in" : "default", position: "relative" }}>
                    {post.videoUrl
                      ? <video src={post.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <img src={post.imageUrl} alt="媒體" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.2s", transform: hoveredMedia === post.id ? "scale(1.06)" : "scale(1)" }} />
                    }
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === "friends" && (
            <FriendsTab friendUids={friendUids} isMobile={isMobile} />
          )}
          {tab === "about" && (
            <AboutTab profile={profile} isOwner={isOwner} />
          )}
        </div>
        </main>
      </div>
      <MobileTabBarLayout activeTab={isOwner ? "me" : undefined} />
    </>
  );
}
