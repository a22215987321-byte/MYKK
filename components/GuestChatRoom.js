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
import { ChevronDown, LogOut, Menu, MessageCircle, MoreHorizontal, Pencil, Plus, Send, Settings, Trash2, X } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { OWNER_EMAIL } from "../lib/admin";

const COMPANION_NAME = "EVON";
const COMPANION_GREETING = "你好，我是 GPT5.6 SOL，有甚麼能幫你的嗎？";
const REPLY_LEVELS = ["HIGH", "EXTRA"];
const STYLE_OPTIONS = [
  { id: "default", label: "淺色預設", icon: "☀️" },
  { id: "pastel-pearl", label: "柔和珠光", icon: "🪞" },
  { id: "shadow-window", label: "幽影深窗", icon: "🌙" },
  { id: "clean-cards", label: "簡約四卡", icon: "🟪" },
];

function resizeGuestTextarea(element) {
  if (!element) return;
  element.style.height = "40px";
  const height = Math.min(Math.max(element.scrollHeight, 40), 176);
  element.style.height = `${height}px`;
  element.style.overflowY = element.scrollHeight > 176 ? "auto" : "hidden";
}

export function isGuestSubmitKey({ key, shiftKey, isComposing }) {
  return key === "Enter" && !shiftKey && !isComposing;
}

const guestRoot = uid => doc(db, "guest_users", uid);
const guestChats = uid => collection(guestRoot(uid), "chats");
const guestChat = (uid, chatId) => doc(guestChats(uid), chatId);
const guestMessages = (uid, chatId) => collection(guestChat(uid, chatId), "messages");
const guestChatData = (uid, title) => ({
  ownerId: uid,
  counterpartyEmail: OWNER_EMAIL,
  title,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

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
  const [replyLevel, setReplyLevel] = useState("HIGH");
  const [styleId, setStyleId] = useState("shadow-window");
  const [appearanceOpen, setAppearanceOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openActionsId, setOpenActionsId] = useState(null);
  const creatingInitialChat = useRef(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const composingRef = useRef(false);

  useEffect(() => {
    const savedLevel = window.localStorage.getItem("evon-guest-reply-level");
    const savedStyle = window.localStorage.getItem("evon-guest-style");
    if (REPLY_LEVELS.includes(savedLevel)) setReplyLevel(savedLevel);
    if (STYLE_OPTIONS.some(option => option.id === savedStyle)) setStyleId(savedStyle);
  }, []);

  useEffect(() => resizeGuestTextarea(textareaRef.current), [input]);

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
          const ref = await addDoc(guestChats(uid), guestChatData(uid, "新聊天"));
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
      const ref = await addDoc(guestChats(uid), guestChatData(uid, `新聊天 ${chats.length + 1}`));
      setActiveChatId(ref.id);
      setSidebarOpen(false);
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

  const changeReplyLevel = event => {
    const next = event.target.value;
    setReplyLevel(next);
    window.localStorage.setItem("evon-guest-reply-level", next);
  };

  const changeStyle = next => {
    setStyleId(next);
    window.localStorage.setItem("evon-guest-style", next);
  };

  return (
    <main className="guest-root" data-guest-theme={styleId}>
      <style>{`
        .guest-root {
          --guest-bg: var(--bg); --guest-panel: var(--panel); --guest-panel-alt: var(--panel-alt);
          --guest-border: var(--border); --guest-text: var(--text);
          --guest-muted: var(--text-muted); --guest-accent: var(--accent);
          --guest-accent-soft: var(--accent-active);
          --guest-accent-border: color-mix(in srgb, var(--accent) 45%, var(--border));
          --guest-accent-text: color-mix(in srgb, var(--accent) 65%, var(--text));
          color-scheme: light;
          height: 100dvh; display: grid; grid-template-columns: 280px minmax(0, 1fr); grid-template-rows: minmax(0, 1fr);
          background: var(--guest-bg); color: var(--guest-text); font-family: var(--font-body);
        }
        .guest-root[data-guest-theme="shadow-window"] { color-scheme: dark; }
        .guest-root[data-guest-theme="pastel-pearl"] { --guest-accent-text: var(--text); }
        .guest-sidebar { --guest-text: #262626; --guest-muted: #737373; --guest-border: #ececec; width: 280px; height: 100dvh; box-sizing: border-box; flex-shrink: 0; background: #fafafa; color: var(--guest-text); border-right: 1px solid #ececec; padding: 0 14px; display: flex; flex-direction: column; min-width: 0; min-height: 0; box-shadow: none; z-index: 30; }
        .guest-sidebar-backdrop, .guest-sidebar-close, .guest-sidebar-open { display: none; }
        .guest-brand { height: 68px; flex-shrink: 0; display: flex; align-items: center; gap: 10px; padding: 0 2px; }
        .guest-brand img { width: 28px; height: 28px; object-fit: contain; }
        .guest-brand-name { font-size: 17px; line-height: 28px; font-weight: 800; letter-spacing: 1.3px; }
        .guest-sidebar-close { margin-left: auto; }
        .guest-new { width: 100%; height: 44px; flex-shrink: 0; border: 0; border-radius: 11px; background: #f0f0f0; color: #303030; padding: 0 14px; display: flex; align-items: center; justify-content: flex-start; gap: 10px; cursor: pointer; font-weight: 600; transition: background .16s ease; }
        .guest-new:hover { background: #e7e7e7; }
        .guest-section-label { display: block; margin: 18px 4px 7px; color: #858585; font-size: 12px; font-weight: 600; }
        .guest-list { flex: 1; min-height: 0; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; scrollbar-width: thin; }
        .guest-chat-row { position: relative; min-height: 56px; box-sizing: border-box; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 4px; border: 0; border-radius: 10px; padding: 3px 5px 3px 10px; color: #555; transition: background .16s ease; }
        .guest-chat-row:hover { background: #f0f0f0; }
        .guest-chat-row.active { background: color-mix(in srgb, var(--guest-accent) 9%, #fafafa); color: #262626; }
        .guest-chat-select { min-width: 0; height: 100%; border: 0; background: none; color: inherit; text-align: left; cursor: pointer; padding: 7px 2px; display: flex; align-items: center; gap: 10px; }
        .guest-chat-copy { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .guest-chat-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 13px; font-weight: 600; }
        .guest-chat-subtitle { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #858585; font-size: 12px; }
        .guest-row-actions { position: relative; display: flex; }
        .guest-more { opacity: 0; transition: opacity .15s, background .15s; }
        .guest-chat-row:hover .guest-more, .guest-chat-row:focus-within .guest-more, .guest-more[aria-expanded="true"] { opacity: 1; }
        .guest-row-menu { position: absolute; top: 34px; right: 0; z-index: 20; width: 132px; padding: 5px; display: grid; gap: 2px; border: 1px solid #e5e5e5; border-radius: 10px; background: #fff; box-shadow: 0 8px 24px rgba(0,0,0,.08); }
        .guest-row-menu button { height: 34px; border: 0; border-radius: 7px; background: transparent; color: #404040; padding: 0 9px; display: flex; align-items: center; gap: 8px; cursor: pointer; font: inherit; font-size: 12px; }
        .guest-row-menu button:hover { background: #f3f3f3; }
        .guest-row-menu button:last-child { color: #b42318; }
        .guest-icon-button { border: 0; background: none; color: var(--guest-muted); width: 31px; height: 31px; border-radius: 8px; cursor: pointer; display: grid; place-items: center; }
        .guest-sidebar .guest-sidebar-close { display: none; }
        .guest-icon-button:hover { color: #262626; background: #ededed; }
        .guest-style-switcher { flex-shrink: 0; padding: 8px 0 10px; }
        .guest-appearance-toggle { width: 100%; height: 40px; border: 0; border-radius: 10px; background: transparent; color: #505050; padding: 0 10px; display: flex; align-items: center; gap: 9px; cursor: pointer; font: inherit; font-size: 13px; font-weight: 600; }
        .guest-appearance-toggle:hover { background: #f0f0f0; }
        .guest-appearance-toggle svg:last-child { margin-left: auto; transition: transform .16s ease; }
        .guest-appearance-toggle[aria-expanded="true"] svg:last-child { transform: rotate(180deg); }
        .guest-style-options { margin-top: 4px; display: grid; gap: 3px; }
        .guest-style-button { min-height: 36px; padding: 7px 10px 7px 32px; display: flex; align-items: center; gap: 8px; border: 0; border-radius: 9px; background: transparent; color: #4b4b4b; font: inherit; font-size: 12px; text-align: left; cursor: pointer; transition: background .16s ease; }
        .guest-style-button:hover { background: #f0f0f0; }
        .guest-style-button.active { background: color-mix(in srgb, var(--guest-accent) 9%, #fafafa); }
        .guest-style-check { margin-left: auto; color: var(--guest-accent-text); }
        .guest-style-button:focus-visible, .guest-appearance-toggle:focus-visible, .guest-level-control:focus-within, .guest-new:focus-visible, .guest-icon-button:focus-visible, .guest-send:focus-visible, .guest-sidebar-open:focus-visible { outline: 2px solid #525252; outline-offset: 2px; }
        .guest-account { flex-shrink: 0; margin: 0 -2px; padding: 12px 8px; border-top: 1px solid #ececec; border-radius: 10px 10px 0 0; display: flex; align-items: center; justify-content: space-between; gap: 10px; transition: background .16s ease; }
        .guest-account:hover { background: #f0f0f0; }
        .guest-account-name { min-width: 0; }
        .guest-account-name strong { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 14px; }
        .guest-account-name span { color: #858585; font-size: 12px; }
        /* Keep the reading workspace neutral independently of the sidebar theme. */
        .guest-main {
          --guest-text: #202020; --guest-muted: #737373; --guest-panel: #fff;
          --guest-accent-text: #525252; --guest-accent-border: #c5c5c5; --guest-accent-soft: #f3f3f3;
          min-width: 0; min-height: 0; display: flex; flex-direction: column;
          background: #fafafa; color: var(--guest-text); color-scheme: light;
        }
        .guest-header { height: 64px; box-sizing: border-box; flex-shrink: 0; border: 0; border-bottom: 1px solid #ececec; border-radius: 0; background: #fafafa; box-shadow: none; padding: 0 26px; display: flex; align-items: center; justify-content: space-between; gap: 18px; }
        .guest-header-left { min-width: 0; display: flex; align-items: center; gap: 8px; }
        .guest-header-copy { min-width: 0; display: flex; align-items: center; gap: 11px; }
        .guest-header-avatar { width: 32px; height: 32px; flex: 0 0 32px; border-radius: 50%; object-fit: cover; }
        .guest-header h1 { margin: 0; font-size: 15px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .guest-level-control { position: relative; width: fit-content; min-width: 96px; height: 45px; box-sizing: border-box; padding: 0 14px; border: 1px solid transparent; border-radius: 9px; background: transparent; color: #525252; display: inline-flex; align-items: center; justify-content: center; gap: 10px; transition: background .16s ease, border-color .16s ease; }
        .guest-level-control:hover { background: #f1f1f1; border-color: #e6e6e6; }
        .guest-level-value { font-size: 12px; font-weight: 600; line-height: 1; letter-spacing: .04em; pointer-events: none; }
        .guest-level-control svg { flex: 0 0 auto; pointer-events: none; }
        .guest-level-select { position: absolute; inset: 0; z-index: 1; width: 100%; height: 100%; margin: 0; padding: 0; border: 0; outline: 0; appearance: none; -webkit-appearance: none; opacity: 0; cursor: pointer; }
        .guest-messages { flex: 1; min-height: 0; overflow-y: auto; overscroll-behavior-y: contain; padding: 28px 0 12px; }
        /* The main workspace (sidebar excluded) is three equal tracks; chat lives on the centre track. */
        .guest-message-column, .guest-composer-column { width: calc(100% / 3); min-width: 0; margin: 0 auto; box-sizing: border-box; }
        .guest-message-column { display: flex; flex-direction: column; }
        .guest-message { min-width: 0; display: flex; justify-content: flex-end; margin-bottom: 24px; }
        .guest-message--companion { justify-content: flex-start; }
        .guest-companion-message { display: grid; grid-template-columns: 28px minmax(0, 1fr); gap: 12px; max-width: 100%; color: var(--guest-text); font-size: 15.5px; line-height: 1.7; }
        .guest-companion-message img { width: 28px; height: 28px; object-fit: contain; }
        .guest-companion-name { display: block; margin: 1px 0 8px; color: #404040; font-size: 13px; font-weight: 600; overflow-wrap: anywhere; }
        .guest-companion-content { min-width: 0; overflow-wrap: anywhere; white-space: pre-wrap; }
        .guest-companion-content :is(p, ul, ol, pre, blockquote) { margin: 0 0 16px; }
        .guest-companion-content :is(ul, ol) { padding-left: 24px; white-space: normal; }
        .guest-companion-content li + li { margin-top: 6px; }
        .guest-companion-content pre { max-width: 100%; overflow-x: auto; padding: 16px; border: 1px solid #e7e7e7; border-radius: 12px; background: #f4f4f4; white-space: pre; }
        .guest-companion-content code { font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .9em; }
        .guest-companion-content :not(pre) > code { padding: 2px 4px; border-radius: 4px; background: #f0f0f0; }
        .guest-companion-content > :last-child { margin-bottom: 0; }
        .guest-bubble { box-sizing: border-box; max-width: min(100%, 680px); padding: 12px 16px; border: 1px solid #e7e7e7; border-radius: 16px; background: #fff; color: #202020; font-size: 15.5px; line-height: 1.65; white-space: pre-wrap; overflow-wrap: anywhere; box-shadow: none; }
        .guest-composer-wrap { flex-shrink: 0; padding: 12px 0 22px; }
        .guest-error { margin-bottom: 9px; color: color-mix(in srgb, #ef4444 70%, var(--guest-text)); font-size: 13px; text-align: center; }
        .guest-composer { width: 100%; min-height: 58px; box-sizing: border-box; border: 1px solid #e6e6e6; border-radius: 20px; background: #fff; display: flex; align-items: flex-end; gap: 10px; padding: 7px 9px 7px 16px; box-shadow: none; transition: border-color .18s ease; }
        .guest-composer:focus-within { border-color: #a3a3a3; box-shadow: none; }
        .guest-composer textarea { flex: 1; min-width: 0; width: 100%; height: 40px; min-height: 40px; max-height: 176px; box-sizing: border-box; resize: none; overflow-y: hidden; border: 0; outline: 0; background: transparent; color: var(--guest-text); padding: 8px 0; font: inherit; font-size: 15.5px; line-height: 24px; }
        .guest-composer textarea::placeholder { color: var(--guest-muted); opacity: 1; }
        .guest-send { width: 42px; height: 42px; flex: 0 0 42px; border-radius: 13px; border: 0; background: transparent; color: #404040; display: grid; place-items: center; cursor: pointer; transition: background .18s ease, transform .16s ease, opacity .18s ease; }
        .guest-send:not(:disabled):hover { background: #f3f3f3; }
        .guest-send:not(:disabled):active { transform: scale(.96); }
        .guest-send:disabled { opacity: .32; cursor: not-allowed; }
        @media (min-width: 721px) and (max-width: 1024px) {
          .guest-root { grid-template-columns: 252px minmax(0, 1fr); }
          .guest-sidebar { width: 252px; padding-inline: 12px; }
        }
        @media (max-width: 720px) {
          .guest-root { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
          .guest-sidebar-backdrop { display: block; position: fixed; inset: 0; z-index: 29; border: 0; background: rgba(0,0,0,.24); cursor: pointer; }
          .guest-sidebar { position: fixed; inset: 0 auto 0 0; width: min(86vw, 320px); height: 100dvh; padding: 0 14px; border-right: 1px solid #e5e5e5; visibility: hidden; transform: translateX(-102%); transition: transform .2s ease, visibility 0s linear .2s; }
          .guest-sidebar.open { visibility: visible; transform: translateX(0); transition-delay: 0s; }
          .guest-sidebar .guest-sidebar-close, .guest-sidebar-open { display: grid; place-items: center; }
          .guest-more { opacity: 1; }
          .guest-main { min-height: 0; }
          .guest-header { height: 60px; padding: 0 14px; }
          .guest-header-copy { gap: 9px; }
          .guest-sidebar-open { flex: 0 0 34px; width: 34px; height: 34px; padding: 0; border: 0; border-radius: 8px; background: transparent; color: #525252; cursor: pointer; }
          .guest-sidebar-open:hover { background: #efefef; }
          .guest-header h1 { font-size: 14px; }
          .guest-level-control { min-width: 96px; height: 44px; padding-inline: 14px; }
          .guest-messages { padding: 24px 16px 8px; }
          .guest-message-column, .guest-composer-column { width: 100%; }
          .guest-composer-wrap { padding: 10px 16px calc(12px + env(safe-area-inset-bottom)); }
        }
      `}</style>

      {sidebarOpen && <button className="guest-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="關閉側邊欄" />}

      <aside className={`guest-sidebar${sidebarOpen ? " open" : ""}`} aria-label="聊天側邊欄">
        <div className="guest-brand">
          <img src="/logo.png?v=3" alt="" aria-hidden="true" />
          <div className="guest-brand-name">EVONCHAT</div>
          <button className="guest-icon-button guest-sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="關閉側邊欄">
            <X size={18} />
          </button>
        </div>

        <button className="guest-new" onClick={createChat}>
          <Plus size={17} /> 新聊天
        </button>

        <span className="guest-section-label">對話</span>
        <div className="guest-list" aria-label="你的訪客聊天">
          {chats.map(chat => (
            <div key={chat.id} className={`guest-chat-row${chat.id === activeChatId ? " active" : ""}`}>
              <button className="guest-chat-select" onClick={() => {
                setActiveChatId(chat.id);
                setSidebarOpen(false);
              }}>
                <MessageCircle size={17} />
                <span className="guest-chat-copy">
                  <span className="guest-chat-title">{COMPANION_NAME}</span>
                  <span className="guest-chat-subtitle">{chat.title || "新聊天"}</span>
                </span>
              </button>
              <span className="guest-row-actions">
                <button
                  className="guest-icon-button guest-more"
                  onClick={() => setOpenActionsId(current => current === chat.id ? null : chat.id)}
                  aria-label={`${chat.title || "新聊天"} 操作`}
                  aria-expanded={openActionsId === chat.id}
                  aria-haspopup="menu"
                >
                  <MoreHorizontal size={17} />
                </button>
                {openActionsId === chat.id && (
                  <span className="guest-row-menu" role="menu">
                    <button role="menuitem" onClick={() => { setOpenActionsId(null); renameChat(chat); }}><Pencil size={14} />重新命名</button>
                    <button role="menuitem" onClick={() => { setOpenActionsId(null); deleteChat(chat); }}><Trash2 size={14} />刪除聊天</button>
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>

        <div className="guest-style-switcher">
          <button className="guest-appearance-toggle" onClick={() => setAppearanceOpen(open => !open)} aria-expanded={appearanceOpen} aria-controls="guest-theme-options">
            <Settings size={16} />
            <span>外觀</span>
            <ChevronDown size={15} aria-hidden="true" />
          </button>
          {appearanceOpen && (
            <div id="guest-theme-options" className="guest-style-options" role="group" aria-label="介面風格">
              {STYLE_OPTIONS.map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={`guest-style-button${styleId === option.id ? " active" : ""}`}
                  onClick={() => changeStyle(option.id)}
                  aria-label={option.label}
                  aria-pressed={styleId === option.id}
                  title={option.label}
                >
                  <span aria-hidden="true">{option.icon}</span>
                  <span>{option.label}</span>
                  {styleId === option.id && <span className="guest-style-check" aria-hidden="true">✓</span>}
                </button>
              ))}
            </div>
          )}
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
          <div className="guest-header-left">
            <button className="guest-sidebar-open" onClick={() => setSidebarOpen(true)} aria-label="開啟側邊欄">
              <Menu size={19} />
            </button>
            <div className="guest-header-copy">
              <img className="guest-header-avatar" src="/evon-avatar.png" alt="EVON 頭像" width={32} height={32} />
              <h1>{COMPANION_NAME}</h1>
            </div>
          </div>
          <span className="guest-level-control">
            <select className="guest-level-select" value={replyLevel} onChange={changeReplyLevel} aria-label="回覆模式">
              {REPLY_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
            </select>
            <span className="guest-level-value" aria-hidden="true">{replyLevel}</span>
            <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
          </span>
        </header>

        <div className="guest-messages">
          <div className="guest-message-column">
            <div className="guest-message guest-message--companion">
              <div className="guest-companion-message">
                <img src="/logo.png?v=3" alt="" aria-hidden="true" />
                <div>
                  <span className="guest-companion-name">{COMPANION_NAME}</span>
                  <div className="guest-companion-content">{COMPANION_GREETING}</div>
                </div>
              </div>
            </div>
            {messages.map(message => (
              <div key={message.id} className="guest-message">
                <div className="guest-bubble">{message.text}</div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="guest-composer-wrap">
          <div className="guest-composer-column">
            {error && <div className="guest-error" role="alert">{error}</div>}
            <div className="guest-composer">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={event => {
                  setInput(event.target.value);
                  resizeGuestTextarea(event.target);
                }}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={() => { composingRef.current = false; }}
                onKeyDown={event => {
                  const isComposing = composingRef.current || event.nativeEvent.isComposing;
                  if (isGuestSubmitKey({ key: event.key, shiftKey: event.shiftKey, isComposing })) {
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
        </div>
      </section>
    </main>
  );
}
