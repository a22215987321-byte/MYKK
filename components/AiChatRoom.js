import { useState, useRef, useEffect } from "react";
import {
  collection, doc, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, limit, serverTimestamp,
} from "firebase/firestore";
import { toast } from "../lib/toast";

const MODELS = [
  { id: "deepseek-v4-flash", label: "deepseek-v4-flash" },
  { id: "deepseek-v4-pro", label: "deepseek-v4-pro" },
  { id: "claude-sonnet", label: "Claude Sonnet 4.6" },
  { id: "claude-haiku", label: "Claude Haiku 4.5" },
  { id: "gpt-5", label: "GPT-5.2" },
  { id: "gpt-5-mini", label: "GPT-5.2 Mini" },
  { id: "gemini-pro", label: "Gemini 3 Pro" },
];

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
export default function AiChatRoom({ user, db }) {
  const uid = user?.uid;
  const [conversations, setConversations] = useState([]);
  const [convListReady, setConvListReady] = useState(false);
  const [activeConvId, setActiveConvId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState(MODELS[0].id);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const endRef = useRef(null);
  const modelMenuRef = useRef(null);
  const historyRef = useRef(null);
  const migratedRef = useRef(false);
  // Set right before a programmatic setMessages() that's "switching to a
  // different conversation" rather than "the current one grew a message" —
  // the save effect below checks this so loading/switching never re-saves
  // the conversation it just loaded straight back on top of itself.
  const skipNextSaveRef = useRef(false);

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
  useEffect(() => {
    if (!convListReady || activeConvId || conversations.length === 0) return;
    skipNextSaveRef.current = true;
    setActiveConvId(conversations[0].id);
    setMessages(conversations[0].messages || []);
  }, [convListReady, conversations, activeConvId]);

  // Autosave — creates a new conversation doc on this user's first message,
  // then keeps updating that same doc. Surfaces a toast on failure instead
  // of only logging, so a broken save is never silent.
  useEffect(() => {
    if (!uid || messages.length === 0) return;
    if (skipNextSaveRef.current) { skipNextSaveRef.current = false; return; }
    const payload = { messages, title: titleFromMessages(messages), updatedAt: serverTimestamp() };
    if (activeConvId) {
      updateDoc(doc(db, "aiChats", uid, "conversations", activeConvId), payload)
        .catch(err => { console.error("AiChatRoom save error:", err); toast("對話儲存失敗，請檢查網路連線"); });
    } else {
      addDoc(collection(db, "aiChats", uid, "conversations"), { ...payload, createdAt: serverTimestamp() })
        .then(ref => setActiveConvId(ref.id))
        .catch(err => { console.error("AiChatRoom save error:", err); toast("對話儲存失敗，請檢查網路連線"); });
    }
  }, [messages, uid, db]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, sending]);

  // Click-outside-to-close, same pattern as ThemeToggle's dropdown.
  useEffect(() => {
    if (!modelMenuOpen && !historyOpen) return;
    const onClickOutside = e => {
      if (modelMenuOpen && modelMenuRef.current && !modelMenuRef.current.contains(e.target)) setModelMenuOpen(false);
      if (historyOpen && historyRef.current && !historyRef.current.contains(e.target)) setHistoryOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [modelMenuOpen, historyOpen]);

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
        body: JSON.stringify({ messages: next, model }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 服務發生錯誤");
      setMessages(m => [...m, { role: "assistant", content: data.reply }]);
    } catch (err) {
      toast(err.message || "傳送失敗，請重試");
    } finally {
      setSending(false);
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

  return (
    <>
      {/* Header — className shares the .cr-chat-header rule defined in
          ChatRoom.js's <style> block (this component always renders inside
          ChatRoom's tree), so it gets the same "世界" background translucency
          as 大廳/私訊/群組 for free. */}
      <div className="cr-chat-header" style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
        <img src="/ai-avatar.jpg" alt="EVON AI" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>1.0 EVON AI</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>有問題都可以問我</div>
        </div>
        <div style={{ flex: 1 }} />

        <div ref={historyRef} style={{ position: "relative" }}>
          <button onClick={() => setHistoryOpen(v => !v)}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "6px 14px", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            🕘 歷史對話{conversations.length > 0 ? ` (${conversations.length})` : ""}
          </button>
          {historyOpen && (
            <div style={{
              position: "absolute", top: "100%", right: 0, marginTop: 6, background: "var(--panel)",
              border: "1px solid var(--border)", borderRadius: "var(--radius-md)", boxShadow: "var(--card-shadow)",
              overflow: "hidden", zIndex: 20, minWidth: 240, maxHeight: 320, overflowY: "auto",
            }}>
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
          )}
        </div>

        <button onClick={newConversation} disabled={sending || messages.length === 0}
          style={{
            background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
            padding: "6px 14px", color: "var(--text-muted)", fontSize: 12, fontWeight: 600,
            cursor: (sending || messages.length === 0) ? "default" : "pointer",
            opacity: (sending || messages.length === 0) ? 0.5 : 1,
          }}>
          🆕 新對話
        </button>
      </div>

      {/* Messages — same --chat-world-bg wiring as the other 3 chat rooms
          (see ChatRoom.js's hall/private/group message containers). */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, backgroundImage: "var(--chat-world-bg, none)", backgroundSize: "var(--chat-world-bg-size, auto)", backgroundRepeat: "var(--chat-world-bg-repeat, repeat)", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
        {messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "80px 0" }}>
            <div style={{ fontSize: 14 }}>打個招呼開始對話吧</div>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
            <div style={{
              maxWidth: "70%", padding: "10px 14px", borderRadius: "var(--radius-lg)",
              background: m.role === "user" ? "var(--accent)" : "var(--panel-alt)",
              color: m.role === "user" ? "var(--accent-text)" : "var(--text)",
              fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 14px", borderRadius: "var(--radius-lg)", background: "var(--panel-alt)", color: "var(--text-faint)", fontSize: 14 }}>
              思考中...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input row — model picker sits directly to the left of 傳送. className
          reuses .cr-input-bar for the same reason as the header above
          (also gives it the opaque panel the other 3 rooms' input bars
          already had, which this one was previously missing). */}
      <div className="cr-input-bar" style={{ padding: "12px 16px", borderTop: "1px solid var(--panel)", display: "flex", gap: 8, flexShrink: 0 }}>
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="輸入訊息..." disabled={sending}
          style={{ flex: 1, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "9px 14px", color: "var(--text)", fontSize: 14, outline: "none" }} />

        <div ref={modelMenuRef} style={{ position: "relative", flexShrink: 0 }}>
          <button onClick={() => setModelMenuOpen(v => !v)}
            style={{
              display: "inline-flex", alignItems: "center", gap: 6, height: "100%",
              background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 999,
              padding: "0 14px", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}>
            {model} <span style={{ fontSize: 10, color: "var(--text-faint)" }}>▾</span>
          </button>

          {modelMenuOpen && (
            <div style={{
              position: "absolute", bottom: "calc(100% + 6px)", right: 0,
              background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)",
              boxShadow: "var(--card-shadow)", overflow: "hidden", zIndex: 20, minWidth: 210,
            }}>
              {MODELS.map(m => (
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
          )}
        </div>

        <button onClick={send} disabled={sending || !input.trim()}
          style={{ background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)", padding: "9px 18px", color: "var(--accent-text)", fontSize: 14, fontWeight: 600, cursor: sending ? "default" : "pointer", opacity: sending || !input.trim() ? 0.6 : 1, flexShrink: 0 }}>
          傳送
        </button>
      </div>
    </>
  );
}
