import { useState, useEffect, useRef } from "react";
import { VOCAB_TOPICS } from "../lib/ieltsBand4Data";

const STORAGE_KEY = "ib4-vocab-completed";

function speakEn(text, rate = 0.85) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US"; u.rate = rate;
  window.speechSynthesis.speak(u);
}

function speakZh(text, rate = 0.9) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = window.speechSynthesis.getVoices();
  let lang = "zh-HK";
  for (const l of ["zh-HK", "zh-TW", "zh-CN"]) {
    if (voices.some(v => v.lang === l || v.lang.startsWith(l.slice(0, 2)))) { lang = l; break; }
  }
  u.lang = lang; u.rate = rate;
  window.speechSynthesis.speak(u);
}

function PlayBtn({ text, lang = "en", rate = 0.85, label = "▶", color = "#6366f1", sm }) {
  const [active, setActive] = useState(false);
  function play(e) {
    e && e.stopPropagation();
    if (lang === "zh") speakZh(text, rate); else speakEn(text, rate);
    setActive(true);
    setTimeout(() => setActive(false), 1200);
  }
  const p = sm ? "4px 9px" : "6px 12px";
  return (
    <button onClick={play} style={{ padding: p, borderRadius: 8, border: `1px solid ${active ? color : "var(--border)"}`,
      background: active ? color + "15" : "var(--panel-alt)", color: active ? color : "var(--text-faint)",
      cursor: "pointer", fontSize: sm ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, transition: "all .15s" }}>
      {active ? "🔊" : "▶"} {label}
    </button>
  );
}

// Quiz block for each topic
function TopicQuiz({ topic, completedIds, onComplete }) {
  const words = topic.words;
  const [qIdx, setQIdx] = useState(0);
  const [type, setType] = useState("enZh"); // enZh | zhEn | fill
  const [selected, setSelected] = useState(null);
  const [fillInput, setFillInput] = useState("");
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const TOTAL = 5;

  const questions = useState(() => {
    const shuffled = [...words].sort(() => Math.random() - 0.5).slice(0, TOTAL);
    return shuffled.map((w, i) => ({
      word: w,
      type: i % 2 === 0 ? "enZh" : "zhEn",
      distractors: words.filter(x => x.id !== w.id).sort(() => Math.random() - 0.5).slice(0, 3),
    }));
  })[0];

  if (done) return (
    <div style={{ padding: "16px", background: "#10b98110", borderRadius: 12, border: "1px solid #10b98130", textAlign: "center" }}>
      <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
      <div style={{ fontSize: 14, fontWeight: 800, color: "#10b981" }}>小測驗完成！{score}/{TOTAL} 正確</div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
        {score >= 4 ? "非常好！繼續下一個主題。" : "建議再複習一次單字，然後重新測驗。"}
      </div>
      <button onClick={() => { setQIdx(0); setSelected(null); setFillInput(""); setShowResult(false); setScore(0); setDone(false); }}
        style={{ marginTop: 10, padding: "7px 18px", borderRadius: 10, border: "none", background: "#10b981", color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
        再試一次
      </button>
    </div>
  );

  const q = questions[qIdx];
  const allOpts = type === "enZh"
    ? [{ id: q.word.id, label: q.word.meaningZh }, ...q.distractors.map(d => ({ id: d.id, label: d.meaningZh }))].sort(() => Math.random() - 0.5)
    : [{ id: q.word.id, label: q.word.word }, ...q.distractors.map(d => ({ id: d.id, label: d.word }))].sort(() => Math.random() - 0.5);

  function checkAnswer(optId) {
    if (showResult) return;
    setSelected(optId);
    setShowResult(true);
    if (optId === q.word.id) setScore(s => s + 1);
  }

  function next() {
    if (qIdx + 1 >= TOTAL) { setDone(true); } else { setQIdx(i => i + 1); setSelected(null); setShowResult(false); }
  }

  const questionLabel = q.type === "enZh"
    ? <><span style={{ fontSize: 18, fontWeight: 900, color: "#a78bfa", fontStyle: "italic" }}>{q.word.word}</span><span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>的中文意思是？</span></>
    : <><span style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>「{q.word.meaningZh}」</span><span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>的英文是？</span></>;

  return (
    <div style={{ padding: "14px", background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>🧠 小測驗 {qIdx + 1}/{TOTAL}</div>
        <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>得分：{score}</div>
      </div>
      <div style={{ marginBottom: 12 }}>{questionLabel}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {allOpts.map(opt => {
          const isCorrect = opt.id === q.word.id;
          const isSelected = opt.id === selected;
          let bg = "var(--panel-alt)", border = "var(--border)", col = "var(--text)";
          if (showResult) {
            if (isCorrect) { bg = "#10b98115"; border = "#10b981"; col = "#10b981"; }
            else if (isSelected) { bg = "#ef444415"; border = "#ef4444"; col = "#ef4444"; }
          } else if (isSelected) { bg = "#6366f115"; border = "#6366f1"; col = "#6366f1"; }
          return (
            <button key={opt.id} onClick={() => checkAnswer(opt.id)}
              style={{ padding: "9px 12px", borderRadius: 9, border: `1px solid ${border}`, background: bg, color: col,
                cursor: showResult ? "default" : "pointer", fontSize: 13, fontWeight: 600, textAlign: "left", transition: "all .15s" }}>
              {isCorrect && showResult ? "✓ " : isSelected && !isCorrect && showResult ? "✗ " : ""}{opt.label}
            </button>
          );
        })}
      </div>
      {showResult && (
        <div style={{ marginTop: 10, padding: "8px 11px", background: selected === q.word.id ? "#10b98110" : "#ef444410",
          borderRadius: 9, border: `1px solid ${selected === q.word.id ? "#10b98130" : "#ef444430"}` }}>
          <div style={{ fontSize: 12, color: selected === q.word.id ? "#10b981" : "#ef4444", fontWeight: 700, marginBottom: 3 }}>
            {selected === q.word.id ? "✓ 正確！" : "✗ 答錯了"}
          </div>
          {selected !== q.word.id && (
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
              正確答案：<strong style={{ color: "var(--text)" }}>{q.type === "enZh" ? q.word.meaningZh : q.word.word}</strong>
            </div>
          )}
          <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 3 }}>
            例句：{q.word.example} — {q.word.exampleZh}
          </div>
        </div>
      )}
      {showResult && (
        <button onClick={next} style={{ marginTop: 10, width: "100%", padding: "9px 0", borderRadius: 10, border: "none",
          background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          {qIdx + 1 >= TOTAL ? "查看結果" : "下一題 →"}
        </button>
      )}
    </div>
  );
}

// Word card
function WordCard({ word, color, done, onToggle }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ background: "var(--panel)", borderRadius: 13, border: `1px solid ${open ? color + "50" : "var(--border)"}`,
      overflow: "hidden", boxShadow: open ? `0 0 0 2px ${color}25` : "none", transition: "all .15s" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "11px 14px", cursor: "pointer",
        background: open ? color + "0a" : "transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {done && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>✓</span>}
          <div>
            <span style={{ fontSize: 15, fontWeight: 800, color, fontStyle: "italic" }}>{word.word}</span>
            <span style={{ fontSize: 11, color: "var(--text-faint)", marginLeft: 6 }}>{word.pos}</span>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{word.meaningZh}</span>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{open ? "▲" : "▼"}</span>
        </div>
      </div>
      {open && (
        <div style={{ padding: "8px 14px 12px", borderTop: `1px solid ${color}18` }}>
          <div style={{ marginBottom: 8, padding: "8px 10px", background: color + "0a", borderRadius: 9, border: `1px solid ${color}18` }}>
            <div style={{ fontSize: 13, fontStyle: "italic", color: "#a78bfa", marginBottom: 2 }}>{word.example}</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{word.exampleZh}</div>
          </div>
          <div style={{ marginBottom: 8, padding: "6px 9px", background: "rgba(245,158,11,0.07)", borderRadius: 8, border: "1px solid rgba(245,158,11,0.2)" }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#d97706", marginBottom: 2 }}>🎯 IELTS 使用場景</div>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{word.usage}</div>
          </div>
          <div onClick={e => e.stopPropagation()} style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 8 }}>
            <PlayBtn text={word.word} lang="en" rate={0.85} label="正常" color={color} sm />
            <PlayBtn text={word.word} lang="en" rate={0.5} label="慢速" color="#8b5cf6" sm />
            <PlayBtn text={`${word.word} means ${word.meaningZh}. Example: ${word.example}`} lang="en" rate={0.85} label="老師講解" color="#0891b2" sm />
          </div>
          <button onClick={e => { e.stopPropagation(); onToggle(word.id); }}
            style={{ width: "100%", padding: "8px 0", borderRadius: 9, border: "none",
              background: done ? "#10b98118" : `linear-gradient(135deg,${color}cc,${color})`,
              color: done ? "#10b981" : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {done ? "✓ 已完成" : "標記完成"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function IeltsBand4Vocab({ onNav }) {
  const [activeTopicIdx, setActiveTopicIdx] = useState(0);
  const [completedIds, setCompletedIds] = useState(new Set());
  const [showQuiz, setShowQuiz] = useState(false);

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

  const topic = VOCAB_TOPICS[activeTopicIdx];
  const topicDone = topic.words.filter(w => completedIds.has(w.id)).length;
  const allDone = VOCAB_TOPICS.reduce((s, t) => s + t.words.filter(w => completedIds.has(w.id)).length, 0);
  const allTotal = VOCAB_TOPICS.reduce((s, t) => s + t.words.length, 0);
  const pct = allTotal > 0 ? Math.round((allDone / allTotal) * 100) : 0;

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ padding: "10px 18px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
          <button onClick={() => onNav && onNav("band4")}
            style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--text)", fontSize: 15, fontWeight: 800, padding: 0 }}>
            ← 📖 入門詞彙
          </button>
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{allDone}/{allTotal} · {pct}%</span>
        </div>
        <div style={{ height: 4, borderRadius: 2, background: "var(--border)" }}>
          <div style={{ height: "100%", borderRadius: 2, background: "#6366f1", width: `${pct}%`, transition: "width .3s" }} />
        </div>
      </div>

      {/* Topic tabs */}
      <div style={{ display: "flex", gap: 4, padding: "6px 12px", overflowX: "auto", flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--panel-alt)" }}>
        {VOCAB_TOPICS.map((t, i) => {
          const done = t.words.filter(w => completedIds.has(w.id)).length;
          const active = i === activeTopicIdx;
          return (
            <button key={t.id} onClick={() => { setActiveTopicIdx(i); setShowQuiz(false); }}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 20,
                border: `1px solid ${active ? t.color + "60" : "var(--border)"}`,
                background: active ? t.color + "18" : "var(--panel)",
                color: active ? t.color : "var(--text-faint)",
                cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400,
                whiteSpace: "nowrap", flexShrink: 0, transition: "all .15s",
                boxShadow: active ? `0 0 0 2px ${t.color}28` : "none" }}>
              {t.emoji} {t.title}
              {done > 0 && <span style={{ background: "#10b98128", color: "#10b981", borderRadius: 10, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>{done}/{t.words.length}</span>}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
        <div style={{ marginBottom: 12, padding: "10px 14px", background: topic.color + "0c",
          borderRadius: 12, border: `1px solid ${topic.color}25`,
          display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 14, fontWeight: 800, color: topic.color }}>{topic.emoji} {topic.title}</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>
              {topic.words.length} 個單字 · {topicDone} 已完成
            </div>
          </div>
          {topicDone === topic.words.length && <span style={{ fontSize: 20 }}>🎉</span>}
        </div>

        {!showQuiz ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {topic.words.map(w => (
                <WordCard key={w.id} word={w} color={topic.color} done={completedIds.has(w.id)} onToggle={toggleComplete} />
              ))}
            </div>
            <button onClick={() => setShowQuiz(true)}
              style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg,${topic.color}cc,${topic.color})`,
                color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              🧠 開始小測驗
            </button>
          </>
        ) : (
          <>
            <TopicQuiz topic={topic} completedIds={completedIds} onComplete={toggleComplete} />
            <button onClick={() => setShowQuiz(false)} style={{ marginTop: 10, width: "100%", padding: "10px 0", borderRadius: 12,
              border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text-muted)",
              cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              ← 返回單字
            </button>
          </>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          {activeTopicIdx > 0 && (
            <button onClick={() => { setActiveTopicIdx(i => i - 1); setShowQuiz(false); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "1px solid var(--border)",
                background: "var(--panel)", color: "var(--text-muted)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
              ← {VOCAB_TOPICS[activeTopicIdx - 1].title}
            </button>
          )}
          {activeTopicIdx < VOCAB_TOPICS.length - 1 && (
            <button onClick={() => { setActiveTopicIdx(i => i + 1); setShowQuiz(false); }}
              style={{ flex: 1, padding: "10px 0", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg,${VOCAB_TOPICS[activeTopicIdx + 1].color}bb,${VOCAB_TOPICS[activeTopicIdx + 1].color})`,
                color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>
              {VOCAB_TOPICS[activeTopicIdx + 1].title} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
