import { useEffect, useState } from "react";

const NOTE_TYPES = ["初學者會疑惑", "翻譯不自然", "缺少句子拆解", "單字查不到", "發音問題", "頁面設計問題", "其他"];
const SEVERITIES = ["低", "中", "高", "必修"];

const DEFAULT_SLOTS = [
  { title: "初學者疑惑", placeholder: "例如：Lo tienen 是什麼？為什麼這句這樣翻？" },
  { title: "翻譯 / 句子拆解", placeholder: "例如：需要自然中文 + 直譯 + 語塊拆解。" },
  { title: "單字 / 字典問題", placeholder: "例如：某個字點擊後顯示暫無解釋。" },
  { title: "頁面設計問題", placeholder: "例如：按鈕太低、文字太淺、卡片太擠。" },
];

function emptyNotes() {
  return DEFAULT_SLOTS.map(s => ({ title: s.title, content: "", type: "其他", severity: "中" }));
}

function storageKey(noteKey) {
  return `evonchat_notes_${noteKey}`;
}

function loadNotes(noteKey) {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(storageKey(noteKey)) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length === DEFAULT_SLOTS.length) return parsed;
    }
  } catch (_) {}
  return emptyNotes();
}

function saveNotes(noteKey, notes) {
  try { window.localStorage.setItem(storageKey(noteKey), JSON.stringify(notes)); } catch (_) {}
}

function NoteCard({ note, placeholder, onChange, onExpand }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid rgba(167,139,250,0.35)", borderRadius: 10, padding: "7px 9px", minHeight: 92, maxHeight: 110, boxSizing: "border-box", display: "flex", flexDirection: "column", gap: 3, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <input value={note.title} onChange={e => onChange({ ...note, title: e.target.value })} placeholder="標題"
          style={{ flex: 1, minWidth: 0, background: "none", border: "none", outline: "none", color: "var(--text)", fontSize: 12, fontWeight: 700, padding: 0 }} />
        <button onClick={onExpand} title="放大編輯"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 13, padding: "1px 3px", flexShrink: 0, lineHeight: 1 }}>⛶</button>
      </div>
      <textarea className="pn-hide-scrollbar" value={note.content} onChange={e => onChange({ ...note, content: e.target.value })}
        placeholder={placeholder} rows={3}
        style={{ background: "none", border: "none", outline: "none", resize: "none", color: "var(--text-muted)", fontSize: 11, lineHeight: 1.5, fontFamily: "inherit", height: 52 }} />
    </div>
  );
}

function NoteModal({ note, index, pageTitle, pathLabel, isMobile, onChange, onClose, onClear }) {
  const [copied, setCopied] = useState(false);

  async function copyForCodex() {
    const text = `請修正 EVONCHAT 這一頁的學習問題：

頁面：
${pathLabel}

頁面標題：
${pageTitle}

筆記標題：
${note.title}

問題類型：
${note.type}

嚴重程度：
${note.severity}

問題內容：
${note.content}

要求：
請根據這個問題修正頁面，讓中文初學者更容易理解。`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch (_) {}
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 900, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{
        width: isMobile ? "100%" : "min(480px, 92vw)", maxHeight: isMobile ? "85vh" : "88vh", overflowY: "auto",
        background: "var(--panel)", border: "1px solid var(--border)",
        borderRadius: isMobile ? "18px 18px 0 0" : 16, padding: "18px 20px 20px", boxShadow: "0 10px 40px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>本頁筆記</div>
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{pageTitle}</div>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 20, lineHeight: 1 }}>✕</button>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", marginBottom: 4 }}>筆記標題</div>
            <input value={note.title} onChange={e => onChange(index, { ...note, title: e.target.value })}
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel-alt)", color: "var(--text)", fontSize: 14 }} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", marginBottom: 4 }}>筆記內容</div>
            <textarea value={note.content} onChange={e => onChange(index, { ...note, content: e.target.value })} rows={7}
              style={{ width: "100%", boxSizing: "border-box", padding: "9px 12px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel-alt)", color: "var(--text)", fontSize: 13, lineHeight: 1.7, resize: "vertical", fontFamily: "inherit" }} />
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", marginBottom: 4 }}>問題類型</div>
              <select value={note.type} onChange={e => onChange(index, { ...note, type: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel-alt)", color: "var(--text)", fontSize: 13 }}>
                {NOTE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 100 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", marginBottom: 4 }}>嚴重程度</div>
              <select value={note.severity} onChange={e => onChange(index, { ...note, severity: e.target.value })}
                style={{ width: "100%", padding: "8px 10px", borderRadius: 9, border: "1px solid var(--border)", background: "var(--panel-alt)", color: "var(--text)", fontSize: 13 }}>
                {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 18, flexWrap: "wrap" }}>
          <button onClick={copyForCodex}
            style={{ flex: "1 1 140px", padding: "10px 0", borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
              background: copied ? "#10b981" : "linear-gradient(135deg,#7c3aed,#a78bfa)", color: "#fff" }}>
            {copied ? "✓ 已複製" : "📋 複製給 Codex"}
          </button>
          <button onClick={() => onClear(index)}
            style={{ flex: "1 1 90px", padding: "10px 0", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel-alt)", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            清空這格
          </button>
          <button onClick={onClose}
            style={{ flex: "1 1 90px", padding: "10px 0", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel-alt)", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            關閉
          </button>
        </div>
      </div>
    </div>
  );
}

export default function PageNotes({ noteKey, pageTitle }) {
  const [notes, setNotes] = useState(emptyNotes());
  const [loaded, setLoaded] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(null);

  useEffect(() => {
    if (!noteKey) return;
    setNotes(loadNotes(noteKey));
    setLoaded(true);
    setExpandedIndex(null);
  }, [noteKey]);

  function updateNote(index, next) {
    setNotes(prev => {
      const updated = prev.map((n, i) => (i === index ? next : n));
      if (noteKey) saveNotes(noteKey, updated);
      return updated;
    });
  }

  function clearNote(index) {
    updateNote(index, { title: DEFAULT_SLOTS[index]?.title || "", content: "", type: "其他", severity: "中" });
  }

  if (!noteKey || !loaded) return null;

  const isMobile = typeof window !== "undefined" && window.innerWidth < 680;
  const pathLabel = (typeof window !== "undefined" ? window.location.pathname : "") + "#" + noteKey;

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "18px 10px 12px", borderTop: "1px solid var(--panel)" }}>
      <style>{`.pn-hide-scrollbar::-webkit-scrollbar{width:0;height:0}.pn-hide-scrollbar{scrollbar-width:none}`}</style>
      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--text)", marginBottom: 1 }}>本頁筆記</div>
      <div style={{ fontSize: 10, color: "var(--text-faint)", marginBottom: 8 }}>記低今頁問題 / 修改想法</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {notes.map((note, i) => (
          <NoteCard key={i} note={note} placeholder={DEFAULT_SLOTS[i]?.placeholder}
            onChange={next => updateNote(i, next)} onExpand={() => setExpandedIndex(i)} />
        ))}
      </div>

      {expandedIndex !== null && (
        <NoteModal note={notes[expandedIndex]} index={expandedIndex} pageTitle={pageTitle} pathLabel={pathLabel} isMobile={isMobile}
          onChange={updateNote} onClose={() => setExpandedIndex(null)} onClear={i => { clearNote(i); }} />
      )}
    </div>
  );
}
