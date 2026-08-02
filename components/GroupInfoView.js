import { useState, useEffect, useMemo } from "react";
import { db } from "../lib/firebase";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { Avatar } from "./PostComments";
import { toast } from "../lib/toast";
import { formatDate } from "../lib/format";

function isGroupAvatarImage(avatar) {
  return typeof avatar === "string" && avatar.startsWith("http");
}

const soon = () => toast("此功能即將推出");

const ACTION_ROW = [
  { icon: "🔍", label: "搜尋" },
  { icon: "📞", label: "語音通話" },
  { icon: "📹", label: "視訊通話" },
  { icon: "🔕", label: "靜音通知" },
  { icon: "⋯", label: "更多" },
];

const TILES = [
  { icon: "📢", label: "群組公告", sub: "發布最新資訊給成員" },
  { icon: "📌", label: "置頂訊息", sub: "查看所有置頂訊息" },
  { icon: "🔗", label: "邀請連結", sub: "分享連結邀請好友加入" },
  { icon: "🔔", label: "通知設定", sub: "管理群組通知偏好" },
  { icon: "🎨", label: "聊天背景", sub: "自訂群組聊天背景" },
  { icon: "⚙️", label: "群組設定", sub: "管理群組名稱、權限等" },
];

// 「+新增成員」彈窗：列出自己的好友裡還不在這個群組的人，點了就直接
// arrayUnion 進 groups/{id}.members——規則已經允許現有成員改 members 欄位，
// 不用另外改 Firestore rules。
function AddGroupMemberModal({ group, myUid, onClose, onAdded }) {
  const [loading, setLoading] = useState(true);
  const [friends, setFriends] = useState([]);
  const [adding, setAdding] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const meSnap = await getDoc(doc(db, "users", myUid));
        const friendIds = (meSnap.exists() ? meSnap.data().friends : []) || [];
        const candidateIds = friendIds.filter(fid => !(group.members || []).includes(fid));
        const snaps = await Promise.all(candidateIds.map(fid => getDoc(doc(db, "users", fid))));
        if (cancelled) return;
        setFriends(snaps.filter(s => s.exists()).map(s => ({ uid: s.id, ...s.data() })));
      } catch (e) {
        console.error("[AddGroupMemberModal] load friends failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [myUid, group.members]);

  const addMember = async (friendUid) => {
    setAdding(friendUid);
    try {
      await updateDoc(doc(db, "groups", group.id), { members: arrayUnion(friendUid) });
      setFriends(prev => prev.filter(f => f.uid !== friendUid));
      onAdded?.(friendUid);
      toast("已加入群組", "success");
    } catch (e) {
      console.error("[AddGroupMemberModal] add member failed", e);
      toast("新增失敗，請重試");
    } finally {
      setAdding(null);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="新增成員" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 360, maxHeight: "70vh", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--card-shadow)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>新增成員</span>
          <button onClick={onClose} aria-label="關閉" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {loading && <div style={{ textAlign: "center", padding: 30, color: "var(--text-faint)" }}>載入中...</div>}
          {!loading && friends.length === 0 && (
            <div style={{ textAlign: "center", padding: 30, color: "var(--text-dim)" }}>好友都已經在群組裡了</div>
          )}
          {friends.map(f => (
            <button key={f.uid} onClick={() => addMember(f.uid)} disabled={adding === f.uid}
              style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 8, background: "none", border: "none", borderRadius: 10, cursor: "pointer", textAlign: "left" }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}>
              <Avatar avatar={f.avatar} avatarImage={f.avatarImage} color={f.color} size={36} />
              <span style={{ flex: 1, fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nickname}</span>
              <span style={{ fontSize: 12, color: "var(--accent)" }}>{adding === f.uid ? "新增中..." : "+ 加入"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// 點群組聊天上方的名字打開的「群組資訊」中間頁——參考 WhatsApp/WeChat 那種
// 群組詳情頁的版面。這一版是使用者明確要求「版面先做出來」：成員清單、
// 分享媒體是真資料（成員資料抓自 users 集合、媒體抓自目前已載入的群組訊息），
// 檔案與連結、下面六個功能磚、上面那排通話/搜尋按鈕先做版面，點下去只提示
// 「即將推出」，之後要接功能再另外做。
export default function GroupInfoView({ group, messages, myUid, onClose, onOpenProfile }) {
  const [memberProfiles, setMemberProfiles] = useState({});
  const [showAddMember, setShowAddMember] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const uids = Array.from(new Set([...(group.members || []), group.createdBy].filter(Boolean)));
    Promise.all(uids.map(u => getDoc(doc(db, "users", u)))).then(snaps => {
      if (cancelled) return;
      const profiles = {};
      snaps.forEach(s => { if (s.exists()) profiles[s.id] = { uid: s.id, ...s.data() }; });
      setMemberProfiles(profiles);
    }).catch(e => console.error("[GroupInfoView] load member profiles failed", e));
    return () => { cancelled = true; };
  }, [group.id, group.members, group.createdBy]);

  const mediaMessages = useMemo(
    () => (messages || []).filter(m => m.imageUrl || m.videoUrl),
    [messages]
  );

  const creatorProfile = group.createdBy ? memberProfiles[group.createdBy] : null;

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", background: "var(--bg)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <button onClick={onClose} aria-label="返回" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: 4 }}>←</button>
        <div style={{ width: 32, height: 32, borderRadius: "30%", overflow: "hidden", flexShrink: 0, background: "linear-gradient(135deg,var(--text-dim),var(--border))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
          {isGroupAvatarImage(group.avatar)
            ? <img src={group.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : (group.avatar || "👥")}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{group.name}</div>
          <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{(group.members || []).length} 位成員</div>
        </div>
        <button onClick={soon} aria-label="更多" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 18, padding: 4 }}>⋯</button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          {/* 橫幅＋大頭貼＋名字（群組沒有封面圖欄位，先用固定漸層當背景） */}
          <div style={{ position: "relative", borderRadius: 16, overflow: "hidden", background: "linear-gradient(135deg,#4c1d95,#1e1b4b)", padding: "32px 28px", display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ width: 88, height: 88, borderRadius: "50%", overflow: "hidden", flexShrink: 0, background: "rgba(255,255,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 40, border: "3px solid rgba(255,255,255,0.3)" }}>
              {isGroupAvatarImage(group.avatar)
                ? <img src={group.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                : (group.avatar || "👥")}
            </div>
            <div style={{ flex: 1, minWidth: 0, color: "#fff" }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>{group.name}</div>
              {group.description && <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>{group.description}</div>}
              <div style={{ fontSize: 12, opacity: 0.7, marginTop: 6 }}>
                {(group.members || []).length} 位成員{group.createdAt ? ` · 建立於 ${formatDate(group.createdAt)}` : ""}
              </div>
            </div>
            <button onClick={soon} aria-label="編輯群組"
              style={{ position: "absolute", top: 14, right: 14, background: "rgba(0,0,0,0.35)", border: "none", borderRadius: "50%", width: 34, height: 34, color: "#fff", cursor: "pointer", fontSize: 14 }}>
              ✏️
            </button>
          </div>

          {/* 搜尋／通話／靜音／更多 */}
          <div style={{ display: "flex", gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            {ACTION_ROW.map(a => (
              <button key={a.label} onClick={soon}
                style={{ flex: "1 1 100px", display: "flex", alignItems: "center", justifyContent: "center", gap: 6, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 10px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
                {a.icon} {a.label}
              </button>
            ))}
          </div>

          {/* 成員 + 分享媒體 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>成員 {(group.members || []).length}</span>
                <button onClick={() => setShowAddMember(true)} title="新增成員" aria-label="新增成員"
                  style={{ background: "var(--accent)", border: "none", borderRadius: "50%", width: 26, height: 26, color: "var(--accent-text)", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>
                  +
                </button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 2, maxHeight: 260, overflowY: "auto" }}>
                {(group.members || []).map(m => {
                  const p = memberProfiles[m];
                  return (
                    <button key={m} onClick={() => onOpenProfile?.(m)}
                      style={{ display: "flex", alignItems: "center", gap: 10, background: "none", border: "none", padding: "6px 4px", borderRadius: 8, cursor: "pointer", textAlign: "left", width: "100%" }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
                      onMouseLeave={e => e.currentTarget.style.background = "none"}>
                      {p?.avatarImage
                        ? <img src={p.avatarImage} alt="" style={{ width: 34, height: 34, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                        : <div style={{ width: 34, height: 34, borderRadius: "50%", background: p?.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0 }}>{p?.avatar || "😊"}</div>}
                      <span style={{ fontSize: 13, color: "var(--text)", flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p?.nickname || "..."}</span>
                      {m === group.createdBy && <span title="群主" style={{ fontSize: 13, flexShrink: 0 }}>👑</span>}
                      {m === myUid && <span style={{ fontSize: 11, color: "var(--text-faint)", flexShrink: 0 }}>（我）</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>分享媒體</span>
                {mediaMessages.length > 0 && (
                  <button onClick={soon} style={{ background: "none", border: "none", color: "var(--accent)", cursor: "pointer", fontSize: 12 }}>查看全部</button>
                )}
              </div>
              {mediaMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 12, padding: "24px 0" }}>還沒有分享過的媒體</div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
                  {mediaMessages.slice(-9).reverse().map(m => (
                    <div key={m.id} style={{ aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: "#000" }}>
                      {m.videoUrl
                        ? <video src={m.videoUrl} muted style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        : <img src={m.imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* 檔案與連結 + 功能磚 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
            <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 10 }}>檔案與連結</div>
              <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 12, padding: "24px 0" }}>還沒有分享過的檔案</div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {TILES.map(t => (
                <button key={t.label} onClick={soon}
                  style={{ display: "flex", flexDirection: "column", gap: 6, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: 14, cursor: "pointer", textAlign: "left" }}>
                  <span style={{ fontSize: 18 }}>{t.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{t.label}</span>
                  <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{t.sub}</span>
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, padding: "14px 4px", borderTop: "1px solid var(--border)", fontSize: 12, color: "var(--text-faint)", flexWrap: "wrap", gap: 8 }}>
            <span>🛡️ 群組建立者：{creatorProfile?.nickname || "..."}</span>
            <span>群組識別碼：#{group.id.slice(0, 6)}</span>
          </div>
        </div>
      </div>

      {showAddMember && (
        <AddGroupMemberModal group={group} myUid={myUid} onClose={() => setShowAddMember(false)} />
      )}
    </div>
  );
}
