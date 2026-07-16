import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { auth, db } from "../../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";

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

function getStatus(status) {
  switch (status) {
    case "online": return { label: "線上",    color: "#22c55e" };
    case "away":   return { label: "暫時離開", color: "#eab308" };
    case "dnd":    return { label: "請勿打擾", color: "#ef4444" };
    default:       return { label: "離線",    color: "#6b7280" };
  }
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

function formatJoinDate(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString("zh-TW", { year: "numeric", month: "long" });
}

function NewPostForm({ profile, onPosted }) {
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
        userId: profile.uid,
        userNickname: profile.nickname,
        userAvatar: profile.avatar || "😊",
        userColor: profile.color || "var(--accent)",
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
            rows={3}
            style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5 }}
          />
          {preview && (
            <div style={{ position: "relative", marginTop: 8, borderRadius: 10, overflow: "hidden", display: "inline-block" }}>
              {mediaType === "video"
                ? <video src={preview} controls style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, display: "block" }} />
                : <img src={preview} alt="預覽" style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, display: "block" }} />
              }
              <button onClick={removeMedia}
                style={{ position: "absolute", top: 6, right: 6, background: "rgba(0,0,0,0.6)", border: "none", borderRadius: "50%", width: 26, height: 26, color: "#fff", cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✕
              </button>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
            <button onClick={() => fileRef.current?.click()}
              style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", color: "var(--text-faint)", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
              📎 加入圖片/影片
            </button>
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

export default function ProfilePublicPage() {
  const router = useRouter();
  const { uid } = router.query;
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("posts");
  const [lightboxImg, setLightboxImg] = useState(null);
  const [avatarHover, setAvatarHover] = useState(false);
  const [hoveredMedia, setHoveredMedia] = useState(null);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const currentUser = auth.currentUser;
    setIsOwner(!!(currentUser && currentUser.uid === uid));
  }, [uid]);

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    async function load() {
      try {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (!cancelled && userSnap.exists()) setProfile({ uid: userSnap.id, ...userSnap.data() });
      } catch (e) {}
      try {
        const postsSnap = await getDocs(query(collection(db, "posts"), where("userId", "==", uid)));
        if (!cancelled) {
          const sorted = postsSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .sort((a, b) => {
              const ta = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
              const tb = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
              return tb - ta;
            });
          setPosts(sorted);
        }
      } catch (e) {}
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [uid]);

  const reloadPosts = async () => {
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
    } catch (e) {}
  };

  useEffect(() => {
    function onKey(e) { if (e.key === "Escape") setLightboxImg(null); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--panel-alt)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-faint)", fontSize: 16 }}>載入中...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--panel-alt)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
        <div style={{ fontSize: 48 }}>😶</div>
        <div style={{ color: "var(--text-muted)", fontSize: 18 }}>找不到此用戶</div>
        <Link href="/" style={{ color: "var(--accent)", textDecoration: "none", fontSize: 14 }}>← 返回聊天室</Link>
      </div>
    );
  }

  const st = getStatus(profile.status);
  const bannerStyle = profile.profileBgType === "image"
    ? { backgroundImage: `url(${profile.profileBg})`, backgroundSize: "cover", backgroundPosition: "center" }
    : { background: profile.profileBg || "linear-gradient(135deg,#1e3a5f,#2d1f6e)" };

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--panel-alt); }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        @media (max-width: 767px) {
          /* Prevent iOS Safari auto-zoom on input focus (needs >=16px) */
          input, textarea, select { font-size: 16px !important; }

          .pp-banner { height: 140px !important; }
          .pp-avatar { width: 84px !important; height: 84px !important; }
          .pp-avatar-row { margin-top: -42px !important; }
        }
      `}</style>

      {/* Lightbox */}
      {lightboxImg && (
        <div onClick={() => setLightboxImg(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.9)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          <img src={lightboxImg} onClick={e => e.stopPropagation()}
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, objectFit: "contain", cursor: "default", boxShadow: "0 8px 40px rgba(0,0,0,0.6)" }} />
          <button onClick={() => setLightboxImg(null)}
            style={{ position: "absolute", top: 20, right: 20, background: "rgba(30,41,59,0.9)", border: "1px solid var(--border)", color: "#f1f5f9", fontSize: 20, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>
      )}

      <div style={{ minHeight: "100vh", background: "var(--panel-alt)", color: "var(--text)", fontFamily: "'Inter','Helvetica Neue',sans-serif" }}>

        {/* Sticky top bar */}
        <div style={{ position: "sticky", top: 0, zIndex: 50, background: "rgba(15,23,42,0.85)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", gap: 16, padding: "0 16px", height: 52 }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: "50%", color: "var(--text)", textDecoration: "none", fontSize: 18, background: "transparent", transition: "background 0.15s" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--panel)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            ←
          </Link>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>{profile.nickname}</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{posts.length} 則貼文</div>
          </div>
        </div>

        {/* Banner */}
        <div className="pp-banner" style={{ height: 200, ...bannerStyle }} />

        {/* Avatar + actions row */}
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 16px" }}>
          <div className="pp-avatar-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginTop: -52, marginBottom: 12 }}>
            <div className="pp-avatar" style={{ flexShrink: 0, position: "relative", cursor: profile.avatarImage ? "pointer" : "default", width: 104, height: 104 }}
              onClick={() => profile.avatarImage && setLightboxImg(profile.avatarImage)}
              onMouseEnter={() => setAvatarHover(true)}
              onMouseLeave={() => setAvatarHover(false)}>
              {profile.avatarImage
                ? <img src={profile.avatarImage} alt="頭像" style={{ width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover", border: "4px solid var(--panel-alt)", display: "block", transition: "filter 0.2s", filter: avatarHover ? "brightness(0.75)" : "brightness(1)" }} />
                : <div style={{ width: "100%", height: "100%", borderRadius: "50%", background: profile.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 52, border: "4px solid var(--panel-alt)" }}>{profile.avatar || "😊"}</div>
              }
              {profile.avatarImage && avatarHover && (
                <div style={{ position: "absolute", inset: 0, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                  <span style={{ fontSize: 28 }}>🔍</span>
                </div>
              )}
            </div>

            {isOwner ? (
              <Link href="/" style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "7px 16px", color: "var(--text)", textDecoration: "none", fontSize: 14, fontWeight: 700, marginBottom: 8, display: "inline-block" }}
                onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--panel)"}>
                ⚙️ 編輯個人資料
              </Link>
            ) : (
              <Link href={`/?chat=${uid}`} style={{ background: "var(--accent)", border: "none", borderRadius: 20, padding: "8px 18px", color: "#fff", textDecoration: "none", fontSize: 14, fontWeight: 700, marginBottom: 8, transition: "background 0.15s", display: "inline-block" }}
                onMouseEnter={e => e.currentTarget.style.background = "#2563eb"}
                onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}>
                💬 傳訊息
              </Link>
            )}
          </div>

          {/* Name + status */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", lineHeight: 1.2 }}>{profile.nickname}</h1>
              <span style={{ background: `${st.color}22`, border: `1px solid ${st.color}55`, color: st.color, borderRadius: 20, padding: "2px 8px", fontSize: 11, fontWeight: 700 }}>
                ● {st.label}
              </span>
            </div>
            {profile.signature && (
              <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 2, fontStyle: "italic" }}>「{profile.signature}」</div>
            )}
          </div>

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
            <div style={{ display: "flex", gap: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{(profile.friends || []).length}</span>
              <span style={{ fontSize: 14, color: "var(--text-faint)" }}>好友</span>
            </div>
            <div style={{ display: "flex", gap: 4 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{posts.length}</span>
              <span style={{ fontSize: 14, color: "var(--text-faint)" }}>貼文</span>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: "flex", borderBottom: "1px solid var(--panel)" }}>
            {[["posts","貼文"],["media","媒體"]].map(([key, label]) => (
              <button key={key} onClick={() => setTab(key)}
                style={{ flex: 1, padding: "14px 0", background: "none", border: "none", borderBottom: tab === key ? "2px solid var(--accent)" : "2px solid transparent", color: tab === key ? "#f1f5f9" : "var(--text-faint)", fontSize: 14, fontWeight: tab === key ? 700 : 500, cursor: "pointer", transition: "color 0.15s" }}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Posts */}
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          {tab === "posts" && (
            <>
              {/* Post form — only for owner */}
              {isOwner && (
                <NewPostForm profile={profile} onPosted={reloadPosts} />
              )}

              {posts.length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-dim)" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>📭</div>
                  <div style={{ fontSize: 16 }}>{isOwner ? "還沒有貼文，發第一篇吧！" : "還沒有任何貼文"}</div>
                </div>
              )}
              {posts.filter(p => p.text || p.imageUrl || p.videoUrl).map(post => (
                <div key={post.id} style={{ borderBottom: "1px solid var(--panel)" }}>
                  <div style={{ padding: "16px 16px 12px" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                      {profile.avatarImage
                        ? <img src={profile.avatarImage} alt="頭像" style={{ width: 40, height: 40, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        : <div style={{ width: 40, height: 40, borderRadius: "50%", background: profile.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>{profile.avatar}</div>
                      }
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>{profile.nickname}</span>
                          <span style={{ fontSize: 13, color: "var(--text-faint)" }}>· {formatDate(post.createdAt)}</span>
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
                            onClick={() => setLightboxImg(post.imageUrl)}>
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
              ))}
            </>
          )}
          {tab === "media" && (
            <>
              {posts.filter(p => p.imageUrl || p.videoUrl).length === 0 && (
                <div style={{ textAlign: "center", padding: "60px 20px", color: "var(--text-dim)" }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>🖼️</div>
                  <div style={{ fontSize: 16 }}>還沒有媒體貼文</div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, padding: "2px" }}>
                {posts.filter(p => p.imageUrl || p.videoUrl).map(post => (
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
        </div>
      </div>
    </>
  );
}
