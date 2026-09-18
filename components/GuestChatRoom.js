import { useEffect, useRef, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from "firebase/firestore";
import { LogOut, MessageCircle, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { auth, db } from "../lib/firebase";

const guestRoot = uid => doc(db, "guest_users", uid);
const guestChats = uid => collection(guestRoot(uid), "chats");
const guestChat = (uid, chatId) => doc(guestChats(uid), chatId);
const guestMessages = (uid, chatId) => collection(guestChat(uid, chatId), "messages");

async function removeGuestChat(uid, chatId) {
  const messageSnap = await getDocs(guestMessages(uid, chatId));
  const docs = messageSnap.docs;

  // Firestore batches accept at most 500 writes. Keep headroom for future
  // metadata cleanup and delete long chats in deterministic chunks.
  for (let start = 0; start < docs.length; start += 400) {
    const batch = writeBatch(db);
    docs.slice(start, start + 400).forEach(message => batch.delete(message.ref));
    await batch.commit();
  }

  await deleteDoc(guestChat(uid, chatId));
}

export default function GuestChatRoom({ user }) {
  const uid = user.uid;
  const [profile, setProfile] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const creatingInitialChat = useRef(false);
  const messagesEndRef = useRef(null);

  useEffect(() => onSnapshot(guestRoot(uid), snap => {
    if (snap.exists()) setProfile({ uid: snap.id, ...snap.data() });
  }, () => setError("無法載入訪客資料，請確認 Firestore 權限設定")), [uid]);

  useEffect(() => {
    const chatsQuery = query(guestChats(uid), orderBy("updatedAt", "desc"));
    return onSnapshot(chatsQuery, async snap => {
      const next = snap.docs.map(item => ({ id: item.id, ...item.data() }));
      setChats(next);

      if (next.length === 0 && !creatingInitialChat.current) {
        creatingInitialChat.current = true;
        try {
          const ref = await addDoc(guestChats(uid), {
            ownerId: uid,
            title: "新聊天",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
          setActiveChatId(ref.id);
        } catch {
          setError("無法建立訪客聊天，請確認 Firestore 權限設定");
        } finally {
          creatingInitialChat.current = false;
        }
        return;
      }

      setActiveChatId(current => next.some(item => item.id === current) ? current : next[0]?.id || null);
    }, () => setError("無法載入訪客聊天，請確認 Firestore 權限設定"));
  }, [uid]);

  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return undefined;
    }
    const messagesQuery = query(guestMessages(uid, activeChatId), orderBy("createdAt"));
    return onSnapshot(messagesQuery, snap => {
      setMessages(snap.docs.map(item => ({ id: item.id, ...item.data() })));
    }, () => setError("無法讀取這個訪客聊天"));
  }, [uid, activeChatId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createChat = async () => {
    setError("");
    try {
      const ref = await addDoc(guestChats(uid), {
        ownerId: uid,
        title: `新聊天 ${chats.length + 1}`,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setActiveChatId(ref.id);
    } catch {
      setError("建立聊天失敗，請稍後再試");
    }
  };

  const renameChat = async (chat) => {
    const nextTitle = window.prompt("重新命名聊天", chat.title || "新聊天")?.trim();
    if (!nextTitle || nextTitle === chat.title) return;
    try {
      await updateDoc(guestChat(uid, chat.id), {
        title: nextTitle.slice(0, 60),
        updatedAt: serverTimestamp(),
      });
    } catch {
      setError("重新命名失敗，請稍後再試");
    }
  };

  const deleteChat = async (chat) => {
    if (!window.confirm(`確定刪除「${chat.title || "新聊天"}」及其中的所有訊息嗎？`)) return;
    try {
      await removeGuestChat(uid, chat.id);
    } catch {
      setError("刪除聊天失敗，請稍後再試");
    }
  };

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || !activeChatId || sending) return;
    setInput("");
    setSending(true);
    setError("");
    try {
      await addDoc(guestMessages(uid, activeChatId), {
        ownerId: uid,
        senderId: uid,
        senderType: "guest",
        text,
        createdAt: serverTimestamp(),
      });
      await updateDoc(guestChat(uid, activeChatId), {
        updatedAt: serverTimestamp(),
        lastMessage: text.slice(0, 80),
      });
    } catch {
      setInput(text);
      setError("訊息傳送失敗，請稍後再試");
    } finally {
      setSending(false);
    }
  };

  const activeChat = chats.find(chat => chat.id === activeChatId);

  return (
    <main className="guest-root">
      <style>{`
        .guest-root {
          --guest-bg: #0d0e12; --guest-panel: #171a22; --guest-panel-alt: #11141b;
          --guest-border: rgba(255,255,255,.09); --guest-text: rgba(255,255,255,.92);
          --guest-muted: rgba(255,255,255,.52); --guest-accent: #7c5cff;
          min-height: 100dvh; display: grid; grid-template-columns: 310px 1fr;
          background: var(--guest-bg); color: var(--guest-text); font-family: var(--font-body);
        }
        .guest-sidebar { background: var(--guest-panel-alt); border-right: 1px solid var(--guest-border); padding: 22px 16px; display: flex; flex-direction: column; min-width: 0; }
        .guest-brand { display: flex; align-items: center; gap: 11px; padding: 2px 8px 22px; }
        .guest-brand img { width: 38px; height: 38px; border-radius: 12px; }
        .guest-brand-name { font-size: 18px; font-weight: 800; letter-spacing: 1.5px; }
        .guest-badge { display: inline-flex; align-items: center; width: fit-content; border: 1px solid rgba(124,92,255,.45); background: rgba(124,92,255,.13); color: #b9aaff; border-radius: 999px; padding: 5px 10px; font-size: 12px; font-weight: 700; }
        .guest-new { height: 44px; border: 1px solid rgba(124,92,255,.48); border-radius: 13px; background: rgba(124,92,255,.12); color: var(--guest-text); display: flex; align-items: center; justify-content: center; gap: 8px; cursor: pointer; font-weight: 700; }
        .guest-new:hover { background: rgba(124,92,255,.2); }
        .guest-list { flex: 1; overflow-y: auto; margin-top: 16px; display: flex; flex-direction: column; gap: 7px; }
        .guest-chat-row { display: grid; grid-template-columns: 1fr auto; align-items: center; gap: 4px; border: 1px solid transparent; border-radius: 12px; padding: 6px 7px 6px 11px; color: var(--guest-muted); }
        .guest-chat-row.active { background: rgba(124,92,255,.14); border-color: rgba(124,92,255,.3); color: var(--guest-text); }
        .guest-chat-select { min-width: 0; border: 0; background: none; color: inherit; text-align: left; cursor: pointer; padding: 7px 4px; display: flex; align-items: center; gap: 9px; }
        .guest-chat-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; font-weight: 650; }
        .guest-row-actions { display: flex; opacity: 0; transition: opacity .15s; }
        .guest-chat-row:hover .guest-row-actions, .guest-chat-row:focus-within .guest-row-actions { opacity: 1; }
        .guest-icon-button { border: 0; background: none; color: var(--guest-muted); width: 31px; height: 31px; border-radius: 8px; cursor: pointer; display: grid; place-items: center; }
        .guest-icon-button:hover { color: var(--guest-text); background: rgba(255,255,255,.07); }
        .guest-account { border-top: 1px solid var(--guest-border); padding: 16px 6px 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .guest-account-name { min-width: 0; }
        .guest-account-name strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
        .guest-account-name span { color: var(--guest-muted); font-size: 11px; }
        .guest-main { min-width: 0; min-height: 100dvh; display: flex; flex-direction: column; background: radial-gradient(circle at 70% 0%, rgba(124,92,255,.09), transparent 34%), var(--guest-bg); }
        .guest-header { height: 74px; border-bottom: 1px solid var(--guest-border); padding: 0 26px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
        .guest-header h1 { margin: 0; font-size: 18px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .guest-messages { flex: 1; min-height: 0; overflow-y: auto; padding: 30px 0; }
        .guest-message-column { width: calc(100% / 3); min-height: 100%; margin: 0 auto; display: flex; flex-direction: column; }
        .guest-empty { height: 100%; min-height: 280px; display: grid; place-items: center; text-align: center; color: var(--guest-muted); }
        .guest-empty-icon { width: 54px; height: 54px; margin: 0 auto 14px; border-radius: 17px; background: rgba(124,92,255,.14); color: #aa96ff; display: grid; place-items: center; }
        .guest-message { display: flex; justify-content: flex-end; margin-bottom: 13px; }
        .guest-bubble { max-width: 100%; padding: 11px 15px; border-radius: 17px 17px 5px 17px; background: linear-gradient(135deg, #6d4df4, #835ef5); color: white; line-height: 1.55; white-space: pre-wrap; word-break: break-word; box-shadow: 0 8px 24px rgba(64,37,166,.22); }
        .guest-composer-wrap { padding: 16px max(20px, calc((100% - 860px) / 2)) 22px; }
        .guest-error { margin-bottom: 9px; color: #fca5a5; font-size: 13px; text-align: center; }
        .guest-composer { min-height: 56px; border: 1px solid var(--guest-border); border-radius: 18px; background: var(--guest-panel); display: flex; align-items: flex-end; gap: 10px; padding: 8px 9px 8px 16px; box-shadow: 0 16px 36px rgba(0,0,0,.2); }
        .guest-composer textarea { flex: 1; min-width: 0; resize: none; border: 0; outline: 0; background: transparent; color: var(--guest-text); font: inherit; line-height: 1.45; min-height: 24px; max-height: 120px; padding: 8px 0; }
        .guest-send { width: 42px; height: 42px; flex: 0 0 42px; border-radius: 13px; border: 0; background: var(--guest-accent); color: white; display: grid; place-items: center; cursor: pointer; }
        .guest-send:disabled { opacity: .45; cursor: not-allowed; }
        @media (max-width: 720px) {
          .guest-root { grid-template-columns: 1fr; grid-template-rows: auto 1fr; }
          .guest-sidebar { border-right: 0; border-bottom: 1px solid var(--guest-border); padding: 13px 12px; }
          .guest-brand { padding: 0 4px 10px; }
          .guest-brand img { width: 32px; height: 32px; }
          .guest-new { height: 40px; }
          .guest-list { flex-direction: row; overflow-x: auto; margin-top: 10px; }
          .guest-chat-row { min-width: 170px; }
          .guest-row-actions { opacity: 1; }
          .guest-account { position: absolute; top: 13px; right: 12px; border: 0; padding: 0; }
          .guest-account-name { display: none; }
          .guest-main { min-height: 0; }
          .guest-header { height: 60px; padding: 0 16px; }
          .guest-messages { padding: 22px 14px; }
          .guest-message-column { width: 100%; }
          .guest-composer-wrap { padding: 10px 12px calc(12px + env(safe-area-inset-bottom)); }
          .guest-bubble { max-width: 88%; }
        }
      `}</style>

      <aside className="guest-sidebar">
        <div className="guest-brand">
          <img src="/logo.png?v=3" alt="" aria-hidden="true" />
          <div>
            <div className="guest-brand-name">EVONCHAT</div>
            <span className="guest-badge">訪客模式</span>
          </div>
        </div>

        <button className="guest-new" onClick={createChat}>
          <Plus size={17} /> 建立聊天
        </button>

        <div className="guest-list" aria-label="你的訪客聊天">
          {chats.map(chat => (
            <div key={chat.id} className={`guest-chat-row${chat.id === activeChatId ? " active" : ""}`}>
              <button className="guest-chat-select" onClick={() => setActiveChatId(chat.id)}>
                <MessageCircle size={17} />
                <span className="guest-chat-title">{chat.title || "新聊天"}</span>
              </button>
              <span className="guest-row-actions">
                <button className="guest-icon-button" onClick={() => renameChat(chat)} aria-label={`重新命名 ${chat.title || "新聊天"}`}><Pencil size={15} /></button>
                <button className="guest-icon-button" onClick={() => deleteChat(chat)} aria-label={`刪除 ${chat.title || "新聊天"}`}><Trash2 size={15} /></button>
              </span>
            </div>
          ))}
        </div>

        <div className="guest-account">
          <div className="guest-account-name">
            <strong>{profile?.nickname || "訪客"}</strong>
            <span>匿名工作區</span>
          </div>
          <button className="guest-icon-button" onClick={() => auth.signOut()} aria-label="登出訪客模式" title="登出">
            <LogOut size={19} />
          </button>
        </div>
      </aside>

      <section className="guest-main">
        <header className="guest-header">
          <h1>{activeChat?.title || "新聊天"}</h1>
          <span className="guest-badge">訪客模式</span>
        </header>

        <div className="guest-messages">
          <div className="guest-message-column">
            {messages.length === 0 ? (
              <div className="guest-empty">
                <div>
                  <div className="guest-empty-icon"><MessageCircle size={25} /></div>
                  <strong>這是你的私人訪客聊天</strong>
                  <div style={{ marginTop: 7, fontSize: 13 }}>資料只會從目前匿名 UID 的專屬路徑讀取。</div>
                </div>
              </div>
            ) : messages.map(message => (
              <div key={message.id} className="guest-message">
                <div className="guest-bubble">{message.text}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="guest-composer-wrap">
          {error && <div className="guest-error" role="alert">{error}</div>}
          <div className="guest-composer">
            <textarea
              rows={1}
              value={input}
              onChange={event => setInput(event.target.value)}
              onKeyDown={event => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="輸入訊息…"
              aria-label="訊息"
            />
            <button className="guest-send" onClick={sendMessage} disabled={!input.trim() || !activeChatId || sending} aria-label="傳送訊息">
              <Send size={19} />
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
