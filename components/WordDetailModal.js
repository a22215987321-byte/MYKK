function speak(word, lang) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(word);
  u.lang = lang === "es" ? "es-ES" : "en-US";
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

function parseDetail(text) {
  const lines = (text || "").split("\n");
  const sections = [];
  let current = null;
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    if (/^\d+\./.test(t)) {
      if (current) sections.push(current);
      current = { title: t, items: [] };
    } else if (t.startsWith("•")) {
      current?.items.push({ type: "phrase", text: t.slice(1).trim() });
    } else if (t.startsWith("○")) {
      current?.items.push({ type: "example", text: t.slice(1).trim() });
    }
  }
  if (current) sections.push(current);
  return sections;
}

// Split "sentence（翻譯）" into { sentence, translation }
function splitExample(text) {
  const m = text.match(/^([\s\S]*?)（([\s\S]+)）\s*$/);
  if (m) return { sentence: m[1].trim(), translation: m[2].trim() };
  return { sentence: text, translation: "" };
}

// Split "phrase = 中文" into { phrase, cn }
function splitPhrase(text) {
  const idx = text.indexOf(" = ");
  if (idx !== -1) return { phrase: text.slice(0, idx).trim(), cn: text.slice(idx + 3).trim() };
  return { phrase: text, cn: "" };
}

// Highlight the target word in a sentence (bold + color)
function HighlightedSentence({ sentence, word }) {
  if (!word || !sentence) return <span>{sentence}</span>;
  const re = new RegExp(`(${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = sentence.split(re);
  return (
    <span>
      {parts.map((part, i) =>
        part.toLowerCase() === word.toLowerCase()
          ? <strong key={i} style={{ color: "#a78bfa", fontWeight: 800 }}>{part}</strong>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

export default function WordDetailModal({ word, data, lang, onClose, onEdit }) {
  const sections = parseDetail(data?.detail || "");
  const baseDef = data?.t || data?.en || "";

  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 24, paddingBottom: 24, overflowY: "auto" }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 20,
          width: 560, maxWidth: "96vw", boxShadow: "0 24px 60px rgba(0,0,0,0.7)",
          display: "flex", flexDirection: "column", maxHeight: "min(calc(100vh - 48px), calc(100dvh - 48px))", overflow: "hidden" }}>

        {/* Header */}
        <div style={{ padding: "18px 22px 14px", borderBottom: "1px solid var(--panel)",
          display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          <button onClick={onClose}
            style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer",
              fontSize: 20, lineHeight: 1, padding: 10, minWidth: 40, minHeight: 40, borderRadius: 4 }}>✕</button>
          <span style={{ fontWeight: 800, fontSize: 22, color: "#a78bfa", flex: 1 }}>{word}</span>
          <button onClick={() => speak(word, lang)} title="發音"
            style={{ background: "none", border: "none", cursor: "pointer",
              color: "#60a5fa", fontSize: 20, padding: "2px 6px", borderRadius: 6 }}>🔊</button>
          {onEdit && (
            <button onClick={onEdit} title="編輯"
              style={{ background: "none", border: "none", cursor: "pointer",
                color: "var(--text-faint)", fontSize: 16, padding: "2px 6px", borderRadius: 6 }}>✏️</button>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 22px 24px" }}>

          {/* Base definition (small, at top) */}
          {baseDef && (
            <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 18, lineHeight: 1.5 }}>
              {baseDef}
            </div>
          )}

          {sections.length === 0 && (
            <div style={{ textAlign: "center", color: "var(--text-dim)", padding: 40, fontSize: 14 }}>
              尚無詳解內容，請點 ✏️ 編輯新增。
            </div>
          )}

          {sections.map((sec, si) => (
            <div key={si} style={{ marginBottom: 24 }}>
              {/* Section title */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ background: "linear-gradient(135deg,#4c1d95,#7c3aed)",
                  borderRadius: 8, padding: "3px 10px", fontSize: 12, color: "#e9d5ff", fontWeight: 700 }}>
                  {sec.title.match(/^\d+/)?.[0]}
                </div>
                <span style={{ fontWeight: 700, fontSize: 16, color: "var(--text)" }}>
                  {sec.title.replace(/^\d+\.\s*/, "")}
                </span>
              </div>

              {/* Items */}
              <div style={{ paddingLeft: 4 }}>
                {sec.items.map((item, ii) => {
                  if (item.type === "phrase") {
                    const { phrase, cn } = splitPhrase(item.text);
                    return (
                      <div key={ii} style={{ marginBottom: 6, display: "flex", alignItems: "baseline", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>• {phrase}</span>
                        {cn && (
                          <>
                            <span style={{ fontSize: 13, color: "var(--text-dim)" }}>=</span>
                            <span style={{ fontSize: 14, color: "#fbbf24", fontWeight: 600 }}>{cn}</span>
                          </>
                        )}
                      </div>
                    );
                  }
                  if (item.type === "example") {
                    const { sentence, translation } = splitExample(item.text);
                    return (
                      <div key={ii} style={{ marginBottom: 8, marginLeft: 16, paddingLeft: 10,
                        borderLeft: "2px solid var(--accent-hover)" }}>
                        <div style={{ fontSize: 13, color: "#c4b5fd", lineHeight: 1.65 }}>
                          ○ <HighlightedSentence sentence={sentence} word={word} />
                        </div>
                        {translation && (
                          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2, lineHeight: 1.5 }}>
                            （{translation}）
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
