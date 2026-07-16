import { useState, useEffect } from "react";
import { lookupWord } from "../lib/dictionary";
import { loadAllEdits, saveEdit } from "../lib/dictEdits";
import ClickableSpanishText from "./ClickableSpanishText";

const TAG_LABELS = { zk: "中考", gk: "高考", ky: "考研", cet4: "CET4", cet6: "CET6", ielts: "IELTS", toefl: "TOEFL", gre: "GRE" };
const GENDER_LABELS = { m: "陽性", f: "陰性", "m-f": "陽/陰性", c: "中性" };

const WORD_RE = { en: /(\b[a-zA-Z][a-zA-Z'-]*\b)/g, es: /([a-zA-Záéíóúüñ][a-zA-Záéíóúüñ'-]*)/gi };
const WORD_START_RE = { en: /^[a-zA-Z]/, es: /^[a-zA-Záéíóúüñ]/i };
const SPEECH_LANG = { en: "en-US", es: "es-ES" };

function speak(word, lang) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = SPEECH_LANG[lang] || "en-US";
  utter.rate = 0.85;
  window.speechSynthesis.speak(utter);
}

function WordPopup({ word, data: initialData, loading, pos, lang, onClose }) {
  const [data, setData] = useState(initialData);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [srcFull, setSrcFull] = useState(false);
  const [expandField, setExpandField] = useState(null); // { key, label }

  useEffect(() => {
    if (initialData !== undefined) setData(initialData);
  }, [initialData]);

  const startEdit = () => {
    setForm({ t: data?.t || "", s: data?.s || "", g: data?.g || "", p: data?.p || "", ex: data?.ex || "", src: data?.src || "" });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const saved = await saveEdit(lang, word, form);
      setData(d => ({ ...(d || {}), ...saved }));
      setEditing(false);
    } catch {
      alert("儲存失敗，請確認 Firebase dictEdits 集合的安全規則。");
    }
    setSaving(false);
  };

  const mainText = data ? (data.t || data.en) : null;
  const showEnSecondary = data && data.t && data.en;

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 599 }} />
      <div onClick={e => e.stopPropagation()}
        style={{
          position: "fixed", left: pos.left, top: pos.top, zIndex: 600,
          background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 12,
          padding: "12px 14px", minWidth: 220, maxWidth: 340,
          maxHeight: "70vh", overflowY: "auto",
          boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
        }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, gap: 8 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: "#a78bfa" }}>{word}</span>
          <div style={{ display: "flex", gap: 4 }}>
            {!editing && !loading && (
              <button onClick={startEdit} title="編輯"
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 13, color: "var(--text-faint)", padding: "2px 4px", borderRadius: 4 }}>✏️</button>
            )}
            <button onClick={onClose}
              style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 14, lineHeight: 1 }}>✕</button>
          </div>
        </div>

        {loading ? (
          <div style={{ fontSize: 13, color: "var(--text-faint)" }}>查詢中...</div>
        ) : editing ? (
          /* Edit form */
          <div>
            {[
              { key: "t", placeholder: "中文翻譯..." },
              { key: "s", placeholder: "詞性 (n./v./adj.)" },
              ...(lang === "es"
                ? [{ key: "g", placeholder: "陰陽性 (m/f/m-f)" }]
                : [{ key: "p", placeholder: "音標 /.../" }]
              ),
            ].map(({ key, placeholder }) => (
              <input key={key} value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                placeholder={placeholder}
                style={{ display: "block", width: "100%", boxSizing: "border-box", marginBottom: 6,
                  background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 6,
                  padding: "6px 8px", color: "var(--text)", fontSize: 12, outline: "none" }} />
            ))}
            {[
              { key: "ex", label: "📝 例句", placeholder: "例句（每行一句）..." },
              { key: "src", label: "📖 來源", placeholder: "詞源說明，支援換行..." },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: 6 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                  <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{label}</span>
                  <button onClick={() => setExpandField({ key, label })}
                    style={{ background: "none", border: "1px solid var(--border)", cursor: "pointer",
                      color: "var(--text-faint)", fontSize: 9, padding: "0px 5px", borderRadius: 3, lineHeight: 1.6 }}>
                    ⛶
                  </button>
                </div>
                <textarea value={form[key] || ""} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={2}
                  style={{ display: "block", width: "100%", boxSizing: "border-box",
                    background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 6,
                    padding: "6px 8px", color: "var(--text)", fontSize: 12, outline: "none",
                    resize: "vertical", lineHeight: 1.65, fontFamily: "inherit" }} />
              </div>
            ))}
            <div style={{ display: "flex", gap: 6 }}>
              <button onClick={handleSave} disabled={saving}
                style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "none",
                  cursor: saving ? "default" : "pointer",
                  background: "linear-gradient(135deg,#4c1d95,#7c3aed)", color: "#fff",
                  fontSize: 12, fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
                {saving ? "..." : "儲存"}
              </button>
              <button onClick={() => setEditing(false)}
                style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)",
                  cursor: "pointer", background: "none", color: "var(--text-muted)", fontSize: 12 }}>
                取消
              </button>
            </div>
          </div>
        ) : data ? (
          /* Normal view */
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              {lang === "en" && data.p && <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{data.p}</span>}
              <button onClick={() => speak(word, lang)} title="聽發音"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", fontSize: 13, lineHeight: 1 }}>🔊</button>
              {data.s && (
                <span style={{ fontSize: 11, padding: "1px 5px", background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 4 }}>
                  {data.s}.
                </span>
              )}
              {lang === "en" && data.g && (
                <span style={{ fontSize: 10, padding: "1px 6px", background: "var(--accent-hover)", color: "#93c5fd", borderRadius: 10 }}>
                  {TAG_LABELS[data.g] || data.g.toUpperCase()}
                </span>
              )}
              {lang === "es" && data.g && (
                <span style={{ fontSize: 10, padding: "1px 6px", background: data.g === "f" ? "#4c1d1d" : "var(--accent-hover)", color: data.g === "f" ? "#f87171" : "#60a5fa", borderRadius: 10 }}>
                  {GENDER_LABELS[data.g] || data.g}
                </span>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{mainText}</div>
            {showEnSecondary && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{data.en}</div>}
            {/* Manual example sentences */}
            {data.ex && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--panel)" }}>
                <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 5, fontWeight: 700 }}>📝 例句</div>
                {data.ex.split("\n").filter(Boolean).map((line, i) => (
                  <div key={i} style={{ fontSize: 12, color: "#c4b5fd", lineHeight: 1.65, marginBottom: 4 }}>{line}</div>
                ))}
              </div>
            )}
            {/* Source with expand button */}
            {data.src && (
              <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--panel)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700 }}>📖 來源</div>
                  <button onClick={() => setSrcFull(true)} title="展開完整來源"
                    style={{ background: "none", border: "1px solid var(--border)", cursor: "pointer",
                      color: "var(--text-faint)", fontSize: 10, padding: "1px 8px", borderRadius: 4, lineHeight: 1.6 }}>
                    展開
                  </button>
                </div>
                <div style={{ fontSize: 12, color: "var(--text-subtle)", lineHeight: 1.8, whiteSpace: "pre-wrap",
                  maxHeight: 80, overflow: "hidden" }}>
                  {data.src}
                </div>
              </div>
            )}
          </>
        ) : (
          <div style={{ fontSize: 13, color: "var(--text-faint)" }}>查無此字</div>
        )}
      </div>

      {/* Src full-content modal */}
      {srcFull && data?.src && (
        <div onClick={() => setSrcFull(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 700,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 16,
              width: 560, maxWidth: "92vw", maxHeight: "80vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--panel)",
              display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 14, color: "#7c3aed", fontWeight: 700 }}>📖 來源</span>
              <span style={{ fontSize: 16, color: "#a78bfa", fontWeight: 700, flex: 1 }}>{word}</span>
              <button onClick={() => setSrcFull(false)}
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
              <div style={{ fontSize: 14, color: "var(--text-subtle)", lineHeight: 2, whiteSpace: "pre-wrap" }}>{data.src}</div>
            </div>
          </div>
        </div>
      )}

      {/* Expand textarea modal (edit mode) */}
      {expandField && (
        <div onClick={() => setExpandField(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 800,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--panel-alt)", border: "1px solid #4c1d95", borderRadius: 16,
              width: 680, maxWidth: "96vw", height: "78vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.8)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--panel)",
              display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 14, color: "#a78bfa", fontWeight: 700, flex: 1 }}>{expandField.label} — {word}</span>
              <button onClick={() => setExpandField(null)}
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            <textarea
              autoFocus
              value={form[expandField.key] || ""}
              onChange={e => setForm(f => ({ ...f, [expandField.key]: e.target.value }))}
              style={{ flex: 1, width: "100%", boxSizing: "border-box", background: "var(--bg)",
                border: "none", outline: "none", padding: "18px 20px",
                color: "var(--text)", fontSize: 15, lineHeight: 2, resize: "none",
                fontFamily: "inherit" }}
            />
            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--panel)", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
              <button onClick={() => setExpandField(null)}
                style={{ padding: "8px 24px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg,#4c1d95,#7c3aed)", color: "#fff", fontWeight: 700, fontSize: 14 }}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default function ClickableSentence({ text, style, lang = "en" }) {
  // 西語走統一的 Grammar Learning Card 引擎（詞性判斷 + 動詞變位 + 文法解釋），
  // 不再用下面這套只查平面字典的舊邏輯。
  if (lang === "es") return <ClickableSpanishText text={text} style={style} />;

  return <ClickableSentenceEn text={text} style={style} lang={lang} />;
}

function ClickableSentenceEn({ text, style, lang = "en" }) {
  const [popup, setPopup] = useState(null);

  useEffect(() => { loadAllEdits(); }, []);

  const tokens = (text || "").split(WORD_RE[lang] || WORD_RE.en);

  const handleClick = async (e, word) => {
    const rect = e.target.getBoundingClientRect();
    const left = Math.min(rect.left, (typeof window !== "undefined" ? window.innerWidth : 9999) - 280);
    setPopup({ word, data: null, loading: true, pos: { left: Math.max(8, left), top: rect.bottom + 6 } });
    const data = await lookupWord(word, lang);
    setPopup(p => (p && p.word === word ? { ...p, data, loading: false } : p));
  };

  return (
    <span style={style}>
      {tokens.map((tok, i) =>
        (WORD_START_RE[lang] || WORD_START_RE.en).test(tok) ? (
          <span key={i} onClick={e => handleClick(e, tok)}
            style={{ cursor: "pointer", borderBottom: "1px dotted var(--text-dim)" }}>
            {tok}
          </span>
        ) : (
          <span key={i}>{tok}</span>
        )
      )}
      {popup && (
        <WordPopup word={popup.word} data={popup.data} loading={popup.loading} pos={popup.pos} lang={lang}
          onClose={() => setPopup(null)} />
      )}
    </span>
  );
}
