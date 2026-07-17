import { useState, useEffect, useRef, useCallback } from "react";
import { auth, db } from "../lib/firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy,
  doc, updateDoc, arrayUnion, arrayRemove, serverTimestamp,
  getDoc,
} from "firebase/firestore";
import Link from "next/link";

async function uploadToR2(file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type, fileData: base64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "上傳失敗");
  return data.url;
}

function formatDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return "剛剛";
  if (diff < 3600) return `${Math.floor(diff / 60)} 分鐘前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小時前`;
  return d.toLocaleDateString("zh-TW", { month: "long", day: "numeric" });
}

function Avatar({ avatar, color, size = 40 }) {
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
          <Avatar avatar={c.userAvatar} color={c.userColor} size={28} />
          <div style={{ background: "var(--panel-alt)", borderRadius: 10, padding: "6px 10px", flex: 1 }}>
            <span style={{ fontWeight: 700, fontSize: 12, color: "var(--text-muted)", marginRight: 6 }}>{c.userNickname}</span>
            <span style={{ fontSize: 13, color: "var(--text)" }}>{c.text}</span>
            <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }}>{formatDate(c.createdAt)}</div>
          </div>
        </div>
      ))}
      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
        <Avatar avatar={myProfile.avatar} color={myProfile.color} size={28} />
        <div style={{ flex: 1, display: "flex", gap: 6 }}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && submit()}
            placeholder="留言..."
            style={{ flex: 1, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 20, padding: "6px 12px", color: "var(--text)", fontSize: 13, outline: "none" }}
          />
          <button
            onClick={submit}
            disabled={!text.trim() || sending}
            style={{ background: text.trim() ? "var(--accent)" : "var(--panel)", border: "none", borderRadius: 20, padding: "6px 14px", color: text.trim() ? "#fff" : "var(--text-dim)", cursor: text.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600 }}
          >
            送出
          </button>
        </div>
      </div>
    </div>
  );
}

function PostCard({ post, myUid, myProfile }) {
  const [showComments, setShowComments] = useState(false);
  const liked = (post.likes || []).includes(myUid);

  const toggleLike = async () => {
    const ref = doc(db, "posts", post.id);
    if (liked) {
      await updateDoc(ref, { likes: arrayRemove(myUid) });
    } else {
      await updateDoc(ref, { likes: arrayUnion(myUid) });
    }
  };

  return (
    <div style={{ background: "var(--panel)", borderRadius: 16, border: "1px solid var(--border)", marginBottom: 16, overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px" }}>
        <Avatar avatar={post.userAvatar} color={post.userColor} size={40} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{post.userNickname}</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{formatDate(post.createdAt)}</div>
        </div>
      </div>

      {/* Text */}
      {post.text && (
        <div style={{ padding: "0 16px 12px", fontSize: 15, color: "var(--text)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {post.text}
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
      <div style={{ padding: "10px 16px", display: "flex", alignItems: "center", gap: 16, borderTop: "1px solid var(--panel)" }}>
        <button
          onClick={toggleLike}
          className="feed-action-btn"
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: liked ? "#ef4444" : "var(--text-faint)", fontSize: 14, fontWeight: 600, padding: 0 }}
        >
          <span style={{ fontSize: 18 }}>{liked ? "❤️" : "🤍"}</span>
          {(post.likes || []).length > 0 && <span>{(post.likes || []).length}</span>}
        </button>
        <button
          onClick={() => setShowComments(v => !v)}
          className="feed-action-btn"
          style={{ display: "flex", alignItems: "center", gap: 5, background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 14, fontWeight: 600, padding: 0 }}
        >
          <span style={{ fontSize: 18 }}>💬</span>
          留言
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

function NewPostForm({ myProfile, onPosted }) {
  const [text, setText] = useState("");
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
    if (!text.trim() && !mediaFile) return;
    setPosting(true);
    try {
      let imageUrl = null;
      let videoUrl = null;
      if (mediaFile) {
        const url = await uploadToR2(mediaFile);
        if (mediaType === "video") videoUrl = url;
        else imageUrl = url;
      }
      await addDoc(collection(db, "posts"), {
        userId: myProfile.uid,
        userNickname: myProfile.nickname,
        userAvatar: myProfile.avatar,
        userColor: myProfile.color,
        text: text.trim(),
        imageUrl,
        videoUrl,
        likes: [],
        createdAt: serverTimestamp(),
      });
      setText("");
      removeMedia();
      onPosted?.();
    } catch {
      alert("發佈失敗，請重試");
    } finally {
      setPosting(false);
    }
  };

  const canPost = (text.trim() || mediaFile) && !posting;

  return (
    <div style={{ background: "var(--panel)", borderRadius: 16, border: "1px solid var(--border)", padding: 16, marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        <Avatar avatar={myProfile.avatar} color={myProfile.color} size={40} />
        <div style={{ flex: 1 }}>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="分享你的想法..."
            rows={3}
            style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}
          />
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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <button
              onClick={() => fileRef.current?.click()}
              style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", color: "var(--text-faint)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}
            >
              📎 加入圖片/影片
            </button>
            <input ref={fileRef} type="file" accept="image/*,video/*" onChange={onFile} style={{ display: "none" }} />
            <button
              onClick={submit}
              disabled={!canPost}
              style={{ background: canPost ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "var(--panel)", border: "none", borderRadius: 10, padding: "8px 20px", color: canPost ? "#fff" : "var(--text-dim)", cursor: canPost ? "pointer" : "default", fontSize: 14, fontWeight: 700 }}
            >
              {posting ? "發佈中..." : "發佈"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeedApp({ user }) {
  const [myProfile, setMyProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const topRef = useRef();

  useEffect(() => {
    return onSnapshot(doc(db, "users", user.uid), snap => {
      if (snap.exists()) setMyProfile({ uid: user.uid, ...snap.data() });
    });
  }, [user.uid]);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("createdAt", "desc"));
    return onSnapshot(q, snap => {
      setPosts(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  if (!myProfile) {
    return (
      <div style={{ minHeight: "100dvh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-faint)" }}>載入中...</div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
        * { box-sizing: border-box; }
        html, body { overflow-x: hidden; }

        @media (max-width: 767px) {
          /* Prevent iOS Safari auto-zoom on input focus (needs >=16px) */
          input, textarea, select { font-size: 16px !important; }

          .feed-topnav { padding: 0 14px !important; }
          .feed-media img, .feed-media video { max-height: 320px !important; }
          .feed-action-btn { padding: 8px 4px !important; }
        }
      `}</style>
      <div style={{ minHeight: "100dvh", background: "var(--bg)", color: "var(--text)", fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>

        {/* Top Nav */}
        <div className="feed-topnav" style={{ position: "sticky", top: 0, zIndex: 50, background: "var(--panel-alt)", borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", gap: 12, padding: "0 20px", height: 56 }}>
          <div style={{ fontSize: 20 }}>📋</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: "var(--text)", flex: 1 }}>動態消息</div>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 5, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10, padding: "6px 14px", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            💬 聊天室
          </Link>
          <button
            onClick={() => auth.signOut()}
            style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 16, padding: 4 }}
            title="登出"
          >
            🚪
          </button>
        </div>

        {/* Content */}
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "24px 16px" }} ref={topRef}>
          <NewPostForm myProfile={myProfile} />

          {posts.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-dim)" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <div style={{ fontSize: 16 }}>還沒有任何貼文</div>
              <div style={{ fontSize: 13, marginTop: 4 }}>成為第一個分享的人吧！</div>
            </div>
          )}

          {posts.map(post => (
            <PostCard key={post.id} post={post} myUid={user.uid} myProfile={myProfile} />
          ))}
        </div>
      </div>
    </>
  );
}
