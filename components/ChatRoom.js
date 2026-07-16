import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { auth, db } from "../lib/firebase";
import AvatarCreator from "./AvatarCreator";
import CalendarMemo from "./CalendarMemo";
import PageNotes from "./PageNotes";
import ThemeToggle from "./ThemeToggle";
import NavItem from "./nav/NavItem";
import ChatMoreMenu from "./ChatMoreMenu";
import ChatMobileTabBar from "./ChatMobileTabBar";
import VocabRoom from "./VocabRoom";
import SpanishRoom from "./SpanishRoom";
import SpanishCourseRoom from "./SpanishCourseRoom";
import CustomVocabRoom from "./CustomVocabRoom";
import DictionaryRoom from "./DictionaryRoom";
import SpanishPronunciation from "./SpanishPronunciation";
import SpanishGrammar from "./SpanishGrammar";
import SpanishVerbConjugator from "./SpanishVerbConjugator";
import EnglishPronunciation from "./EnglishPronunciation";
import IeltsBand4 from "./IeltsBand4";
import {
  doc, collection, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot,
  query, orderBy, limitToLast, serverTimestamp,
  arrayUnion, arrayRemove, getDocs, where, limit, getDoc,
} from "firebase/firestore";

const EMOJI_QUICK  = ["👍","❤️","😂","😮","😢","🙏"];
const PROFILE_GRADIENTS = [
  "linear-gradient(135deg,#1e3a5f,#2d1f6e)",
  "linear-gradient(135deg,#f59e0b,#ef4444)",
  "linear-gradient(135deg,#06b6d4,#3b82f6)",
  "linear-gradient(135deg,#10b981,#059669)",
  "linear-gradient(135deg,#ec4899,#8b5cf6)",
  "linear-gradient(135deg,#0f172a,#1e293b)",
  "linear-gradient(135deg,#f472b6,#fb923c)",
  "linear-gradient(135deg,#34d399,#06b6d4)",
  "radial-gradient(ellipse at 20% 15%, rgba(96,84,210,0.65), transparent 55%), radial-gradient(ellipse at 85% 88%, rgba(36,140,170,0.55), transparent 55%) #0a0e1a",
  "radial-gradient(ellipse at 80% 10%, rgba(236,72,153,0.55), transparent 50%), radial-gradient(ellipse at 15% 90%, rgba(99,102,241,0.50), transparent 55%) #0f0a1e",
  "radial-gradient(ellipse at 50% 0%, rgba(251,191,36,0.45), transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(239,68,68,0.40), transparent 55%) #150a00",
  "radial-gradient(ellipse at 10% 50%, rgba(16,185,129,0.50), transparent 55%), radial-gradient(ellipse at 90% 50%, rgba(6,182,212,0.45), transparent 55%) #001a14",
];
const STATUS_EMOJIS = ["🎵","💻","📖","🏃","🎮","😴","🍕","☕"];
const AVATAR_EMOJIS = ["😊","👨‍💻","📚","🏃","🎮","🎨","🍜","🌸","🦊","🐼","🎧","⚡"];
const COLORS = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4","#84cc16"];

function formatTime(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function getStatus(status) {
  switch (status) {
    case "online": return { label: "線上",    color: "#22c55e" };
    case "away":   return { label: "離開", color: "#eab308" };
    case "dnd":    return { label: "勿擾", color: "#ef4444" };
    default:       return { label: "離線",    color: "#6b7280" };
  }
}

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

// Avatar helper

function AvatarImg({ avatarImage, avatar, color, size = 36 }) {
  if (avatarImage) {
    return <img src={avatarImage} alt="頭像" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0, display: "block" }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, flexShrink: 0 }}>
      {avatar || "😊"}
    </div>
  );
}

// MessageBubble

function MessageBubble({ msg, isMine, showSender, myUid, collectionPath }) {
  const [reactions, setReactions] = useState({});
  const [showPicker, setShowPicker] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [tapped, setTapped] = useState(false);
  const showActions = hovered || tapped;
  const addReaction = (e) => { setReactions(r => ({ ...r, [e]: (r[e]||0)+1 })); setShowPicker(false); };

  const recallMsg = async () => {
    if (!collectionPath) return;
    if (!confirm("確認撤回此訊息？")) return;
    try {
      await updateDoc(doc(db, ...collectionPath), { recalled: true, text: "此訊息已撤回", imageUrl: "", videoUrl: "" });
    } catch (e) {
      alert("撤回失敗，請重試");
    }
  };

  if (msg.recalled) {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 2 }}>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, maxWidth: "72%" }}>
          {!isMine && <div style={{ width: 30, flexShrink: 0 }} />}
          <div style={{ padding: "8px 14px", borderRadius: 18, background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text-dim)", fontSize: 13, fontStyle: "italic" }}>
            此訊息已撤回
          </div>
        </div>
        <span style={{ fontSize: 10, color: "var(--border)", marginTop: 2, marginLeft: isMine ? 0 : 40 }}>{formatTime(msg.createdAt)}</span>
      </div>
    );
  }

  const hasMedia = msg.imageUrl || msg.videoUrl;

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => { if (isMine) setTapped(v => !v); }}
      style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: 2, position: "relative" }}
    >
      {isMine && showActions && (
        <button onClick={e => { e.stopPropagation(); recallMsg(); }} style={{ position: "absolute", top: 0, right: 0, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "2px 8px", fontSize: 11, color: "var(--text-muted)", cursor: "pointer", zIndex: 5, whiteSpace: "nowrap" }}>
          撤回
        </button>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: 8, maxWidth: "72%", marginTop: isMine && showActions ? 22 : 0 }}>
        {!isMine && showSender && (
          <div style={{ flexShrink: 0 }}>
            <AvatarImg avatarImage={msg.senderAvatarImage} avatar={msg.avatar || msg.sender?.[0]} color="var(--accent-2)" size={30} />
          </div>
        )}
        {!isMine && !showSender && <div style={{ width: 30, flexShrink: 0 }} />}
        <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start" }}>
          {!isMine && showSender && <span style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3, marginLeft: 2 }}>{msg.sender}</span>}
          <div onDoubleClick={() => setShowPicker(v => !v)} style={{
            padding: hasMedia && !msg.text ? "4px" : "9px 14px",
            borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
            background: isMine ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "var(--panel)",
            color: isMine ? "#fff" : "var(--text)", fontSize: 14, lineHeight: 1.5, cursor: "default",
            border: isMine ? "none" : "1px solid var(--border)",
            backdropFilter: "var(--panel-blur)", WebkitBackdropFilter: "var(--panel-blur)",
            overflow: "hidden",
          }}>
            {msg.videoUrl && (
              <video src={msg.videoUrl} controls style={{ maxWidth: 260, maxHeight: 200, borderRadius: "var(--radius-md)", display: "block", boxShadow: "var(--glow-shadow)" }} />
            )}
            {msg.imageUrl && (
              <img src={msg.imageUrl} alt="圖片" style={{ maxWidth: 260, maxHeight: 200, borderRadius: "var(--radius-md)", display: "block", boxShadow: "var(--glow-shadow)" }} />
            )}
            {msg.text}
          </div>
          {Object.keys(reactions).length > 0 && (
            <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
              {Object.entries(reactions).map(([emoji, count]) => (
                <button key={emoji} onClick={() => addReaction(emoji)} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 8px", fontSize: 12, color: "var(--text)", cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}>
                  {emoji} <span style={{ color: "var(--text-faint)" }}>{count}</span>
                </button>
              ))}
            </div>
          )}
          {showPicker && (
            <div style={{ position: "absolute", [isMine ? "right" : "left"]: 0, bottom: "calc(100% + 6px)", background: "var(--panel)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)", padding: "6px 8px", display: "flex", gap: 6, zIndex: 10 }}>
              {EMOJI_QUICK.map(e => <button key={e} onClick={() => addReaction(e)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 20 }}>{e}</button>)}
            </div>
          )}
        </div>
      </div>
      <span style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 3, marginLeft: isMine ? 0 : 40 }}>{formatTime(msg.createdAt)}</span>
    </div>
  );
}

// ProfilePage

function ProfilePage({ myProfile, friendProfiles, onSave, onClose }) {
  const [nickname,   setNickname]   = useState(myProfile.nickname || "");
  const [bio,        setBio]        = useState(myProfile.bio || "");
  const [avatar,     setAvatar]     = useState(myProfile.avatar || "😊");
  const [color,      setColor]      = useState(myProfile.color || "var(--accent)");
  const [statusText, setStatusText] = useState(myProfile.statusText || "");
  const [status,     setStatus]     = useState(myProfile.status || "online");
  const [signature,  setSignature]  = useState(myProfile.signature || "");
  const [showCreator, setShowCreator] = useState(false);
  const [profileBg,     setProfileBg]     = useState(myProfile.profileBg || "linear-gradient(135deg,var(--accent-hover),#2d1f6e)");
  const [profileBgType, setProfileBgType] = useState(myProfile.profileBgType || "gradient");
  const [bgUploading,   setBgUploading]   = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const bgFileRef = useRef(null);
  const avatarFileRef = useRef(null);
  const friendList = (myProfile.friends || []).map(fid => friendProfiles[fid]).filter(Boolean);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const url = await uploadToR2(file);
      await updateDoc(doc(db, 'users', myProfile.uid), { avatarImage: url });
    } catch {
      alert("頭像上傳失敗，請重試");
    } finally {
      setAvatarUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <div className="cr-modal-full" style={{ background: "var(--panel)", borderRadius: 20, width: 460, maxWidth: "92vw", maxHeight: "85vh", overflow: "auto", border: "1px solid var(--border)" }}>
        <div style={{
          background: profileBgType === "gradient" ? profileBg : undefined,
          backgroundImage: profileBgType === "image" ? `url(${profileBg})` : undefined,
          backgroundSize: profileBgType === "image" ? "cover" : undefined,
          backgroundPosition: profileBgType === "image" ? "center" : undefined,
          padding: "28px 28px 0", borderRadius: "20px 20px 0 0", position: "relative",
        }}>
          <button onClick={onClose} className="cr-close-btn" style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.3)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "var(--text-muted)", cursor: "pointer", fontSize: 18 }}>✕</button>
          {showCreator && <AvatarCreator myProfile={myProfile} onClose={() => setShowCreator(false)} />}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16 }}>
            <div style={{ position: "relative" }}>
              <AvatarImg avatarImage={myProfile.avatarImage} avatar={avatar} color={color} size={80} />
              <span style={{ position: "absolute", bottom: 2, right: 2, width: 18, height: 18, borderRadius: "50%", background: getStatus(status).color, border: "3px solid var(--panel)" }} />
              <button onClick={() => setShowCreator(true)} title="更換頭像"
                style={{ position: "absolute", top: 0, left: 0, width: 80, height: 80, borderRadius: "50%", background: "rgba(0,0,0,0)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0, transition: "opacity 0.2s" }}
                onMouseEnter={e => { e.currentTarget.style.opacity = 1; e.currentTarget.style.background = "rgba(0,0,0,0.45)"; }}
                onMouseLeave={e => { e.currentTarget.style.opacity = 0; e.currentTarget.style.background = "rgba(0,0,0,0)"; }}>
                <span style={{ fontSize: 22, pointerEvents: "none" }}>📷</span>
              </button>
            </div>
            <div style={{ paddingBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 20, color: "var(--text)" }}>{nickname}</div>
              <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: "min(60vw, 260px)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myProfile.email}</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 20, marginTop: 16, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 14, paddingBottom: 14 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text)" }}>{friendList.length}</div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>好友</div>
            </div>
          </div>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8, display: "block" }}>頭像圖片</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <AvatarImg avatarImage={myProfile.avatarImage} avatar={avatar} color={color} size={48} />
              <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                <button onClick={() => avatarFileRef.current?.click()} disabled={avatarUploading}
                  style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "7px 14px", color: "var(--text-muted)", cursor: avatarUploading ? "default" : "pointer", fontSize: 13 }}>
                  {avatarUploading ? "上傳中..." : "📷 上傳頭像圖片"}
                </button>
                {myProfile.avatarImage && (
                  <button onClick={() => updateDoc(doc(db, 'users', myProfile.uid), { avatarImage: "" })}
                    style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 12, textAlign: "left" }}>移除圖片</button>
                )}
              </div>
              <input ref={avatarFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleAvatarUpload} />
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 6, display: "block" }}>頭像 Emoji（可選）</label>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {AVATAR_EMOJIS.map(e => (
                <button key={e} onClick={() => setAvatar(e)} style={{ width: 36, height: 36, borderRadius: "50%", border: avatar === e ? "2px solid var(--accent)" : "2px solid var(--border)", background: color, cursor: "pointer", fontSize: 18 }}>{e}</button>
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 6, display: "block" }}>頭像顏色</label>
            <div style={{ display: "flex", gap: 8 }}>
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 28, height: 28, borderRadius: "50%", background: c, border: color === c ? "3px solid #fff" : "3px solid transparent", cursor: "pointer" }} />
              ))}
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4, display: "block" }}>暱稱</label>
            <input value={nickname} onChange={e => setNickname(e.target.value)} style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4, display: "block" }}>個性簽名（最多 20 字）</label>
            <input value={signature} onChange={e => setSignature(e.target.value.slice(0, 20))} placeholder="寫一句代表你的話..."
              style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
            <div style={{ textAlign: "right", fontSize: 11, color: "var(--text-dim)", marginTop: 3 }}>{signature.length} / 20</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4, display: "block" }}>自我介紹</label>
            <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} placeholder="簡單介紹一下自己..." style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box", resize: "none" }} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4, display: "block" }}>狀態文字</label>
            <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>
              {STATUS_EMOJIS.map(e => <button key={e} onClick={() => setStatusText(p => p + e)} style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "4px 8px", cursor: "pointer", fontSize: 16 }}>{e}</button>)}
            </div>
            <input value={statusText} onChange={e => setStatusText(e.target.value)} placeholder="在忙什麼呢..." style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 4, display: "block" }}>上線狀態</label>
            <div style={{ display: "flex", gap: 8 }}>
              {[["online","線上"],["away","離開"],["dnd","勿擾"],["offline","離線"]].map(([s,l]) => (
                <button key={s} onClick={() => setStatus(s)} style={{ flex: 1, padding: "8px 0", border: status === s ? `2px solid ${getStatus(s).color}` : "1px solid var(--border)", borderRadius: "var(--radius-sm)", background: status === s ? `${getStatus(s).color}22` : "var(--panel-alt)", color: status === s ? getStatus(s).color : "var(--text-faint)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{l}</button>
              ))}
            </div>
          </div>
          {friendList.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8, display: "block" }}>好友列表 ({friendList.length})</label>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {friendList.map(f => (
                  <div key={f.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--panel-alt)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                    <AvatarImg avatarImage={f.avatarImage} avatar={f.avatar} color={f.color} size={32} />
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{f.nickname}</div>
                      <div style={{ fontSize: 11, color: getStatus(f.status).color }}>{getStatus(f.status).label}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{ marginBottom: 20 }}>
            <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8, display: "block" }}>個人背景</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
              {PROFILE_GRADIENTS.map((g, i) => (
                <button key={i} onClick={() => { setProfileBg(g); setProfileBgType("gradient"); }}
                  style={{ width: 32, height: 32, borderRadius: "var(--radius-sm)", background: g, border: profileBg === g && profileBgType === "gradient" ? "3px solid #fff" : "2px solid transparent", cursor: "pointer", flexShrink: 0 }} />
              ))}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => bgFileRef.current?.click()} disabled={bgUploading}
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-sm)", padding: "7px 12px", color: "var(--text-muted)", cursor: bgUploading ? "default" : "pointer", fontSize: 13 }}>
                {bgUploading ? "上傳中..." : "更換背景圖片"}
              </button>
              {profileBgType === "image" && (
                <button onClick={() => { setProfileBg(PROFILE_GRADIENTS[0]); setProfileBgType("gradient"); }}
                  style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 12 }}>移除背景</button>
              )}
              <input ref={bgFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setBgUploading(true);
                try {
                  const url = await uploadToR2(file);
                  setProfileBg(url);
                  setProfileBgType("image");
                } catch {
                  alert("背景上傳失敗，請重試");
                } finally {
                  setBgUploading(false);
                  e.target.value = "";
                }
              }} />
            </div>
          </div>
          <button onClick={() => onSave({ nickname, bio, avatar, color, statusText, status, signature, profileBg, profileBgType })} style={{ width: "100%", background: "linear-gradient(135deg,var(--accent),var(--accent-2))", border: "none", borderRadius: "var(--radius-md)", padding: "12px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
            儲存設定
          </button>
        </div>
      </div>
    </div>
  );
}

// FriendSearch????????????????????????????????????????????????????????????

function FriendSearch({ myUid, myProfile, onClose, onSendRequest }) {
  const [searchText, setSearchText] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!searchText.trim()) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const q = searchText.trim();
        const found = {};
        const emailSnap = await getDocs(query(collection(db, 'users'), where('email', '==', q)));
        emailSnap.docs.forEach(d => { found[d.id] = { uid: d.id, ...d.data() }; });
        const nickSnap = await getDocs(query(collection(db, 'users'), where('nickname', '>=', q), where('nickname', '<=', q + ''), limit(10)));
        nickSnap.docs.forEach(d => { found[d.id] = { uid: d.id, ...d.data() }; });
        const filtered = Object.values(found).filter(u =>
          u.uid !== myUid &&
          !(myProfile.friends || []).includes(u.uid) &&
          !(myProfile.pendingOut || []).includes(u.uid)
        );
        setResults(filtered);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [searchText, myUid, myProfile.friends, myProfile.pendingOut]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <div className="cr-modal-full" style={{ background: "var(--panel)", borderRadius: 20, width: 520, maxWidth: "95vw", border: "1px solid var(--border)", padding: 28, boxSizing: "border-box", overflowY: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "var(--text)", margin: 0, fontSize: 20, fontWeight: 700 }}>搜尋並新增好友</h3>
          <button onClick={onClose} className="cr-close-btn" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 24 }}>✕</button>
        </div>
        <input value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="輸入暱稱或電郵搜尋..."
          style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "13px 16px", color: "var(--text)", fontSize: 16, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
        {searching && <div style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 16 }}>搜尋中...</div>}
        {!searching && results.length === 0 && searchText && <div style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 16, padding: "16px 0" }}>找不到相關使用者</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {results.map(u => (
            <div key={u.uid} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", background: "var(--panel-alt)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <AvatarImg avatarImage={u.avatarImage} avatar={u.avatar} color={u.color} size={48} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 16 }}>{u.nickname}</div>
                {u.signature && <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic" }}>{u.signature}</div>}
                <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{u.email}</div>
              </div>
              <button onClick={() => onSendRequest(u.uid)} style={{ background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 18px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>加好友</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// FriendRequests

function FriendRequests({ myProfile, onAccept, onDecline, onClose }) {
  const [pendingProfiles, setPendingProfiles] = useState([]);

  useEffect(() => {
    const uids = myProfile.pendingIn || [];
    if (!uids.length) { setPendingProfiles([]); return; }
    Promise.all(uids.map(uid => getDoc(doc(db, 'users', uid)))).then(snaps => {
      setPendingProfiles(snaps.filter(s => s.exists()).map(s => ({ uid: s.id, ...s.data() })));
    });
  }, [(myProfile.pendingIn || []).join(',')]);

  return (
    <div className="cr-sheet-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <div className="cr-sheet" style={{ background: "var(--panel)", borderRadius: "var(--radius-lg)", width: 380, maxWidth: "92vw", border: "1px solid var(--border)", padding: 24, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ color: "var(--text)", margin: 0, fontSize: 16, fontWeight: 700 }}>好友邀請 ({pendingProfiles.length})</h3>
          <button onClick={onClose} className="cr-close-btn" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>
        {pendingProfiles.length === 0 && <div style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 14, padding: "20px 0" }}>目前沒有待處理的邀請</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pendingProfiles.map(u => (
            <div key={u.uid} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px", background: "var(--panel-alt)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
              <AvatarImg avatarImage={u.avatarImage} avatar={u.avatar} color={u.color} size={40} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>{u.nickname}</div>
                <div style={{ fontSize: 11, color: "var(--text-faint)" }}>想加你為好友</div>
              </div>
              <button onClick={() => onAccept(u.uid)} style={{ background: "#22c55e", border: "none", borderRadius: "var(--radius-sm)", padding: "6px 12px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", marginRight: 4 }}>接受</button>
              <button onClick={() => onDecline(u.uid)} style={{ background: "#ef4444", border: "none", borderRadius: "var(--radius-sm)", padding: "6px 12px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>拒絕</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// CreateGroupModal

function CreateGroupModal({ friends, onClose, onCreate }) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState([]);

  const toggle = (uid) => {
    setSelected(prev => prev.includes(uid) ? prev.filter(u => u !== uid) : [...prev, uid]);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <div className="cr-modal-full" style={{ background: "var(--panel)", borderRadius: 20, width: 400, maxWidth: "92vw", maxHeight: "80vh", overflow: "auto", border: "1px solid var(--border)", padding: 24, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ color: "var(--text)", margin: 0, fontSize: 18, fontWeight: 700 }}>建立群組</h3>
          <button onClick={onClose} className="cr-close-btn" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 24 }}>✕</button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 6, display: "block" }}>群組名稱</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="輸入群組名稱..."
            style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 8, display: "block" }}>成員（選擇好友加入）</label>
          {friends.length === 0 && <div style={{ color: "var(--text-faint)", fontSize: 13, padding: "8px 0" }}>尚無好友可加入群組</div>}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {friends.map(f => (
              <button key={f.uid} onClick={() => toggle(f.uid)}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", background: selected.includes(f.uid) ? "var(--accent-active)" : "var(--panel-alt)", border: `1px solid ${selected.includes(f.uid) ? "var(--accent)" : "var(--border)"}`, borderRadius: "var(--radius-md)", cursor: "pointer", textAlign: "left", width: "100%" }}>
                <AvatarImg avatarImage={f.avatarImage} avatar={f.avatar} color={f.color} size={36} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 14 }}>{f.nickname}</div>
                </div>
                <span style={{ color: selected.includes(f.uid) ? "#93c5fd" : "var(--text-dim)", fontSize: 18 }}>
                  {selected.includes(f.uid) ? "✓" : "+"}
                </span>
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={() => name.trim() && onCreate(name.trim(), selected)}
          disabled={!name.trim()}
          style={{ width: "100%", background: name.trim() ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : "var(--panel)", border: "none", borderRadius: "var(--radius-md)", padding: "12px", color: name.trim() ? "#fff" : "var(--text-dim)", fontSize: 15, fontWeight: 700, cursor: name.trim() ? "pointer" : "default" }}>
          建立群組 ({1 + selected.length} 人)
        </button>
      </div>
    </div>
  );
}

// RankBadge

function RankBadge({ rank, size = 32 }) {
  const bg =
    rank === 1 ? "linear-gradient(135deg,#f59e0b,#fbbf24)" :
    rank === 2 ? "linear-gradient(135deg,var(--text-muted),var(--text-subtle))" :
    rank === 3 ? "linear-gradient(135deg,#d97706,#b45309)" :
               "linear-gradient(135deg,var(--border),var(--text-dim))";
  return (
    <div style={{ width: size * 1.6, height: size, borderRadius: size * 0.5, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.45, fontWeight: 800, color: "#fff", flexShrink: 0 }}>
      {rank}
    </div>
  );
}

// DonateModal

function DonateModal({ myProfile, onClose }) {
  const [amount, setAmount] = useState(50);
  const [customInput, setCustomInput] = useState("");
  const [useCustom, setUseCustom] = useState(false);
  const [loading, setLoading] = useState(false);

  const finalAmount = useCustom ? (parseInt(customInput, 10) || 0) : amount;

  const handleDonate = async () => {
    if (finalAmount < 1) { alert("請輸入最少 HK$1 的金額"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: myProfile.uid,
          userNickname: myProfile.nickname || "",
          userAvatar: myProfile.avatar || "",
          userColor: myProfile.color || "",
          userAvatarImage: myProfile.avatarImage || "",
          amount: finalAmount,
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else alert("付款失敗：" + (data.error || "請稍後再試"));
    } catch {
      alert("付款發生錯誤，請重試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="cr-sheet-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
      <div className="cr-sheet" style={{ background: "var(--panel)", borderRadius: 20, width: 380, maxWidth: "92vw", border: "1px solid var(--border)", padding: 28, boxSizing: "border-box" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text)" }}>🎁 打賞</h3>
          <button onClick={onClose} className="cr-close-btn" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 24 }}>✕</button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 12 }}>
          {[10, 30, 50, 100].map(a => (
            <button key={a} onClick={() => { setAmount(a); setUseCustom(false); }}
              style={{ flex: "1 1 70px", padding: "12px 0", borderRadius: "var(--radius-md)", border: !useCustom && amount === a ? "2px solid #f59e0b" : "2px solid var(--border)", background: !useCustom && amount === a ? "rgba(245,158,11,0.15)" : "var(--panel-alt)", color: !useCustom && amount === a ? "#fbbf24" : "var(--text-muted)", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
              HK${a}
            </button>
          ))}
        </div>
        <div style={{ marginBottom: 20 }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: useCustom ? "#fbbf24" : "var(--text-faint)", fontWeight: 700, fontSize: 15, pointerEvents: "none" }}>HK$</span>
            <input
              type="number" min="1" placeholder="輸入金額"
              value={customInput}
              onChange={e => { setCustomInput(e.target.value); setUseCustom(true); }}
              onFocus={() => setUseCustom(true)}
              style={{ width: "100%", background: useCustom ? "rgba(245,158,11,0.1)" : "var(--panel-alt)", border: useCustom ? "2px solid #f59e0b" : "2px solid var(--border)", borderRadius: "var(--radius-md)", padding: "12px 14px 12px 52px", color: "var(--text)", fontSize: 16, fontWeight: 700, outline: "none", boxSizing: "border-box" }}
            />
          </div>
        </div>
        <button onClick={handleDonate} disabled={loading || finalAmount < 1}
          style={{ width: "100%", background: finalAmount >= 1 && !loading ? "linear-gradient(135deg,#f59e0b,#d97706)" : "var(--border)", border: "none", borderRadius: "var(--radius-md)", padding: "14px", color: "#fff", fontSize: 16, fontWeight: 700, cursor: finalAmount >= 1 && !loading ? "pointer" : "default", transition: "all 0.15s" }}>
          {loading ? "處理中..." : finalAmount >= 1 ? `🎁 打賞 HK${finalAmount}` : "🎁 打賞"}
        </button>
        <div style={{ textAlign: "center", fontSize: 12, color: "var(--text-dim)", marginTop: 10 }}>支援信用卡、Apple Pay 等付款方式</div>
      </div>
    </div>
  );
}

// Main ChatApp

export default function ChatApp({ user }) {
  const uid = user.uid;

  const [myProfile,      setMyProfile]      = useState(null);
  const [friendProfiles, setFriendProfiles] = useState({});
  const [hallMessages,   setHallMessages]   = useState([]);
  const [privateMessages,setPrivateMessages]= useState([]);
  const [activeFriendId, setActiveFriendId] = useState(null);
  const [hallInput,      setHallInput]      = useState("");
  const [privateInput,   setPrivateInput]   = useState("");
  const [hallUploading,  setHallUploading]  = useState(false);
  const [privateUploading, setPrivateUploading] = useState(false);
  const [showProfile,    setShowProfile]    = useState(false);
  const [showFriendSearch, setShowFriendSearch] = useState(false);
  const [showFriendReqs,   setShowFriendReqs]   = useState(false);
  const [searchQuery,    setSearchQuery]    = useState("");
  const [contextMenu,    setContextMenu]    = useState(null);
  const [friendInfo,     setFriendInfo]     = useState(null);

  // Group states
  const [myGroups,       setMyGroups]       = useState([]);
  const [activeGroupId,  setActiveGroupId]  = useState(null);
  const [groupMessages,  setGroupMessages]  = useState([]);
  const [showCreateGroup,setShowCreateGroup]= useState(false);
  const [groupInput,     setGroupInput]     = useState("");
  const [groupUploading, setGroupUploading] = useState(false);

  // Leaderboard states
  const [showLeaderboard,  setShowLeaderboard]  = useState(false);
  const [donations,        setDonations]        = useState([]);
  const [showDonateModal,  setShowDonateModal]  = useState(false);

  // Vocab states
  const [showVocab,          setShowVocab]          = useState(false);
  const [showSpanish,        setShowSpanish]        = useState(false);
  const [showSpanishCourse,  setShowSpanishCourse]  = useState(false);
  const [showCustomVocab,    setShowCustomVocab]    = useState(false);
  const [showDict,           setShowDict]           = useState(false);
  const [frenchView,         setFrenchView]         = useState(null); // null | 'pron' | 'a1' | 'grammar' | 'a1exam'
  const [showSpanishPron,    setShowSpanishPron]    = useState(false);
  const [showSpanishGrammar, setShowSpanishGrammar] = useState(false);
  const [showSpanishVerbs,   setShowSpanishVerbs]   = useState(false);
  const [spanishCourseNoteContext, setSpanishCourseNoteContext] = useState(null); // {key, title} reported by SpanishCourseRoom's current lesson
  const [showEnglishPron,    setShowEnglishPron]    = useState(false);
  const [showIeltsBand4,     setShowIeltsBand4]     = useState(false);

  // Mobile / sidebar states
  const [isMobile,       setIsMobile]       = useState(false);
  const [calendarOpen,   setCalendarOpen]   = useState(false);
  const [mobileView,     setMobileView]     = useState(null); // 'list' | 'more' | null (content-driven)

  const resetAllViews = useCallback(() => {
    setActiveFriendId(null); setActiveGroupId(null);
    setShowLeaderboard(false); setShowCinema(false);
    setShowVocab(false); setShowSpanish(false); setShowSpanishCourse(false);
    setShowCustomVocab(false); setShowDict(false); setFrenchView(null);
    setShowSpanishPron(false); setShowSpanishGrammar(false); setShowSpanishVerbs(false);
    setShowEnglishPron(false); setShowIeltsBand4(false);
  }, []);

  // Cinema states
  const [showCinema,       setShowCinema]       = useState(false);
  const [cinemaView,       setCinemaView]       = useState('list');
  const [cinemaRooms,      setCinemaRooms]      = useState([]);
  const [activeCinemaRoom, setActiveCinemaRoom] = useState(null);
  const [cinemaComments,   setCinemaComments]   = useState([]);
  const [cinemaInput,      setCinemaInput]      = useState('');
  const [isHosting,        setIsHosting]        = useState(false);
  const [screenStream,     setScreenStream]     = useState(null);
  const [remoteStream,     setRemoteStream]     = useState(null);
  const [cinemaTitleInput, setCinemaTitleInput] = useState('');
  const [showCreateCinema, setShowCreateCinema] = useState(false);
  const [cinemaViewerCount, setCinemaViewerCount] = useState(0);

  const messagesEndRef = useRef(null);
  const loadedFriendIds = useRef(new Set());
  const longPressTimerRef = useRef(null);
  const longPressFiredRef = useRef(false);
  const hallFileRef = useRef(null);
  const privateFileRef = useRef(null);
  const groupFileRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const myPeerRef = useRef(null);
  const cinemaCommentsEndRef = useRef(null);
  const mainTouchRef = useRef(null); // 手機版：從內容區域向右滑，回到聊天列表/更多選單
  const signalUnsubRef = useRef(null);
  const commentsUnsubRef = useRef(null);
  const viewersUnsubRef = useRef(null);

  const chatId = activeFriendId ? [uid, activeFriendId].sort().join('_') : null;

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [contextMenu]);

  useEffect(() => {
    return onSnapshot(doc(db, 'users', uid), snap => {
      if (snap.exists()) setMyProfile({ uid, ...snap.data() });
    });
  }, [uid]);

  const friendsKey = myProfile?.friends?.join(',') || '';
  useEffect(() => {
    if (!myProfile?.friends?.length) return;
    const missing = myProfile.friends.filter(fid => !loadedFriendIds.current.has(fid));
    if (!missing.length) return;
    missing.forEach(fid => loadedFriendIds.current.add(fid));
    Promise.all(missing.map(fid => getDoc(doc(db, 'users', fid)))).then(snaps => {
      const profiles = {};
      snaps.forEach(s => { if (s.exists()) profiles[s.id] = { uid: s.id, ...s.data() }; });
      if (Object.keys(profiles).length) setFriendProfiles(prev => ({ ...prev, ...profiles }));
    });
  }, [friendsKey]);

  useEffect(() => {
    const q = query(collection(db, 'hall_messages'), orderBy('createdAt'), limitToLast(50));
    return onSnapshot(q, snap => {
      setHallMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  useEffect(() => {
    if (!activeFriendId) { setPrivateMessages([]); return; }
    const q = query(collection(db, 'private_chats', chatId, 'messages'), orderBy('createdAt'), limitToLast(50));
    return onSnapshot(q, snap => {
      setPrivateMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [uid, activeFriendId]);

  // Groups listener
  useEffect(() => {
    const q = query(collection(db, 'groups'), where('members', 'array-contains', uid));
    return onSnapshot(q, snap => {
      setMyGroups(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [uid]);

  // Group messages listener
  useEffect(() => {
    if (!activeGroupId) { setGroupMessages([]); return; }
    const q = query(collection(db, 'groups', activeGroupId, 'messages'), orderBy('createdAt'), limitToLast(50));
    return onSnapshot(q, snap => {
      setGroupMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, [activeGroupId]);

  // Donations listener
  useEffect(() => {
    return onSnapshot(collection(db, 'donations'), snap => {
      setDonations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Cinema rooms listener
  useEffect(() => {
    return onSnapshot(collection(db, 'cinemaRooms'), snap => {
      setCinemaRooms(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
  }, []);

  // Scroll cinema comments to bottom
  useEffect(() => {
    cinemaCommentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [cinemaComments]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [hallMessages, privateMessages, groupMessages]);

  useEffect(() => {
    const onVisibility = () => {
      const s = document.visibilityState === "hidden" ? "offline" : "online";
      updateDoc(doc(db, "users", uid), { status: s });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [uid]);

  // Mobile detection
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // Escape to close calendar overlay
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") setCalendarOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Lock body scroll when calendar open on mobile
  useEffect(() => {
    if (isMobile && calendarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isMobile, calendarOpen]);

  useEffect(() => {
    let timer;
    let isAway = false;
    const AWAY_MS = 15 * 60 * 1000;
    const reset = () => {
      clearTimeout(timer);
      if (isAway) { isAway = false; updateDoc(doc(db, "users", uid), { status: "online" }); }
      timer = setTimeout(() => { isAway = true; updateDoc(doc(db, "users", uid), { status: "away" }); }, AWAY_MS);
    };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach(e => document.addEventListener(e, reset));
    reset();
    return () => { clearTimeout(timer); events.forEach(e => document.removeEventListener(e, reset)); };
  }, [uid]);

  // Firestore write helpers

  const sendHall = useCallback(async () => {
    if (!hallInput.trim() || !myProfile) return;
    const text = hallInput.trim();
    setHallInput("");
    await addDoc(collection(db, 'hall_messages'), {
      senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
      senderAvatarImage: myProfile.avatarImage || "",
      text, createdAt: serverTimestamp(),
    });
  }, [hallInput, myProfile, uid]);

  const sendHallMedia = useCallback(async (file) => {
    if (!myProfile) return;
    setHallUploading(true);
    try {
      const url = await uploadToR2(file);
      const isVideo = file.type.startsWith("video/");
      await addDoc(collection(db, 'hall_messages'), {
        senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
        senderAvatarImage: myProfile.avatarImage || "",
        text: "", imageUrl: isVideo ? "" : url, videoUrl: isVideo ? url : "", createdAt: serverTimestamp(),
      });
    } catch {
      alert("上傳失敗，請重試");
    } finally {
      setHallUploading(false);
    }
  }, [myProfile, uid]);

  const sendPrivate = useCallback(async () => {
    if (!privateInput.trim() || !activeFriendId || !myProfile) return;
    const text = privateInput.trim();
    setPrivateInput("");
    await addDoc(collection(db, 'private_chats', chatId, 'messages'), {
      senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
      senderAvatarImage: myProfile.avatarImage || "",
      text, createdAt: serverTimestamp(),
    });
  }, [privateInput, activeFriendId, myProfile, uid, chatId]);

  const sendPrivateMedia = useCallback(async (file) => {
    if (!activeFriendId || !myProfile) return;
    setPrivateUploading(true);
    try {
      const url = await uploadToR2(file);
      const isVideo = file.type.startsWith("video/");
      await addDoc(collection(db, 'private_chats', chatId, 'messages'), {
        senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
        senderAvatarImage: myProfile.avatarImage || "",
        text: "", imageUrl: isVideo ? "" : url, videoUrl: isVideo ? url : "", createdAt: serverTimestamp(),
      });
    } catch {
      alert("上傳失敗，請重試");
    } finally {
      setPrivateUploading(false);
    }
  }, [activeFriendId, myProfile, uid, chatId]);

  const sendGroup = useCallback(async () => {
    if (!groupInput.trim() || !activeGroupId || !myProfile) return;
    const text = groupInput.trim();
    setGroupInput("");
    await addDoc(collection(db, 'groups', activeGroupId, 'messages'), {
      senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
      senderAvatarImage: myProfile.avatarImage || "",
      text, imageUrl: "", videoUrl: "", createdAt: serverTimestamp(),
    });
  }, [groupInput, activeGroupId, myProfile, uid]);

  const sendGroupMedia = useCallback(async (file) => {
    if (!activeGroupId || !myProfile) return;
    setGroupUploading(true);
    try {
      const url = await uploadToR2(file);
      const isVideo = file.type.startsWith("video/");
      await addDoc(collection(db, 'groups', activeGroupId, 'messages'), {
        senderId: uid, sender: myProfile.nickname, avatar: myProfile.avatar,
        senderAvatarImage: myProfile.avatarImage || "",
        text: "", imageUrl: isVideo ? "" : url, videoUrl: isVideo ? url : "", createdAt: serverTimestamp(),
      });
    } catch {
      alert("上傳失敗，請重試");
    } finally {
      setGroupUploading(false);
    }
  }, [activeGroupId, myProfile, uid]);

  const handleSaveProfile = useCallback(async (patch) => {
    await updateDoc(doc(db, 'users', uid), patch);
    setShowProfile(false);
  }, [uid]);

  const handleSendFriendRequest = useCallback(async (targetUid) => {
    await updateDoc(doc(db, 'users', uid),       { pendingOut: arrayUnion(targetUid) });
    await updateDoc(doc(db, 'users', targetUid), { pendingIn:  arrayUnion(uid) });
    setShowFriendSearch(false);
  }, [uid]);

  const handleAcceptFriend = useCallback(async (fromUid) => {
    await updateDoc(doc(db, 'users', uid),     { friends: arrayUnion(fromUid), pendingIn:  arrayRemove(fromUid) });
    await updateDoc(doc(db, 'users', fromUid), { friends: arrayUnion(uid),     pendingOut: arrayRemove(uid) });
  }, [uid]);

  const handleDeclineFriend = useCallback(async (fromUid) => {
    await updateDoc(doc(db, 'users', uid),     { pendingIn:  arrayRemove(fromUid) });
    await updateDoc(doc(db, 'users', fromUid), { pendingOut: arrayRemove(uid) });
  }, [uid]);

  const handleCreateGroup = useCallback(async (name, memberUids) => {
    const members = [uid, ...memberUids];
    const ref = await addDoc(collection(db, 'groups'), {
      name,
      avatar: "👥",
      members,
      createdBy: uid,
      createdAt: serverTimestamp(),
    });
    setActiveGroupId(ref.id);
    setActiveFriendId(null);
    setShowCreateGroup(false);
  }, [uid]);

  // Cinema / WebRTC

  const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  const startHostSignaling = (roomId, stream) => {
    const q = query(collection(db, 'cinemaRooms', roomId, 'signals'), where('type', '==', 'offer'));
    signalUnsubRef.current = onSnapshot(q, async snap => {
      for (const change of snap.docChanges()) {
        if (change.type !== 'added') continue;
        const { viewerId, data } = change.doc.data();
        if (peerConnectionsRef.current[viewerId]) continue;
        const pc = new RTCPeerConnection(ICE_SERVERS);
        peerConnectionsRef.current[viewerId] = pc;
        stream.getTracks().forEach(track => pc.addTrack(track, stream));
        pc.onicecandidate = async ({ candidate }) => {
          if (candidate) await addDoc(collection(db, 'cinemaRooms', roomId, 'signals'), {
            type: 'host-ice', viewerId, data: candidate.toJSON(), createdAt: serverTimestamp(),
          });
        };
        await pc.setRemoteDescription(new RTCSessionDescription(data));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await addDoc(collection(db, 'cinemaRooms', roomId, 'signals'), {
          type: 'answer', viewerId, data: { type: answer.type, sdp: answer.sdp }, createdAt: serverTimestamp(),
        });
        const iceQ = query(collection(db, 'cinemaRooms', roomId, 'signals'),
          where('type', '==', 'viewer-ice'), where('viewerId', '==', viewerId));
        onSnapshot(iceQ, iceSnap => {
          iceSnap.docChanges().forEach(async ch => {
            if (ch.type === 'added') { try { await pc.addIceCandidate(new RTCIceCandidate(ch.doc.data().data)); } catch {} }
          });
        });
      }
    });
  };

  const createCinemaRoom = async () => {
    if (!cinemaTitleInput.trim() || !myProfile) return;
    const roomRef = await addDoc(collection(db, 'cinemaRooms'), {
      hostId: uid, hostNickname: myProfile.nickname, hostAvatar: myProfile.avatar,
      hostColor: myProfile.color, hostAvatarImage: myProfile.avatarImage || '',
      title: cinemaTitleInput.trim(), isLive: true, createdAt: serverTimestamp(),
    });
    const room = { id: roomRef.id, hostId: uid, title: cinemaTitleInput.trim(), hostNickname: myProfile.nickname, hostAvatar: myProfile.avatar, hostColor: myProfile.color, hostAvatarImage: myProfile.avatarImage || '' };
    setIsHosting(true);
    setActiveCinemaRoom(room);
    setCinemaView('room');
    setShowCreateCinema(false);
    setCinemaTitleInput('');
    commentsUnsubRef.current = onSnapshot(
      query(collection(db, 'cinemaRooms', roomRef.id, 'comments'), orderBy('createdAt')),
      snap => setCinemaComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    await setDoc(doc(db, 'cinemaRooms', roomRef.id, 'viewers', uid), { nickname: myProfile.nickname, joinedAt: serverTimestamp() });
    viewersUnsubRef.current = onSnapshot(
      collection(db, 'cinemaRooms', roomRef.id, 'viewers'),
      snap => setCinemaViewerCount(snap.size)
    );
  };

  const startHostStream = async () => {
    if (!activeCinemaRoom) return;
    let stream;
    try { stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true }); }
    catch { return; }
    setScreenStream(stream);
    setTimeout(() => { if (localVideoRef.current) localVideoRef.current.srcObject = stream; }, 100);
    stream.getVideoTracks()[0].onended = () => leaveCinemaRoom(activeCinemaRoom.id, true);
    startHostSignaling(activeCinemaRoom.id, stream);
  };

  const joinCinemaRoom = async (room) => {
    setActiveCinemaRoom(room);
    setCinemaView('room');
    commentsUnsubRef.current = onSnapshot(
      query(collection(db, 'cinemaRooms', room.id, 'comments'), orderBy('createdAt')),
      snap => setCinemaComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    );
    await setDoc(doc(db, 'cinemaRooms', room.id, 'viewers', uid), { nickname: myProfile?.nickname || '', joinedAt: serverTimestamp() });
    viewersUnsubRef.current = onSnapshot(
      collection(db, 'cinemaRooms', room.id, 'viewers'),
      snap => setCinemaViewerCount(snap.size)
    );
    if (room.hostId === uid) return;
    const pc = new RTCPeerConnection(ICE_SERVERS);
    myPeerRef.current = pc;
    pc.ontrack = (e) => {
      setRemoteStream(e.streams[0]);
      setTimeout(() => { if (remoteVideoRef.current) remoteVideoRef.current.srcObject = e.streams[0]; }, 100);
    };
    pc.onicecandidate = async ({ candidate }) => {
      if (candidate) await addDoc(collection(db, 'cinemaRooms', room.id, 'signals'), {
        type: 'viewer-ice', viewerId: uid, data: candidate.toJSON(), createdAt: serverTimestamp(),
      });
    };
    const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: true });
    await pc.setLocalDescription(offer);
    await addDoc(collection(db, 'cinemaRooms', room.id, 'signals'), {
      type: 'offer', viewerId: uid, data: { type: offer.type, sdp: offer.sdp }, createdAt: serverTimestamp(),
    });
    const answerQ = query(collection(db, 'cinemaRooms', room.id, 'signals'),
      where('type', '==', 'answer'), where('viewerId', '==', uid));
    const answerUnsub = onSnapshot(answerQ, async snap => {
      if (snap.empty || pc.remoteDescription) return;
      await pc.setRemoteDescription(new RTCSessionDescription(snap.docs[0].data().data));
      answerUnsub();
    });
    const hostIceQ = query(collection(db, 'cinemaRooms', room.id, 'signals'),
      where('type', '==', 'host-ice'), where('viewerId', '==', uid));
    onSnapshot(hostIceQ, snap => {
      snap.docChanges().forEach(async ch => {
        if (ch.type === 'added') { try { await pc.addIceCandidate(new RTCIceCandidate(ch.doc.data().data)); } catch {} }
      });
    });
  };

  const leaveCinemaRoom = async (roomId, asHost = false) => {
    if (myPeerRef.current) { myPeerRef.current.close(); myPeerRef.current = null; }
    Object.values(peerConnectionsRef.current).forEach(pc => pc.close());
    peerConnectionsRef.current = {};
    if (screenStream) { screenStream.getTracks().forEach(t => t.stop()); }
    setScreenStream(null);
    setRemoteStream(null);
    const rid = roomId || activeCinemaRoom?.id;
    if (rid) { try { await deleteDoc(doc(db, 'cinemaRooms', rid, 'viewers', uid)); } catch {} }
    if (asHost) {
      if (rid) { try { await deleteDoc(doc(db, 'cinemaRooms', rid)); } catch {} }
    }
    if (signalUnsubRef.current) { signalUnsubRef.current(); signalUnsubRef.current = null; }
    if (commentsUnsubRef.current) { commentsUnsubRef.current(); commentsUnsubRef.current = null; }
    if (viewersUnsubRef.current) { viewersUnsubRef.current(); viewersUnsubRef.current = null; }
    setIsHosting(false);
    setActiveCinemaRoom(null);
    setCinemaComments([]);
    setCinemaInput('');
    setCinemaViewerCount(0);
    setCinemaView('list');
  };

  const sendCinemaComment = async () => {
    if (!cinemaInput.trim() || !activeCinemaRoom || !myProfile) return;
    const text = cinemaInput.trim();
    setCinemaInput('');
    await addDoc(collection(db, 'cinemaRooms', activeCinemaRoom.id, 'comments'), {
      userId: uid, userNickname: myProfile.nickname, userAvatar: myProfile.avatar,
      userColor: myProfile.color, text, createdAt: serverTimestamp(),
    });
  };

  if (!myProfile) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--bg)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "var(--text-faint)" }}>載入中...</div>
      </div>
    );
  }

  const activeFriendProfile = activeFriendId ? friendProfiles[activeFriendId] : null;
  const myFriends = (myProfile.friends || [])
    .map(fid => friendProfiles[fid])
    .filter(f => f && (!searchQuery || f.nickname.toLowerCase().includes(searchQuery.toLowerCase())));
  const pendingInCount = (myProfile.pendingIn || []).length;
  const activeGroup = activeGroupId ? myGroups.find(g => g.id === activeGroupId) : null;

  // Mobile nav: which top-level destination is currently "drilled into"
  const inTool = showLeaderboard || showCinema || showVocab || showSpanish || showSpanishCourse ||
    showCustomVocab || showDict || showSpanishPron || showSpanishGrammar || showSpanishVerbs ||
    showEnglishPron || showIeltsBand4;
  const inThread = !!activeFriendId || !!activeGroupId;

  // 手機版：在內容區域（聊天串/工具畫面）向右滑，回到左側導覽（聊天列表或更多選單），
  // 跟頂部返回鍵是同一個動作，只是多一種手勢觸發方式。用水平位移為主的門檻避免誤觸垂直捲動。
  function handleMainTouchStart(e) {
    if (!isMobile || mobileView !== null) return;
    const t = e.touches[0];
    mainTouchRef.current = { x: t.clientX, y: t.clientY };
  }
  function handleMainTouchEnd(e) {
    const start = mainTouchRef.current;
    mainTouchRef.current = null;
    if (!start || !isMobile || mobileView !== null) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (dx < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    if (inTool) setMobileView('more');
    else { resetAllViews(); setMobileView('list'); }
  }

  const leaderboard = Object.values(
    donations.reduce((acc, d) => {
      if (!acc[d.userId]) acc[d.userId] = { userId: d.userId, userNickname: d.userNickname, userAvatar: d.userAvatar, userColor: d.userColor, userAvatarImage: d.userAvatarImage, total: 0 };
      acc[d.userId].total += (d.amount || 0);
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);

  // 本頁筆記：右側日曆下方的筆記格，依目前顯示的西語頁面決定 key/標題。
  // SpanishCourseRoom 會用 onContextChange 回報目前的關卡，取得更細的 key。
  let activeSpanishNotes = null;
  if (showSpanishCourse) activeSpanishNotes = spanishCourseNoteContext || { key: "spanish-course-home", title: "西語 A1 路線" };
  else if (showSpanishPron) activeSpanishNotes = { key: "spanish-pron", title: "西語發音" };
  else if (showSpanishGrammar) activeSpanishNotes = { key: "spanish-grammar", title: "西語文法" };
  else if (showSpanishVerbs) activeSpanishNotes = { key: "spanish-verbs", title: "西語動詞變位表" };
  else if (showDict) activeSpanishNotes = { key: "spanish-dict", title: "西語字典" };
  else if (showSpanish) activeSpanishNotes = { key: "spanish-home", title: "西班牙語學習" };

  return (
    <>
      <style>{`
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        .fb:hover { background: var(--accent-hover) !important; }
        .fb.act  { background: var(--accent-active) !important; box-shadow: var(--glow-shadow); }
        .sb:hover:not(:disabled) { background: #2563eb !important; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }

        /* ── Global overflow guard ── */
        html, body { overflow-x: hidden; }
        #__next { overflow-x: hidden; }

        /* ── Mobile topbar: hidden on desktop ── */
        .cr-mobile-topbar { display: none; }

        /* ── Mobile tab bar: hidden on desktop ── */
        .cr-tabbar { display: none; }

        /* ── Calendar overlay ── */
        .cr-cal { flex-shrink: 0; }

        @media (max-width: 767px) {
          /* Prevent iOS Safari auto-zoom on input focus (needs >=16px) */
          input, textarea, select { font-size: 16px !important; }

          /* Shell fills full screen */
          .cr-shell {
            margin: 0 !important;
            height: 100dvh !important;
            border-radius: 0 !important;
            flex-direction: column !important;
          }

          /* Sidebar (聊天分頁): full-width panel, shown/hidden via JS display toggle */
          .cr-sidebar {
            width: 100% !important;
            border-right: none !important;
            padding-top: env(safe-area-inset-top) !important;
          }

          /* Main area: always full width */
          .cr-main {
            width: 100% !important;
            max-width: 100% !important;
            min-width: 0 !important;
            flex: 1 !important;
            /* 沒有 min-height:0，flex 子項目預設 min-height:auto 會撐開超過可用空間，
               導致內容被 .cr-shell 的 overflow:hidden 直接裁掉，而不是自己捲動——
               這是各個「room」（西語課程/字典/大廳訊息等）在手機版滑不動的根本原因。 */
            min-height: 0 !important;
            overflow-x: hidden !important;
            overflow-y: hidden !important;
          }

          /* Mobile topbar shown */
          .cr-mobile-topbar {
            display: flex !important;
            align-items: center;
            gap: 10px;
            padding: calc(env(safe-area-inset-top) + 8px) 14px 8px;
            background: var(--panel-alt);
            border-bottom: 1px solid var(--panel);
            flex-shrink: 0;
          }

          /* Bottom tab bar shown */
          .cr-tabbar {
            display: flex !important;
            flex-shrink: 0;
            border-top: 1px solid var(--panel);
            background: var(--panel-alt);
            padding-bottom: env(safe-area-inset-bottom);
          }

          /* Calendar: full-screen overlay */
          .cr-cal {
            position: fixed !important;
            inset: 0 !important;
            width: 100% !important;
            height: 100dvh !important;
            z-index: 350 !important;
            transform: translateX(100%);
            transition: transform 0.28s ease;
            overflow: hidden !important;
            display: flex;
            flex-direction: column;
          }
          .cr-cal-open { transform: translateX(0) !important; }

          /* Input areas: safe area padding at bottom */
          .cr-input-bar {
            padding-bottom: calc(env(safe-area-inset-bottom) + 10px) !important;
          }

          /* Prevent any child from causing horizontal scroll */
          .cr-main > * { max-width: 100%; }

          /* Calendar inner: full width on mobile overlay */
          .cal-inner {
            width: 100% !important;
            height: 100% !important;
            border-left: none !important;
            flex: 1 !important;
          }

          /* Comfortable ~44px touch target for icon-only close buttons */
          .cr-close-btn {
            min-width: 44px !important;
            min-height: 44px !important;
            display: flex !important;
            align-items: center;
            justify-content: center;
          }

          /* Modal → bottom sheet */
          .cr-sheet-overlay { align-items: flex-end !important; }
          .cr-sheet {
            width: 100% !important;
            max-width: 100% !important;
            border-radius: 20px 20px 0 0 !important;
            max-height: 80vh !important;
            padding-bottom: calc(20px + env(safe-area-inset-bottom)) !important;
          }

          /* Modal → full-screen */
          .cr-modal-full {
            border-radius: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: 100dvh !important;
            max-height: 100dvh !important;
          }
        }
      `}</style>

      {showProfile    && <ProfilePage myProfile={myProfile} friendProfiles={friendProfiles} onSave={handleSaveProfile} onClose={() => setShowProfile(false)} />}
      {showFriendSearch && <FriendSearch myUid={uid} myProfile={myProfile} onClose={() => setShowFriendSearch(false)} onSendRequest={handleSendFriendRequest} />}
      {showFriendReqs && <FriendRequests myProfile={myProfile} onAccept={handleAcceptFriend} onDecline={handleDeclineFriend} onClose={() => setShowFriendReqs(false)} />}
      {showCreateGroup && <CreateGroupModal friends={myFriends} onClose={() => setShowCreateGroup(false)} onCreate={handleCreateGroup} />}
      {showDonateModal && <DonateModal myProfile={myProfile} onClose={() => setShowDonateModal(false)} />}

      {/* Right-click context menu */}
      {contextMenu && (
        <div onClick={e => e.stopPropagation()} style={{ position: "fixed", top: Math.min(contextMenu.y, window.innerHeight - 140), left: Math.min(contextMenu.x, window.innerWidth - 170), background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "4px 0", zIndex: 450, minWidth: 160, boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
          <Link href={`/profile/${contextMenu.friend.uid}`} onClick={() => setContextMenu(null)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px", color: "var(--text)", textDecoration: "none", fontSize: 13 }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            🔍 查看個人檔案
          </Link>
          <button onClick={() => { setFriendInfo(contextMenu.friend); setContextMenu(null); }}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", color: "var(--text)", background: "none", border: "none", textAlign: "left", fontSize: 13, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            ℹ️ 個人資料
          </button>
          <div style={{ height: 1, background: "var(--border)", margin: "4px 0" }} />
          <button onClick={() => { setActiveFriendId(contextMenu.friend.uid); setActiveGroupId(null); setShowLeaderboard(false); setContextMenu(null); }}
            style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "9px 14px", color: "var(--text)", background: "none", border: "none", textAlign: "left", fontSize: 13, cursor: "pointer" }}
            onMouseEnter={e => e.currentTarget.style.background = "var(--border)"}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
            💬 傳送訊息</button>
        </div>
      )}

      {/* Friend info card */}
      {friendInfo && (
        <div onClick={() => setFriendInfo(null)} className="cr-sheet-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
          <div onClick={e => e.stopPropagation()} className="cr-sheet" style={{ background: "var(--panel)", borderRadius: 20, width: 320, maxWidth: "92vw", border: "1px solid var(--border)", overflow: "hidden" }}>
            <div style={{ background: friendInfo.profileBgType === "image" ? undefined : (friendInfo.profileBg || "linear-gradient(135deg,var(--accent-hover),#2d1f6e)"), backgroundImage: friendInfo.profileBgType === "image" ? `url(${friendInfo.profileBg})` : undefined, backgroundSize: "cover", backgroundPosition: "center", height: 80, position: "relative" }}>
              <button onClick={() => setFriendInfo(null)} className="cr-close-btn" style={{ position: "absolute", top: 8, right: 8, background: "rgba(0,0,0,0.4)", border: "none", borderRadius: "50%", width: 28, height: 28, color: "#fff", cursor: "pointer", fontSize: 14 }}>✕</button>
            </div>
            <div style={{ padding: "0 20px 20px", marginTop: -30 }}>
              <AvatarImg avatarImage={friendInfo.avatarImage} avatar={friendInfo.avatar} color={friendInfo.color} size={60} />
              <div style={{ marginTop: 10 }}>
                <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text)" }}>{friendInfo.nickname}</div>
                {friendInfo.signature && <div style={{ fontSize: 13, color: "var(--text-muted)", fontStyle: "italic", marginTop: 2 }}>{friendInfo.signature}</div>}
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 6, background: `${getStatus(friendInfo.status).color}22`, border: `1px solid ${getStatus(friendInfo.status).color}`, borderRadius: 20, padding: "2px 8px" }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: getStatus(friendInfo.status).color, display: "inline-block" }} />
                  <span style={{ fontSize: 11, color: getStatus(friendInfo.status).color, fontWeight: 600 }}>{getStatus(friendInfo.status).label}</span>
                </div>
                {friendInfo.statusText && <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>{friendInfo.statusText}</div>}
                {friendInfo.bio && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.6 }}>{friendInfo.bio}</div>}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
                <button onClick={() => { setActiveFriendId(friendInfo.uid); setActiveGroupId(null); setShowLeaderboard(false); setFriendInfo(null); }}
                  style={{ flex: 1, background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 0", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
                  💬 傳送訊息                </button>
                <Link href={`/profile/${friendInfo.uid}`} onClick={() => setFriendInfo(null)}
                  style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "9px 0", color: "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  🔍 查看檔案
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="cr-shell" style={{
        display: "flex",
        height: "calc(100vh - var(--shell-margin) * 2 - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
        marginTop: "calc(var(--shell-margin) + env(safe-area-inset-top))",
        marginBottom: "calc(var(--shell-margin) + env(safe-area-inset-bottom))",
        marginLeft: "calc(var(--shell-margin) + env(safe-area-inset-left))",
        marginRight: "calc(var(--shell-margin) + env(safe-area-inset-right))",
        background: "var(--shell-bg)", color: "var(--text)", fontFamily: "var(--font-body)", overflow: "hidden",
        borderRadius: "var(--shell-radius)", boxShadow: "var(--shell-shadow)",
        backdropFilter: "var(--shell-blur)", WebkitBackdropFilter: "var(--shell-blur)",
      }}>

        {/* Mobile topbar: back chevron (in-thread/tool only) + title + calendar */}
        <div className="cr-mobile-topbar">
          {mobileView === null ? (
            <button onClick={() => { if (inTool) { setMobileView('more'); } else { resetAllViews(); setMobileView('list'); } }} aria-label="返回"
              style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", fontSize: 22, padding: 4, lineHeight: 1, flexShrink: 0 }}>
              ‹
            </button>
          ) : (
            <div style={{ width: 22, flexShrink: 0 }} />
          )}
          <div style={{ flex: 1, minWidth: 0, fontWeight: 700, fontSize: 15, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {mobileView === 'list' ? "聊天" : mobileView === 'more' ? "更多" : activeGroup ? activeGroup.name : activeFriendProfile ? activeFriendProfile.nickname : "Evonchat"}
          </div>
          <button onClick={() => setCalendarOpen(true)} aria-label="開啟日曆"
            style={{ background: "none", border: "none", color: "var(--text)", cursor: "pointer", fontSize: 20, padding: 4, lineHeight: 1, flexShrink: 0 }}>
            📅
          </button>
        </div>

        {/* 側邊欄（手機版＝聊天分頁的列表畫面；桌面版＝常駐側欄） */}
        <div className="cr-sidebar" style={{ width: 280, background: "var(--panel-alt)", borderRight: "1px solid var(--panel)", display: (isMobile && mobileView !== 'list') ? "none" : "flex", flexDirection: "column", flexShrink: 0, overflow: "hidden" }}>

          {/* My info */}
          <div style={{ padding: "14px 14px 10px", borderBottom: "1px solid var(--panel)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <button onClick={() => setShowProfile(true)} style={{ background: "none", border: "none", padding: 0, cursor: "pointer", flexShrink: 0 }}>
                <AvatarImg avatarImage={myProfile.avatarImage} avatar={myProfile.avatar} color={myProfile.color} size={42} />
              </button>
              <div style={{ flex: 1, minWidth: 0 }}>
                <Link href={`/profile/${uid}`} style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textDecoration: "none", display: "block" }}
                  onMouseEnter={e => e.currentTarget.style.color = "#93c5fd"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text)"}>
                  {myProfile.nickname}
                </Link>
                {myProfile.signature && <div style={{ fontSize: 12, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontStyle: "italic" }}>{myProfile.signature}</div>}
                {myProfile.statusText && <div style={{ fontSize: 11, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{myProfile.statusText}</div>}
              </div>
              <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                <ThemeToggle mode="inline" onOpenProfile={() => setShowProfile(true)} />
                <button onClick={() => auth.signOut()} title="登出" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 16, padding: 4, borderRadius: "var(--radius-sm)" }}>🚪</button>
              </div>
            </div>
          </div>

          {/* Scrollable nav area */}
          <div style={{ flex: 1, overflowY: "auto", minHeight: 0 }}>

          {/* Friend request banner */}
          {pendingInCount > 0 && (
            <button onClick={() => setShowFriendReqs(true)}
              style={{ margin: "8px 10px 0", display: "flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#dc2626,#b91c1c)", border: "none", borderRadius: "var(--radius-md)", padding: "10px 12px", color: "#fff", cursor: "pointer", width: "calc(100% - 20px)", textAlign: "left" }}>
              <span style={{ fontSize: 18 }}>🔔</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>你有 {pendingInCount} 個好友請求</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>點擊查看並處理</div>
              </div>
            </button>
          )}

          {/* Friend search box */}
          <div style={{ padding: "10px 12px 6px" }}>
            <input type="text" placeholder="搜尋好友..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "7px 12px", color: "var(--text)", fontSize: 13, outline: "none", boxSizing: "border-box" }} />
          </div>

          {/* Feed link */}
          <div style={{ padding: "4px 10px 0" }}>
            <Link href="/feed" style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 10px", borderRadius: "var(--radius-md)", background: "transparent", color: "var(--text)", textDecoration: "none", transition: "background 0.15s" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--accent-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
              <div style={{ width: 34, height: 34, borderRadius: "var(--radius-md)", background: "linear-gradient(135deg,#ec4899,#f59e0b)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>📰</div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>動態消息</div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>查看好友動態</div>
              </div>
            </Link>
          </div>

          {/* Hall button */}
          <div style={{ padding: "4px 10px 0" }}>
            <NavItem icon="💬" iconBg="linear-gradient(135deg,var(--accent-2),#a855f7)" label="# 公共大廳" sublabel="和大家聊天吧" mobileTouch
              active={!activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showCustomVocab && !showDict && !frenchView && !showSpanishPron && !showSpanishGrammar && !showSpanishVerbs && !showEnglishPron && !showIeltsBand4}
              onClick={() => { resetAllViews(); if (isMobile) setMobileView(null); }} />
          </div>

          {!isMobile && (
          <>
          {/* Leaderboard button */}
          <div style={{ padding: "4px 10px 6px" }}>
            <NavItem icon="🏆" iconBg="linear-gradient(135deg,#f59e0b,#fbbf24,#d97706)" label="排行榜" sublabel="積分排名"
              active={showLeaderboard} onClick={() => { resetAllViews(); setShowLeaderboard(true); }} />
          </div>

          {/* Cinema button */}
          <div style={{ padding: "0 10px 6px" }}>
            <NavItem icon="🎬" iconBg="linear-gradient(135deg,var(--accent-hover),#2563eb)" label="電影院" sublabel="同步觀看影片"
              active={showCinema} onClick={() => { resetAllViews(); setShowCinema(true); }} />
          </div>

          {/* English section label */}
          <div style={{ padding: "4px 12px 2px" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase" }}>🇬🇧 英語學習</span>
          </div>

          {/* English Pronunciation button */}
          <div style={{ padding: "0 10px 6px" }}>
            <NavItem compact icon="🔤" iconBg="linear-gradient(135deg,#1e3a5f,#3b82f6)" label="英語發音" sublabel="音標・母音・子音"
              active={showEnglishPron} onClick={() => { resetAllViews(); setShowEnglishPron(true); }} />
          </div>

          {/* IELTS Band 4 button */}
          <div style={{ padding: "0 10px 2px" }}>
            <NavItem compact icon="🎯" iconBg="linear-gradient(135deg,#1e3a1e,#6366f1)" label="IELTS 4.0 入門" sublabel="詞彙・聽力・口說"
              active={showIeltsBand4} onClick={() => { resetAllViews(); setShowIeltsBand4(true); }} />
          </div>

          {/* Vocab button */}
          <div style={{ padding: "0 10px 6px" }}>
            <NavItem icon="📚" iconBg="linear-gradient(135deg,#065f46,#10b981)" label="IELTS 詞彙" sublabel="IELTS 單字練習"
              active={showVocab} onClick={() => { resetAllViews(); setShowVocab(true); }} />
          </div>

          {/* Spanish section label */}
          <div style={{ padding: "4px 12px 2px" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase" }}>🇪🇸 西班牙語</span>
          </div>

          {/* Spanish button */}
          <div style={{ padding: "0 10px 2px" }}>
            <NavItem icon="🇪🇸" iconBg="linear-gradient(135deg,#7c1d1d,#dc2626)" label="西班牙語學習" sublabel="CEFR A1/A2"
              active={showSpanish} onClick={() => { resetAllViews(); setShowSpanish(true); }} />
          </div>

          {/* Spanish Course button */}
          <div style={{ padding: "0 10px 2px" }}>
            <NavItem compact icon="🗺️" iconBg="linear-gradient(135deg,#1e1b4b,#6366f1)" label="西語 A1 路線" sublabel="初學者情境課程"
              active={showSpanishCourse} onClick={() => { resetAllViews(); setShowSpanishCourse(true); }} />
          </div>

          {/* Spanish Pronunciation button */}
          <div style={{ padding: "0 10px 2px" }}>
            <NavItem compact icon="🔤" iconBg="linear-gradient(135deg,#7c1d1d,#b91c1c)" label="西語發音" sublabel="母音 · 子音 · 重音"
              active={showSpanishPron} onClick={() => { resetAllViews(); setShowSpanishPron(true); }} />
          </div>

          {/* Spanish Grammar button */}
          <div style={{ padding: "0 10px 6px" }}>
            <NavItem compact icon="📐" iconBg="linear-gradient(135deg,#14532d,#16a34a)" label="西語文法" sublabel="ser/estar · 代詞 · 動詞"
              active={showSpanishGrammar} onClick={() => { resetAllViews(); setShowSpanishGrammar(true); }} />
          </div>

          {/* Spanish Verb Conjugator button */}
          <div style={{ padding: "0 10px 6px" }}>
            <NavItem compact icon="🧩" iconBg="linear-gradient(135deg,#7c2d12,#dc2626)" label="西語動詞變位" sublabel="完整變位查詢"
              active={showSpanishVerbs} onClick={() => { resetAllViews(); setShowSpanishVerbs(true); }} />
          </div>

          {/* Custom vocab button */}
          <div style={{ padding: "0 10px 6px" }}>
            <NavItem icon="✏️" iconBg="linear-gradient(135deg,var(--accent-hover),#7c3aed)" label="自定詞彙" sublabel="建立個人單字本"
              active={showCustomVocab} onClick={() => { resetAllViews(); setShowCustomVocab(true); }} />
            <div style={{ height: 6 }} />
            <NavItem icon="📖" iconBg="linear-gradient(135deg,#0f2e1c,#166534)" label="字典" sublabel="英・西・法 A-Z"
              active={showDict} onClick={() => { resetAllViews(); setShowDict(true); }} />
          </div>
          </>
          )}

          {/* Groups section */}
          <div style={{ padding: "0 12px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase" }}>群組 {myGroups.length}</span>
            <button onClick={() => setShowCreateGroup(true)} title="建立群組" style={{ background: "var(--border)", border: "none", borderRadius: "var(--radius-sm)", padding: "3px 8px", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}>+</button>
          </div>
          <div style={{ padding: "0 8px 6px" }}>
            {myGroups.map(group => {
              const isActive = activeGroupId === group.id;
              return (
                <button key={group.id} onClick={() => { resetAllViews(); setActiveGroupId(group.id); if (isMobile) setMobileView(null); }}
                  className={`fb ${isActive ? "act" : ""}`}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: "var(--radius-md)", border: "none", background: isActive ? "var(--accent-active)" : "transparent", color: "var(--text)", cursor: "pointer", textAlign: "left", transition: "background 0.15s", marginBottom: 2 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg,var(--text-dim),var(--border))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                    {group.avatar || "👥"}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{(group.members || []).length} 人</div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Friends header */}
          <div style={{ padding: "0 12px 4px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-dim)", letterSpacing: "0.06em", textTransform: "uppercase" }}>好友 {myFriends.length}</span>
            <div style={{ display: "flex", gap: 4 }}>
              {pendingInCount > 0 && (
                <button onClick={() => setShowFriendReqs(true)} title="好友請求" style={{ background: "#ef4444", border: "none", borderRadius: 20, padding: "2px 8px", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", gap: 4 }}>
                  🔔 {pendingInCount}
                </button>
              )}
              <button onClick={() => setShowFriendSearch(true)} title="加好友" style={{ background: "var(--border)", border: "none", borderRadius: "var(--radius-sm)", padding: "3px 8px", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}>+</button>
            </div>
          </div>

          {/* Friend list */}
          <div style={{ padding: "0 8px 8px" }}>
            {myFriends.length === 0 && !searchQuery && (
              <div style={{ textAlign: "center", padding: "20px 12px", color: "var(--text-dim)", fontSize: 13 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>👋</div>
                還沒有好友<br />
                <button onClick={() => setShowFriendSearch(true)} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 13, marginTop: 6 }}>點擊搜尋好友</button>
              </div>
            )}
            {myFriends.map(friend => {
              const isActive = activeFriendId === friend.uid;
              return (
                <button key={friend.uid} onClick={() => { if (longPressFiredRef.current) { longPressFiredRef.current = false; return; } resetAllViews(); setActiveFriendId(friend.uid); if (isMobile) setMobileView(null); }}
                  onContextMenu={e => { e.preventDefault(); setContextMenu({ x: e.clientX, y: e.clientY, friend }); }}
                  onTouchStart={e => {
                    longPressFiredRef.current = false;
                    const touch = e.touches[0];
                    const x = touch.clientX, y = touch.clientY;
                    longPressTimerRef.current = setTimeout(() => {
                      longPressFiredRef.current = true;
                      setContextMenu({ x, y, friend });
                    }, 500);
                  }}
                  onTouchEnd={() => clearTimeout(longPressTimerRef.current)}
                  onTouchMove={() => clearTimeout(longPressTimerRef.current)}
                  className={`fb ${isActive ? "act" : ""}`}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: "var(--radius-md)", border: "none", background: isActive ? "var(--accent-active)" : "transparent", color: "var(--text)", cursor: "pointer", textAlign: "left", transition: "background 0.15s", marginBottom: 2, WebkitTouchCallout: "none", WebkitUserSelect: "none", userSelect: "none" }}>
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <AvatarImg avatarImage={friend.avatarImage} avatar={friend.avatar} color={friend.color} size={36} />
                    <span style={{ position: "absolute", bottom: 1, right: 1, width: 10, height: 10, borderRadius: "50%", background: getStatus(friend.status).color, border: "2px solid var(--panel-alt)" }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{friend.nickname}</div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {friend.statusText || getStatus(friend.status).label}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          </div>
        </div>

        {/* 更多選單（手機版「更多」分頁） */}
        {isMobile && mobileView === 'more' && (
          <ChatMoreMenu
            state={{ showLeaderboard, showCinema, showEnglishPron, showIeltsBand4, showVocab, showSpanish, showSpanishCourse, showSpanishPron, showSpanishGrammar, showSpanishVerbs, showCustomVocab, showDict }}
            setters={{ setShowLeaderboard, setShowCinema, setShowEnglishPron, setShowIeltsBand4, setShowVocab, setShowSpanish, setShowSpanishCourse, setShowSpanishPron, setShowSpanishGrammar, setShowSpanishVerbs, setShowCustomVocab, setShowDict }}
            onOpen={(setter) => { resetAllViews(); setter(true); setMobileView(null); }}
          />
        )}

        {/* 主要區域 */}
        <div className="cr-main" onTouchStart={handleMainTouchStart} onTouchEnd={handleMainTouchEnd}
          style={{ flex: 1, display: (isMobile && mobileView !== null) ? "none" : "flex", flexDirection: "column", background: "var(--bg)", minWidth: 0, minHeight: 0 }}>

          {/* Leaderboard view */}
          {showLeaderboard && !activeFriendId && !activeGroupId && (
            <>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", background: "linear-gradient(180deg,#08091a 0%,#0d0a28 60%,var(--bg) 100%)", padding: "36px 28px 24px" }}>
                {/* Title */}
                <div style={{ textAlign: "center", marginBottom: 36 }}>
                  <div style={{ fontSize: 30, fontWeight: 900, color: "#f8c94f", letterSpacing: 3, textShadow: "0 0 30px rgba(248,201,79,0.6), 0 0 60px rgba(248,201,79,0.3)" }}>
                    🏆 打賞排行榜
                  </div>
                  <div style={{ fontSize: 11, color: "#4a5580", letterSpacing: 8, marginTop: 8, fontWeight: 700 }}>
                    TIPPING LEADERBOARD
                  </div>
                </div>

                {leaderboard.length === 0 && (
                  <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-dim)" }}>
                    <div style={{ fontSize: 52, marginBottom: 14 }}>🏆</div>
                    <div style={{ fontSize: 16, color: "var(--text-faint)" }}>還沒有人打賞</div>
                    <div style={{ fontSize: 13, marginTop: 6, color: "var(--text-dim)" }}>快來成為第一位吧！</div>
                  </div>
                )}

                {/* All entries */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14, maxWidth: 700, margin: "0 auto" }}>
                  {leaderboard.map((entry, i) => {
                    const rank = i + 1;
                    const suffix = rank === 1 ? "ST" : rank === 2 ? "ND" : rank === 3 ? "RD" : "TH";
                    const title = rank === 1 ? "CHAMPION" : rank === 2 ? "RUNNER-UP" : rank === 3 ? "THIRD" : `${rank}TH PLACE`;
                    const palette = [
                      { badge: "linear-gradient(135deg,var(--accent),var(--accent-2))", card: "rgba(59,130,246,0.10)", border: "rgba(99,102,241,0.45)", glow: "rgba(99,102,241,0.25)", amount: "#93c5fd" },
                      { badge: "linear-gradient(135deg,#ec4899,#ef4444)", card: "rgba(236,72,153,0.10)", border: "rgba(236,72,153,0.45)", glow: "rgba(236,72,153,0.25)", amount: "#f9a8d4" },
                      { badge: "linear-gradient(135deg,var(--text-muted),var(--text-faint))",  card: "rgba(148,163,184,0.08)", border: "rgba(148,163,184,0.35)", glow: "rgba(148,163,184,0.15)", amount: "var(--text-subtle)" },
                      { badge: "linear-gradient(135deg,#8b5cf6,var(--accent-2))", card: "rgba(139,92,246,0.09)",  border: "rgba(139,92,246,0.40)", glow: "rgba(139,92,246,0.20)", amount: "#c4b5fd" },
                      { badge: "linear-gradient(135deg,#f59e0b,#d97706)", card: "rgba(245,158,11,0.09)",  border: "rgba(245,158,11,0.40)", glow: "rgba(245,158,11,0.20)", amount: "#fcd34d" },
                    ];
                    const p = i < palette.length ? palette[i] : { badge: "linear-gradient(135deg,var(--border),var(--text-dim))", card: "rgba(51,65,85,0.15)", border: "rgba(71,85,105,0.35)", glow: "transparent", amount: "var(--text-muted)" };
                    return (
                      <div key={entry.userId} style={{
                        display: "flex", alignItems: "center", gap: 16,
                        padding: "14px 22px 14px 16px",
                        borderRadius: 60,
                        background: p.card,
                        border: `1px solid ${p.border}`,
                        boxShadow: `0 0 24px ${p.glow}, inset 0 0 24px ${p.card}`,
                      }}>
                        {/* Rank badge */}
                        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: 58, height: 58, borderRadius: "var(--radius-lg)", background: p.badge, flexShrink: 0, boxShadow: `0 4px 12px ${p.glow}` }}>
                          <span style={{ fontSize: 22, fontWeight: 900, color: "#fff", lineHeight: 1.1 }}>{rank}</span>
                          <span style={{ fontSize: 8, fontWeight: 800, color: "rgba(255,255,255,0.75)", letterSpacing: 1 }}>{suffix}</span>
                        </div>
                        {/* Avatar */}
                        <AvatarImg avatarImage={entry.userAvatarImage} avatar={entry.userAvatar} color={entry.userColor} size={52} />
                        {/* Name + title */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 800, fontSize: 17, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.userNickname}</div>
                          <div style={{ fontSize: 9, color: p.amount, letterSpacing: 3, fontWeight: 700, marginTop: 3 }}>{title}</div>
                        </div>
                        {/* Amount */}
                        <div style={{ fontWeight: 900, fontSize: 18, color: p.amount, flexShrink: 0, letterSpacing: 0.5 }}>HK${entry.total.toLocaleString()}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div style={{ padding: "14px 20px", background: "#08091a", borderTop: "1px solid #1a1a3a", flexShrink: 0 }}>
                <button onClick={() => setShowDonateModal(true)}
                  style={{ width: "100%", background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none", borderRadius: "var(--radius-lg)", padding: "13px", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(245,158,11,0.35)", letterSpacing: 1 }}>
                  🎁 立即打賞
                </button>
              </div>
            </>
          )}

          {/* Cinema view */}
          {showCinema && !activeFriendId && !activeGroupId && !showLeaderboard && (
            <>
              {cinemaView === 'list' && (
                <>
                  {/* Header */}
                  <div style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "var(--panel-alt)", flexShrink: 0 }}>
                    <span style={{ fontSize: 20 }}>🎬</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>電影院</div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>同步觀看直播</div>
                    </div>
                    <button onClick={() => setShowCreateCinema(true)}
                      style={{ marginLeft: "auto", background: "#2563eb", border: "none", borderRadius: "var(--radius-md)", padding: "7px 16px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                      + 建立直播
                    </button>
                  </div>
                  {/* Room list */}
                  <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 28px" }}>
                    {cinemaRooms.length === 0 && (
                      <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-dim)" }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>🎬</div>
                        <div style={{ fontSize: 16, color: "var(--text-faint)" }}>目前沒有進行中的直播</div>
                        <div style={{ fontSize: 13, marginTop: 8, color: "var(--text-dim)" }}>快來建立第一個吧！</div>
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: 12, maxWidth: 700, margin: "0 auto" }}>
                      {cinemaRooms.map(room => (
                        <div key={room.id} style={{ background: "var(--panel-alt)", border: "1px solid var(--panel)", borderRadius: "var(--radius-lg)", padding: "16px 20px", display: "flex", alignItems: "center", gap: 14 }}>
                          <AvatarImg avatarImage={room.hostAvatarImage} avatar={room.hostAvatar} color={room.hostColor} size={44} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 4 }}>{room.title}</div>
                            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>主持人：{room.hostNickname}</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                            <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 1 }}>🔴 LIVE</span>
                            <button onClick={() => joinCinemaRoom(room)}
                              style={{ background: "linear-gradient(135deg,#2563eb,var(--accent-active))", border: "none", borderRadius: "var(--radius-md)", padding: "8px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                              加入
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Create room modal */}
                  {showCreateCinema && (
                    <div className="cr-sheet-overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 600 }}>
                      <div className="cr-sheet" style={{ background: "var(--panel-alt)", border: "1px solid var(--panel)", borderRadius: 20, padding: "32px", width: 360, maxWidth: "92vw", boxShadow: "0 20px 60px rgba(0,0,0,0.6)", boxSizing: "border-box" }}>
                        <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text)", marginBottom: 20 }}>🎬 建立新直播</div>
                        <input type="text" value={cinemaTitleInput} onChange={e => setCinemaTitleInput(e.target.value)}
          placeholder="輸入直播標題（例如：電影之夜）"
                          style={{ width: "100%", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "11px 14px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
                        <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 20 }}>建立直播後，點擊開始畫面分享，好友就能同步觀看囉！</div>
                        <div style={{ display: "flex", gap: 10 }}>
                          <button onClick={() => { setShowCreateCinema(false); setCinemaTitleInput(''); }}
                            style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "11px", color: "var(--text-muted)", fontSize: 14, cursor: "pointer" }}>取消</button>
                          <button onClick={createCinemaRoom}
                            style={{ flex: 1, background: "linear-gradient(135deg,#2563eb,var(--accent-active))", border: "none", borderRadius: "var(--radius-md)", padding: "11px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>建立直播</button>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {cinemaView === 'room' && activeCinemaRoom && (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#000", minHeight: 0 }}>
                  {/* Top bar */}
                  <div style={{ height: 48, background: "#0a0a0a", borderBottom: "1px solid #1a1a1a", display: "flex", alignItems: "center", padding: "0 16px", gap: 12, flexShrink: 0 }}>
                    <button onClick={() => leaveCinemaRoom(activeCinemaRoom.id, isHosting)}
                      style={{ background: "var(--panel)", border: "none", borderRadius: "var(--radius-sm)", padding: "6px 14px", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>離開直播</button>
                    <span style={{ color: "var(--text)", fontWeight: 600, fontSize: 14 }}>{activeCinemaRoom.title}</span>
                    <span style={{ background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 700, padding: "3px 8px", borderRadius: 20, letterSpacing: 1 }}>🔴 LIVE</span>
                    <span style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontSize: 13 }}>👁️ {cinemaViewerCount}</span>
                        <span style={{ marginLeft: "auto", color: "var(--text-faint)", fontSize: 12 }}>主持人：{activeCinemaRoom.hostNickname}</span>
                  </div>
                  {/* Video area */}
                  <div style={{ flex: 1, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", minHeight: 0 }}>
                    {isHosting && !screenStream ? (
                      <button onClick={startHostStream}
                        style={{ background: "linear-gradient(135deg,#2563eb,var(--accent-active))", border: "none", borderRadius: 14, padding: "16px 32px", color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer" }}>
                        開始畫面分享
                      </button>
                    ) : isHosting ? (
                      <video ref={localVideoRef} autoPlay muted playsInline
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    ) : remoteStream ? (
                      <video ref={remoteVideoRef} autoPlay playsInline
                        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
                    ) : (
                      <div style={{ textAlign: "center", color: "var(--text-dim)" }}>
                        <div style={{ fontSize: 48, marginBottom: 12 }}>📺</div>
                        <div style={{ fontSize: 14 }}>等待主持人開始畫面分享...</div>
                      </div>
                    )}
                  </div>
                  {/* Comments area */}
                  <div style={{ height: 220, background: "var(--bg)", borderTop: "1px solid var(--panel)", display: "flex", flexDirection: "column", flexShrink: 0 }}>
                    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 6 }}>
                      {cinemaComments.length === 0 && (
                        <div style={{ color: "var(--text-dim)", fontSize: 13, textAlign: "left", paddingTop: 8 }}>還沒有留言，快來說第一句吧！</div>
                      )}
                      {cinemaComments.map(c => (
                        <div key={c.id} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                          <AvatarImg avatarImage={c.userAvatarImage} avatar={c.userAvatar} color={c.userColor} size={24} />
                          <div style={{ textAlign: "left" }}>
                            <span style={{ fontSize: 12, color: "var(--text-faint)", marginRight: 6 }}>{c.userNickname}</span>
                            <span style={{ fontSize: 14, color: "var(--text)" }}>{c.text}</span>
                          </div>
                        </div>
                      ))}
                      <div ref={cinemaCommentsEndRef} />
                    </div>
                    <div style={{ padding: "8px 12px", borderTop: "1px solid var(--panel)", display: "flex", gap: 8 }}>
                      <input type="text" value={cinemaInput} onChange={e => setCinemaInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendCinemaComment()}
                        placeholder="留言..."
                        style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "8px 12px", color: "var(--text)", fontSize: 14, outline: "none" }} />
                      <button className="sb" onClick={sendCinemaComment}
                        style={{ background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", padding: "8px 16px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>傳送</button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Vocab view */}
          {showVocab && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && (
            <VocabRoom user={user} db={db} />
          )}

          {/* Spanish view */}
          {showSpanish && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && (
            <SpanishRoom user={user} db={db} />
          )}

          {/* Spanish Course view */}
          {showSpanishCourse && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && (
            <SpanishCourseRoom user={user} db={db} onContextChange={setSpanishCourseNoteContext} />
          )}

          {/* Spanish Pronunciation view */}
          {showSpanishPron && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !frenchView && (
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}><SpanishPronunciation onNav={() => { setShowSpanishPron(false); if (isMobile) setMobileView('more'); }} /></div>
          )}

          {/* Spanish Grammar view */}
          {showSpanishGrammar && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !frenchView && (
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}><SpanishGrammar onNav={() => { setShowSpanishGrammar(false); if (isMobile) setMobileView('more'); }} /></div>
          )}

          {/* Spanish Verb Conjugator view */}
          {showSpanishVerbs && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !frenchView && (
            <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}><SpanishVerbConjugator onNav={() => { setShowSpanishVerbs(false); if (isMobile) setMobileView('more'); }} /></div>
          )}

          {/* English Pronunciation view */}
          {showEnglishPron && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !frenchView && !showSpanishPron && !showSpanishGrammar && !showSpanishVerbs && (
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}><EnglishPronunciation user={user} db={db} onNav={() => { setShowEnglishPron(false); if (isMobile) setMobileView('more'); }} /></div>
          )}

          {/* Custom vocab view */}
          {showCustomVocab && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && (
            <CustomVocabRoom user={myProfile || user} db={db} />
          )}

          {/* Dictionary view */}
          {showDict && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !showCustomVocab && (
            <DictionaryRoom />
          )}

          {/* Public hall */}
          {/* IELTS Band 4 view */}
          {showIeltsBand4 && !activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !frenchView && !showSpanishPron && !showSpanishGrammar && !showSpanishVerbs && !showEnglishPron && (
            <div style={{ flex: 1, minHeight: 0, overflow: "hidden" }}><IeltsBand4 onNav={() => { setShowIeltsBand4(false); if (isMobile) setMobileView('more'); }} /></div>
          )}

          {!activeFriendId && !activeGroupId && !showLeaderboard && !showCinema && !showVocab && !showSpanish && !showSpanishCourse && !showCustomVocab && !showDict && !frenchView && !showSpanishPron && !showSpanishGrammar && !showSpanishVerbs && !showEnglishPron && !showIeltsBand4 && (
            <>
              <div style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "var(--panel-alt)", flexShrink: 0 }}>
                <span style={{ fontSize: 20 }}>💬</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}># 公共大廳</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>大家都可以看到這裡的訊息</div>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 2 }}>
                <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 12, padding: "8px 0 16px" }}>
                  今天 · {new Date().toLocaleDateString("zh-TW", { month: "long", day: "numeric" })}
                </div>
                {hallMessages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)" }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                    <div>大廳還沒有訊息，來說第一句話吧！</div>
                  </div>
                )}
                {hallMessages.map((msg, i) => {
                  if (msg.isSystem) return (
                    <div key={msg.id} style={{ textAlign: "center", marginBottom: 10 }}>
                      <span style={{ background: "var(--panel)", color: "var(--text-faint)", fontSize: 12, padding: "5px 14px", borderRadius: 20, border: "1px solid var(--border)" }}>ℹ️ {msg.text}</span>
                    </div>
                  );
                  const isMine = msg.senderId === uid;
                  const showSender = !isMine && hallMessages[i-1]?.senderId !== msg.senderId;
                  return <MessageBubble key={msg.id} msg={msg} isMine={isMine} showSender={showSender} myUid={uid} collectionPath={["hall_messages", msg.id]} />;
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="cr-input-bar" style={{ padding: "10px 14px 14px", background: "var(--panel-alt)", borderTop: "1px solid var(--panel)", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input ref={hallFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { sendHallMedia(f); e.target.value = ""; } }} />
                  <button onClick={() => hallFileRef.current?.click()} disabled={hallUploading} title="上傳圖片/影片"
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "8px 10px", cursor: hallUploading ? "default" : "pointer", fontSize: 16, color: "var(--text-faint)", flexShrink: 0 }}>
                    {hallUploading ? "⏳" : "📎"}
                  </button>
                  <input type="text" value={hallInput} onChange={e => setHallInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendHall()} placeholder="輸入訊息..."
                    style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "9px 14px", color: "var(--text)", fontSize: 16, outline: "none" }} />
                  <button className="sb" onClick={sendHall} style={{ background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 16px", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>傳送</button>
                </div>
              </div>
            </>
          )}

          {/* Private chat */}
          {activeFriendId && activeFriendProfile && (
            <>
              <div style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "var(--panel-alt)", flexShrink: 0 }}>
                <div style={{ position: "relative" }}>
                  <AvatarImg avatarImage={activeFriendProfile.avatarImage} avatar={activeFriendProfile.avatar} color={activeFriendProfile.color} size={34} />
                  <span style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: getStatus(activeFriendProfile.status).color, border: "2px solid var(--panel-alt)" }} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{activeFriendProfile.nickname}</div>
                  <div style={{ fontSize: 11, color: getStatus(activeFriendProfile.status).color }}>
                    {getStatus(activeFriendProfile.status).label}{activeFriendProfile.statusText ? ` · ${activeFriendProfile.statusText}` : ""}
                  </div>
                </div>
                <Link href={`/profile/${activeFriendProfile.uid}`} style={{ marginLeft: "auto", color: "var(--text-faint)", fontSize: 12, textDecoration: "none" }}
                  onMouseEnter={e => e.currentTarget.style.color = "var(--text-muted)"}
                  onMouseLeave={e => e.currentTarget.style.color = "var(--text-faint)"}>
                  ℹ️ 個人檔案
                </Link>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 2, backgroundImage: "radial-gradient(circle at 1px 1px, var(--panel) 1px, transparent 0)", backgroundSize: "28px 28px" }}>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  <AvatarImg avatarImage={activeFriendProfile.avatarImage} avatar={activeFriendProfile.avatar} color={activeFriendProfile.color} size={56} />
                  <div style={{ marginTop: 8, fontWeight: 700, fontSize: 15 }}>{activeFriendProfile.nickname}</div>
                  {activeFriendProfile.bio && <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4, maxWidth: 260, margin: "4px auto 0" }}>{activeFriendProfile.bio}</div>}
                  <div style={{ fontSize: 12, color: "var(--text-dim)", marginTop: 6 }}>你們已經是好友了</div>
                </div>
                {privateMessages.map((msg, i) => {
                  const isMine = msg.senderId === uid;
                  return <MessageBubble key={msg.id} msg={msg} isMine={isMine} showSender={!isMine && privateMessages[i-1]?.senderId !== msg.senderId} myUid={uid} collectionPath={["private_chats", chatId, "messages", msg.id]} />;
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="cr-input-bar" style={{ padding: "10px 14px 14px", background: "var(--panel-alt)", borderTop: "1px solid var(--panel)", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input ref={privateFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { sendPrivateMedia(f); e.target.value = ""; } }} />
                  <button onClick={() => privateFileRef.current?.click()} disabled={privateUploading} title="上傳圖片/影片"
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "8px 10px", cursor: privateUploading ? "default" : "pointer", fontSize: 16, color: "var(--text-faint)", flexShrink: 0 }}>
                    {privateUploading ? "⏳" : "📎"}
                  </button>
                  <input type="text" value={privateInput} onChange={e => setPrivateInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendPrivate()} placeholder={`傳送訊息給 ${activeFriendProfile.nickname}...`}
                    style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "9px 14px", color: "var(--text)", fontSize: 16, outline: "none" }} />
                  <button className="sb" onClick={sendPrivate} disabled={!privateInput.trim()}
                    style={{ background: privateInput.trim() ? "var(--accent)" : "var(--panel)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 16px", color: privateInput.trim() ? "#fff" : "var(--text-dim)", cursor: privateInput.trim() ? "pointer" : "default", fontSize: 14, fontWeight: 600, transition: "all 0.15s" }}>
                    傳送                  </button>
                </div>
                <div style={{ textAlign: "right", fontSize: 11, color: "var(--border)", marginTop: 4 }}>私訊只有你們兩人看得到 · 雙方都可以撤回訊息</div>
              </div>
            </>
          )}

          {/* Group chat */}
          {activeGroupId && activeGroup && (
            <>
              <div style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "var(--panel-alt)", flexShrink: 0 }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "linear-gradient(135deg,var(--text-dim),var(--border))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>
                  {activeGroup.avatar || "👥"}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{activeGroup.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{(activeGroup.members || []).length} 位成員</div>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 2 }}>
                {groupMessages.length === 0 && (
                  <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-dim)" }}>
                    <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                    <div>群組剛建立，開始聊天吧！</div>
                  </div>
                )}
                {groupMessages.map((msg, i) => {
                  const isMine = msg.senderId === uid;
                  const showSender = !isMine && groupMessages[i-1]?.senderId !== msg.senderId;
                  return <MessageBubble key={msg.id} msg={msg} isMine={isMine} showSender={showSender} myUid={uid} collectionPath={["groups", activeGroupId, "messages", msg.id]} />;
                })}
                <div ref={messagesEndRef} />
              </div>
              <div className="cr-input-bar" style={{ padding: "10px 14px 14px", background: "var(--panel-alt)", borderTop: "1px solid var(--panel)", flexShrink: 0 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input ref={groupFileRef} type="file" accept="image/*,video/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (f) { sendGroupMedia(f); e.target.value = ""; } }} />
                  <button onClick={() => groupFileRef.current?.click()} disabled={groupUploading} title="上傳圖片/影片"
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "8px 10px", cursor: groupUploading ? "default" : "pointer", fontSize: 16, color: "var(--text-faint)", flexShrink: 0 }}>
                    {groupUploading ? "⏳" : "📎"}
                  </button>
                  <input type="text" value={groupInput} onChange={e => setGroupInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendGroup()} placeholder={`傳送訊息給 ${activeGroup.name}...`}
                    style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "9px 14px", color: "var(--text)", fontSize: 16, outline: "none" }} />
                  <button className="sb" onClick={sendGroup} style={{ background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 16px", color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>傳送</button>
                </div>
              </div>
            </>
          )}

          {/* Loading friend profile */}
          {activeFriendId && !activeFriendProfile && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-faint)" }}>載入中...</div>
          )}
        </div>

        {/* Right panel: calendar overlay on mobile, sidebar on desktop */}
        <div className={`cr-cal${calendarOpen ? " cr-cal-open" : ""}`} style={{ width: 252, flexShrink: 0, height: "100%", display: "flex", flexDirection: "column", overflow: "hidden", borderLeft: "1px solid var(--panel)" }}>
          {isMobile && (
            <div style={{ padding: "calc(env(safe-area-inset-top) + 8px) 14px 8px", background: "var(--panel-alt)", borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: "var(--text)" }}>📅 日曆備忘錄</span>
              <button onClick={() => setCalendarOpen(false)} style={{ background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "5px 10px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>✕ 關閉</button>
            </div>
          )}
          {activeSpanishNotes && <PageNotes noteKey={activeSpanishNotes.key} pageTitle={activeSpanishNotes.title} />}
          <CalendarMemo uid={uid} />
        </div>

        {isMobile && (
          <ChatMobileTabBar
            activeTab={mobileView === 'more' || (mobileView === null && inTool) ? 'more' : 'chat'}
            onSelectChats={() => { resetAllViews(); setMobileView('list'); }}
            onSelectMore={() => setMobileView('more')}
            onOpenProfile={() => setShowProfile(true)}
            pendingCount={pendingInCount}
          />
        )}
      </div>
    </>
  );
}

