import { useState, useRef, useEffect } from "react";
import {
  collection, doc, getDoc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, limit, serverTimestamp,
} from "firebase/firestore";
import { toast } from "../lib/toast";

const MODELS = [
  { id: "claude-sonnet", label: "Claude Sonnet 5" },
  { id: "claude-haiku", label: "Claude Haiku 4.5" },
  { id: "gpt-5", label: "GPT-5" },
  { id: "gpt-5-mini", label: "GPT-5.2 Mini" },
  { id: "deepseek-v4-flash", label: "DeepSeek-V4-Flash" },
  { id: "deepseek-v4-pro", label: "DeepSeek-V4-Pro" },
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
  // 預設模型固定用 DeepSeek（跟後端 chat.js 的 DEFAULT_MODEL_ID 一致），
  // 不要因為上面 MODELS 陣列的排序（OpenRouter 排前面方便選）跟著變動。
  const [model, setModel] = useState("deepseek-v4-flash");
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
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
  }, [messages, sending, images, generating]);

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

  return (
    <>
      {/* Header — className shares the .cr-chat-header rule defined in
          ChatRoom.js's <style> block (this component always renders inside
          ChatRoom's tree), so it gets the same "世界" background translucency
          as 大廳/私訊/群組 for free. */}
      <div className="cr-chat-header" style={{ height: "var(--toolbar-height, 56px)", borderBottom: "var(--toolbar-inner-divider, 1px solid var(--panel))", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0, boxSizing: "border-box" }}>
        <img src="/ai-avatar.jpg" alt="EVON AI" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>1.0 EVON AI</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>有問題都可以問我</div>
        </div>

        {/* 聊天模式／圖片生成模式切換 */}
        <div style={{ display: "flex", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 999, padding: 3, gap: 2, marginLeft: 4 }}>
          {[["chat", "聊天模式"], ["image", "圖片生成"]].map(([key, label]) => (
            <button key={key} onClick={() => setMode(key)}
              style={{
                border: "none", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer",
                background: mode === key ? "var(--accent)" : "transparent",
                color: mode === key ? "var(--accent-text)" : "var(--text-muted)",
              }}>
              {label}
            </button>
          ))}
        </div>

        <div style={{ flex: 1 }} />

        {mode === "chat" && (
        <>
        <div ref={historyRef} style={{ position: "relative" }}>
          <button onClick={() => setHistoryOpen(v => !v)}
            style={{ height: "var(--toolbar-btn-height, auto)", boxSizing: "border-box", background: "var(--toolbar-btn-bg, none)", border: "1px solid var(--border)", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))", padding: "6px 14px", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
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
            height: "var(--toolbar-btn-height, auto)", boxSizing: "border-box",
            background: "var(--toolbar-btn-bg, none)", border: "1px solid var(--border)", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))",
            padding: "6px 14px", color: "var(--text-muted)", fontSize: 12, fontWeight: 600,
            cursor: (sending || messages.length === 0) ? "default" : "pointer",
            opacity: (sending || messages.length === 0) ? 0.5 : 1,
          }}>
          🆕 新對話
        </button>
        </>
        )}
      </div>

      {/* Messages — className="cr-chat-panel" gives this its own floating
          "window" treatment under 幽影深窗 (background/border/radius/glow —
          see the .cr-chat-panel rule in ChatRoom.js's <style> block); every
          other theme's --chatpanel-* tokens default to 0/none so this stays
          a plain flush container exactly as before. */}
      <div className="cr-chat-panel" style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, backgroundSize: "var(--chat-world-bg-size, auto), cover", backgroundRepeat: "var(--chat-world-bg-repeat, repeat), no-repeat", backgroundPosition: "center, center", backgroundAttachment: "fixed, fixed" }}>
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
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "70%", padding: "10px 14px", borderRadius: "var(--radius-lg)",
                  background: m.role === "user" ? "var(--accent)" : "var(--bubble-assistant-bg, var(--panel-alt))",
                  color: m.role === "user" ? "var(--accent-text)" : "var(--text)",
                  fontSize: 14, whiteSpace: "pre-wrap", wordBreak: "break-word",
                }}>
                  {m.content}
                </div>
              </div>
            ))}
            {sending && (
              <div style={{ display: "flex", justifyContent: "flex-start" }}>
                <div style={{ padding: "10px 14px", borderRadius: "var(--radius-lg)", background: "var(--bubble-assistant-bg, var(--panel-alt))", color: "var(--text-faint)", fontSize: 14 }}>
                  思考中...
                </div>
              </div>
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
      <div className="cr-input-bar" style={{ padding: "12px 16px", borderTop: "var(--toolbar-inner-divider, 1px solid var(--panel))", display: "flex", alignItems: "center", gap: 8, flexShrink: 0, boxSizing: "border-box" }}>
        {mode === "chat" ? (
          <>
        {/* Decorative under 幽影深窗 only (--plusbtn-display defaults to
            none everywhere else) — DeepSeek's text-only API has nowhere to
            send an attachment yet, so this doesn't wire up a real upload. */}
        <button type="button" onClick={() => toast("附加檔案功能即將推出")}
          style={{
            display: "var(--plusbtn-display, none)", width: "var(--plusbtn-size, 0px)", height: "var(--plusbtn-size, 0px)",
            flexShrink: 0, alignItems: "center", justifyContent: "center",
            background: "var(--toolbar-btn-bg, var(--panel-alt))", border: "1px solid var(--border)", borderRadius: "var(--toolbar-btn-radius, var(--radius-md))",
            color: "var(--text)", fontSize: 22, cursor: "pointer", lineHeight: 1,
          }}>
          +
        </button>

        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="輸入訊息..." disabled={sending}
          style={{ flex: 1, height: "var(--inputbar-field-h, auto)", boxSizing: "border-box", background: "var(--inputfield-bg, var(--panel))", border: "1px solid var(--border)", borderRadius: "var(--search-radius, var(--radius-md))", padding: "9px 14px", color: "var(--text)", fontSize: 14, outline: "none" }} />

        <div ref={modelMenuRef} style={{ position: "relative", flexShrink: 0, width: "var(--modelpicker-w, auto)" }}>
          <button onClick={() => setModelMenuOpen(v => !v)}
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "var(--modelpicker-justify, flex-start)", gap: 6,
              width: "100%", height: "var(--inputbar-field-h, 100%)", boxSizing: "border-box",
              background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--modelpicker-radius, 999px)",
              padding: "0 14px", color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
            }}>
            {MODELS.find(m => m.id === model)?.label || model} <span style={{ fontSize: 10, color: "var(--text-faint)" }}>▾</span>
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
          placeholder="描述你想要的圖片..." disabled={generating}
          style={{ flex: 1, height: "var(--inputbar-field-h, auto)", boxSizing: "border-box", background: "var(--inputfield-bg, var(--panel))", border: "1px solid var(--border)", borderRadius: "var(--search-radius, var(--radius-md))", padding: "9px 14px", color: "var(--text)", fontSize: 14, outline: "none" }} />

        <button onClick={generateImage} disabled={generating || !imagePrompt.trim()}
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
  );
}
