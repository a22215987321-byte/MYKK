import { useState, useRef, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import writingData from "../lib/spanishA1WritingData";
import spanishA1Dict from "../lib/spanishA1Dict";

const { topics, exercises } = writingData;

// ── helpers ───────────────────────────────────────────────────────────
function normalize(s) {
  return (s || "").trim().toLowerCase()
    .replace(/[¿¡«»"'().,;:!?]/g, "")
    .replace(/\s+/g, " ")
    .normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function checkAnswer(input, answer, alternates = []) {
  const n = normalize(input);
  if (n === normalize(answer)) return true;
  return alternates.some((a) => n === normalize(a));
}

function levelColor(level) {
  if (level === "A1-1") return "#10b981";
  if (level === "A1-2") return "#f59e0b";
  return "#8b5cf6";
}

function levelLabel(level) {
  if (level === "A1-1") return "入門";
  if (level === "A1-2") return "基礎";
  return "整合";
}

function typeLabel(type) {
  const map = {
    "cn-to-es": "中→西",
    "es-to-cn": "西→中",
    "fill-blank": "填空",
    "sort-sentence": "排序",
    "error-correct": "改錯",
    "free-write": "短句",
  };
  return map[type] || type;
}

function typeColor(type) {
  const map = {
    "cn-to-es": "#6366f1",
    "es-to-cn": "#06b6d4",
    "fill-blank": "#f59e0b",
    "sort-sentence": "#10b981",
    "error-correct": "#ef4444",
    "free-write": "#ec4899",
  };
  return map[type] || "#888";
}

// ── DictPopup (inline version for related words) ──────────────────────
function DictChip({ word }) {
  const [open, setOpen] = useState(false);
  const entry = spanishA1Dict[word.toLowerCase()] || null;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span
        onClick={() => setOpen(!open)}
        style={{ cursor: "pointer", color: "#6366f1", fontWeight: 600, fontSize: 13,
          borderBottom: "1.5px dashed #6366f155", borderRadius: 2, padding: "0 2px" }}
      >{word}</span>
      {open && (
        <div style={{
          position: "absolute", bottom: "calc(100% + 6px)", left: 0,
          background: "var(--panel)", border: "1px solid var(--border)",
          borderRadius: 12, padding: "10px 12px", zIndex: 20, minWidth: 180, maxWidth: 240,
          boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
        }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>{word}</div>
          {entry ? (
            <>
              <div style={{ fontSize: 11, color: "#6366f1", marginBottom: 4 }}>{entry.partOfSpeech}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{entry.zh}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{entry.en}</div>
            </>
          ) : (
            <div style={{ fontSize: 12, color: "var(--text-faint)" }}>暫無收錄</div>
          )}
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 14 }}>✕</button>
        </div>
      )}
    </span>
  );
}

// ── ExerciseCard ──────────────────────────────────────────────────────
function ExerciseCard({ ex, onResult, topicColor }) {
  const [input, setInput] = useState("");
  const [selected, setSelected] = useState(null);
  const [picked, setPicked] = useState([]);
  const [remaining, setRemaining] = useState(() => {
    if (ex.type === "sort-sentence") return [...ex.words];
    return [];
  });
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const [freeSubmitted, setFreeSubmitted] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  function submit() {
    let correct = false;
    if (ex.type === "fill-blank") correct = selected === ex.answer;
    else if (ex.type === "sort-sentence") correct = picked.join(" ") === ex.answer.join(" ");
    else if (ex.type === "free-write") { setFreeSubmitted(true); onResult(true); return; }
    else correct = checkAnswer(input, ex.answer, ex.alternates);
    setIsCorrect(correct);
    setSubmitted(true);
    onResult(correct);
  }

  function handlePick(word, idx) {
    setPicked([...picked, word]);
    const r = [...remaining]; r.splice(idx, 1); setRemaining(r);
  }
  function handleUnpick(word, idx) {
    const p = [...picked]; p.splice(idx, 1); setPicked(p);
    setRemaining([...remaining, word]);
  }

  const color = topicColor || "#6366f1";
  const canSubmit = ex.type === "fill-blank" ? selected !== null
    : ex.type === "sort-sentence" ? picked.length === ex.answer.length
    : ex.type === "free-write" ? input.trim().length > 0
    : input.trim().length > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Prompt */}
      <div style={{ background: `${color}12`, border: `1px solid ${color}33`, borderRadius: 14, padding: "16px 18px" }}>
        <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 6 }}>
          {ex.type === "cn-to-es" && "📝 把下面的中文翻譯成西語"}
          {ex.type === "es-to-cn" && "📝 把下面的西語翻譯成中文"}
          {ex.type === "fill-blank" && "📝 選擇正確的填空答案"}
          {ex.type === "sort-sentence" && "📝 把單詞排成正確句子"}
          {ex.type === "error-correct" && "📝 找出並改正句子中的錯誤"}
          {ex.type === "free-write" && "✏️ 自由表達（沒有唯一答案）"}
        </div>
        <div style={{ fontSize: ex.type === "fill-blank" ? 16 : 18, fontWeight: 700, color: "var(--text)", lineHeight: 1.6 }}>
          {ex.type === "fill-blank" ? ex.blank : ex.prompt}
        </div>
        {ex.hint && !submitted && (
          <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-faint)", fontStyle: "italic" }}>💡 {ex.hint}</div>
        )}
      </div>

      {/* Input area */}
      {!submitted && !freeSubmitted && (
        <>
          {(ex.type === "cn-to-es" || ex.type === "es-to-cn" || ex.type === "error-correct") && (
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && submit()}
              placeholder="在這裡輸入答案..."
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 12,
                border: "1px solid var(--border)", background: "var(--panel)",
                color: "var(--text)", fontSize: 16, outline: "none",
                boxSizing: "border-box",
              }}
            />
          )}
          {ex.type === "free-write" && (
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="請用西語寫下你的答案..."
              rows={4}
              style={{
                width: "100%", padding: "13px 16px", borderRadius: 12,
                border: "1px solid var(--border)", background: "var(--panel)",
                color: "var(--text)", fontSize: 15, outline: "none", resize: "vertical",
                boxSizing: "border-box", fontFamily: "inherit",
              }}
            />
          )}
          {ex.type === "fill-blank" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {ex.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => setSelected(opt)}
                  style={{
                    padding: "12px 16px", borderRadius: 10, textAlign: "left", fontSize: 15,
                    fontWeight: selected === opt ? 700 : 400, cursor: "pointer",
                    background: selected === opt ? `${color}18` : "var(--panel)",
                    border: `1px solid ${selected === opt ? color : "var(--border)"}`,
                    color: "var(--text)", transition: "all 0.15s",
                  }}
                >{opt}</button>
              ))}
            </div>
          )}
          {ex.type === "sort-sentence" && (
            <>
              <div style={{ minHeight: 48, background: "var(--panel-alt)", border: "2px dashed var(--border)", borderRadius: 12, padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {picked.length === 0 && <span style={{ color: "var(--text-faint)", fontSize: 13 }}>點擊下方單詞加入...</span>}
                {picked.map((w, i) => (
                  <button key={i} onClick={() => handleUnpick(w, i)}
                    style={{ background: color, border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                    {w}
                  </button>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {remaining.map((w, i) => (
                  <button key={i} onClick={() => handlePick(w, i)}
                    style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 13px", color: "var(--text)", fontSize: 14, cursor: "pointer" }}>
                    {w}
                  </button>
                ))}
              </div>
            </>
          )}
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{
              width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
              background: canSubmit ? `linear-gradient(135deg, ${color}, ${color}cc)` : "var(--panel-alt)",
              color: canSubmit ? "#fff" : "var(--text-faint)", fontSize: 15, fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed", transition: "all 0.15s",
            }}
          >確認答案</button>
        </>
      )}

      {/* Feedback */}
      {(submitted || freeSubmitted) && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {!freeSubmitted && (
            <div style={{
              padding: "14px 16px", borderRadius: 12,
              background: isCorrect ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.08)",
              border: `1px solid ${isCorrect ? "#10b981" : "#ef4444"}`,
            }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: isCorrect ? "#10b981" : "#ef4444", marginBottom: isCorrect ? 0 : 8 }}>
                {isCorrect ? "✅ 正確！" : "❌ 答錯了"}
              </div>
              {!isCorrect && (
                <div style={{ fontSize: 14, color: "var(--text)" }}>
                  正確答案：<strong style={{ color: "#6366f1" }}>{ex.answer}</strong>
                </div>
              )}
            </div>
          )}
          {freeSubmitted && (
            <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(99,102,241,0.08)", border: "1px solid #6366f155" }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "#6366f1", marginBottom: 6 }}>📝 參考範例</div>
              <div style={{ fontSize: 14, color: "var(--text)" }}>{ex.answer}</div>
            </div>
          )}
          {/* Explanation */}
          <div style={{ padding: "14px 16px", borderRadius: 12, background: "var(--panel-alt)", border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 6 }}>💡 解釋</div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7 }}>{ex.explanation}</div>
          </div>
          {/* Related words */}
          {ex.relatedWords && ex.relatedWords.length > 0 && (
            <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--panel)", border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--text-faint)", marginRight: 8 }}>相關詞彙：</span>
              {ex.relatedWords.map((w) => <DictChip key={w} word={w} />).reduce((acc, el, i) => i === 0 ? [el] : [...acc, <span key={`sep-${i}`} style={{ marginRight: 6 }} />, el], [])}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── ExerciseSession ───────────────────────────────────────────────────
function ExerciseSession({ queue, title, onBack, db, user, onDone }) {
  const [idx, setIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [showFeedback, setShowFeedback] = useState(false);

  const ex = queue[idx];
  const topic = topics.find((t) => t.id === ex?.topicId);
  const color = topic?.color || "#6366f1";

  function handleResult(correct) {
    setResults((r) => [...r, correct]);
    setShowFeedback(true);
  }

  function next() {
    setShowFeedback(false);
    if (idx + 1 < queue.length) setIdx(idx + 1);
    else onDone(results);
  }

  if (!ex) return null;
  const progress = ((idx + 1) / queue.length) * 100;

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid var(--border)", background: "var(--panel-alt)", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>{title}</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{idx + 1} / {queue.length} 題</div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: `${levelColor(ex.level)}22`, color: levelColor(ex.level), fontWeight: 700 }}>{ex.level}</span>
          <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: `${typeColor(ex.type)}22`, color: typeColor(ex.type), fontWeight: 700 }}>{typeLabel(ex.type)}</span>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--panel-alt)" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: color, transition: "width 0.4s" }} />
      </div>

      <div style={{ padding: "20px 16px 120px" }}>
        <ExerciseCard key={ex.id} ex={ex} onResult={handleResult} topicColor={color} />
        {showFeedback && (
          <button
            onClick={next}
            style={{ marginTop: 20, width: "100%", padding: "14px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}
          >
            {idx + 1 < queue.length ? "下一題 →" : "查看結果 🎉"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── SessionResult ─────────────────────────────────────────────────────
function SessionResult({ results, total, onBack, onRetry }) {
  const correct = results.filter(Boolean).length;
  const pct = Math.round((correct / total) * 100);
  const emoji = pct === 100 ? "🏆" : pct >= 70 ? "⭐" : "💪";
  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "32px 20px", textAlign: "center" }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>{emoji}</div>
      <div style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>
        {pct === 100 ? "全對！太棒了！" : pct >= 70 ? "做得不錯！" : "繼續加油！"}
      </div>
      <div style={{ fontSize: 16, color: "var(--text-dim)", marginBottom: 24 }}>
        {correct} / {total} 題正確（{pct}%）
      </div>
      <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 320 }}>
        <button onClick={onRetry} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid var(--border)", background: "none", color: "var(--text)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>再練一次</button>
        <button onClick={onBack} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>← 返回</button>
      </div>
    </div>
  );
}

// ── TopicView ─────────────────────────────────────────────────────────
function TopicView({ topic, onStartSession, onBack, doneIds }) {
  const topicExercises = exercises.filter((e) => e.topicId === topic.id);
  const doneCount = topicExercises.filter((e) => doneIds.has(e.id)).length;
  const byType = {
    "cn-to-es": topicExercises.filter((e) => e.type === "cn-to-es"),
    "es-to-cn": topicExercises.filter((e) => e.type === "es-to-cn"),
    "fill-blank": topicExercises.filter((e) => e.type === "fill-blank"),
    "sort-sentence": topicExercises.filter((e) => e.type === "sort-sentence"),
    "error-correct": topicExercises.filter((e) => e.type === "error-correct"),
    "free-write": topicExercises.filter((e) => e.type === "free-write"),
  };

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid var(--border)", background: "var(--panel-alt)", display: "flex", alignItems: "center", gap: 12, position: "sticky", top: 0, zIndex: 10 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>←</button>
        <div style={{ fontSize: 18 }}>{topic.emoji}</div>
        <div style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{topic.title}</div>
        <div style={{ fontSize: 12, color: topic.color, fontWeight: 700 }}>{doneCount}/{topicExercises.length}</div>
      </div>

      <div style={{ padding: "16px 16px 100px" }}>
        <button
          onClick={() => onStartSession(topicExercises, topic.title)}
          style={{ width: "100%", marginBottom: 16, padding: "14px 0", borderRadius: 14, border: "none", background: `linear-gradient(135deg, ${topic.color}, ${topic.color}cc)`, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: `0 4px 16px ${topic.color}44` }}
        >▶ 全部練習（{topicExercises.length} 題）</button>

        {Object.entries(byType).map(([type, list]) => list.length === 0 ? null : (
          <div key={type} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 11, padding: "2px 9px", borderRadius: 6, background: `${typeColor(type)}18`, color: typeColor(type), fontWeight: 700 }}>{typeLabel(type)}</span>
              <button
                onClick={() => onStartSession(list, `${topic.title} — ${typeLabel(type)}`)}
                style={{ marginLeft: "auto", fontSize: 12, padding: "4px 12px", borderRadius: 8, border: `1px solid ${topic.color}55`, background: "none", color: topic.color, cursor: "pointer", fontWeight: 600 }}
              >練習 {list.length} 題</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {list.map((ex) => (
                <button
                  key={ex.id}
                  onClick={() => onStartSession([ex], ex.prompt || ex.blank)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 10, background: "var(--panel)", border: `1px solid ${doneIds.has(ex.id) ? topic.color + "55" : "var(--border)"}`, cursor: "pointer", textAlign: "left", width: "100%" }}
                >
                  <span style={{ fontSize: 14 }}>{doneIds.has(ex.id) ? "✅" : "○"}</span>
                  <span style={{ flex: 1, fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {ex.prompt || ex.blank}
                  </span>
                  <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: `${levelColor(ex.level)}18`, color: levelColor(ex.level), fontWeight: 700, flexShrink: 0 }}>{ex.level}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── HomeView ──────────────────────────────────────────────────────────
function HomeView({ onStartToday, onSelectTopic, doneIds, user }) {
  const total = exercises.length;
  const done = exercises.filter((e) => doneIds.has(e.id)).length;
  const pct = Math.round((done / total) * 100);

  // Build today's 5: pick ones not done, mix of types and topics
  const undone = exercises.filter((e) => !doneIds.has(e.id));
  const todayQueue = undone.slice(0, 5);

  const typeBreakdown = [
    { type: "cn-to-es", label: "中→西", color: "#6366f1" },
    { type: "es-to-cn", label: "西→中", color: "#06b6d4" },
    { type: "fill-blank", label: "填空", color: "#f59e0b" },
    { type: "sort-sentence", label: "排序", color: "#10b981" },
    { type: "error-correct", label: "改錯", color: "#ef4444" },
    { type: "free-write", label: "短句", color: "#ec4899" },
  ];

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)" }}>
      {/* Header */}
      <div style={{ padding: "18px 18px 0", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)" }}>✏️ A1 文字練習</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>10 個主題 · 200 題全方位練習</div>
        </div>
      </div>

      {/* Progress */}
      <div style={{ margin: "14px 18px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>總進度</span>
          <span style={{ fontSize: 12, color: "#6366f1", fontWeight: 700 }}>{done}/{total} 題 · {pct}%</span>
        </div>
        <div style={{ height: 8, background: "var(--panel-alt)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99, transition: "width 0.6s" }} />
        </div>
      </div>

      {/* Today's practice */}
      <div style={{ margin: "16px 16px 0", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>📅 今日文字練習</div>
        {todayQueue.length === 0 ? (
          <div style={{ textAlign: "center", padding: "16px 0" }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 14, color: "var(--text-dim)" }}>所有練習已完成！</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
              {[...Array(5)].map((_, i) => (
                <div key={i} style={{ flex: 1, height: 4, borderRadius: 99, background: i < todayQueue.length ? "#6366f1" : "var(--panel-alt)" }} />
              ))}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 14 }}>
              為你挑選了 {Math.min(todayQueue.length, 5)} 道練習題
            </div>
            <button
              onClick={() => onStartToday(todayQueue.slice(0, 5))}
              style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(99,102,241,0.3)" }}
            >▶ 開始今日練習</button>
          </>
        )}
      </div>

      {/* Type guide */}
      <div style={{ margin: "14px 16px 0", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "14px" }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>練習類型</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {typeBreakdown.map((t) => (
            <div key={t.type} style={{ padding: "8px 10px", borderRadius: 10, background: `${t.color}10`, border: `1px solid ${t.color}33`, textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: t.color }}>{t.label}</div>
              <div style={{ fontSize: 10, color: "var(--text-faint)", marginTop: 2 }}>
                {exercises.filter((e) => e.type === t.type && doneIds.has(e.id)).length}/{exercises.filter((e) => e.type === t.type).length}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Topics */}
      <div style={{ padding: "14px 16px 40px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>按主題練習</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {topics.map((t) => {
            const topicEx = exercises.filter((e) => e.topicId === t.id);
            const topicDone = topicEx.filter((e) => doneIds.has(e.id)).length;
            const topicPct = Math.round((topicDone / topicEx.length) * 100);
            return (
              <button
                key={t.id}
                onClick={() => onSelectTopic(t)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "var(--panel)", border: `1px solid ${topicDone === topicEx.length && topicDone > 0 ? t.color + "55" : "var(--border)"}`, cursor: "pointer", textAlign: "left", width: "100%" }}
              >
                <span style={{ fontSize: 22, flexShrink: 0 }}>{t.emoji}</span>
                <div style={{ flex: 1, overflow: "hidden" }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{t.title}</div>
                  <div style={{ height: 3, background: "var(--panel-alt)", borderRadius: 99, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${topicPct}%`, background: t.color, borderRadius: 99 }} />
                  </div>
                </div>
                <div style={{ flexShrink: 0, textAlign: "right" }}>
                  <div style={{ fontSize: 12, color: t.color, fontWeight: 700 }}>{topicDone}/{topicEx.length}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────
export default function SpanishA1WritingRoom({ user, db }) {
  const [view, setView] = useState("home"); // home | topic | session | result
  const [activeTopic, setActiveTopic] = useState(null);
  const [sessionQueue, setSessionQueue] = useState([]);
  const [sessionTitle, setSessionTitle] = useState("");
  const [sessionResults, setSessionResults] = useState([]);
  const [doneIds, setDoneIds] = useState(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.uid || !db) { setLoaded(true); return; }
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const done = snap.data().spanishWritingDone || [];
        setDoneIds(new Set(done));
      }
      setLoaded(true);
    });
  }, [user?.uid, db]);

  async function markDone(exIds) {
    const next = new Set([...doneIds, ...exIds]);
    setDoneIds(next);
    if (user?.uid && db) {
      await updateDoc(doc(db, "users", user.uid), {
        spanishWritingDone: [...next],
      });
    }
  }

  function startSession(queue, title) {
    setSessionQueue(queue);
    setSessionTitle(title);
    setSessionResults([]);
    setView("session");
  }

  function handleDone(results) {
    setSessionResults(results);
    // Mark all queued exercises as done
    markDone(sessionQueue.map((e) => e.id));
    setView("result");
  }

  if (!loaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-dim)", fontSize: 14 }}>
        載入中...
      </div>
    );
  }

  if (view === "session") {
    return (
      <ExerciseSession
        queue={sessionQueue}
        title={sessionTitle}
        onBack={() => setView(activeTopic ? "topic" : "home")}
        db={db}
        user={user}
        onDone={handleDone}
      />
    );
  }

  if (view === "result") {
    return (
      <SessionResult
        results={sessionResults}
        total={sessionQueue.length}
        onBack={() => { activeTopic ? setView("topic") : setView("home"); }}
        onRetry={() => { setSessionResults([]); setView("session"); }}
      />
    );
  }

  if (view === "topic" && activeTopic) {
    return (
      <TopicView
        topic={activeTopic}
        onStartSession={startSession}
        onBack={() => setView("home")}
        doneIds={doneIds}
      />
    );
  }

  return (
    <HomeView
      onStartToday={(queue) => { setActiveTopic(null); startSession(queue, "今日文字練習"); }}
      onSelectTopic={(t) => { setActiveTopic(t); setView("topic"); }}
      doneIds={doneIds}
      user={user}
    />
  );
}
