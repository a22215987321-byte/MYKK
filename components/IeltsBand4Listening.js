import { useState, useEffect } from "react";
import { LISTENING_STAGES } from "../lib/ieltsBand4Data";

const STORAGE_KEY = "ib4-listen-completed";

function speakEn(text, rate = 0.85) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = rate;
  window.speechSynthesis.speak(u);
}

function PlayBtn({ text, rate = 0.85, label, color, sm }) {
  const [active, setActive] = useState(false);
  function play(e) {
    e && e.stopPropagation();
    speakEn(text, rate);
    setActive(true);
    setTimeout(() => setActive(false), Math.max(1500, text.length * 80));
  }
  return (
    <button onClick={play} style={{ padding: sm ? "4px 9px" : "7px 13px", borderRadius: 8,
      border: `1px solid ${active ? color : "var(--border)"}`,
      background: active ? color + "15" : "var(--panel-alt)",
      color: active ? color : "var(--text-faint)",
      cursor: "pointer", fontSize: sm ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, transition: "all .15s" }}>
      {active ? "🔊" : "▶"} {label}
    </button>
  );
}

function ListeningItem({ item, color, done, onToggle }) {
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState(null);
  const [checked, setChecked] = useState(false);

  function checkAnswer(idx) {
    if (checked) return;
    setSelected(idx);
    setChecked(true);
  }

  const correct = item.answer; // 0-based index

  return (
    <div style={{ background: "var(--panel)", borderRadius: 14, border: `1px solid ${done ? "#10b98140" : "var(--border)"}`, overflow: "hidden", marginBottom: 14 }}>
      {/* Scene header */}
      <div style={{ padding: "11px 14px 9px", background: color + "0c", borderBottom: `1px solid ${color}20`,
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 800, color }}>🎬 {item.scenario}</div>
          {done && <div style={{ fontSize: 10, color: "#10b981", marginTop: 2 }}>✓ 已完成</div>}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <PlayBtn text={item.transcript} rate={0.85} label="播放" color={color} sm />
          <PlayBtn text={item.transcript} rate={0.55} label="慢速" color="#8b5cf6" sm />
        </div>
      </div>

      <div style={{ padding: "12px 14px" }}>
        {/* Keywords */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 5 }}>💡 聽前提示：注意這些關鍵詞</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {(item.keywords || []).map(kw => (
              <span key={kw} style={{ padding: "2px 8px", background: color + "15", color, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{kw}</span>
            ))}
          </div>
        </div>

        {/* Transcript reveal */}
        {!revealed ? (
          <button onClick={() => setRevealed(true)}
            style={{ width: "100%", marginBottom: 10, padding: "8px 0", borderRadius: 9, border: "1px dashed var(--border)",
              background: "transparent", color: "var(--text-faint)", cursor: "pointer", fontSize: 12 }}>
            👁 顯示聽力原文
          </button>
        ) : (
          <div style={{ marginBottom: 10, padding: "9px 11px", background: "var(--panel-alt)", borderRadius: 9, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "var(--text-faint)", marginBottom: 4, textTransform: "uppercase" }}>聽力原文</div>
            <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, fontStyle: "italic" }}>{item.transcript}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{item.transcriptZh}</div>
          </div>
        )}

        {/* Question */}
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>
            ❓ {item.question}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 8 }}>{item.questionZh}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {item.options.map((opt, i) => {
              const isCorrect = i === correct;
              const isSelected = i === selected;
              let bg = "var(--panel-alt)", border = "var(--border)", col = "var(--text)";
              if (checked) {
                if (isCorrect) { bg = "#10b98115"; border = "#10b981"; col = "#10b981"; }
                else if (isSelected) { bg = "#ef444415"; border = "#ef4444"; col = "#ef4444"; }
              } else if (isSelected) { bg = color + "15"; border = color; col = color; }
              return (
                <button key={i} onClick={() => checkAnswer(i)}
                  style={{ padding: "9px 12px", borderRadius: 9, border: `1px solid ${border}`,
                    background: bg, color: col, cursor: checked ? "default" : "pointer",
                    fontSize: 13, fontWeight: 600, textAlign: "left", transition: "all .15s" }}>
                  {["A", "B", "C", "D"][i]}. {opt}
                  {checked && isCorrect ? " ✓" : checked && isSelected && !isCorrect ? " ✗" : ""}
                </button>
              );
            })}
          </div>
        </div>

        {/* Explanation */}
        {checked && (
          <div style={{ marginBottom: 10, padding: "9px 11px", background: selected === correct ? "#10b98110" : "#ef444410",
            borderRadius: 9, border: `1px solid ${selected === correct ? "#10b98130" : "#ef444430"}` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: selected === correct ? "#10b981" : "#ef4444", marginBottom: 3 }}>
              {selected === correct ? "✓ 正確！" : "✗ 答錯了"}
            </div>
            <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.7 }}>{item.explanationZh}</div>
          </div>
        )}

        {checked && (
          <button onClick={() => onToggle(item.id)} style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "none",
            background: done ? "#10b98118" : `linear-gradient(135deg,${color}cc,${color})`,
            color: done ? "#10b981" : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {done ? "✓ 已完成" : "標記完成"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function IeltsBand4Listening({ onNav }) {
  const [activeStageIdx, setActiveStageIdx] = useState(0);
  const [completedIds, setCompletedIds] = useState(new Set());

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) setCompletedIds(new Set(JSON.parse(s)));
    } catch (_) {}
  }, []);

  function toggleComplete(id) {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch (_) {}
      return next;
    });
  }

  const stage = LISTENING_STAGES[activeStageIdx];
  const stageDone = stage.items.filter(it => completedIds.has(it.id)).length;
  const allDone = LISTENING_STAGES.reduce((s, st) => s + st.items.filter(it => completedIds.has(it.id)).length, 0);
  const allTotal = LISTENING_STAGES.reduce((s, st) => s + st.items.length, 0);
  const pct = allTotal > 0 ? Math.round((allDone / allTotal) * 100) : 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 18px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <button onClick={() => onNav && onNav("band4")}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--text)", fontSize: 15, fontWeight: 800, padding: 0 }}>
            ← 🎧 入門聽力
          </button>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{allDone}/{allTotal} · {pct}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: "var(--border)" }}>
          <div style={{ height: "100%", borderRadius: 2, background: "#ec4899", width: `${pct}%`, transition: "width .3s" }} />
        </div>
      </div>

      {/* Stage tabs */}
      <div style={{ display: "flex", gap: 4, padding: "6px 12px", overflowX: "auto", flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--panel-alt)" }}>
        {LISTENING_STAGES.map((st, i) => {
          const done = st.items.filter(it => completedIds.has(it.id)).length;
          const active = i === activeStageIdx;
          return (
            <button key={st.id} onClick={() => setActiveStageIdx(i)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 20,
                border: `1px solid ${active ? st.color + "60" : "var(--border)"}`,
                background: active ? st.color + "18" : "var(--panel)",
                color: active ? st.color : "var(--text-faint)",
                cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400,
                whiteSpace: "nowrap", flexShrink: 0, transition: "all .15s",
                boxShadow: active ? `0 0 0 2px ${st.color}28` : "none" }}>
              {st.emoji} {st.title}
              {done > 0 && <span style={{ background: "#10b98128", color: "#10b981", borderRadius: 10, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>{done}/{st.items.length}</span>}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        <div style={{ marginBottom: 14, padding: "11px 14px", background: stage.color + "0c",
          borderRadius: 12, border: `1px solid ${stage.color}25` }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: stage.color, marginBottom: 4 }}>
            {stage.emoji} {stage.title}
          </div>
          <div style={{ padding: "7px 10px", background: "#0891b210", borderRadius: 8, border: "1px solid #0891b225", marginBottom: 6 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#0891b2", textTransform: "uppercase", marginBottom: 3 }}>💡 聽力技巧</div>
            <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.7 }}>{stage.tip}</div>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
            {stage.keywords.map(kw => (
              <span key={kw} style={{ padding: "2px 8px", background: stage.color + "15", color: stage.color, borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{kw}</span>
            ))}
          </div>
        </div>

        {stage.items.map(item => (
          <ListeningItem key={item.id} item={{ ...item, keywords: stage.keywords }} color={stage.color}
            done={completedIds.has(item.id)} onToggle={toggleComplete} />
        ))}

        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          {activeStageIdx > 0 && (
            <button onClick={() => setActiveStageIdx(i => i - 1)}
              style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid var(--border)",
                background: "var(--panel)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              ← {LISTENING_STAGES[activeStageIdx - 1].title}
            </button>
          )}
          {activeStageIdx < LISTENING_STAGES.length - 1 && (
            <button onClick={() => setActiveStageIdx(i => i + 1)}
              style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg,${LISTENING_STAGES[activeStageIdx + 1].color}bb,${LISTENING_STAGES[activeStageIdx + 1].color})`,
                color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
              {LISTENING_STAGES[activeStageIdx + 1].title} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
