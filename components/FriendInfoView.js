import { useState, useMemo } from "react";
import { db } from "../lib/firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { toast } from "../lib/toast";

function getStatus(status) {
  switch (status) {
    case "online": return { label: "線上", color: "#22c55e" };
    case "away": return { label: "離開", color: "#eab308" };
    default: return { label: "離線", color: "var(--text-dim)" };
  }
}

const soon = () => toast("此功能即將推出");

const SETTINGS_ROWS = [
  { icon: "🔍", label: "搜尋聊天記錄" },
  { icon: "🎨", label: "自訂主題" },
  { icon: "📌", label: "釘選訊息" },
  { icon: "🔔", label: "通知", value: "預設" },
];

// 點私訊聊天上方好友名字打開的「好友資訊」中間頁——跟 GroupInfoView 同一種
// 版面邏輯，一樣是「版面先做出來」：媒體/共同群組是真資料，聊天設定六列
// 先做版面（點下去提示即將推出），封鎖／檢舉是真的（沿用 ProfileView.js
// 裡 blockUser/reportUser 那套寫法，Firestore 規則本來就允許）。
export default function FriendInfoView({ friend, myUid, myBlocked, messages, myGroups, onClose, onSendMessage }) {
  const [busy, setBusy] = useState(false);

  const mediaMessages = useMemo(
    () => (messages || []).filter(m => m.imageUrl || m.videoUrl),
    [messages]
  );

  const mutualGroups = useMemo(
    () => (myGroups || []).filter(g => (g.members || []).includes(friend.uid)),
    [myGroups, friend.uid]
  );

  const isBlocked = (myBlocked || []).includes(friend.uid);
  const st = getStatus(friend.status);
  const handle = `@${(friend.nickname || "user").replace(/\s+/g, "").toLowerCase()}`;

  const toggleBlock = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await updateDoc(doc(db, "users", myUid), {
        blocked: isBlocked ? arrayRemove(friend.uid) : arrayUnion(friend.uid),
      });
      toast(isBlocked ? "已解除封鎖" : "已封鎖", "success");
    } catch (e) {
      console.error("[FriendInfoView] toggleBlock failed", e);
      toast("操作失敗，請重試");
    } finally {
      setBusy(false);
    }
  };

  const reportFriend = async () => {
    if (busy) return;
    if (!confirm(`確定要檢舉「${friend.nickname}」嗎？`)) return;
    setBusy(true);
    try {
      await addDoc(collection(db, "reports"), { reporterUid: myUid, targetUid: friend.uid, createdAt: serverTimestamp() });
      toast("已送出檢舉，我們會盡快處理", "success");
    } catch (e) {
      console.error("[FriendInfoView] reportFriend failed", e);
      toast("送出失敗，請重試");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0, position: "relative" }}>
        <button onClick={onClose} aria-label="返回" style={{ position: "absolute", left: 16, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: 4 }}>←</button>
        <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>個人資料</span>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
            {friend.avatarImage
              ? <img src={friend.avatarImage} alt="" style={{ width: 76, height: 76, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
              : <div style={{ width: 76, height: 76, borderRadius: "50%", background: friend.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, flexShrink: 0 }}>{friend.avatar || "😊"}</div>}
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>{friend.nickname}</div>
              <div style={{ fontSize: 12, color: st.color, marginTop: 2 }}>{st.label}</div>
              {friend.signature && <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>{friend.signature}</div>}
              <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 6 }}>{handle} · ID: {friend.uid.slice(0, 8)}</div>
            </div>
            <div style={{ display: "flex", gap: 18, flexShrink: 0 }}>
              <button onClick={onClose} title="發送訊息" aria-label="發送訊息"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 11 }}>
                <span style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--panel-alt)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>💬</span>
                發送訊息
              </button>
              <button onClick={soon} title="語音通話" aria-label="語音通話"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 11 }}>
                <span style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--panel-alt)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>📞</span>
                語音通話
              </button>
              <button onClick={soon} title="更多" aria-label="更多"
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 11 }}>
                <span style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--panel-alt)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>⋯</span>
                更多
              </button>
            </div>
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, marginTop: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>媒體、連結和文件</span>
              {mediaMessages.length > 0 && <button onClick={soon} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>查看全部</button>}
            </div>
            {mediaMessages.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 12, padding: "24px 0" }}>還沒有分享過的媒體</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 6 }}>
                {mediaMessages.slice(-6).reverse().map(m => (
                  <div key={m.id} style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: "#000" }}>
                    {m.videoUrl
                      ? <video src={m.videoUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                      : <img src={m.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: 16, marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 10 }}>共同群組</div>
            {mutualGroups.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 12, padding: "16px 0" }}>沒有共同的群組</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                {mutualGroups.map(g => (
                  <div key={g.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 10, padding: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: "30%", background: "linear-gradient(135deg,var(--text-dim),var(--border))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, overflow: "hidden" }}>
                      {typeof g.avatar === "string" && g.avatar.startsWith("http")
                        ? <img src={g.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        : (g.avatar || "👥")}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{(g.members || []).length} 人</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "4px 16px", marginTop: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", padding: "12px 0 4px" }}>聊天設定</div>
            {SETTINGS_ROWS.map(r => (
              <button key={r.label} onClick={soon}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", borderTop: "1px solid var(--border-soft, var(--border))", padding: "12px 0", color: "var(--text)", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
                <span style={{ fontSize: 15 }}>{r.icon}</span>
                <span style={{ flex: 1 }}>{r.label}</span>
                {r.value && <span style={{ color: "var(--text-faint)", fontSize: 12 }}>{r.value}</span>}
                <span style={{ color: "var(--text-faint)" }}>›</span>
              </button>
            ))}
          </div>

          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "4px 16px", marginTop: 16, marginBottom: 20 }}>
            <button onClick={toggleBlock} disabled={busy}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", padding: "12px 0", color: "#ef4444", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 15 }}>🚫</span>
              <span style={{ flex: 1 }}>{isBlocked ? `解除封鎖 ${friend.nickname}` : `封鎖 ${friend.nickname}`}</span>
              <span style={{ color: "var(--text-faint)" }}>›</span>
            </button>
            <button onClick={reportFriend} disabled={busy}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", background: "none", border: "none", borderTop: "1px solid var(--border-soft, var(--border))", padding: "12px 0", color: "#ef4444", fontSize: 13, cursor: "pointer", textAlign: "left" }}>
              <span style={{ fontSize: 15 }}>🚩</span>
              <span style={{ flex: 1 }}>檢舉 {friend.nickname}</span>
              <span style={{ color: "var(--text-faint)" }}>›</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
