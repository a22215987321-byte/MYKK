import { useEffect, useState, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import MobileTabBarLayout from "./MobileTabBarLayout";
import MyStickersPanel from "./MyStickersPanel";
import LoadingState from "./LoadingState";
import ImageCropModal from "./ImageCropModal";
import ThemeToggle from "./ThemeToggle";
import VideoPlayer from "./VideoPlayer";
import useIsMobile from "../lib/useIsMobile";
import { uploadToR2 } from "../lib/uploadToR2";
import { formatDate } from "../lib/format";
import { toast } from "../lib/toast";
import { useMediaAttachments } from "../lib/useMediaAttachments";
import MediaAttachPreview from "./media-editor/MediaAttachPreview";
import { getNotificationVolume, setNotificationVolume, playNotificationSound } from "../lib/notificationSound";
import {
  doc, onSnapshot, collection, query, where, orderBy, getDocs, addDoc,
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

// Compact profile-header badge for whatever the user is currently learning
// (reuses the same learningLanguages field already editable in the 關於 tab —
// no separate schema needed just to show it more prominently up top).
const LANGUAGE_BADGES = {
  "西班牙語": { code: "ES", label: "西語入門" },
  "英語（IELTS）": { code: "EN", label: "英語 IELTS" },
  "法語": { code: "FR", label: "法語入門" },
};

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

// Auto-grow textarea: ~6 lines of breathing room before scrolling kicks in,
// capped well short of the viewport so the 發佈 button never gets pushed
// off-screen by a long draft.
const TEXTAREA_MIN_HEIGHT = 132;
const TEXTAREA_MAX_HEIGHT_RATIO = 0.55;

function NewPostForm({ profile, onPosted }) {
  const [text, setText] = useState("");
  const [visibility, setVisibility] = useState("public");
  const media = useMediaAttachments();
  const [posting, setPosting] = useState(false);
  const textareaRef = useRef();
  const manualHeightRef = useRef(0);
  const pendingCursorRef = useRef(null);

  const onTextareaPaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const handled = media.onPasteImages(items, () => e.preventDefault());
    if (!handled) return;

    const pastedText = e.clipboardData.getData("text/plain");
    if (pastedText) {
      const el = e.target;
      const start = el.selectionStart ?? text.length;
      const end = el.selectionEnd ?? text.length;
      pendingCursorRef.current = start + pastedText.length;
      setText(prev => prev.slice(0, start) + pastedText + prev.slice(end));
    }
  };

  useEffect(() => {
    if (pendingCursorRef.current == null) return;
    const el = textareaRef.current;
    const pos = pendingCursorRef.current;
    pendingCursorRef.current = null;
    if (el) requestAnimationFrame(() => { el.selectionStart = el.selectionEnd = pos; });
  }, [text]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxH = Math.round(window.innerHeight * TEXTAREA_MAX_HEIGHT_RATIO);
    const target = Math.min(Math.max(el.scrollHeight, TEXTAREA_MIN_HEIGHT, manualHeightRef.current), maxH);
    el.style.height = `${target}px`;
  }, [text]);

  const onTextareaMouseUp = () => {
    const el = textareaRef.current;
    if (el) manualHeightRef.current = el.offsetHeight;
  };

  const submit = async () => {
    if (!text.trim() && !media.hasMedia) { toast("請輸入內容"); return; }
    if (!auth.currentUser || !profile?.uid) {
      console.error("[ProfileView.NewPostForm] submit blocked: no authenticated user", { authCurrentUser: auth.currentUser, profileUid: profile?.uid });
      toast("請先登入後再發布");
      return;
    }
    if (auth.currentUser.uid !== profile.uid) {
      console.error("[ProfileView.NewPostForm] submit blocked: viewing another user's profile", { authUid: auth.currentUser.uid, profileUid: profile.uid });
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
      imageUrls: [],
      videoUrl: null,
      audioUrl: null,
      subtitles: null,
      likes: [],
      visibility,
      pinned: false,
      createdAt: serverTimestamp(),
    };
    try {
      if (media.hasMedia) {
        console.log("[ProfileView.NewPostForm] uploading media", { imageCount: media.imageFiles.length, hasVideo: !!media.videoFile, hasAudio: !!media.audioFile });
        const { imageUrls, videoUrl, audioUrl, subtitles } = await media.upload();
        payload.imageUrls = imageUrls;
        payload.imageUrl = imageUrls[0] || null;
        payload.videoUrl = videoUrl;
        payload.audioUrl = audioUrl;
        payload.subtitles = subtitles;
      }
      console.log("[ProfileView.NewPostForm] submitting post", {
        uid: auth.currentUser.uid, imageCount: payload.imageUrls.length, hasVideo: !!payload.videoUrl,
        textLength: payload.text.length, payload,
      });
      const ref = await addDoc(collection(db, "posts"), payload);
      console.log("[ProfileView.NewPostForm] post created", { id: ref.id });
      setText("");
      media.removeAll();
      setVisibility("public");
      onPosted?.();
    } catch (err) {
      console.error("[ProfileView.NewPostForm] publish failed", {
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

  const canPost = (text.trim() || media.hasMedia) && !posting;

  return (
    <div style={{ borderBottom: "1px solid var(--panel)", padding: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {profile.avatarImage
          ? <img src={profile.avatarImage} alt="頭像" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
          : <div style={{ width: 40, height: 40, borderRadius: "50%", background: profile.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{profile.avatar || "😊"}</div>
        }
        <div style={{ flex: 1 }}>
          <textarea
            ref={textareaRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onPaste={onTextareaPaste}
            onMouseUp={onTextareaMouseUp}
            placeholder="有什麼想分享的嗎？（可直接貼上截圖）"
            aria-label="貼文內容"
            style={{
              width: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12,
              padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box", lineHeight: 1.5,
              minHeight: TEXTAREA_MIN_HEIGHT, maxHeight: `${TEXTAREA_MAX_HEIGHT_RATIO * 100}vh`, overflowY: "auto", resize: "vertical",
            }}
          />
          <MediaAttachPreview media={media} thumbSize={120} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10, gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => media.fileRef.current?.click()}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", color: "var(--text-faint)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
                📎 加入圖片/影片/音樂（可多選圖片）
              </button>
              <VisibilityMenu value={visibility} onChange={setVisibility} />
            </div>
            <input ref={media.fileRef} type="file" accept="image/*,video/*,audio/mpeg,audio/mp3,.mp3" multiple onChange={media.onFile} style={{ display: "none" }} />
            <button onClick={submit} disabled={!canPost}
              style={{ background: canPost ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "var(--panel)", border: "none", borderRadius: 10, padding: "8px 20px", color: canPost ? "var(--accent-text)" : "var(--text-dim)", cursor: canPost ? "pointer" : "default", fontSize: 14, fontWeight: 700 }}>
              {posting ? "發佈中..." : "發佈"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// 貼文列表卡片裡的圖片區——1 張整寬顯示（跟原本一樣），多張排成方格，
// 點擊一律交給外層開 MediaLightbox（裡面自己有張與張之間的左右切換）。
function PostImageGrid({ images, maxHeight = 400 }) {
  const n = images.length;
  if (n === 1) {
    return (
      <img src={images[0]} alt="貼文圖片" style={{ width: "100%", maxHeight, objectFit: "cover", display: "block", transition: "filter 0.2s" }}
        onMouseEnter={e => e.currentTarget.style.filter = "brightness(0.85)"}
        onMouseLeave={e => e.currentTarget.style.filter = "brightness(1)"} />
    );
  }
  const shown = images.slice(0, 4);
  const extra = n - shown.length;
  const cols = n === 3 ? 3 : 2;
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 2 }}>
      {shown.map((src, i) => (
        <div key={i} style={{ position: "relative", aspectRatio: "1 / 1", overflow: "hidden", background: "#000" }}>
          <img src={src} alt={`貼文圖片 ${i + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          {extra > 0 && i === shown.length - 1 && (
            <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.55)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, fontWeight: 700 }}>
              +{extra}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PostItem({ post, profile, isOwner, onTogglePin, onOpenMedia }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const visInfo = VISIBILITY_OPTS.find(o => o.id === (post.visibility || "public"));

  return (
    <div id={`post-${post.id}`} style={{ borderBottom: "1px solid var(--panel)", background: post.pinned ? "var(--panel-alt)" : "transparent" }}>
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
              <div style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word", marginBottom: (post.imageUrl || post.videoUrl || post.audioUrl) ? 10 : 0 }}>
                {post.text}
              </div>
            )}
            {post.videoUrl && (
              <div style={{ borderRadius: 16, overflow: "hidden", marginTop: 10 }}>
                <VideoPlayer src={post.videoUrl} subtitles={post.subtitles} />
              </div>
            )}
            {!post.videoUrl && post.imageUrl && (
              <div style={{ borderRadius: 16, overflow: "hidden", marginTop: 10, cursor: "zoom-in" }}
                onClick={() => onOpenMedia(post)}>
                <PostImageGrid images={post.imageUrls?.length ? post.imageUrls : [post.imageUrl]} maxHeight={400} />
              </div>
            )}
            {post.audioUrl && (
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", marginTop: 10 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>🎵</span>
                <audio src={post.audioUrl} controls style={{ flex: 1, minWidth: 0, height: 34 }} />
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

function formatDuration(sec) {
  if (!isFinite(sec) || sec <= 0) return "";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// YouTube 頻道頁那種影片縮圖卡：縮圖是影片本身的畫面（載入 metadata 後把
// currentTime 撥到 0.1 秒，逼瀏覽器畫出一張真的畫面當封面，而不是黑畫面），
// 右下角疊字幕長度，滑鼠移過去顯示標題跟讚數/時間。
function VideoThumb({ post, onOpen }) {
  const videoRef = useRef(null);
  const [duration, setDuration] = useState(0);

  const onLoadedMetadata = () => {
    const v = videoRef.current;
    if (!v) return;
    setDuration(v.duration || 0);
    try { v.currentTime = Math.min(0.1, (v.duration || 1) / 2); } catch {}
  };

  return (
    <button onClick={onOpen} type="button"
      style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ position: "relative", width: "100%", aspectRatio: "16 / 9", background: "#000", borderRadius: 10, overflow: "hidden" }}>
        <video ref={videoRef} src={post.videoUrl} muted playsInline preload="metadata"
          onLoadedMetadata={onLoadedMetadata}
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
        {duration > 0 && (
          <span style={{ position: "absolute", right: 6, bottom: 6, background: "rgba(0,0,0,0.75)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "2px 5px", borderRadius: 4 }}>
            {formatDuration(duration)}
          </span>
        )}
      </div>
      <div style={{ padding: "8px 2px 0" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", lineHeight: 1.35, minHeight: "2.7em" }}>
          {post.text?.trim() || "（無標題）"}
        </div>
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 3 }}>
          ❤️ {(post.likes || []).length} · {formatDate(post.createdAt)}
        </div>
      </div>
    </button>
  );
}

function VideosTab({ videoPosts, isMobile, onOpen }) {
  if (videoPosts.length === 0) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-dim)" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🎬</div>
        <div style={{ fontSize: 16 }}>還沒有影片</div>
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(3, 1fr)", gap: 20, padding: 16 }}>
      {videoPosts.map(post => (
        <VideoThumb key={post.id} post={post} onOpen={() => onOpen(post)} />
      ))}
    </div>
  );
}

function formatAudioTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// 音頻收藏的播放器——收藏清單裡任一首開始播放後，播完自動接下一首（順序
// 播放），可以切「單曲循環」讓目前這首重複播放。只用一個共用的 <audio>
// 元素切換 src，不是每首歌各自一個 <audio>。
function AudioQueuePlayer({ tracks }) {
  const audioRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [repeatOne, setRepeatOne] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const currentTrack = currentIndex != null ? tracks[currentIndex] : null;

  useEffect(() => {
    const a = audioRef.current;
    if (!a || currentIndex == null) return;
    a.src = tracks[currentIndex]?.audioUrl;
    a.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrent(a.currentTime);
    const onLoaded = () => setDuration(a.duration || 0);
    const onEnded = () => {
      if (repeatOne) {
        a.currentTime = 0;
        a.play().catch(() => {});
        return;
      }
      setCurrentIndex(idx => {
        if (idx == null) return idx;
        const next = idx + 1;
        return next < tracks.length ? next : null;
      });
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnded);
    };
  }, [repeatOne, tracks]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || currentIndex == null) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  };
  const playPrev = () => setCurrentIndex(idx => (idx == null ? 0 : Math.max(idx - 1, 0)));
  const playNext = () => setCurrentIndex(idx => (idx == null ? 0 : Math.min(idx + 1, tracks.length - 1)));

  return (
    <div>
      <audio ref={audioRef} style={{ display: "none" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {tracks.map((t, i) => {
          const isCurrent = currentIndex === i;
          return (
            <button key={t.id} onClick={() => (isCurrent ? togglePlay() : setCurrentIndex(i))}
              style={{ display: "flex", alignItems: "center", gap: 10, background: isCurrent ? "var(--panel-hover)" : "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 16, width: 20, textAlign: "center", flexShrink: 0 }}>{isCurrent && playing ? "⏸" : "▶"}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: isCurrent ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.text?.trim() || "（未命名音樂）"}
                </div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{t.userNickname}</div>
              </div>
            </button>
          );
        })}
      </div>

      {currentTrack && (
        <div style={{ position: "sticky", bottom: 8, marginTop: 12, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 12px", display: "flex", alignItems: "center", gap: 10, boxShadow: "var(--card-shadow)" }}>
          <button onClick={playPrev} disabled={currentIndex === 0} aria-label="上一首" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, opacity: currentIndex === 0 ? 0.4 : 1 }}>⏮</button>
          <button onClick={togglePlay} aria-label={playing ? "暫停" : "播放"} style={{ background: "var(--accent)", border: "none", borderRadius: "50%", width: 30, height: 30, color: "var(--accent-text)", cursor: "pointer", fontSize: 14, flexShrink: 0 }}>{playing ? "⏸" : "▶"}</button>
          <button onClick={playNext} disabled={currentIndex === tracks.length - 1} aria-label="下一首" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, opacity: currentIndex === tracks.length - 1 ? 0.4 : 1 }}>⏭</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{currentTrack.text?.trim() || "（未命名音樂）"}</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
              <span style={{ fontSize: 10, color: "var(--text-faint)" }}>{formatAudioTime(current)}</span>
              <div style={{ flex: 1, height: 3, background: "var(--border)", borderRadius: 2 }}>
                <div style={{ width: duration ? `${(current / duration) * 100}%` : "0%", height: "100%", background: "var(--accent)", borderRadius: 2 }} />
              </div>
              <span style={{ fontSize: 10, color: "var(--text-faint)" }}>{formatAudioTime(duration)}</span>
            </div>
          </div>
          <button onClick={() => setRepeatOne(v => !v)} title="單曲循環" aria-pressed={repeatOne}
            style={{ background: repeatOne ? "var(--accent-active)" : "none", border: "1px solid var(--border)", borderRadius: "50%", width: 28, height: 28, color: repeatOne ? "var(--accent)" : "var(--text-faint)", cursor: "pointer", fontSize: 13, flexShrink: 0 }}>
            🔁
          </button>
        </div>
      )}
    </div>
  );
}

// 收藏分頁：影片收藏、音頻收藏都是真資料（收藏貼文裡分別帶 videoUrl／
// audioUrl 的），影片縮圖沿用 VideosTab 的 VideoThumb，音頻是上面那個
// AudioQueuePlayer（順序播放＋單曲循環）。
function FavoritesTab({ profile, isOwner, favoritePosts, favoritesLoaded, onOpen }) {
  const [saving, setSaving] = useState(false);
  const isPublic = profile.favoritesPublic !== false; // 沒設過欄位 = 預設公開

  const togglePublic = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "users", profile.uid), { favoritesPublic: !isPublic });
    } catch (e) {
      console.error("[FavoritesTab] toggle favoritesPublic failed", e);
      toast("設定失敗，請重試");
    } finally {
      setSaving(false);
    }
  };

  if (!isOwner && !isPublic) {
    return (
      <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-dim)" }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
        <div style={{ fontSize: 16 }}>這個收藏是不公開的</div>
      </div>
    );
  }

  const videoFavorites = favoritePosts.filter(p => p.videoUrl);
  const audioFavorites = favoritePosts.filter(p => p.audioUrl);

  return (
    <div style={{ padding: 16 }}>
      {isOwner && (
        <button onClick={togglePublic} disabled={saving}
          style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "6px 14px", color: "var(--text-muted)", cursor: "pointer", fontSize: 12 }}>
          {isPublic ? "🌐 收藏公開中" : "🔒 收藏不公開"}
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>{isPublic ? "設為不公開" : "設為公開"}</span>
        </button>
      )}

      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>影片收藏</div>
      {!favoritesLoaded ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-dim)", fontSize: 13 }}>載入中...</div>
      ) : videoFavorites.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-dim)", fontSize: 13 }}>還沒有收藏任何影片</div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
          {videoFavorites.map(post => (
            <VideoThumb key={post.id} post={post} onOpen={() => onOpen(post)} />
          ))}
        </div>
      )}

      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", margin: "24px 0 10px" }}>音頻收藏</div>
      {!favoritesLoaded ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-dim)", fontSize: 13 }}>載入中...</div>
      ) : audioFavorites.length === 0 ? (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-dim)", fontSize: 13 }}>還沒有收藏任何音樂</div>
      ) : (
        <AudioQueuePlayer tracks={audioFavorites} />
      )}
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

// Rich media viewer — unlike a bare image lightbox, this keeps the source
// post's author/time/text/like/comment context visible, and lets you step
// through the same user's other media (mediaList) without closing/reopening.
function MediaLightbox({ mediaList, index, profile, viewerUid, myProfile, isMobile, onClose, onIndexChange, onViewOriginal }) {
  const post = mediaList[index];
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [sendingComment, setSendingComment] = useState(false);
  const [likeBusy, setLikeBusy] = useState(false);
  // 一則貼文可能有多張圖——先在「這則貼文的圖片」之間左右切換，切到頭/尾了
  // 才換去上一則/下一則貼文（跟 index 是分開的兩層導覽）。
  const [imgIdx, setImgIdx] = useState(0);
  const images = !post?.videoUrl ? (post?.imageUrls?.length ? post.imageUrls : (post?.imageUrl ? [post.imageUrl] : [])) : [];

  useEffect(() => { setImgIdx(0); }, [post?.id]);

  useEffect(() => {
    if (!post) return;
    return onSnapshot(query(collection(db, "posts", post.id, "comments"), orderBy("createdAt")), snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => console.error("[ProfileView.MediaLightbox] comments listener failed", e));
  }, [post?.id]);

  const goPrev = () => {
    if (images.length > 1 && imgIdx > 0) { setImgIdx(i => i - 1); return; }
    if (index > 0) onIndexChange(index - 1);
  };
  const goNext = () => {
    if (images.length > 1 && imgIdx < images.length - 1) { setImgIdx(i => i + 1); return; }
    if (index < mediaList.length - 1) onIndexChange(index + 1);
  };
  const hasPrev = (images.length > 1 && imgIdx > 0) || index > 0;
  const hasNext = (images.length > 1 && imgIdx < images.length - 1) || index < mediaList.length - 1;

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, imgIdx, mediaList.length, images.length]);

  if (!post) {
    return (
      <div role="dialog" aria-modal="true" aria-label="貼文檢視" onClick={onClose}
        style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.85)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div onClick={e => e.stopPropagation()}
          style={{ background: "var(--panel)", borderRadius: 16, padding: 32, textAlign: "center", color: "var(--text-muted)" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🚫</div>
          這則貼文已無法顯示
          <div style={{ marginTop: 16 }}>
            <button onClick={onClose} style={{ background: "var(--accent)", border: "none", borderRadius: 20, padding: "8px 18px", color: "var(--accent-text)", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>關閉</button>
          </div>
        </div>
      </div>
    );
  }

  const liked = viewerUid ? (post.likes || []).includes(viewerUid) : false;

  const toggleLike = async () => {
    if (!viewerUid) { toast("請先登入後再按讚"); return; }
    if (likeBusy) return;
    setLikeBusy(true);
    try {
      await updateDoc(doc(db, "posts", post.id), { likes: liked ? arrayRemove(viewerUid) : arrayUnion(viewerUid) });
    } catch (e) {
      console.error("[ProfileView.MediaLightbox] toggleLike failed", e);
      toast("操作失敗，請重試");
    } finally {
      setLikeBusy(false);
    }
  };

  const submitComment = async () => {
    if (!viewerUid || !myProfile) { toast("請先登入後再留言"); return; }
    if (!commentText.trim() || sendingComment) return;
    setSendingComment(true);
    try {
      await addDoc(collection(db, "posts", post.id, "comments"), {
        userId: myProfile.uid,
        userNickname: myProfile.nickname,
        userAvatar: myProfile.avatar,
        userAvatarImage: myProfile.avatarImage || "",
        userColor: myProfile.color,
        text: commentText.trim(),
        createdAt: serverTimestamp(),
      });
      setCommentText("");
    } catch (e) {
      console.error("[ProfileView.MediaLightbox] submitComment failed", e);
      toast("留言失敗，請重試");
    } finally {
      setSendingComment(false);
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/profile/${profile.uid}?post=${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `${profile.nickname} 的貼文`, text: post.text?.slice(0, 80) || "", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast("連結已複製", "success");
      }
    } catch { /* 使用者取消分享 */ }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="貼文檢視" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 1000, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <div onClick={e => e.stopPropagation()}
        style={{
          display: "flex", flexDirection: isMobile ? "column" : "row",
          width: "100%", maxWidth: isMobile ? "none" : 1100,
          height: isMobile ? "100dvh" : "90vh", maxHeight: isMobile ? "100dvh" : "90vh",
          background: "#000", borderRadius: isMobile ? 0 : 12, overflow: "hidden",
        }}>

        {/* Media + prev/next — fixed proportion of the modal's own height
            (not the info column's content height), so a solid black media
            area never depends on how much text happens to be below it. */}
        <div style={{ position: "relative", flex: isMobile ? "0 0 62%" : "1 1 auto", height: isMobile ? undefined : "100%", background: "#000", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
          {post.videoUrl
            ? <VideoPlayer src={post.videoUrl} autoPlay subtitles={post.subtitles} />
            : images.length > 0 && <img src={images[imgIdx]} alt="貼文圖片" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" }} />
          }
          {images.length > 1 && (
            <div style={{ position: "absolute", top: 10, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 12, fontWeight: 600, padding: "3px 10px", borderRadius: 20 }}>
              {imgIdx + 1} / {images.length}
            </div>
          )}
          {hasPrev && (
            <button onClick={goPrev} aria-label="上一張"
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 18 }}>
              ‹
            </button>
          )}
          {hasNext && (
            <button onClick={goNext} aria-label="下一張"
              style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(0,0,0,0.5)", border: "none", color: "#fff", width: 36, height: 36, borderRadius: "50%", cursor: "pointer", fontSize: 18 }}>
              ›
            </button>
          )}
        </div>

        {/* Post info + interactions — on desktop this shares the row's fixed
            height with the media column; on mobile it's just "whatever's left"
            after the media area's fixed 62%, with its own internal scroll. */}
        <div style={{ width: isMobile ? "100%" : 360, flex: isMobile ? "1 1 0%" : "0 0 360px", height: isMobile ? undefined : "100%", minHeight: 0, background: "var(--panel)", display: "flex", flexDirection: "column" }}>
          {/* Fixed header — just the author row, always visible regardless of
              how long the post text below turns out to be. */}
          <div style={{ padding: 16, borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", gap: 10 }}>
            {profile.avatarImage
              ? <img src={profile.avatarImage} alt="頭像" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 36, height: 36, borderRadius: "50%", background: profile.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{profile.avatar}</div>
            }
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{profile.nickname}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{formatDate(post.createdAt)}</div>
            </div>
          </div>

          {/* Scrollable body — post text (can be arbitrarily long, e.g. an AI
              prompt) + actions + comments all share this one scroll region,
              so nothing here can ever push past the modal's fixed height. */}
          <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>
            {post.text && (
              <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                {post.text}
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginTop: 12 }}>
              <button onClick={toggleLike} disabled={likeBusy}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: liked ? "#ef4444" : "var(--text-faint)", fontSize: 13, fontWeight: 600, padding: 0 }}>
                <span style={{ fontSize: 17 }}>{liked ? "❤️" : "🤍"}</span> {(post.likes || []).length}
              </button>
              <span style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-faint)", fontSize: 13, fontWeight: 600 }}>
                <span style={{ fontSize: 17 }}>💬</span> {comments.length}
              </span>
              <button onClick={share}
                style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 13, fontWeight: 600, padding: 0 }}>
                <span style={{ fontSize: 17 }}>↗</span>
              </button>
            </div>
            <button onClick={() => onViewOriginal(post.id)}
              style={{ marginTop: 12, marginBottom: 16, width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 0", color: "var(--text)", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              查看原貼文
            </button>

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            {comments.map(c => (
              <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 10, alignItems: "flex-start" }}>
                {c.userAvatarImage
                  ? <img src={c.userAvatarImage} alt="頭像" style={{ width: 26, height: 26, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  : <div style={{ width: 26, height: 26, borderRadius: "50%", background: c.userColor || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>{c.userAvatar}</div>
                }
                <div style={{ background: "var(--panel-alt)", borderRadius: 10, padding: "6px 10px", flex: 1, minWidth: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: 12, color: "var(--text-muted)", marginRight: 6 }}>{c.userNickname}</span>
                  <span style={{ fontSize: 13, color: "var(--text)" }}>{c.text}</span>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <div style={{ fontSize: 13, color: "var(--text-dim)", textAlign: "center", padding: "20px 0" }}>還沒有留言</div>
            )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 6, padding: 12, borderTop: "1px solid var(--border)", flexShrink: 0 }}>
            <input
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitComment()}
              placeholder="留言..."
              style={{ flex: 1, minWidth: 0, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 20, padding: "7px 12px", color: "var(--text)", fontSize: 13, outline: "none" }}
            />
            <button onClick={submitComment} disabled={!commentText.trim() || sendingComment}
              style={{ background: commentText.trim() ? "var(--accent)" : "var(--panel-alt)", border: "none", borderRadius: 20, padding: "7px 16px", color: commentText.trim() ? "var(--accent-text)" : "var(--text-dim)", cursor: commentText.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600, flexShrink: 0 }}>
              送出
            </button>
          </div>
        </div>
      </div>

      <button onClick={onClose} aria-label="關閉貼文檢視"
        style={{ position: "absolute", top: 16, right: 16, background: "rgba(30,41,59,0.9)", border: "1px solid var(--border)", color: "#f1f5f9", fontSize: 20, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
        ✕
      </button>
    </div>
  );
}

// Shared full profile UI — used both by pages/profile/[uid].js (standalone
// page, direct/shareable link) and embedded inline inside ChatRoom's Feed
// pane (see ChatRoom.js's viewProfileUid state) so clicking a post author
// never leaves the chat SPA. `embedded`/`onClose` only affect page chrome
// (header back-vs-close button, root sizing, global CSS resets, bottom tab
// bar) — every Firebase query/write below is identical either way.
export default function ProfileView({ uid, embedded = false, onClose, onOpenProfile, initialTab = "posts" }) {
  const router = useRouter();
  const [viewerUid, setViewerUid] = useState(undefined); // undefined = auth not resolved yet, null = guest
  const [viewerProfile, setViewerProfile] = useState(null);
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [favoritePosts, setFavoritePosts] = useState([]);
  const [favoritesLoaded, setFavoritesLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [tab, setTab] = useState(initialTab);
  const [avatarZoomImg, setAvatarZoomImg] = useState(null);
  const [mediaLightboxIndex, setMediaLightboxIndex] = useState(null);
  // 從「影片」分頁打開時，prev/next 只在影片之間切換（不會混到圖片貼文）；
  // 從「媒體」分頁打開時維持原本圖片+影片混在一起切換。
  const [lightboxList, setLightboxList] = useState(null);
  const [scrollToPostId, setScrollToPostId] = useState(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const [hoveredMedia, setHoveredMedia] = useState(null);
  const [stickersPanelOpen, setStickersPanelOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [cropTarget, setCropTarget] = useState(null); // "avatar" | "cover" | null
  const [pendingFile, setPendingFile] = useState(null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  // Starts at the same default the getter falls back to, then corrected from
  // localStorage client-side only — reading localStorage during the initial
  // render would mismatch what the statically-generated HTML shipped with.
  const [notifVolume, setNotifVolumeState] = useState(70);
  useEffect(() => { setNotifVolumeState(getNotificationVolume()); }, []);
  const changeNotifVolume = (v) => { setNotifVolumeState(v); setNotificationVolume(v); };
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
      console.error("[ProfileView] failed to load profile", e);
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
    } catch (e) { console.error("[ProfileView] failed to load posts", e); }
  }, [uid]);

  useEffect(() => { if (uid) reloadPosts(); }, [uid, reloadPosts]);

  // 收藏分頁：抓的不是「這個人發的貼文」（posts 那份查詢是這樣），是「這個人
  // 收藏過的貼文」——不限發文者是誰，靠 posts.bookmarks array-contains 這個
  // uid 查。公開/不公開只影響「非本人能不能看到這個分頁的內容」，資料本身
  // 一律都抓（isOwner 分頁一定要看得到自己收藏了什麼）。
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDocs(query(collection(db, "posts"), where("bookmarks", "array-contains", uid)));
        if (cancelled) return;
        const sorted = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => {
            const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
            const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
            return tb - ta;
          });
        setFavoritePosts(sorted);
      } catch (e) {
        console.error("[ProfileView] failed to load favorite posts", e);
      } finally {
        if (!cancelled) setFavoritesLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") { setAvatarZoomImg(null); setMediaLightboxIndex(null); } }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // 「查看原貼文」／分享連結（?post=<id>）都指到貼文 tab 裡對應那則貼文的位置。
  // 只在獨立頁面（非 embedded）才看 URL query，避免嵌入模式誤讀聊天室自己的網址參數。
  useEffect(() => {
    if (embedded || tab !== "posts" || !scrollToPostId) return;
    const id = scrollToPostId;
    const t = setTimeout(() => {
      document.getElementById(`post-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setScrollToPostId(null);
    }, 50);
    return () => clearTimeout(t);
  }, [embedded, tab, scrollToPostId, posts]);

  useEffect(() => {
    if (embedded || !router.isReady) return;
    const postId = router.query.post;
    if (typeof postId === "string" && postId && posts.some(p => p.id === postId)) {
      setTab("posts");
      setScrollToPostId(postId);
    }
  }, [embedded, router.isReady, router.query.post, posts]);

  const viewOriginalPost = useCallback((postId) => {
    setMediaLightboxIndex(null);
    setTab("posts");
    setScrollToPostId(postId);
  }, []);

  const togglePin = useCallback(async (post) => {
    try {
      await updateDoc(doc(db, "posts", post.id), { pinned: !post.pinned });
      setPosts(prev => prev.map(p => p.id === post.id ? { ...p, pinned: !p.pinned } : p));
    } catch (e) {
      console.error("[ProfileView] togglePin failed", e);
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
      console.error("[ProfileView] sendFriendRequest failed", e);
      toast("送出失敗，請重試");
    }
  };

  // 訂閱：跟「好友」是兩件事——好友是雙向、用來聊天，訂閱是單向、只是想追蹤這個人
  // 之後發的貼文/影片，YouTube 頻道那種訂閱概念，所以獨立存在 users/{uid}.subscribers。
  const isSubscribed = !!(viewerUid && (profile?.subscribers || []).includes(viewerUid));
  const toggleSubscribe = async () => {
    if (!viewerUid || !profile) { toast("請先登入後再訂閱"); return; }
    try {
      await updateDoc(doc(db, "users", profile.uid), {
        subscribers: isSubscribed ? arrayRemove(viewerUid) : arrayUnion(viewerUid),
      });
    } catch (e) {
      console.error("[ProfileView] toggleSubscribe failed", e);
      toast("操作失敗，請重試");
    }
  };

  const acceptFriendRequest = async () => {
    if (!viewerUid || !profile) return;
    try {
      await updateDoc(doc(db, "users", viewerUid), { friends: arrayUnion(profile.uid), pendingIn: arrayRemove(profile.uid) });
      await updateDoc(doc(db, "users", profile.uid), { friends: arrayUnion(viewerUid), pendingOut: arrayRemove(viewerUid) });
      toast("已成為好友", "success");
    } catch (e) {
      console.error("[ProfileView] acceptFriendRequest failed", e);
      toast("操作失敗，請重試");
    }
  };

  const reportUser = async () => {
    if (!viewerUid || !profile) return;
    try {
      await addDoc(collection(db, "reports"), { reporterUid: viewerUid, targetUid: profile.uid, createdAt: serverTimestamp() });
      toast("已送出檢舉，我們會盡快處理", "success");
    } catch (e) {
      console.error("[ProfileView] reportUser failed", e);
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
      console.error("[ProfileView] blockUser failed", e);
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
      console.error("[ProfileView] unblockUser failed", e);
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
      console.error("[ProfileView] confirmCrop upload failed", e);
      toast("上傳失敗，請重試");
    } finally {
      setCropTarget(null);
      setPendingFile(null);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };

  if (loading) {
    return <LoadingState label="載入中..." minHeight={embedded ? "100%" : undefined} />;
  }

  if (loadError && !profile) {
    return (
      <LoadingState
        error="無法載入此用戶，請檢查網路連線"
        onRetry={() => window.location.reload()}
        minHeight={embedded ? "100%" : undefined}
      />
    );
  }

  if (!profile) {
    return (
      <main style={{ minHeight: embedded ? "100%" : "100vh", background: "var(--panel-alt)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div aria-hidden="true" style={{ fontSize: 48 }}>😶</div>
        <div style={{ color: "var(--text-muted)", fontSize: 18 }}>找不到此用戶</div>
        {embedded
          ? <button onClick={onClose} style={{ color: "var(--accent)", background: "none", border: "none", cursor: "pointer", fontSize: 14 }}>← 返回動態消息</button>
          : <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14 }}>← 返回聊天室</Link>
        }
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
  const videoPosts = visiblePosts.filter(p => p.videoUrl);
  const totalLikes = visiblePosts.reduce((sum, p) => sum + (p.likes || []).length, 0);

  const openMediaFor = (post, list = mediaPosts) => {
    const idx = list.findIndex(p => p.id === post.id);
    if (idx >= 0) { setLightboxList(list); setMediaLightboxIndex(idx); }
  };

  return (
    <>
      {embedded ? (
        // Scoped to .pv-embedded only — this component can be mounted
        // alongside ChatRoom's own shell, so unlike the standalone page it
        // must never touch bare `*`/`body`/`input` selectors globally.
        <style>{`
          .pv-embedded, .pv-embedded *, .pv-embedded *::before, .pv-embedded *::after { box-sizing: border-box; }
          .pv-embedded ::-webkit-scrollbar { width: 4px; }
          .pv-embedded ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
          .pv-embedded .pp-stat-clickable { cursor: pointer; }
          .pv-embedded .pp-stat-clickable:hover { background: var(--panel-hover); }
          @media (max-width: 767px) {
            .pv-embedded input, .pv-embedded textarea, .pv-embedded select { font-size: 16px !important; }
            .pv-embedded .pp-banner { height: 140px !important; }
            .pv-embedded .pp-avatar { width: 84px !important; height: 84px !important; }
            .pv-embedded .pp-avatar-row { margin-top: -42px !important; }
          }
        `}</style>
      ) : (
        <style>{`
          *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
          body { background: var(--panel-alt); }
          ::-webkit-scrollbar { width: 4px; }
          ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

          .pp-stat-clickable { cursor: pointer; }
          .pp-stat-clickable:hover { background: var(--panel-hover); }

          @media (max-width: 767px) {
            /* Prevent iOS Safari auto-zoom on input focus (needs >=16px) */
            input, textarea, select { font-size: 16px !important; }

            .pp-banner { height: 140px !important; }
            .pp-avatar { width: 84px !important; height: 84px !important; }
            .pp-avatar-row { margin-top: -42px !important; }
            .pp-root { padding-bottom: calc(var(--mobile-tabbar-h) + env(safe-area-inset-bottom)); }
          }
        `}</style>
      )}

      {/* Avatar zoom (no post context — just the profile picture itself) */}
      {avatarZoomImg && (
        <div role="dialog" aria-modal="true" aria-label="圖片檢視" onClick={() => setAvatarZoomImg(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={avatarZoomImg} alt="放大檢視的圖片" onClick={e => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, objectFit: "contain", cursor: "default", boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }} />
          <button onClick={() => setAvatarZoomImg(null)} aria-label="關閉圖片檢視"
            style={{ position: "absolute", top: 20, right: 20, background: "rgba(30,41,59,0.9)", border: "1px solid var(--border)", color: "#f1f5f9", fontSize: 20, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>
      )}

      {/* Media lightbox — keeps the source post's author/text/likes/comments visible */}
      {mediaLightboxIndex != null && (
        <MediaLightbox
          mediaList={lightboxList || mediaPosts}
          index={mediaLightboxIndex}
          profile={profile}
          viewerUid={viewerUid}
          myProfile={myProfile}
          isMobile={isMobile}
          onClose={() => setMediaLightboxIndex(null)}
          onIndexChange={setMediaLightboxIndex}
          onViewOriginal={viewOriginalPost}
        />
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

      <div className={embedded ? "pp-root pv-embedded" : "pp-root"} style={{ minHeight: embedded ? "100%" : "100vh", background: "var(--panel-alt)", color: "var(--text)", fontFamily: "var(--font-body)", boxSizing: "border-box" }}>

        {/* Sticky top bar — 左邊是返回鍵，embedded 時右上角另外放一顆明確的
            關閉按鈕（✕），兩顆都會回到動態消息，不會真的離開這個 SPA。 */}
        <header style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(15,23,42,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", gap: 16, padding: "0 16px", height: 52 }}>
          {embedded ? (
            <button onClick={onClose} aria-label="返回動態消息" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", color: "var(--text)", border: "none", background: "transparent", cursor: "pointer", fontSize: 18, transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--panel)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              ←
            </button>
          ) : (
            <Link href="/" aria-label="返回聊天室" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", color: "var(--text)", textDecoration: "none", fontSize: 18, background: "transparent", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--panel)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              ←
            </Link>
          )}
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{profile.nickname}</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{visiblePosts.length} 則貼文</div>
          </div>

          <div style={{ flex: 1 }} />

          {embedded && (
            <button onClick={onClose} aria-label="關閉個人頁面"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: "50%", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.16)", color: "#f1f5f9", cursor: "pointer", fontSize: 15, flexShrink: 0 }}
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.16)"}
              onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}>
              ✕
            </button>
          )}

          {/* Quick account menu — this is the logged-in viewer's own
              settings (e.g. notification sound volume), not something about
              whichever profile happens to be open, so it uses myProfile and
              shows regardless of isOwner. */}
          {myProfile && (
            <div style={{ position: "relative" }}>
              <button onClick={() => setAccountMenuOpen(v => !v)} aria-label="帳號選項" aria-expanded={accountMenuOpen}
                style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 20 }}>
                {myProfile.avatarImage
                  ? <img src={myProfile.avatarImage} alt="我的頭像" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} />
                  : <div style={{ width: 28, height: 28, borderRadius: "50%", background: myProfile.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{myProfile.avatar || "😊"}</div>
                }
                <span style={{ color: "#f1f5f9", fontSize: 10 }}>▾</span>
              </button>
              {accountMenuOpen && (
                <>
                  <div onClick={() => setAccountMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 90 }} />
                  <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 8, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 91, minWidth: 220, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>快速設定</div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: "var(--text)", marginBottom: 6 }}>
                      <span>🔊 新訊息音量</span>
                      <span style={{ color: "var(--text-faint)" }}>{notifVolume}%</span>
                    </div>
                    <input type="range" min={0} max={100} value={notifVolume}
                      onChange={e => changeNotifVolume(Number(e.target.value))}
                      style={{ width: "100%" }} aria-label="新訊息通知音量" />
                    <button onClick={() => playNotificationSound()}
                      style={{ marginTop: 10, width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 0", color: "var(--text)", fontSize: 12, cursor: "pointer" }}>
                      🔔 測試音效
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </header>

        <main>
        {/* Banner */}
        <div className="pp-banner" style={{ height: 200, position: "relative", overflow: "hidden", ...bannerStyle }}>
          {/* Star-field texture — only over the default/custom-color gradient;
              a real cover photo shouldn't get a scattering of fake stars
              drawn on top of it. */}
          {profile.profileBgType !== "image" && (
            <div aria-hidden="true" style={{
              position: "absolute", inset: 0, pointerEvents: "none", opacity: 0.6,
              backgroundImage: [
                "radial-gradient(1.5px 1.5px at 8% 22%, #fff, transparent)",
                "radial-gradient(1px 1px at 22% 65%, #fff, transparent)",
                "radial-gradient(2px 2px at 38% 12%, #fff, transparent)",
                "radial-gradient(1px 1px at 52% 48%, #fff, transparent)",
                "radial-gradient(1.5px 1.5px at 64% 75%, #fff, transparent)",
                "radial-gradient(1px 1px at 76% 20%, #fff, transparent)",
                "radial-gradient(2px 2px at 90% 55%, #fff, transparent)",
                "radial-gradient(1px 1px at 14% 85%, #fff, transparent)",
                "radial-gradient(1.5px 1.5px at 46% 88%, #fff, transparent)",
                "radial-gradient(1px 1px at 82% 8%, #fff, transparent)",
                "radial-gradient(1px 1px at 96% 80%, #fff, transparent)",
                "radial-gradient(1.5px 1.5px at 30% 35%, #fff, transparent)",
              ].join(","),
              backgroundSize: "100% 100%",
            }} />
          )}
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
              onClick={() => !isOwner && profile.avatarImage && setAvatarZoomImg(profile.avatarImage)}
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
                  👤 編輯個人資料
                </Link>
                <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "3px 10px", display: "flex", alignItems: "center" }}>
                  <ThemeToggle mode="inline" openUp />
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginLeft: 2 }}>設定</span>
                </div>
                <button onClick={() => setStickersPanelOpen(true)}
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "7px 16px", color: "var(--text)", fontSize: 14, fontWeight: 700, cursor: "pointer" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
                  onMouseLeave={e => e.currentTarget.style.background = "var(--panel)"}>
                  🖼️ 我的貼圖包
                </button>
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
                    style={{ background: "var(--accent)", border: "none", borderRadius: 20, padding: "8px 16px", color: "var(--accent-text)", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                    ✅ 接受好友邀請
                  </button>
                )}
                <button onClick={toggleSubscribe}
                  style={{
                    background: isSubscribed ? "var(--panel)" : "var(--accent)",
                    border: isSubscribed ? "1px solid var(--border)" : "none",
                    borderRadius: 20, padding: "8px 16px",
                    color: isSubscribed ? "var(--text-muted)" : "var(--accent-text)",
                    cursor: "pointer", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", gap: 6,
                  }}>
                  {isSubscribed ? "🔔 已訂閱" : "🔔 訂閱"}
                  {(profile.subscribers || []).length > 0 && (
                    <span style={{ opacity: 0.75, fontWeight: 600 }}>{(profile.subscribers || []).length}</span>
                  )}
                </button>
                <button onClick={() => toast("社群功能即將推出")}
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "8px 16px", color: "var(--text)", cursor: "pointer", fontSize: 14, fontWeight: 700 }}>
                  🤝 加入社群
                </button>
                <Link href={`/?chat=${uid}`} style={{ background: "var(--accent)", border: "none", borderRadius: 20, padding: "8px 18px", color: "var(--accent-text)", textDecoration: "none", fontSize: 14, fontWeight: 700, transition: "background 0.15s", display: "inline-block" }}
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
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", lineHeight: 1.2 }}>{profile.nickname}</h1>
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

          {(profile.learningLanguages || []).some(l => LANGUAGE_BADGES[l]) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
              {(profile.learningLanguages || []).map(lang => {
                const badge = LANGUAGE_BADGES[lang];
                if (!badge) return null;
                return (
                  <span key={lang} style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "var(--accent-active)", border: "1px solid var(--accent-border, var(--border))", borderRadius: 20, padding: "4px 12px 4px 4px", fontSize: 12, fontWeight: 700, color: "var(--text)" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 20, height: 20, borderRadius: "50%", background: "var(--accent)", color: "var(--accent-text)", fontSize: 9, fontWeight: 800 }}>{badge.code}</span>
                    {badge.label}
                  </span>
                );
              })}
            </div>
          )}

          <AchievementsRow profile={profile} posts={posts} />

          {profile.bio && (
            <div style={{ fontSize: 15, color: "var(--text-subtle)", marginBottom: 12, lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{profile.bio}</div>
          )}

          {profile.statusText && (
            <div style={{ marginBottom: 12 }}>
              <span style={{ fontSize: 13, color: "var(--text-faint)", display: "flex", alignItems: "center", gap: 4 }}>💬 {profile.statusText}</span>
            </div>
          )}

          {/* Stat card — joined-date + friend/post/like counts share one row
              instead of a plain text line, matching the rest of the app's
              bordered-card visual language (var(--card-shadow) etc). */}
          <div style={{ display: "flex", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--panel)", boxShadow: "var(--card-shadow)", marginBottom: 16, overflow: "hidden" }}>
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, padding: "12px 10px", borderRight: "1px solid var(--border)" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true">📅</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>加入於</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{profile.createdAt ? formatJoinDate(profile.createdAt) : "—"}</div>
              </div>
            </div>
            <div className="pp-stat-clickable" onClick={() => setTab("videos")} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, padding: "12px 10px", borderRight: "1px solid var(--border)" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true">🎬</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{videoPosts.length}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>影片</div>
              </div>
            </div>
            <div className="pp-stat-clickable" onClick={() => setTab("posts")} style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, padding: "12px 10px", borderRight: "1px solid var(--border)" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true">📄</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{visiblePosts.length}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>貼文</div>
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, padding: "12px 10px" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }} aria-hidden="true">♡</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 800, color: "var(--text)" }}>{totalLikes}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>獲讚總數</div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--panel)" }}>
            {[
              ["posts", "貼文"],
              ["media", `媒體${mediaPosts.length > 0 ? ` (${mediaPosts.length})` : ""}`],
              ["videos", `影片${videoPosts.length > 0 ? ` (${videoPosts.length})` : ""}`],
              ["favorites", "收藏"],
              ["about", "關於"],
            ].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ flex: 1, padding: "14px 0", background: "none", border: "none", borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent", color: tab === key ? "var(--text)" : "var(--text-faint)", fontSize: 14, fontWeight: tab === key ? 700 : 500, cursor: "pointer", transition: "color 0.15s" }}>
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
              {orderedPosts.filter(p => p.text || p.imageUrl || p.videoUrl || p.audioUrl).map(post => (
                <PostItem key={post.id} post={post} profile={profile} isOwner={isOwner} onTogglePin={togglePin} onOpenMedia={openMediaFor} />
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
                    onClick={() => openMediaFor(post)}
                    onMouseEnter={() => setHoveredMedia(post.id)}
                    onMouseLeave={() => setHoveredMedia(null)}
                    style={{ aspectRatio: "1", overflow: "hidden", background: "var(--panel)", cursor: "zoom-in", position: "relative" }}>
                    {post.videoUrl
                      ? <video src={post.videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <img src={post.imageUrl} alt="媒體" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 0.2s", transform: hoveredMedia === post.id ? "scale(1.06)" : "scale(1)" }} />
                    }
                    {post.imageUrls?.length > 1 && (
                      <div title={`${post.imageUrls.length} 張圖片`} style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 11, fontWeight: 700, padding: "1px 6px", borderRadius: 10 }}>
                        🖼️ {post.imageUrls.length}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
          {tab === "videos" && (
            <VideosTab videoPosts={videoPosts} isMobile={isMobile} onOpen={post => openMediaFor(post, videoPosts)} />
          )}
          {tab === "favorites" && (
            <FavoritesTab
              profile={profile} isOwner={isOwner} favoritePosts={favoritePosts} favoritesLoaded={favoritesLoaded}
              onOpen={post => openMediaFor(post, favoritePosts.filter(p => p.videoUrl || p.imageUrl))}
            />
          )}
          {tab === "about" && (
            <AboutTab profile={profile} isOwner={isOwner} />
          )}
        </div>
        </main>
      </div>
      {!embedded && <MobileTabBarLayout activeTab={isOwner ? "me" : undefined} />}
    </>
  );
}
