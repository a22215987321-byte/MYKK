import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { auth, db } from "../lib/firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  doc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp,
} from "firebase/firestore";
import Link from "next/link";
import MobileTabBarLayout from "./MobileTabBarLayout";
import ThemeToggle from "./ThemeToggle";
import LoadingState from "./LoadingState";
import { uploadToR2 } from "../lib/uploadToR2";
import { formatDate, formatFullDate } from "../lib/format";
import { toast } from "../lib/toast";

const HASHTAG_RE = /#[\p{L}\p{N}_]+/gu;
function extractHashtags(text) {
  if (!text) return [];
  return [...new Set((text.match(HASHTAG_RE) || []))];
}

// 輕量 markdown：只處理 **粗體**、# 標籤高亮、## / ### 標題、- 清單，
// 不引入額外套件，滿足「AI 貼文不要顯示醜陋 ** 符號」的需求就好。
function renderInline(str, keyPrefix) {
  const parts = [];
  const re = /(\*\*[^*]+\*\*|#[\p{L}\p{N}_]+)/gu;
  let last = 0, m, i = 0;
  while ((m = re.exec(str))) {
    if (m.index > last) parts.push(str.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**")) {
      parts.push(<strong key={`${keyPrefix}-b${i++}`}>{token.slice(2, -2)}</strong>);
    } else {
      parts.push(<span key={`${keyPrefix}-h${i++}`} style={{ color: "var(--accent)", fontWeight: 600 }}>{token}</span>);
    }
    last = re.lastIndex;
  }
  if (last < str.length) parts.push(str.slice(last));
  return parts;
}

function renderMarkdownLite(text) {
  if (!text) return null;
  const lines = text.split("\n");
  const blocks = [];
  let list = null;
  const flushList = (key) => {
    if (list) { blocks.push(<ul key={`ul-${key}`} style={{ margin: "4px 0 8px", paddingLeft: 20 }}>{list}</ul>); list = null; }
  };
  lines.forEach((line, i) => {
    const t = line.trim();
    if (/^###\s+/.test(t)) {
      flushList(i);
      blocks.push(<h4 key={i} style={{ fontSize: 15, fontWeight: 800, margin: "10px 0 4px", color: "var(--text)" }}>{renderInline(t.replace(/^###\s+/, ""), i)}</h4>);
    } else if (/^##\s+/.test(t)) {
      flushList(i);
      blocks.push(<h3 key={i} style={{ fontSize: 16, fontWeight: 800, margin: "12px 0 6px", color: "var(--text)" }}>{renderInline(t.replace(/^##\s+/, ""), i)}</h3>);
    } else if (/^[-*]\s+/.test(t)) {
      if (!list) list = [];
      list.push(<li key={i} style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text)" }}>{renderInline(t.replace(/^[-*]\s+/, ""), i)}</li>);
    } else if (t === "") {
      flushList(i);
      blocks.push(<div key={i} style={{ height: 6 }} />);
    } else {
      flushList(i);
      blocks.push(<p key={i} style={{ margin: "2px 0", fontSize: 15, lineHeight: 1.6, color: "var(--text)" }}>{renderInline(line, i)}</p>);
    }
  });
  flushList("end");
  return blocks;
}

// One line-icon set shared by the desktop rail and post actions, so
// functional icons read as one consistent style instead of mixed emoji.
const ICON_PATHS = {
  back: <path d="M15 18l-6-6 6-6" />,
  hash: <>
    <line x1="4" y1="9" x2="20" y2="9" />
    <line x1="4" y1="15" x2="20" y2="15" />
    <line x1="10" y1="3" x2="8" y2="21" />
    <line x1="16" y1="3" x2="14" y2="21" />
  </>,
  feed: <>
    <rect x="4" y="4" width="16" height="16" rx="3" />
    <line x1="8" y1="9" x2="16" y2="9" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="12" y2="17" />
  </>,
  send: <>
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </>,
  search: <>
    <circle cx="11" cy="11" r="7" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </>,
};
function Icon({ name, size = 18, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, ...style }} aria-hidden="true">
      {ICON_PATHS[name]}
    </svg>
  );
}

function Avatar({ avatar, avatarImage, color, size = 40 }) {
  if (avatarImage) {
    return <img src={avatarImage} alt="頭像" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block" }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: color || "var(--accent)",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.5, flexShrink: 0,
    }}>
      {avatar}
    </div>
  );
}

function CommentSection({ postId, myProfile }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "posts", postId, "comments"), orderBy("createdAt"));
    return onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [postId]);

  const submit = useCallback(async () => {
    if (!text.trim() || sending) return;
    setSending(true);
    try {
      await addDoc(collection(db, "posts", postId, "comments"), {
        userId: myProfile.uid,
        userNickname: myProfile.nickname,
        userAvatar: myProfile.avatar,
        userAvatarImage: myProfile.avatarImage || "",
        userColor: myProfile.color,
        text: text.trim(),
        createdAt: serverTimestamp(),
      });
      setText("");
    } finally {
      setSending(false);
    }
  }, [text, sending, postId, myProfile]);

  return (
    <div style={{ marginTop: 12, borderTop: "1px solid var(--panel)", paddingTop: 12 }}>
      {comments.map(c => (
        <div key={c.id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
          <Avatar avatar={c.userAvatar} avatarImage={c.userAvatarImage} color={c.userColor} size={28} />
          <div style={{ background: "var(--panel-alt)", borderRadius: 10, padding: "6px 10px", flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: "var(--text-muted)", marginRight: 6 }}>{c.userNickname}</span>
            <span style={{ fontSize: 13, color: "var(--text)" }}>{c.text}</span>
            <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }} title={formatFullDate(c.createdAt)}>{formatDate(c.createdAt)}</div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <Avatar avatar={myProfile.avatar} avatarImage={myProfile.avatarImage} color={myProfile.color} size={28} />
        <div style={{ flex: 1, display: "flex", gap: 6 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="留言..."
            style={{ flex: 1, minWidth: 0, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 20, padding: "6px 12px", color: "var(--text)", fontSize: 13, outline: "none" }}
          />
          <button
            onClick={submit}
            disabled={!text.trim() || sending}
            style={{ background: text.trim() ? "var(--accent)" : "var(--panel)", border: "none", borderRadius: 20, padding: "6px 14px", color: text.trim() ? "#fff" : "var(--text-dim)", cursor: text.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600, flexShrink: 0 }}
          >
            送出
          </button>
        </div>
      </div>
    </div>
  );
}

const LONG_POST_THRESHOLD = 260;

function PostCard({ post, myUid, myProfile }) {
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const liked = (post.likes || []).includes(myUid);
  const bookmarked = (post.bookmarks || []).includes(myUid);
  const isMine = post.userId === myUid;
  const tags = useMemo(() => extractHashtags(post.text), [post.text]);
  const isLong = (post.text || "").length > LONG_POST_THRESHOLD;

  useEffect(() => {
    const q = collection(db, "posts", post.id, "comments");
    return onSnapshot(q, snap => setCommentCount(snap.size));
  }, [post.id]);

  const toggleLike = async () => {
    const ref = doc(db, "posts", post.id);
    try {
      await updateDoc(ref, { likes: liked ? arrayRemove(myUid) : arrayUnion(myUid) });
    } catch (err) {
      console.error("[Feed.PostCard] toggleLike failed", { code: err?.code, message: err?.message, postId: post.id });
    }
  };

  const toggleBookmark = async () => {
    const ref = doc(db, "posts", post.id);
    try {
      await updateDoc(ref, { bookmarks: bookmarked ? arrayRemove(myUid) : arrayUnion(myUid) });
    } catch (err) {
      console.error("[Feed.PostCard] toggleBookmark failed", { code: err?.code, message: err?.message, postId: post.id });
    }
  };

  const share = async () => {
    const url = `${window.location.origin}/feed#${post.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "EVONCHAT 動態", text: post.text?.slice(0, 80) || "", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast("連結已複製", "success");
      }
    } catch { /* 使用者取消分享，不用處理 */ }
  };

  const handleDelete = async () => {
    if (!window.confirm("確定要刪除這篇貼文嗎？")) return;
    try {
      await deleteDoc(doc(db, "posts", post.id));
    } catch (err) {
      console.error("[Feed.PostCard] delete failed", { code: err?.code, message: err?.message, postId: post.id });
      toast("刪除失敗，請重試");
    }
    setMenuOpen(false);
  };

  return (
    <div style={{ background: "var(--panel)", borderRadius: 16, border: "1px solid var(--border)", boxShadow: "var(--card-shadow)", marginBottom: 16, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", position: "relative" }}>
        <Avatar avatar={post.userAvatar} avatarImage={post.userAvatarImage} color={post.userColor} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{post.userNickname}</div>
          <div style={{ fontSize: 11, color: "var(--text-muted)" }} title={formatFullDate(post.createdAt)}>{formatDate(post.createdAt)}</div>
        </div>
        {isMine && (
          <div style={{ position: "relative" }}>
            <button onClick={() => setMenuOpen(v => !v)}
              style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18, padding: 6 }}>
              ⋯
            </button>
            {menuOpen && (
              <>
                <div onClick={() => setMenuOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 60 }} />
                <div style={{ position: "absolute", top: "100%", right: 0, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.3)", zIndex: 61, minWidth: 120, overflow: "hidden" }}>
                  <button onClick={handleDelete} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "10px 14px", color: "#ef4444", cursor: "pointer", fontSize: 13 }}>
                    🗑️ 刪除貼文
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Tags */}
      {tags.length > 0 && (
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: "0 16px 8px" }}>
          {tags.map(tag => (
            <span key={tag} style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", background: "var(--accent-active)", borderRadius: 20, padding: "2px 10px" }}>{tag}</span>
          ))}
        </div>
      )}

      {/* Text */}
      {post.text && (
        <div style={{ padding: "0 16px 12px", wordBreak: "break-word" }}>
          {isLong && !expanded ? (
            <div style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {post.text.slice(0, LONG_POST_THRESHOLD)}…{" "}
              <button onClick={() => setExpanded(true)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, fontWeight: 700, padding: 0 }}>
                展開全文
              </button>
            </div>
          ) : (
            <>
              {renderMarkdownLite(post.text)}
              {isLong && (
                <button onClick={() => setExpanded(false)} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 12, padding: 0, marginTop: 4 }}>
                  收合
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Image */}
      {post.imageUrl && (
        <div className="feed-media" style={{ width: "100%", maxHeight: 480, overflow: "hidden", background: "var(--panel-alt)" }}>
          <img src={post.imageUrl} alt="貼文圖片" style={{ width: "100%", maxHeight: 480, objectFit: "contain", display: "block" }} />
        </div>
      )}

      {/* Video */}
      {post.videoUrl && (
        <div className="feed-media" style={{ width: "100%", background: "#000" }}>
          <video
            src={post.videoUrl}
            controls
            style={{ width: "100%", maxHeight: 480, display: "block" }}
          />
        </div>
      )}

      {/* Actions */}
      <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 18, borderTop: "1px solid var(--panel)" }}>
        <button onClick={toggleLike} className="feed-action-btn"
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: liked ? "#ef4444" : "var(--text-faint)", fontSize: 14, fontWeight: 600, padding: 0 }}>
          <span style={{ fontSize: 18 }}>{liked ? "❤️" : "🤍"}</span>
          <span>{(post.likes || []).length}</span>
        </button>
        <button onClick={() => setShowComments(v => !v)} className="feed-action-btn"
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 14, fontWeight: 600, padding: 0 }}>
          <span style={{ fontSize: 18 }}>💬</span>
          <span>{commentCount}</span>
        </button>
        <button onClick={share} className="feed-action-btn"
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 14, fontWeight: 600, padding: 0 }}>
          <Icon name="send" size={17} />
        </button>
        <button onClick={toggleBookmark} className="feed-action-btn"
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: bookmarked ? "var(--accent)" : "var(--text-faint)", fontSize: 14, fontWeight: 600, padding: 0, marginLeft: "auto" }}>
          <span style={{ fontSize: 18 }}>{bookmarked ? "🔖" : "📑"}</span>
        </button>
      </div>

      {/* Comments */}
      {showComments && (
        <div style={{ padding: "0 16px 14px" }}>
          <CommentSection postId={post.id} myProfile={myProfile} />
        </div>
      )}
    </div>
  );
}

const QUICK_TOPICS = ["今日學到", "西語問題", "法語發音", "IELTS 練習", "生活分享"];

function NewPostForm({ myProfile, onPosted }) {
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaType, setMediaType] = useState(null);
  const [preview, setPreview] = useState(null);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef();
  const textareaRef = useRef();

  const onFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMediaFile(file);
    setMediaType(file.type.startsWith("video/") ? "video" : "image");
    setPreview(URL.createObjectURL(file));
    setExpanded(true);
  };

  const removeMedia = () => {
    setMediaFile(null);
    setMediaType(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const insertTopic = (topic) => {
    const tag = `#${topic} `;
    setText(v => (v.startsWith(tag) ? v : tag + v));
    setExpanded(true);
    textareaRef.current?.focus();
  };

  const submit = async () => {
    if (!text.trim() && !mediaFile) { toast("請輸入內容"); return; }
    if (!auth.currentUser || !myProfile?.uid) {
      console.error("[Feed.NewPostForm] submit blocked: no authenticated user", { authCurrentUser: auth.currentUser, myProfile });
      toast("請先登入後再發布");
      return;
    }
    setPosting(true);
    const payload = {
      userId: myProfile.uid,
      userNickname: myProfile.nickname,
      userAvatar: myProfile.avatar,
      userAvatarImage: myProfile.avatarImage || "",
      userColor: myProfile.color,
      text: text.trim(),
      imageUrl: null,
      videoUrl: null,
      likes: [],
      bookmarks: [],
      createdAt: serverTimestamp(),
    };
    try {
      if (mediaFile) {
        console.log("[Feed.NewPostForm] uploading media", { name: mediaFile.name, type: mediaFile.type, size: mediaFile.size });
        const url = await uploadToR2(mediaFile);
        if (mediaType === "video") payload.videoUrl = url;
        else payload.imageUrl = url;
      }
      console.log("[Feed.NewPostForm] submitting post", {
        uid: auth.currentUser.uid, hasImage: !!payload.imageUrl, hasVideo: !!payload.videoUrl,
        textLength: payload.text.length, payload,
      });
      const ref = await addDoc(collection(db, "posts"), payload);
      console.log("[Feed.NewPostForm] post created", { id: ref.id });
      setText("");
      removeMedia();
      setExpanded(false);
      onPosted?.();
    } catch (err) {
      console.error("[Feed.NewPostForm] publish failed", {
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
    <div style={{ background: "var(--panel)", borderRadius: 16, border: "1px solid var(--border)", boxShadow: "var(--card-shadow)", padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Avatar avatar={myProfile.avatar} avatarImage={myProfile.avatarImage} color={myProfile.color} size={40} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "flex-end" }}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onFocus={() => setExpanded(true)}
              placeholder="分享你的想法…"
              rows={expanded ? 3 : 1}
              style={{ flex: 1, minWidth: 0, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}
            />
            <button
              onClick={submit}
              disabled={!canPost}
              style={{ flexShrink: 0, background: canPost ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "var(--panel-alt)", border: canPost ? "none" : "1px solid var(--border)", borderRadius: 10, padding: "10px 18px", color: canPost ? "#fff" : "var(--text-dim)", cursor: canPost ? "pointer" : "not-allowed", fontSize: 14, fontWeight: 700 }}
            >
              {posting ? "發佈中..." : "發佈"}
            </button>
          </div>

          {expanded && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
              {QUICK_TOPICS.map(topic => (
                <button key={topic} onClick={() => insertTopic(topic)}
                  style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 12px", color: "var(--text-muted)", fontSize: 12, cursor: "pointer" }}>
                  #{topic}
                </button>
              ))}
            </div>
          )}

          {preview && (
            <div style={{ position: "relative", marginTop: 8, borderRadius: 10, overflow: "hidden", display: "inline-block" }}>
              {mediaType === "video"
                ? <video src={preview} controls style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 10, display: "block" }} />
                : <img src={preview} alt="預覽" style={{ maxWidth: "100%", maxHeight: 240, borderRadius: 10, display: "block" }} />
              }
              <button
                onClick={removeMedia}
                style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 26, height: 26, color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
              >✕</button>
            </div>
          )}

          {expanded && (
            <div style={{ marginTop: 10 }}>
              <button
                onClick={() => fileRef.current?.click()}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", color: "var(--text-faint)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}
              >
                📎 加入圖片/影片
              </button>
              <input ref={fileRef} type="file" accept="image/*,video/*" onChange={onFile} style={{ display: "none" }} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Single deduplicated row of topic tags — horizontally scrollable so an
// overflowing list never needs a second row. Each tag toggles as a filter:
// selected = filled, unselected = outline only.
function TopicTagsBar({ topics, selected, onToggle }) {
  const unique = useMemo(() => [...new Set(topics)], [topics]);
  return (
    <div className="feed-tags-row" style={{ display: "flex", gap: 8, overflowX: "auto", padding: "2px 2px 8px", marginBottom: 20 }}>
      {unique.map(topic => {
        const isSelected = selected === topic;
        return (
          <button
            key={topic}
            onClick={() => onToggle(topic)}
            className="feed-tag-chip"
            aria-pressed={isSelected}
            style={{
              flexShrink: 0, padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: isSelected ? "var(--accent)" : "transparent",
              color: isSelected ? "#fff" : "var(--text-muted)",
              border: isSelected ? "1px solid var(--accent)" : "1px solid var(--border)",
            }}
          >
            #{topic}
          </button>
        );
      })}
    </div>
  );
}

// 桌面版精簡導覽軌：不是複製整個聊天室 sidebar（維護成本高、容易跟聊天室走鐘），
// 只留「回到聊天室的明確入口 + 目前在哪一頁」的最小語意，讓 /feed 不會像孤立頁。
function DesktopRail({ pendingCount, myProfile }) {
  return (
    <div style={{ width: 220, flexShrink: 0, borderRight: "1px solid var(--panel)", position: "sticky", top: 0, height: "100vh", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "24px 16px 4px", display: "flex", flexDirection: "column", gap: 4, flex: 1, minHeight: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 8px", marginBottom: 20 }}>
          <span style={{ fontSize: 22 }}>💬</span>
          <span style={{ fontWeight: 800, fontSize: 16, color: "var(--text)" }}>EVONCHAT</span>
        </div>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, color: "var(--text-muted)", textDecoration: "none", fontSize: 14, fontWeight: 600 }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}>
          <Icon name="back" /> 返回聊天室
        </Link>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, color: "var(--text-muted)", textDecoration: "none", fontSize: 14, fontWeight: 600 }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}>
          <Icon name="hash" /> 公共大廳
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: "var(--accent-active)", color: "var(--accent)", fontSize: 14, fontWeight: 700 }}>
          <Icon name="feed" /> 動態消息
        </div>
      </div>

      {/* Profile footer — mirrors ChatRoom's sidebar identity block (real avatar photo,
          nickname, theme toggle) instead of a bare emoji link, so this rail doesn't feel
          like an afterthought next to the chat room's fuller sidebar. */}
      <div style={{ borderTop: "1px solid var(--panel)", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
        <Link href="/?view=more" style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0, textDecoration: "none", position: "relative" }}>
          <Avatar avatar={myProfile.avatar} avatarImage={myProfile.avatarImage} color={myProfile.color} size={36} />
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myProfile.nickname}</span>
          {pendingCount > 0 && (
            <span style={{ position: "absolute", top: -4, left: 24, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, borderRadius: 10, padding: "1px 6px" }}>{pendingCount}</span>
          )}
        </Link>
        <ThemeToggle mode="inline" openUp />
      </div>
    </div>
  );
}

function RightRail({ posts, myProfile }) {
  const topTags = useMemo(() => {
    const freq = new Map();
    posts.forEach(p => extractHashtags(p.text).forEach(tag => freq.set(tag, (freq.get(tag) || 0) + 1)));
    return [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
  }, [posts]);
  const myPostCount = posts.filter(p => p.userId === myProfile.uid).length;

  return (
    <div style={{ width: 280, flexShrink: 0, padding: "24px 16px", position: "sticky", top: 0, height: "100vh", boxSizing: "border-box", overflowY: "auto" }}>
      <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--card-shadow)", padding: 16, marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>📊 我的動態</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)" }}>{myPostCount}</div>
        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>篇貼文</div>
      </div>
      {topTags.length > 0 && (
        <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--card-shadow)", padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>🔥 熱門標籤</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {topTags.map(([tag, count]) => (
              <span key={tag} style={{ fontSize: 12, fontWeight: 600, color: "var(--accent)", background: "var(--accent-active)", borderRadius: 20, padding: "3px 10px" }}>
                {tag} <span style={{ opacity: 0.6 }}>{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function FeedApp({ user }) {
  const [myProfile, setMyProfile] = useState(null);
  const [myProfileError, setMyProfileError] = useState('');
  const [posts, setPosts] = useState([]);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortMode, setSortMode] = useState("latest");
  const topRef = useRef();

  useEffect(() => {
    return onSnapshot(doc(db, "users", user.uid), snap => {
      if (snap.exists()) setMyProfile({ uid: user.uid, ...snap.data() });
    }, (e) => {
      console.error('[Feed] profile snapshot failed', e);
      setMyProfileError('無法載入你的個人資料，請檢查網路連線');
    });
  }, [user.uid]);

  // Safety net for a listener that neither errors nor ever delivers data.
  useEffect(() => {
    if (myProfile) return;
    const t = setTimeout(() => {
      setMyProfileError(prev => prev || '載入時間過長，可能是網路連線問題');
    }, 12000);
    return () => clearTimeout(t);
  }, [myProfile]);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (e) => {
      console.error('[Feed] posts snapshot failed', e);
    });
  }, []);

  const filteredPosts = useMemo(() => {
    if (!myProfile) return [];
    let list = posts;
    if (selectedTopic) list = list.filter(p => (p.text || "").includes(`#${selectedTopic}`));
    const q = searchQuery.trim().toLowerCase();
    if (q) list = list.filter(p => (p.text || "").toLowerCase().includes(q) || (p.userNickname || "").toLowerCase().includes(q));
    if (sortMode === "hot") list = [...list].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0));
    return list;
  }, [posts, myProfile, selectedTopic, searchQuery, sortMode]);

  const toggleTopic = useCallback((topic) => {
    setSelectedTopic(prev => (prev === topic ? null : topic));
  }, []);

  if (!myProfile) {
    return (
      <LoadingState
        label="載入中..."
        minHeight="100dvh"
        error={myProfileError || undefined}
        onRetry={myProfileError ? () => window.location.reload() : undefined}
      />
    );
  }

  return (
    <>
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        * { box-sizing: border-box; }
        html, body { overflow-x: hidden; }

        .feed-shell { display: flex; }
        .feed-main-col { flex: 1; min-width: 0; }
        .feed-desktop-rail, .feed-right-rail { display: none; }

        .feed-tags-row::-webkit-scrollbar { height: 0; }

        .feed-action-btn { transition: transform .15s ease, opacity .15s ease; }
        .feed-action-btn:hover { opacity: 0.7; transform: scale(1.08); }
        .feed-action-btn:active { transform: scale(0.92); }

        .feed-tag-chip { transition: transform .15s ease, opacity .15s ease; }
        .feed-tag-chip:hover { opacity: 0.85; }
        .feed-tag-chip:active { transform: scale(0.96); }

        @media (min-width: 768px) {
          .feed-desktop-rail { display: flex; }
          .feed-mobile-topnav { display: none !important; }
        }
        @media (min-width: 1100px) {
          .feed-right-rail { display: block; }
        }

        @media (max-width: 767px) {
          /* Prevent iOS Safari auto-zoom on input focus (needs >=16px) */
          input, textarea, select { font-size: 16px !important; }

          .feed-topnav { padding: 0 14px !important; }
          .feed-media img, .feed-media video { max-height: 320px !important; }
          .feed-action-btn { padding: 8px 4px !important; }
          .feed-page-root { padding-bottom: calc(var(--mobile-tabbar-h) + env(safe-area-inset-bottom)); }
        }
      `}</style>
      <div className="feed-page-root" style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-body)", boxSizing: "border-box" }}>

        {/* Mobile top nav — 清楚的「← 聊天」返回，不依賴瀏覽器返回鍵 */}
        <header className="feed-mobile-topnav feed-topnav" style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--panel-alt)", borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", gap: 10, padding: "0 12px", height: 52 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text)", textDecoration: "none", fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
            <span aria-hidden="true" style={{ fontSize: 20 }}>←</span> 聊天
          </Link>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", flex: 1, textAlign: "center", marginRight: 40 }}>動態消息</div>
        </header>

        <div className="feed-shell">
          <nav className="feed-desktop-rail" aria-label="動態消息導覽">
            <DesktopRail pendingCount={(myProfile.pendingIn || []).length} myProfile={myProfile} />
          </nav>

          <main className="feed-main-col">
            <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }} ref={topRef}>
              {/* Hero */}
              <div style={{ marginBottom: 20, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>動態消息</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>看看朋友近況，分享你的想法</div>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  <div style={{ position: "relative" }}>
                    <Icon name="search" size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
                    <input
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="搜尋貼文..."
                      style={{ width: 160, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "7px 12px 7px 30px", color: "var(--text)", fontSize: 13, outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: 3, gap: 2 }}>
                    {[["latest", "最新"], ["hot", "熱門"]].map(([mode, label]) => (
                      <button key={mode} onClick={() => setSortMode(mode)}
                        style={{
                          border: "none", borderRadius: 16, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                          background: sortMode === mode ? "var(--accent)" : "transparent",
                          color: sortMode === mode ? "#fff" : "var(--text-muted)",
                        }}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <NewPostForm myProfile={myProfile} />

              <TopicTagsBar topics={QUICK_TOPICS} selected={selectedTopic} onToggle={toggleTopic} />

              {filteredPosts.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16 }}>
                  <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)" }}>還沒有動態</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 4 }}>分享你的第一篇學習筆記吧！</div>
                </div>
              )}

              {filteredPosts.map(post => (
                <PostCard key={post.id} post={post} myUid={user.uid} myProfile={myProfile} />
              ))}
            </div>
          </main>

          <aside className="feed-right-rail">
            <RightRail posts={posts} myProfile={myProfile} />
          </aside>
        </div>
      </div>
      <MobileTabBarLayout activeTab="feed" pendingCount={(myProfile.pendingIn || []).length} />
    </>
  );
}
