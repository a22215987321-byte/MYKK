import { useState, useRef, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "../lib/toast";

const MODELS = [
  { id: "deepseek-v4-flash", label: "deepseek-v4-flash" },
  { id: "deepseek-v4-pro", label: "deepseek-v4-pro" },
];

// Standalone "AI 助手" room — a simple chat UI backed by pages/api/ai/chat.js
// (DeepSeek, server-side only). The conversation is saved to Firestore
// (aiChats/{uid}) so it survives a refresh; "新對話" clears it and starts fresh.
export default function AiChatRoom({ user, db }) {
  const uid = user?.uid;
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [model, setModel] = useState(MODELS[0].id);
  const [modelMenuOpen, setModelMenuOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const endRef = useRef(null);
  const modelMenuRef = useRef(null);

  // Load this user's saved conversation once on mount.
  useEffect(() => {
    if (!uid) { setLoaded(true); return; }
    let cancelled = false;
    (async () => {
      try {
        const snap = await getDoc(doc(db, "aiChats", uid));
        if (!cancelled && snap.exists()) setMessages(snap.data().messages || []);
      } catch (err) {
        console.error("AiChatRoom load error:", err);
      } finally {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [uid, db]);

  // Persist on every change, but only once the initial load has settled —
  // otherwise the empty initial state would overwrite the saved conversation
  // for a split second before it loads.
  useEffect(() => {
    if (!uid || !loaded) return;
    setDoc(doc(db, "aiChats", uid), { messages, updatedAt: serverTimestamp() })
      .catch(err => console.error("AiChatRoom save error:", err));
  }, [messages, uid, loaded, db]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, sending]);

  // Click-outside-to-close, same pattern as ThemeToggle's dropdown.
  useEffect(() => {
    if (!modelMenuOpen) return;
    const onClickOutside = e => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target)) setModelMenuOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [modelMenuOpen]);

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

  const newConversation = () => {
    if (sending) return;
    setMessages([]);
  };

  return (
    <>
      {/* Header */}
      <div style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "var(--panel-alt)", flexShrink: 0 }}>
        <img src="/ai-avatar.jpg" alt="EVON AI" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>1.0 EVON AI</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>有問題都可以問我</div>
        </div>
        <div style={{ flex: 1 }} />
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

      {/* Messages */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
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

      {/* Input row — model picker sits directly to the left of 傳送 */}
      <div style={{ padding: "12px 16px", borderTop: "1px solid var(--panel)", display: "flex", gap: 8, flexShrink: 0 }}>
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
