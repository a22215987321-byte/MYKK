import { useState, useEffect } from "react";
import { auth, db } from "../lib/firebase";
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp } from "firebase/firestore";
import { Avatar } from "./PostComments";
import { chatIdFor, bumpPrivateChatSummary, bumpGroupChatSummary } from "../lib/chatSummary";
import { toast } from "../lib/toast";

// 貼文/影片的「分享」——不再是複製連結或叫出系統分享面板，改成挑好友/群組，
// 直接把貼文變成一則訊息傳過去。Feed.js（動態消息貼文）跟 ChannelProfileView.js
// （影片觀看頁）共用這一個 modal，自己抓自己的好友/群組清單，不依賴外層
// 有沒有把這些資料傳下來（動態消息也有獨立頁面，不是每個地方都在 ChatRoom 裡）。
export default function SharePostModal({ post, onClose }) {
  const myUid = auth.currentUser?.uid;
  const [myProfile, setMyProfile] = useState(null);
  const [friends, setFriends] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sentTo, setSentTo] = useState(() => new Set());
  const [sending, setSending] = useState(null);

  useEffect(() => {
    if (!myUid) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const meSnap = await getDoc(doc(db, "users", myUid));
        const me = meSnap.exists() ? { uid: myUid, ...meSnap.data() } : null;
        if (cancelled) return;
        setMyProfile(me);
        const friendIds = me?.friends || [];
        const friendSnaps = await Promise.all(friendIds.map(fid => getDoc(doc(db, "users", fid))));
        if (cancelled) return;
        setFriends(friendSnaps.filter(s => s.exists()).map(s => ({ uid: s.id, ...s.data() })));
        const groupsSnap = await getDocs(query(collection(db, "groups"), where("members", "array-contains", myUid)));
        if (cancelled) return;
        setGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("[SharePostModal] load failed", { code: e?.code, message: e?.message });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [myUid]);

  const buildMessage = () => ({
    senderId: myUid, sender: myProfile?.nickname || "", avatar: myProfile?.avatar || "",
    senderAvatarImage: myProfile?.avatarImage || "",
    type: "post_share", text: "", imageUrl: "", videoUrl: "",
    sharedPost: {
      id: post.id, userId: post.userId, userNickname: post.userNickname || "",
      userAvatar: post.userAvatar || "", userAvatarImage: post.userAvatarImage || "", userColor: post.userColor || "",
      text: (post.text || "").slice(0, 100),
      imageUrl: post.imageUrls?.[0] || post.imageUrl || "",
      videoUrl: post.videoUrl || "",
    },
    createdAt: serverTimestamp(),
  });

  const shareToFriend = async (friendUid) => {
    if (!myUid || sending) return;
    setSending(friendUid);
    try {
      const cid = chatIdFor(myUid, friendUid);
      await addDoc(collection(db, "private_chats", cid, "messages"), buildMessage());
      await bumpPrivateChatSummary(myUid, friendUid, "[分享的貼文]");
      setSentTo(prev => new Set(prev).add(friendUid));
      toast("已分享", "success");
    } catch (e) {
      console.error("[SharePostModal] share to friend failed", { code: e?.code, message: e?.message });
      toast("分享失敗，請重試");
    } finally {
      setSending(null);
    }
  };

  const shareToGroup = async (group) => {
    if (!myUid || sending) return;
    setSending(group.id);
    try {
      await addDoc(collection(db, "groups", group.id, "messages"), buildMessage());
      await bumpGroupChatSummary(myUid, group.members, group.id, "[分享的貼文]");
      setSentTo(prev => new Set(prev).add(group.id));
      toast("已分享", "success");
    } catch (e) {
      console.error("[SharePostModal] share to group failed", { code: e?.code, message: e?.message });
      toast("分享失敗，請重試");
    } finally {
      setSending(null);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="分享貼文" onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 2000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={e => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 380, maxHeight: "80vh", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, boxShadow: "var(--card-shadow)", display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>分享給...</span>
          <button onClick={onClose} aria-label="關閉" style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {loading && <div style={{ textAlign: "center", padding: 30, color: "var(--text-faint)" }}>載入中...</div>}
          {!loading && !myUid && <div style={{ textAlign: "center", padding: 30, color: "var(--text-dim)" }}>請先登入</div>}
          {!loading && myUid && groups.length === 0 && friends.length === 0 && (
            <div style={{ textAlign: "center", padding: 30, color: "var(--text-dim)" }}>還沒有好友或群組可以分享</div>
          )}
          {groups.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", padding: "6px 8px" }}>群組</div>
              {groups.map(g => (
                <button key={g.id} onClick={() => shareToGroup(g)} disabled={sending === g.id}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 8, background: "none", border: "none", borderRadius: 10, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <div style={{ width: 36, height: 36, borderRadius: "30%", background: "linear-gradient(135deg,var(--text-dim),var(--border))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0, overflow: "hidden" }}>
                    {typeof g.avatar === "string" && g.avatar.startsWith("http")
                      ? <img src={g.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : (g.avatar || "👥")}
                  </div>
                  <span style={{ flex: 1, fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span>
                  {sending === g.id && <span style={{ color: "var(--text-faint)", fontSize: 12 }}>傳送中...</span>}
                  {sentTo.has(g.id) && sending !== g.id && <span style={{ color: "var(--accent)", fontSize: 12 }}>已傳送 ✓</span>}
                </button>
              ))}
            </>
          )}
          {friends.length > 0 && (
            <>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-dim)", padding: "6px 8px" }}>好友</div>
              {friends.map(f => (
                <button key={f.uid} onClick={() => shareToFriend(f.uid)} disabled={sending === f.uid}
                  style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: 8, background: "none", border: "none", borderRadius: 10, cursor: "pointer", textAlign: "left" }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <Avatar avatar={f.avatar} avatarImage={f.avatarImage} color={f.color} size={36} />
                  <span style={{ flex: 1, fontSize: 14, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.nickname}</span>
                  {sending === f.uid && <span style={{ color: "var(--text-faint)", fontSize: 12 }}>傳送中...</span>}
                  {sentTo.has(f.uid) && sending !== f.uid && <span style={{ color: "var(--accent)", fontSize: 12 }}>已傳送 ✓</span>}
                </button>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
