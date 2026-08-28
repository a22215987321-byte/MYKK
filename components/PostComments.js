import { useState, useEffect, useCallback } from "react";
import { db } from "../lib/firebase";
import {
  collection, addDoc, onSnapshot, query, orderBy, serverTimestamp,
} from "firebase/firestore";
import { formatDate, formatFullDate } from "../lib/format";
import LinkifiedText from "./LinkifiedText";

// Feed.js 跟 ChannelProfileView.js（影片留言）共用同一份大頭貼 + 留言區塊，
// 原本只有 Feed.js 自己一份，這裡抽出來避免兩邊各自長出不同的留言 bug。
export function Avatar({ avatar, avatarImage, color, size = 40 }) {
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

export function CommentSection({ postId, myProfile }) {
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
            <span style={{ fontSize: 13, color: "var(--text)", wordBreak: "break-word" }}><LinkifiedText text={c.text} /></span>
            <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 2 }} title={formatFullDate(c.createdAt)}>{formatDate(c.createdAt)}</div>
          </div>
        </div>
      ))}
      {myProfile && (
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
              style={{ background: text.trim() ? "var(--accent)" : "var(--panel)", border: "none", borderRadius: 20, padding: "6px 14px", color: text.trim() ? "var(--accent-text)" : "var(--text-dim)", cursor: text.trim() ? "pointer" : "default", fontSize: 13, fontWeight: 600, flexShrink: 0 }}
            >
              送出
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
