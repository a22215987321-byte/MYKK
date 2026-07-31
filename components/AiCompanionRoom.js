import { useState, useRef, useEffect } from "react";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { toast } from "../lib/toast";
import { buildCompanionSystemPrompt } from "../lib/aiCompanionPrompt";
import { isAdminEmail } from "../lib/admin";

const MAX_STORED_MESSAGES = 20; // mirrors chat.js's MAX_MESSAGES — keeps the
// single aiCompanionChats/{uid} doc from growing past Firestore's 1MiB cap.
const ECHO_GUARD_MS = 400; // ignore mic input for this long after TTS starts,
// so the AI's own voice coming back through an un-headphoned speaker doesn't
// immediately self-trigger a barge-in.
const COMPANION_MODEL = "deepseek-v4-flash";

// Paid ("AI 夥伴") voice companion room. Gate: !hasAiCompanion -> unlock
// card; unlocked but no persona yet -> prompt to open AiCompanionCreator;
// otherwise the call UI. Speech is 100% browser-native (SpeechRecognition +
// speechSynthesis) — no paid speech API, per the confirmed plan decision.
export default function AiCompanionRoom({ user, db, myProfile, onOpenCreator }) {
  const uid = user?.uid;
  const [messages, setMessages] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [callActive, setCallActive] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [sending, setSending] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [unsupported, setUnsupported] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const endRef = useRef(null);

  const recognitionRef = useRef(null);
  const shouldListenRef = useRef(false);
  const speakingRef = useRef(false);
  const sendingRef = useRef(false);
  const ignoreInterimUntilRef = useRef(0);
  // handleUserTurn/speak close over `messages`/`myProfile` and get redefined
  // every render — recognition's onresult handler is only ever attached
  // once (mount effect), so it calls through this ref to always reach the
  // freshest closure instead of a stale one from the first render.
  const handleUserTurnRef = useRef(() => {});

  const hasAiCompanion = !!myProfile?.hasAiCompanion || isAdminEmail(user?.email);
  const hasPersona = !!myProfile?.companionName;

  // Load the single saved-session doc once.
  useEffect(() => {
    if (!uid || !hasAiCompanion) { setLoaded(true); return; }
    (async () => {
      try {
        const snap = await getDoc(doc(db, "aiCompanionChats", uid));
        if (snap.exists()) setMessages(snap.data().messages || []);
      } catch (err) {
        console.error("AiCompanionRoom load error:", err);
      } finally {
        setLoaded(true);
      }
    })();
  }, [uid, db, hasAiCompanion]);

  // Autosave, truncated to the last MAX_STORED_MESSAGES turns.
  useEffect(() => {
    if (!uid || !loaded || messages.length === 0) return;
    const trimmed = messages.slice(-MAX_STORED_MESSAGES);
    setDoc(doc(db, "aiCompanionChats", uid), { messages: trimmed, updatedAt: serverTimestamp() }, { merge: true })
      .catch(err => { console.error("AiCompanionRoom save error:", err); toast("對話儲存失敗，請檢查網路連線"); });
  }, [messages, uid, loaded, db]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, sending]);

  const speak = (text) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "zh-TW";
    utter.pitch = myProfile?.companionVoicePitch ?? 1;
    utter.rate = myProfile?.companionVoiceRate ?? 1;
    utter.onstart = () => {
      speakingRef.current = true;
      setSpeaking(true);
      ignoreInterimUntilRef.current = Date.now() + ECHO_GUARD_MS;
    };
    utter.onend = () => {
      speakingRef.current = false;
      setSpeaking(false);
    };
    window.speechSynthesis.speak(utter);
  };

  const handleUserTurn = async (text) => {
    if (!text || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    try {
      const systemPrompt = buildCompanionSystemPrompt({ name: myProfile?.companionName, traits: myProfile?.companionTraits });
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, model: COMPANION_MODEL, systemPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "AI 服務發生錯誤");
      setMessages(m => [...m, { role: "assistant", content: data.reply }]);
      speak(data.reply);
    } catch (err) {
      toast(err.message || "傳送失敗，請重試");
    } finally {
      setSending(false);
      sendingRef.current = false;
    }
  };
  useEffect(() => { handleUserTurnRef.current = handleUserTurn; });

  // Set up the recognizer once. continuous + interimResults so it keeps
  // running through an entire call (not restarted per-turn) — barge-in
  // relies on it staying alive while the AI is speaking too.
  useEffect(() => {
    const SR = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { setUnsupported(true); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "zh-TW";

    rec.onresult = (e) => {
      let finalText = "";
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) finalText += r[0].transcript;
        else interim += r[0].transcript;
      }
      if (speakingRef.current) {
        if (Date.now() < ignoreInterimUntilRef.current) return; // echo guard
        // Real barge-in: the AI's own speaker output couldn't have produced
        // mic input this far after TTS started, so treat this as the user
        // actually talking — stop the AI and let this segment become the
        // next turn instead of discarding it.
        window.speechSynthesis.cancel();
        speakingRef.current = false;
        setSpeaking(false);
      }
      if (interim) setInterimText(interim);
      if (finalText) {
        setInterimText("");
        handleUserTurnRef.current(finalText.trim());
      }
    };

    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "audio-capture") {
        // Don't let onend's restart logic retry a permission the user just
        // denied — that becomes an infinite deny/restart loop.
        shouldListenRef.current = false;
        setCallActive(false);
        toast(e.error === "not-allowed" ? "麥克風權限被拒絕，請到瀏覽器設定允許存取麥克風" : "找不到麥克風裝置");
      }
      // Other errors (no-speech, network, aborted) are left to onend's
      // normal restart-if-still-active handling below.
    };

    rec.onend = () => {
      if (shouldListenRef.current) {
        try { rec.start(); } catch { /* already starting — harmless */ }
      }
    };

    recognitionRef.current = rec;
    return () => {
      shouldListenRef.current = false;
      try { rec.stop(); } catch { /* not running — harmless */ }
    };
  }, []);

  const toggleCall = () => {
    if (callActive) {
      shouldListenRef.current = false;
      setCallActive(false);
      setInterimText("");
      try { recognitionRef.current?.stop(); } catch { /* already stopped */ }
      if (typeof window !== "undefined") window.speechSynthesis?.cancel();
      speakingRef.current = false;
      setSpeaking(false);
    } else {
      shouldListenRef.current = true;
      setCallActive(true);
      try { recognitionRef.current?.start(); } catch { /* already starting */ }
    }
  };

  const clearConversation = async () => {
    setMessages([]);
    if (!uid) return;
    try {
      await setDoc(doc(db, "aiCompanionChats", uid), { messages: [], updatedAt: serverTimestamp() }, { merge: true });
    } catch (err) {
      console.error("AiCompanionRoom clear error:", err);
    }
  };

  const handleUnlock = async () => {
    setUnlocking(true);
    try {
      const res = await fetch("/api/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: myProfile.uid,
          userNickname: myProfile.nickname || "",
          userAvatar: myProfile.avatar || "",
          userColor: myProfile.color || "",
          userAvatarImage: myProfile.avatarImage || "",
          product: "ai_companion_unlock",
        }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else toast("付款失敗：" + (data.error || "請稍後再試"));
    } catch {
      toast("付款發生錯誤，請重試");
    } finally {
      setUnlocking(false);
    }
  };

  if (!hasAiCompanion) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>💬</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text)" }}>解鎖 AI 語音夥伴</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 320 }}>
          自訂專屬 AI 夥伴的名字與個性，隨時用語音跟它聊天。付一次，永久解鎖。
        </div>
        <button onClick={handleUnlock} disabled={unlocking}
          style={{ background: unlocking ? "var(--border)" : "linear-gradient(135deg,var(--accent),var(--accent-2))", border: "none", borderRadius: "var(--radius-md)", padding: "12px 28px", color: unlocking ? "var(--text-faint)" : "var(--accent-text)", fontSize: 15, fontWeight: 700, cursor: unlocking ? "default" : "pointer" }}>
          {unlocking ? "處理中..." : "🔓 解鎖 HK$0.1"}
        </button>
      </div>
    );
  }

  if (!hasPersona) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 48 }}>✨</div>
        <div style={{ fontWeight: 700, fontSize: 18, color: "var(--text)" }}>先設計你的 AI 夥伴</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 320 }}>取個名字、選個性，設定好就能開始語音聊天了。</div>
        <button onClick={onOpenCreator}
          style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-2))", border: "none", borderRadius: "var(--radius-md)", padding: "12px 28px", color: "var(--accent-text)", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
          💬 開始設計
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="cr-chat-header" style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, flexShrink: 0 }}>
        {myProfile.avatarImage ? (
          <img src={myProfile.avatarImage} alt="" style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
        ) : (
          <div style={{ width: 32, height: 32, borderRadius: "50%", background: "var(--panel-alt)", flexShrink: 0 }} />
        )}
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{myProfile.companionName}</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
            {speaking ? "說話中..." : sending ? "思考中..." : callActive ? "聆聽中..." : "AI 語音夥伴"}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <button onClick={onOpenCreator}
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "6px 12px", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
          ✏️ 編輯夥伴
        </button>
        <button onClick={clearConversation} disabled={messages.length === 0}
          style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "6px 12px", color: "var(--text-muted)", fontSize: 12, fontWeight: 600, cursor: messages.length === 0 ? "default" : "pointer", opacity: messages.length === 0 ? 0.5 : 1 }}>
          🗑️ 清除對話
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14, backgroundImage: "var(--chat-world-bg, none)", backgroundSize: "var(--chat-world-bg-size, auto)", backgroundRepeat: "var(--chat-world-bg-repeat, repeat)", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
        {unsupported && (
          <div style={{ textAlign: "center", padding: "12px", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-muted)", fontSize: 13 }}>
            ⚠️ 此瀏覽器不支援語音辨識，建議使用 Chrome
          </div>
        )}
        {!unsupported && messages.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-dim)", padding: "40px 0" }}>
            <div style={{ fontSize: 14 }}>按下麥克風，開始跟 {myProfile.companionName} 說話吧</div>
            <div style={{ fontSize: 12, marginTop: 6 }}>建議戴耳機，避免喇叭聲被誤判成你在說話</div>
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
        {interimText && (
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ maxWidth: "70%", padding: "10px 14px", borderRadius: "var(--radius-lg)", background: "var(--panel-alt)", color: "var(--text-dim)", fontSize: 14, fontStyle: "italic" }}>
              {interimText}
            </div>
          </div>
        )}
        {sending && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{ padding: "10px 14px", borderRadius: "var(--radius-lg)", background: "var(--panel-alt)", color: "var(--text-faint)", fontSize: 14 }}>
              思考中...
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div className="cr-input-bar" style={{ padding: "16px", borderTop: "1px solid var(--panel)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, flexShrink: 0 }}>
        <button onClick={toggleCall} disabled={unsupported}
          style={{
            width: 64, height: 64, borderRadius: "50%", border: "none", fontSize: 26,
            background: unsupported ? "var(--border)" : callActive ? "linear-gradient(135deg,#ef4444,#dc2626)" : "linear-gradient(135deg,var(--accent),var(--accent-2))",
            color: "#fff", cursor: unsupported ? "default" : "pointer",
            boxShadow: callActive ? "0 0 0 6px rgba(239,68,68,0.15)" : "none",
          }}>
          {callActive ? "⏹" : "🎙️"}
        </button>
        <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
          {unsupported ? "語音辨識不可用" : callActive ? "點一下結束通話" : "點一下開始語音通話"}
        </div>
      </div>
    </>
  );
}
