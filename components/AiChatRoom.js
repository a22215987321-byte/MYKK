import { useState, useRef, useEffect } from "react";
import {
  collection, doc, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, limit, serverTimestamp,
} from "firebase/firestore";
import { toast } from "../lib/toast";
import MarkdownMessage, { MarkdownMessageStyles } from "./MarkdownMessage";
import PortalPopover from "./PortalPopover";
import { Brain, History, SquarePen } from "lucide-react";
import styles from "./AiChatRoom.module.css";

const DEFAULT_MODELS = [
  { id: "claude-sonnet", label: "Claude Sonnet 5" },
  { id: "claude-haiku", label: "Claude Haiku 4.5" },
  { id: "gpt-5", label: "GPT-5" },
  { id: "gpt-5-mini", label: "GPT-5.2 Mini" },
  { id: "deepseek-v4-flash", label: "DeepSeek-V4-Flash" },
  { id: "deepseek-v4-pro", label: "DeepSeek-V4-Pro" },
];
const FREELLM_MODEL = { id: "freellm-auto", label: "FreeLLMAPI Auto" };

function titleFromMessages(messages) {
  const firstUser = messages.find(m => m.role === "user");
  if (!firstUser?.content) return "新對話";
  const t = firstUser.content.trim().replace(/\s+/g, " ");
  return t.length > 24 ? t.slice(0, 24) + "…" : t;
}

function formatConvTime(ts) {
  const d = ts?.toDate ? ts.toDate() : (ts ? new Date(ts) : null);
  if (!d) return "";
  return d.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

// 深度思考（DeepThink）開啟時，DeepSeek 回傳的 reasoning_content——收合
// 顯示在正式回覆上方，預設收起來（思考過程通常很長，不想佔掉主要對話的
// 版面），點一下展開看完整推理過程。
function ReasoningBlock({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ width: "100%", boxSizing: "border-box" }}>
      <button onClick={() => setOpen(v => !v)}
        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 11, padding: "2px 4px" }}>
        🤔 思考過程 <span style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}>▾</span>
      </button>
      {open && (
        <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.6, whiteSpace: "pre-wrap", padding: "6px 10px", borderLeft: "2px solid var(--border)", marginTop: 2 }}>
          {text}
        </div>
      )}
    </div>
  );
}

// Manus-style message presentation lives here instead of in the chat shell so
// the sidebar, header, composer and message data flow remain untouched.
function AiChatMessage({ message }) {
  if (message.role === "user") {
    return (
      <article className="evon-ai-message evon-ai-message--user" aria-label="你的訊息">
        <div className="evon-ai-user-bubble">{message.content}</div>
      </article>
    );
  }

  return (
    <article className="evon-ai-message evon-ai-message--assistant" aria-label="EVON AI 回覆">
      <img className="evon-ai-message-avatar" src="/logo.png?v=3" alt="" aria-hidden="true" />
      <div className="evon-ai-assistant-content">
        <div className="evon-ai-message-author">EVON AI</div>
        {message.reasoning && <ReasoningBlock text={message.reasoning} />}
        <MarkdownMessage content={message.content} />
      </div>
    </article>
  );
}

function AiChatMessageStyles() {
  return (
    <style>{`
      .evon-ai-message {
        width: 100%;
        box-sizing: border-box;
      }
      .evon-ai-message--user {
        display: flex;
        justify-content: flex-end;
        margin: 2px 0 0;
      }
      .evon-ai-user-bubble {
        width: fit-content;
        max-width: 70%;
        padding: 10px 14px;
        border: 1px solid color-mix(in srgb, var(--border) 82%, transparent);
        border-radius: 14px;
        background: color-mix(in srgb, var(--panel) 88%, var(--text) 12%);
        color: var(--text);
        font-size: 14px;
        line-height: 1.6;
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
      }
      .evon-ai-message--assistant {
        display: grid;
        grid-template-columns: 28px minmax(0, 1fr);
        align-items: start;
        gap: 12px;
        width: min(100%, 820px);
        margin-right: auto;
      }
      .evon-ai-message-avatar {
        width: 28px;
        height: 28px;
        margin-top: 1px;
        border: 0;
        border-radius: 0;
        object-fit: contain;
        flex-shrink: 0;
      }
      .evon-ai-assistant-content {
        width: min(100%, 760px);
        min-width: 0;
        color: var(--text);
        font-size: 14px;
        line-height: 1.65;
        overflow-wrap: anywhere;
      }
      .evon-ai-message-author {
        margin: 2px 0 7px;
        color: var(--text-muted);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }
      .evon-ai-assistant-content .ai-md p {
        margin-bottom: 12px;
        line-height: 1.68;
      }
      .evon-ai-assistant-content .ai-md ul,
      .evon-ai-assistant-content .ai-md ol {
        margin-bottom: 12px;
      }
      .evon-ai-assistant-content .ai-md li {
        margin-bottom: 5px;
        line-height: 1.65;
      }
      .evon-ai-message + .evon-ai-message--assistant {
        margin-top: 24px;
      }
      .evon-ai-message--assistant + .evon-ai-message--user {
        margin-top: 34px;
      }
      .evon-ai-message--user + .evon-ai-message--user {
        margin-top: 10px;
      }
      .evon-ai-message--assistant + .evon-ai-message--assistant {
        margin-top: 20px;
      }
      .evon-ai-thinking {
        color: var(--text-faint);
        font-size: 14px;
        line-height: 1.6;
      }
      @media (max-width: 680px) {
        .evon-ai-user-bubble { max-width: 78%; }
        .evon-ai-message--assistant {
          grid-template-columns: 24px minmax(0, 1fr);
          gap: 10px;
        }
        .evon-ai-message-avatar { width: 24px; height: 24px; }
        .evon-ai-message--assistant + .evon-ai-message--user { margin-top: 28px; }
      }
    `}</style>
  );
}

// Standalone "AI 助手" room — a simple chat UI backed by pages/api/ai/chat.js
// (DeepSeek, server-side only).
//
// Conversations live in aiChats/{uid}/conversations/{convId} — each one its
// own document, not a single overwritten slot. "新對話" just deselects the
// current conversation (it stays saved as-is); a 歷史 panel lists past
// conversations to reopen or delete. This replaces an earlier single-slot
// design where 新對話 destructively wiped the one saved conversation with no
// way to get it back — exactly the "important conversation just disappeared"
// failure this is meant to fix.
export default function AiChatRoom({ user, db, compact = false, onClose, headerDragProps, minimized = false, onMinimize }) {
  const uid = user?.uid;
  const [conversations, setConversations] = useState([]);
  const [convListReady, setConvListReady] = useState(false);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  // 預設模型固定用 DeepSeek（跟後端 chat.js 的 DEFAULT_MODEL_ID 一致），
  // 不要因為上面模型陣列的排序（OpenRouter 排前面方便選）跟著變動。
  const [model, setModel] = useState("deepseek-v4-flash");
  const [availableModels, setAvailableModels] = useState(DEFAULT_MODELS);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  // 深度思考（DeepThink）——只有 DeepSeek 的兩個模型支援，切換會讓後端
  // （pages/api/ai/chat.js）帶 extra_body.thinking.type 給 DeepSeek。回覆
  // 裡如果有 reasoning_content，會存在該則訊息的 reasoning 欄位，顯示成
  // 收合的「思考過程」區塊，不佔用主要回覆的版面。
  const [deepThink, setDeepThink] = useState(false);
  const isDeepseekModel = model.startsWith("deepseek");
  const [historyOpen, setHistoryOpen] = useState(false);
  // 聊天模式／圖片生成模式切換。圖片生成目前是純前端暫存（images），不會存進
  // aiChats 對話紀錄——先讓功能能用，之後真的要留存再另外接 Firestore。
  const [mode, setMode] = useState("chat"); // "chat" | "image"
  const [images, setImages] = useState([]); // [{ prompt, imageUrl }]
  const [imagePrompt, setImagePrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const endRef = useRef(null);
  const modelMenuRef = useRef(null);
  const historyRef = useRef(null);
  const migratedRef = useRef(false);
  // Set right before a programmatic setMessages() that's "switching to a
  // different conversation" rather than "the current one grew a message" —
  // the save effect below checks this so loading/switching never re-saves
  // the conversation it just loaded straight back on top of itself.
  const skipNextSaveRef = useRef(false);

  // FreeLLMAPI is optional and self-hosted. Only expose it in the picker when
  // both server-side settings exist, so production never offers a dead option.
  useEffect(() => {
    let active = true;
    fetch("/api/ai/chat", { method: "GET" })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (active && data?.freellmapiEnabled) {
          setAvailableModels([FREELLM_MODEL, ...DEFAULT_MODELS]);
        }
      })
      .catch(() => {});
    return () => { active = false; };
  }, []);

  // Live list of this user's saved conversations, newest first.
  useEffect(() => {
    if (!uid) { setConvListReady(true); return; }
    const q = query(collection(db, "aiChats", uid, "conversations"), orderBy("updatedAt", "desc"), limit(50));
    const unsub = onSnapshot(q, snap => {
      setConversations(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setConvListReady(true);
    }, err => {
      console.error("AiChatRoom conversations listener error:", err);
      setConvListReady(true);
    });
    return unsub;
  }, [uid, db]);

  // One-time migration from the old single-doc aiChats/{uid} shape (see git
  // history) into a real conversation, so upgrading doesn't itself delete
  // whatever the user had in progress. Runs once the list has loaded and
  // only if there's nothing there yet.
  useEffect(() => {
    if (!uid || !convListReady || migratedRef.current) return;
    migratedRef.current = true;
    if (conversations.length > 0) return;
    (async () => {
      try {
        const oldSnap = await getDoc(doc(db, "aiChats", uid));
        const oldMessages = oldSnap.exists() ? (oldSnap.data().messages || []) : [];
        if (oldMessages.length === 0) return;
        await addDoc(collection(db, "aiChats", uid, "conversations"), {
          messages: oldMessages, title: titleFromMessages(oldMessages),
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.error("AiChatRoom migration error:", err);
      }
    })();
  }, [uid, db, convListReady, conversations.length]);

  // Once the conversation list has loaded and nothing's been picked yet,
  // open the most recently updated one automatically (same "pick up where
  // you left off" behavior the old single-slot version had).
  //
  // messages.length===0 guard: without this, a user who types and sends a
  // message before the (async) conversation list finishes loading would get
  // their just-sent message silently overwritten the moment the list
  // resolves — this is exactly the "my question just disappeared" bug.
  // autoOpenedRef makes this run at most once per mount too, so it can never
  // fire again later and stomp on an active conversation for any other
  // reason (e.g. the conversations array reference changing).
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (!convListReady || autoOpenedRef.current || activeConvId || messages.length > 0 || conversations.length === 0) return;
    autoOpenedRef.current = true;
    skipNextSaveRef.current = true;
    setActiveConvId(conversations[0].id);
    setMessages(conversations[0].messages || []);
  }, [convListReady, conversations, activeConvId, messages.length]);

  // Autosave — creates a new conversation doc on this user's first message,
  // then keeps updating that same doc. Surfaces a toast on failure instead
  // of only logging, so a broken save is never silent.
  //
  // creatingConvRef guards against a real race: send() updates `messages`
  // twice per turn (the user's message immediately, then the assistant's
  // reply once the API responds) — if the reply arrives before the first
  // addDoc() has resolved, activeConvId is still null on the second run, so
  // without this guard it would fire a second addDoc() and create a
  // duplicate, incomplete conversation doc instead of updating the first
  // one. activeConvId is also now a dependency, so the moment the first
  // addDoc resolves and sets it, this effect re-runs and saves whatever
  // `messages` currently holds (including a reply that arrived mid-race)
  // via updateDoc — nothing sent during the race window is silently lost.
  const creatingConvRef = useRef(false);
  useEffect(() => {
    if (!uid || messages.length === 0) return;
    if (skipNextSaveRef.current) { skipNextSaveRef.current = false; return; }
    const payload = { messages, title: titleFromMessages(messages), updatedAt: serverTimestamp() };
    if (activeConvId) {
      updateDoc(doc(db, "aiChats", uid, "conversations", activeConvId), payload)
        .catch(err => { console.error("AiChatRoom save error:", err); toast("對話儲存失敗，請檢查網路連線"); });
    } else if (!creatingConvRef.current) {
      creatingConvRef.current = true;
      addDoc(collection(db, "aiChats", uid, "conversations"), { ...payload, createdAt: serverTimestamp() })
        .then(ref => { creatingConvRef.current = false; setActiveConvId(ref.id); })
        .catch(err => {
          creatingConvRef.current = false;
          console.error("AiChatRoom save error:", err);
          toast("對話儲存失敗，請檢查網路連線");
        });
    }
  }, [messages, activeConvId, uid, db]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, sending, images, generating]);


  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, model, thinking: isDeepseekModel && deepThink }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 服務發生錯誤");
      setMessages(m => [...m, { role: "assistant", content: data.reply, reasoning: data.reasoning || "" }]);
    } catch (err) {
      toast(err.message || "傳送失敗，請重試");
    } finally {
      setSending(false);
    }
  };

  const generateImage = async () => {
    const p = imagePrompt.trim();
    if (!p || generating) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "圖片生成發生錯誤");
      setImages(prev => [...prev, { prompt: p, imageUrl: data.imageUrl }]);
      setImagePrompt("");
    } catch (err) {
      toast(err.message || "生成失敗，請重試");
    } finally {
      setGenerating(false);
    }
  };

  // No longer destructive — the conversation being left is already saved
  // (autosave above), this just clears the view so the next message starts
  // a fresh one instead of appending to the old thread.
  const newConversation = () => {
    if (sending) return;
    skipNextSaveRef.current = true;
    setMessages([]);
    setActiveConvId(null);
  };

  const openConversation = (conv) => {
    skipNextSaveRef.current = true;
    setActiveConvId(conv.id);
    setMessages(conv.messages || []);
    setHistoryOpen(false);
  };

  const removeConversation = async (e, convToDelete) => {
    e.stopPropagation();
    try {
      await deleteDoc(doc(db, "aiChats", uid, "conversations", convToDelete.id));
      if (convToDelete.id === activeConvId) {
        skipNextSaveRef.current = true;
        setActiveConvId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error("AiChatRoom delete error:", err);
      toast("刪除失敗，請重試");
    }
  };

  // 歷史對話清單內容——完整版跟浮動小視窗（compact）共用同一份，compact 版
  // 只是額外在最上面加一條「新對話」（完整版有自己獨立的「新對話」按鈕，不需要
  // 塞進清單裡）。
  const historyList = (
    <div style={{
      background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--card-shadow)",
      overflow: "hidden", maxHeight: 320, overflowY: "auto",
    }}>
      {compact && (
        <div onClick={() => { newConversation(); setHistoryOpen(false); }}
          style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", cursor: "pointer", borderBottom: "1px solid var(--border-soft)", fontSize: 13, color: "var(--text)", fontWeight: 600 }}
          onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
          onMouseLeave={e => e.currentTarget.style.background = "none"}>
          🆕 新對話
        </div>
      )}
      {conversations.length === 0 && (
        <div style={{ padding: "14px", fontSize: 12, color: "var(--text-dim)", textAlign: "center" }}>還沒有過去的對話</div>
      )}
      {conversations.map(c => (
        <div key={c.id} onClick={() => openConversation(c)}
          style={{
            display: "flex", alignItems: "center", gap: 8, width: "100%", padding: "10px 14px",
            background: c.id === activeConvId ? "var(--panel-hover)" : "none", cursor: "pointer",
            borderBottom: "1px solid var(--border-soft)",
          }}
          onMouseEnter={e => { if (c.id !== activeConvId) e.currentTarget.style.background = "var(--panel-hover)"; }}
          onMouseLeave={e => { if (c.id !== activeConvId) e.currentTarget.style.background = "none"; }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title || "新對話"}</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{formatConvTime(c.updatedAt)}</div>
          </div>
          <button onClick={e => removeConversation(e, c)} aria-label="刪除此對話" title="刪除此對話"
            style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 13, padding: 4, flexShrink: 0 }}>
            🗑️
          </button>
        </div>
      ))}
    </div>
  );

  return (
    <>
      {/* Header — className shares the .cr-chat-header rule defined in
          ChatRoom.js's <style> block (this component always renders inside
          ChatRoom's tree), so it gets the same "世界" background translucency
          as 大廳/私訊/群組 for free. compact 版（浮動小視窗用）只留「EVON AI」
          標題＋歷史對話＋關閉，其他（圖片生成模式切換、新對話獨立按鈕、副標題）
          全部拿掉保持簡潔；headerDragProps 是 FloatingAiChat 傳進來的拖曳
          事件（onPointerDown/Move/Up/Cancel），整條 header 就是它的拖曳把手。 */}
      {compact ? (
        <div className="cr-chat-header" {...headerDragProps}
          style={{ height: 44, borderBottom: "var(--toolbar-inner-divider, 1px solid var(--panel))", display: "flex", alignItems: "center", padding: "0 10px 0 14px", gap: 8, flexShrink: 0, boxSizing: "border-box", cursor: headerDragProps ? "grab" : "default", touchAction: "none", userSelect: "none" }}>
          <span style={{ fontSize: 15 }}>🤖</span>
          <div style={{ flex: 1, fontWeight: 700, fontSize: 13, color: "var(--text)" }}>EVON AI</div>
          <div style={{ position: "relative" }}>
            <button ref={historyRef} onClick={() => setHistoryOpen(v => !v)} onPointerDown={e => e.stopPropagation()}
              aria-label="開啟以往的對話" title="以往的對話"
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, padding: 6, lineHeight: 1 }}>
              🕘
            </button>
            <PortalPopover anchorRef={historyRef} open={historyOpen} onClose={() => setHistoryOpen(false)} placement="bottom-right" minWidth={220} constrainToViewport>
              {historyList}
            </PortalPopover>
          </div>
          {onMinimize && (
            <button onClick={onMinimize} onPointerDown={e => e.stopPropagation()} aria-label={minimized ? "還原視窗" : "縮小視窗"}
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, padding: 6, lineHeight: 1 }}>
              {minimized ? "⤢" : "─"}
            </button>
          )}
          {onClose && (
            <button onClick={onClose} onPointerDown={e => e.stopPropagation()} aria-label="關閉"
              style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, padding: 6, lineHeight: 1 }}>
              ✕
            </button>
          )}
        </div>
      ) : (
      <header className={`cr-chat-header ${styles.header}`} aria-label="AI 助手工具列">
        <div className={styles.identity}>
          <img src="/ai-avatar.jpg" alt="" width={32} height={32} />
          <div className={styles.identityText}>
            <div className={styles.title}>1.0 EVON AI</div>
            <div className={styles.subtitle}>有問題都可以問我</div>
          </div>
        </div>

        <div className={styles.options}>
          <div className={styles.modes} role="group" aria-label="AI 模式">
            {[["chat", "聊天模式"], ["image", "圖片生成"]].map(([key, label]) => (
              <button type="button" key={key} onClick={() => setMode(key)} aria-pressed={mode === key}>
                {label}
              </button>
            ))}
          </div>
          {mode === "chat" && isDeepseekModel && (
            <button type="button" className={styles.thinkingButton} onClick={() => setDeepThink(v => !v)}
              aria-pressed={deepThink} title="深度思考模式，回覆前會先顯示推理過程">
              <Brain size={16} aria-hidden="true" />深度思考
            </button>
          )}
        </div>

        {mode === "chat" && (
          <div className={styles.actions}>
            <button type="button" ref={historyRef} onClick={() => setHistoryOpen(v => !v)}
              aria-label={`歷史對話（${conversations.length}）`} aria-expanded={historyOpen} title="歷史對話">
              <History size={18} aria-hidden="true" />
              <span className={styles.actionLabel}>歷史對話{conversations.length > 0 ? ` (${conversations.length})` : ""}</span>
            </button>
            <PortalPopover anchorRef={historyRef} open={historyOpen} onClose={() => setHistoryOpen(false)} placement="bottom-right" minWidth={240} constrainToViewport>
              {historyList}
            </PortalPopover>
            <button type="button" onClick={newConversation} disabled={sending || messages.length === 0} aria-label="新對話" title="新對話">
              <SquarePen size={18} aria-hidden="true" /><span className={styles.actionLabel}>新對話</span>
            </button>
          </div>
        )}
      </header>
      )}

      {/* 縮小狀態（compact 版才有）——只留上面那條 header，訊息區跟輸入列
          整個不畫出來，但 AiChatRoom 本身沒有卸載，所有對話狀態、Firestore
          監聽都還在，還原後訊息會接著原本的樣子，不會重新載入或掉輸入到
          一半的草稿。 */}
      {!(compact && minimized) && (
      <>
      {/* Messages — className="cr-chat-panel" gives this its own floating
          "window" treatment under 幽影深窗 (background/border/radius/glow —
          see the .cr-chat-panel rule in ChatRoom.js's <style> block); every
          other theme's --chatpanel-* tokens default to 0/none so this stays
          a plain flush container exactly as before. */}
      <div className={`cr-chat-panel ${styles.messages} ${compact ? "" : styles.fullMessages}`} style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: mode === "chat" ? 0 : 14, backgroundSize: "var(--chat-world-bg-size, auto), cover", backgroundRepeat: "var(--chat-world-bg-repeat, repeat), no-repeat", backgroundPosition: "center, center", backgroundAttachment: "fixed, fixed" }}>
        {mode === "chat" ? (
          <>
            {messages.length === 0 && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--empty-icon-bg, none)", border: "var(--empty-icon-border, none)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "var(--empty-title-color)" }}>💬</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--empty-title-color)" }}>有什麼問題開始對話吧</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ width: "var(--empty-line-w, 0px)", height: 1, background: "var(--empty-sub-color)", opacity: 0.3 }} />
                  <span style={{ fontSize: 13, color: "var(--empty-sub-color)" }}>我可以幫你回答問題、提供建議、撰寫內容等</span>
                  <span style={{ width: "var(--empty-line-w, 0px)", height: 1, background: "var(--empty-sub-color)", opacity: 0.3 }} />
                </div>
              </div>
            )}
            <MarkdownMessageStyles />
            <AiChatMessageStyles />
            {messages.map((message, i) => <AiChatMessage key={i} message={message} />)}
            {sending && (
              <article className="evon-ai-message evon-ai-message--assistant" aria-label="EVON AI 正在回覆">
                <img className="evon-ai-message-avatar" src="/logo.png?v=3" alt="" aria-hidden="true" />
                <div className="evon-ai-assistant-content">
                  <div className="evon-ai-message-author">EVON AI</div>
                  <span className="evon-ai-thinking">思考中...</span>
                </div>
              </article>
            )}
            <div ref={endRef} />
          </>
        ) : (
          <>
            {images.length === 0 && !generating && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: "var(--empty-icon-bg, none)", border: "var(--empty-icon-border, none)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "var(--empty-title-color)" }}>🎨</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: "var(--empty-title-color)" }}>描述你想要的圖片</div>
                <div style={{ fontSize: 13, color: "var(--empty-sub-color)" }}>由 gpt-image-2 生成</div>
              </div>
            )}
            {images.map((img, i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{img.prompt}</div>
                <img src={img.imageUrl} alt={img.prompt} style={{ maxWidth: "100%", maxHeight: 480, borderRadius: "var(--radius-lg)", display: "block", objectFit: "contain" }} />
              </div>
            ))}
            {generating && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: "var(--radius-lg)", background: "var(--bubble-assistant-bg, var(--panel-alt))", color: "var(--text-faint)", fontSize: 14 }}>
                  生成中...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </>
        )}
      </div>

      {/* Input row — model picker sits directly to the left of 傳送. className
          reuses .cr-input-bar for the same reason as the header above
          (also gives it the opaque panel the other 3 rooms' input bars
          already had, which this one was previously missing). */}
      <div className={`cr-input-bar ${styles.composer} ${compact ? "" : styles.fullComposer}`} style={{ padding: "12px 16px", borderTop: "var(--toolbar-inner-divider, 1px solid var(--panel))", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, boxSizing: "border-box" }}>
        {mode === "chat" ? (
          <>
        {/* Decorative under 幽影深窗 only (--plusbtn-display defaults to
            none everywhere else) — DeepSeek's text-only API has nowhere to
            send an attachment yet, so this doesn't wire up a real upload.
            compact（浮動小視窗）版直接不畫這顆，維持「下方只有傳送訊息」。 */}
        {!compact && (
        <button type="button" className={styles.attachment} onClick={() => toast("附加檔案功能即將推出")}
          style={{
            display: "var(--plusbtn-display, none)", width: "var(--plusbtn-size, 0px)", height: "var(--plusbtn-size, 0px)",
            flexShrink: 0, alignItems: "center", justifyContent: "center",
            background: "var(--toolbar-btn-bg, var(--panel-alt))", border: "1px solid var(--border)", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))",
            color: "var(--text)", fontSize: 22, cursor: "pointer", lineHeight: 1,
          }}>
          +
        </button>
        )}

        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="輸入訊息..." aria-label="輸入訊息" disabled={sending}
          style={{ flex: 1, height: "var(--inputbar-field-h, auto)", boxSizing: "border-box", background: "var(--inputfield-bg, var(--panel))", border: "1px solid var(--border)", borderRadius: "var(--search-radius, var(--radius-md))", padding: "9px 14px", color: "var(--text)", fontSize: 14, outline: "none" }} />

        {/* 模型選擇——compact 版拿掉，固定用預設模型（DeepSeek），對話紀錄跟
            完整版共用同一份 Firestore 資料，之後在完整版「AI 助手」頁還是能
            切換模型繼續聊。 */}
        {!compact && (
        <div className={styles.modelPicker} style={{ position: "relative", flexShrink: 0, width: "var(--modelpicker-w, auto)" }}>
          <button ref={modelMenuRef} onClick={() => setModelMenuOpen(v => !v)} aria-label="選擇 AI 模型" aria-expanded={modelMenuOpen}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "var(--modelpicker-justify, flex-start)", gap: 6,
              width: "100%", height: "var(--inputbar-field-h, 100%)", boxSizing: "border-box",
              background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--modelpicker-radius, 999px)",
              padding: "0 14px", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}>
            {availableModels.find(m => m.id === model)?.label || model} <span style={{ fontSize: 10, color: "var(--text-faint)" }}>▾</span>
          </button>

          <PortalPopover anchorRef={modelMenuRef} open={modelMenuOpen} onClose={() => setModelMenuOpen(false)} placement="top-right" minWidth={210} constrainToViewport>
            <div style={{
              background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
              boxShadow: "var(--card-shadow)", overflow: "hidden",
            }}>
              {availableModels.map(m => (
                <button key={m.id} onClick={() => { setModel(m.id); setModelMenuOpen(false); }}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%",
                    padding: "10px 14px", background: "none", border: "none",
                    color: "var(--text)", fontSize: 13, textAlign: "left", cursor: "pointer",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  <span>{m.label}</span>
                  {model === m.id && <span>✓</span>}
                </button>
              ))}
            </div>
          </PortalPopover>
        </div>
        )}

        <button className={styles.sendButton} onClick={send} disabled={sending || !input.trim()}
          style={{
            width: "var(--sendbtn-width, auto)", height: "var(--sendbtn-height, auto)", boxSizing: "border-box",
            background: "var(--sendbtn-bg, var(--accent))", border: "none", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))",
            padding: "9px 18px", color: "var(--accent-text)", fontSize: 14, fontWeight: 600,
            cursor: sending ? "default" : "pointer", opacity: sending || !input.trim() ? 0.6 : 1, flexShrink: 0,
          }}>
          傳送
        </button>
          </>
        ) : (
          <>
        <input type="text" value={imagePrompt} onChange={e => setImagePrompt(e.target.value)}
          onKeyDown={e => e.key === "Enter" && generateImage()}
          placeholder="描述你想要的圖片..." aria-label="描述你想要的圖片" disabled={generating}
          style={{ flex: 1, height: "var(--inputbar-field-h, auto)", boxSizing: "border-box", background: "var(--inputfield-bg, var(--panel))", border: "1px solid var(--border)", borderRadius: "var(--search-radius, var(--radius-md))", padding: "9px 14px", color: "var(--text)", fontSize: 14, outline: "none" }} />

        <button className={styles.sendButton} onClick={generateImage} disabled={generating || !imagePrompt.trim()}
          style={{
            width: "var(--sendbtn-width, auto)", height: "var(--sendbtn-height, auto)", boxSizing: "border-box",
            background: "var(--sendbtn-bg, var(--accent))", border: "none", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))",
            padding: "9px 18px", color: "var(--accent-text)", fontSize: 14, fontWeight: 600,
            cursor: generating ? "default" : "pointer", opacity: generating || !imagePrompt.trim() ? 0.6 : 1, flexShrink: 0,
          }}>
          生成圖片
        </button>
          </>
        )}
      </div>
      </>
      )}
    </>
  );
}
