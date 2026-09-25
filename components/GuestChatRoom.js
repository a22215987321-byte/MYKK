import { useCallback, useEffect, useRef, useState } from "react";
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
import { ArrowDown, ChevronDown, LogOut, Menu, MessageCircle, MoreHorizontal, Pencil, Plus, Search, Send, Settings, Sparkles, SquarePen, Trash2, X } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { OWNER_EMAIL } from "../lib/admin";
import useIsMobile from "../lib/useIsMobile";
import { GUEST_SKILLS, prepareGuestSkillMessage } from "../lib/guestSkills";
import GuestSkillsSheet, { GuestSkillIcon } from "./GuestSkillsSheet";

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
  element.style.overflowY = element.scrollHeight > element.clientHeight ? "auto" : "hidden";
}

export function isGuestSubmitKey({ key, shiftKey, isComposing, keyCode }) {
  return key === "Enter" && !shiftKey && !isComposing && keyCode !== 229;
}

export function filterGuestChats(chats, search) {
  const term = search.trim().toLocaleLowerCase();
  return chats.filter(chat => `${COMPANION_NAME} ${chat.title || "新聊天"} ${chat.lastMessage || ""}`.toLocaleLowerCase().includes(term));
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
  const [skillsOpen, setSkillsOpen] = useState(false);
  const [chatSearch, setChatSearch] = useState("");
  const [skillNotice, setSkillNotice] = useState("");
  const [showScrollDown, setShowScrollDown] = useState(false);
  const rootRef = useRef(null);
  const sidebarRef = useRef(null);
  const messageListRef = useRef(null);
  const isMobile = useIsMobile();
  const creatingInitialChat = useRef(false);
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);
  const composingRef = useRef(false);
  const closeSkills = useCallback(() => setSkillsOpen(false), []);

  // Follow the visible area when the on-screen keyboard or browser bars resize.
  // Only a CSS measurement changes: no conversation/auth state is touched.
  useEffect(() => {
    const root = rootRef.current;
    if (!isMobile) { root?.style.removeProperty("--guest-viewport-height"); return; }
    const viewport = window.visualViewport;
    const update = () => {
      root?.style.setProperty("--guest-viewport-height", `${viewport?.height || window.innerHeight}px`);
      resizeGuestTextarea(textareaRef.current);
    };
    update();
    viewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      viewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      root?.style.removeProperty("--guest-viewport-height");
    };
  }, [isMobile]);

  useEffect(() => {
    if (!isMobile || !sidebarOpen) return;
    const sidebar = sidebarRef.current;
    const trigger = document.activeElement;
    const focusable = () => Array.from(sidebar.querySelectorAll('button:not(:disabled), input, [href]')).filter(element => element.offsetParent !== null);
    focusable()[0]?.focus({ preventScroll: true });
    const onKeyDown = event => {
      if (event.key === "Escape") { event.preventDefault(); setSidebarOpen(false); return; }
      if (event.key !== "Tab") return;
      const elements = focusable();
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    sidebar.addEventListener("keydown", onKeyDown);
    return () => {
      sidebar.removeEventListener("keydown", onKeyDown);
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [isMobile, sidebarOpen]);

  const applySkill = skillId => {
    setInput(current => prepareGuestSkillMessage(skillId, current));
    setSkillsOpen(false);
    setSkillNotice("已加入任務範本，補上內容後再傳送。");
    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      textarea?.focus({ preventScroll: true });
      if (textarea) textarea.setSelectionRange(textarea.value.length, textarea.value.length);
    });
  };

  const scrollToLatest = () => {
    messageListRef.current?.scrollTo({ top: messageListRef.current.scrollHeight, behavior: window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  useEffect(() => {
    const savedLevel = window.localStorage.getItem("evon-guest-reply-level");
    const savedStyle = window.localStorage.getItem("evon-guest-style");
    if (REPLY_LEVELS.includes(savedLevel)) setReplyLevel(savedLevel);
    if (STYLE_OPTIONS.some(option => option.id === savedStyle)) setStyleId(savedStyle);
  }, []);

  useEffect(() => {
    resizeGuestTextarea(textareaRef.current);
    if (!input) setSkillNotice("");
  }, [input]);

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
    <main ref={rootRef} className="guest-root" data-guest-theme={styleId}>
      {/* Static CSS must stay raw in SSR: escaped selector quotes break hydration. */}
      <style dangerouslySetInnerHTML={{ __html: `
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
        .guest-mobile-only, .guest-mobile-welcome, .guest-mobile-search, .guest-composer-caption, .guest-skill-notice { display: none; }
        .guest-header-actions { display: flex; align-items: center; gap: 4px; }
        .guest-reading-area { position: relative; display: flex; flex: 1; min-height: 0; flex-direction: column; }
        .guest-scroll-latest { position: absolute; bottom: 8px; left: calc(50% - 20px); z-index: 2; width: 40px; height: 40px; border: 1px solid #e5e5e5; border-radius: 50%; background: #fff; color: #555; cursor: pointer; display: grid; place-items: center; box-shadow: 0 2px 8px #00000008; }
        .guest-scroll-latest:hover { background: #f2f2f2; }
        .guest-no-chats { color: #858585; font-size: 13px; padding: 16px 8px; line-height: 1.6; }
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
        .guest-header-new { display: none; }
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
        @media (min-width: 768px) and (max-width: 1024px) {
          .guest-root { grid-template-columns: 252px minmax(0, 1fr); }
          .guest-sidebar { width: 252px; padding-inline: 12px; }
        }
        @media (max-width: 767px) {
          .guest-root { height: var(--guest-viewport-height, 100dvh); grid-template-columns: minmax(0, 1fr); grid-template-rows: minmax(0, 1fr); overflow: hidden; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans TC", sans-serif; }
          .guest-root *, .guest-root *::before, .guest-root *::after { box-sizing: border-box; }
          .guest-main { background: #fafafa; padding-top: env(safe-area-inset-top); }
          .guest-sidebar-backdrop { display: block; position: fixed; inset: 0; z-index: 29; border: 0; background: rgba(0,0,0,.24); cursor: pointer; }
          .guest-sidebar { position: fixed; inset: 0 auto auto 0; width: min(88vw, 320px); height: var(--guest-viewport-height, 100dvh); padding: env(safe-area-inset-top) 16px env(safe-area-inset-bottom); border-right: 1px solid #e5e5e5; visibility: hidden; transform: translateX(-102%); transition: transform .2s ease, visibility 0s linear .2s; }
          .guest-sidebar.open { visibility: visible; transform: translateX(0); transition-delay: 0s; }
          .guest-sidebar .guest-sidebar-close, .guest-sidebar-open { display: grid; place-items: center; }
          .guest-sidebar .guest-icon-button { width: 44px; height: 44px; flex: 0 0 44px; }
          .guest-brand { height: 68px; }
          .guest-mobile-search { display: flex; align-items: center; flex-shrink: 0; gap: 9px; min-height: 44px; margin-top: 14px; padding: 0 12px; border: 1px solid #e7e7e7; border-radius: 11px; color: #8b8b8b; background: #fff; }
          .guest-mobile-search input { width: 100%; min-width: 0; padding: 10px 0; border: 0; outline: none; background: transparent; color: #303030; font: inherit; font-size: 16px; }
          .guest-mobile-search:focus-within { border-color: #888; }
          .guest-section-label { margin-top: 16px; }
          .guest-chat-row { min-height: 62px; flex-shrink: 0; }
          .guest-chat-title { font-size: 14px; }
          .guest-chat-select > svg { flex-shrink: 0; }
          .guest-row-menu { top: 43px; }
          .guest-row-menu button { height: 44px; font-size: 14px; }
          .guest-style-options { max-height: 180px; overflow-y: auto; }
          .guest-style-button { min-height: 44px; font-size: 13px; }
          .guest-more { opacity: 1; }
          .guest-main { min-height: 0; }
          .guest-header { height: 60px; padding: 0 10px; gap: 4px; border-bottom-color: transparent; }
          .guest-header-left { gap: 4px; }
          .guest-header-copy { gap: 7px; }
          .guest-header-avatar { width: 26px; height: 26px; flex-basis: 26px; }
          .guest-sidebar-open { flex: 0 0 44px; width: 44px; height: 44px; padding: 0; border: 0; border-radius: 12px; background: transparent; color: #525252; cursor: pointer; }
          .guest-sidebar-open:hover { background: #efefef; }
          .guest-header h1 { font-size: 14px; }
          .guest-level-control { min-width: 96px; height: 44px; padding-inline: 14px; }
          .guest-mobile-only { display: inline-flex; }
          .guest-header-new { width: 44px; height: 44px; align-items: center; justify-content: center; color: #555; }
          .guest-messages { padding: 20px 20px 8px; scroll-padding-bottom: 16px; }
          .guest-message-column, .guest-composer-column { width: 100%; }
          .guest-messages.is-empty { display: flex; padding-top: clamp(24px, 10dvh, 90px); }
          .guest-messages.is-empty .guest-message-column { flex: 1; }
          .guest-messages.is-empty .guest-greeting { display: none; }
          .guest-mobile-welcome { display: flex; flex-direction: column; align-items: center; width: 100%; margin: auto 0; padding-bottom: 24px; text-align: center; }
          .guest-welcome-avatar { width: 52px; height: 52px; object-fit: cover; border-radius: 50%; margin-bottom: 24px; }
          .guest-welcome-eyebrow { margin: 0 0 10px; color: #8b8b8b; font-size: 11px; letter-spacing: .12em; }
          .guest-mobile-welcome h2 { margin: 0; color: #292929; font-size: clamp(23px, 6.6vw, 28px); line-height: 1.4; font-weight: 500; letter-spacing: -.035em; }
          .guest-welcome-copy { max-width: 300px; margin: 14px 0 0; color: #7a7a7a; font-size: 13px; line-height: 1.8; }
          .guest-quick-skills { display: flex; justify-content: center; flex-wrap: wrap; gap: 8px; margin-top: 28px; }
          .guest-quick-skills button { display: flex; align-items: center; gap: 7px; min-height: 44px; padding: 0 13px; border: 1px solid #e7e5e8; border-radius: 24px; background: #fff; color: #5a555f; font: inherit; font-size: 12px; cursor: pointer; }
          .guest-quick-skills button:hover { background: #f1eff4; border-color: #d6d0dd; }
          .guest-skills-all { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; gap: 7px; margin-top: 8px; padding: 0 14px; border: 0; border-radius: 12px; background: transparent; color: #81758f; font: inherit; font-size: 12px; cursor: pointer; }
          .guest-skills-all:hover { background: #f0edf3; }
          .guest-message { margin-bottom: 24px; }
          .guest-bubble { max-width: 90%; padding: 11px 14px; font-size: 15px; border-radius: 16px; }
          .guest-companion-message { grid-template-columns: 24px minmax(0, 1fr); gap: 10px; font-size: 15px; line-height: 1.75; }
          .guest-companion-message img { width: 24px; height: 24px; }
          .guest-composer-wrap { padding: 10px 12px max(10px, env(safe-area-inset-bottom)); background: #fafafa; }
          .guest-composer { display: grid; grid-template-columns: minmax(0, 1fr) 42px; align-items: end; gap: 2px 8px; min-height: 106px; padding: 10px 10px 8px 14px; border-radius: 22px; border-color: #e4e4e4; }
          .guest-composer textarea { grid-column: 1 / -1; padding: 6px 2px; font-size: 16px; line-height: 24px; max-height: min(176px, calc(var(--guest-viewport-height, 100dvh) * .3)); }
          .guest-composer-skills { justify-self: start; align-items: center; gap: 7px; min-height: 42px; padding: 0 9px; border: 0; border-radius: 11px; color: #756785; background: transparent; font: inherit; font-size: 12px; cursor: pointer; }
          .guest-composer-skills:hover { background: #f4f1f6; }
          .guest-send { grid-column: 2; border-radius: 50%; color: #3a3a3a; }
          .guest-send:not(:disabled):hover { background: #eeebf1; }
          .guest-composer-caption { display: block; margin: 8px 0 0; text-align: center; color: #929292; font-size: 10px; line-height: 1.5; }
          .guest-skill-notice { display: block; margin: 0 4px 8px; color: #7b7088; font-size: 12px; line-height: 1.5; }
          .guest-root button:focus-visible { outline: 2px solid #80708e; outline-offset: 2px; }
          .guest-root button:active:not(:disabled) { opacity: .8; }
        }
        @media (max-width: 767px) and (max-height: 620px) {
          .guest-messages.is-empty { padding-top: 12px; }
          .guest-welcome-avatar, .guest-welcome-eyebrow, .guest-welcome-copy, .guest-composer-caption { display: none; }
          .guest-mobile-welcome { padding-bottom: 12px; }
          .guest-quick-skills { margin-top: 16px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .guest-root *, .guest-root *::before, .guest-root *::after { transition: none !important; scroll-behavior: auto !important; }
        }
      ` }} />

      {sidebarOpen && <button className="guest-sidebar-backdrop" onClick={() => setSidebarOpen(false)} aria-label="關閉側邊欄" tabIndex={-1} />}

      <aside ref={sidebarRef} className={`guest-sidebar${sidebarOpen ? " open" : ""}`} inert={isMobile && !sidebarOpen ? "" : undefined} aria-label="聊天側邊欄" role={isMobile ? "dialog" : undefined} aria-modal={isMobile && sidebarOpen ? true : undefined}>
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

        <label className="guest-mobile-search"><Search size={17} aria-hidden="true" /><input type="search" value={chatSearch} onChange={event => setChatSearch(event.target.value)} placeholder="搜尋對話" aria-label="搜尋對話" /></label>

        <span className="guest-section-label">對話</span>
        <div className="guest-list" aria-label="你的訪客聊天">
          {filterGuestChats(chats, isMobile ? chatSearch : "").map(chat => (
            <div key={chat.id} className={`guest-chat-row${chat.id === activeChatId ? " active" : ""}`}>
              <button className="guest-chat-select" aria-current={chat.id === activeChatId ? "page" : undefined} onClick={() => {
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
          {chats.length > 0 && isMobile && filterGuestChats(chats, chatSearch).length === 0 && <p className="guest-no-chats" role="status">找不到符合的對話。</p>}
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

      <section className="guest-main" inert={isMobile && sidebarOpen ? "" : undefined}>
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
          <div className="guest-header-actions"><span className="guest-level-control">
            <select className="guest-level-select" value={replyLevel} onChange={changeReplyLevel} aria-label="回覆模式">
              {REPLY_LEVELS.map(level => <option key={level} value={level}>{level}</option>)}
            </select>
            <span className="guest-level-value" aria-hidden="true">{replyLevel}</span>
            <ChevronDown size={14} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <button type="button" className="guest-icon-button guest-mobile-only guest-header-new" onClick={createChat} aria-label="建立新聊天" title="新聊天"><SquarePen size={19} /></button></div>
        </header>

        <div className="guest-reading-area">
        <div ref={messageListRef} className={`guest-messages${messages.length === 0 ? " is-empty" : ""}`} onScroll={event => {
          const list = event.currentTarget;
          setShowScrollDown(list.scrollHeight - list.scrollTop - list.clientHeight > 160);
        }}>
          <div className="guest-message-column">
            {messages.length === 0 && <div className="guest-mobile-welcome">
              <img className="guest-welcome-avatar" src="/evon-avatar.png" alt="" />
              <p className="guest-welcome-eyebrow">EVON · YOUR WORKSPACE</p>
              <h2>今天，想從哪裡開始？</h2>
              <p className="guest-welcome-copy">{COMPANION_GREETING}</p>
              <div className="guest-quick-skills">{GUEST_SKILLS.slice(0, 3).map(skill => <button type="button" key={skill.id} onClick={() => applySkill(skill.id)}><GuestSkillIcon name={skill.icon} size={15} />{skill.title}</button>)}</div>
              <button type="button" className="guest-skills-all" onClick={() => setSkillsOpen(true)}><Sparkles size={14} />探索 Skills 任務範本</button>
            </div>}
            <div className="guest-message guest-message--companion guest-greeting">
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
        {showScrollDown && <button type="button" className="guest-scroll-latest" onClick={scrollToLatest} aria-label="回到最新訊息"><ArrowDown size={18} /></button>}
        </div>

        <div className="guest-composer-wrap">
          <div className="guest-composer-column">
            {error && <div className="guest-error" role="alert">{error}</div>}
            {skillNotice && <p className="guest-skill-notice" role="status">{skillNotice}</p>}
            <div className="guest-composer">
              <textarea
                ref={textareaRef}
                rows={1}
                value={input}
                onChange={event => {
                  setInput(event.target.value);
                  setSkillNotice("");
                  resizeGuestTextarea(event.target);
                }}
                onCompositionStart={() => { composingRef.current = true; }}
                onCompositionEnd={() => { composingRef.current = false; }}
                onKeyDown={event => {
                  const isComposing = composingRef.current || event.nativeEvent.isComposing;
                  if (isGuestSubmitKey({ key: event.key, shiftKey: event.shiftKey, isComposing, keyCode: event.nativeEvent.keyCode })) {
                    event.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="輸入訊息…"
                aria-label="訊息"
              />
              <button type="button" className="guest-mobile-only guest-composer-skills" onClick={() => setSkillsOpen(true)} aria-label="開啟 Skills 任務範本" aria-haspopup="dialog"><Sparkles size={17} /><span>Skills</span></button>
              <button className="guest-send" onClick={sendMessage} disabled={!input.trim() || !activeChatId || sending} aria-label="傳送訊息">
                <Send size={19} />
              </button>
            </div>
            <p className="guest-composer-caption">訪客模式 · 請勿傳送敏感個人資料</p>
          </div>
        </div>
      </section>
      <GuestSkillsSheet open={skillsOpen} onClose={closeSkills} onSelect={applySkill} />
    </main>
  );
}
