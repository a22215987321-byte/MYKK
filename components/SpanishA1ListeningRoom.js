import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import listeningData from "../lib/spanishA1ListeningData";
import spanishA1Dict from "../lib/spanishA1Dict";

const { listeningTopics, listeningExercises } = listeningData;

// ── helpers ───────────────────────────────────────────────────────────
function levelColor(l) {
  return l === "A1-1" ? "#10b981" : l === "A1-2" ? "#f59e0b" : "#8b5cf6";
}
function normalize(s) {
  return (s || "").trim().toLowerCase().replace(/[¿¡.,;:!?]/g, "").normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// ── TTS ───────────────────────────────────────────────────────────────
function speak(text, rate, onEnd) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utt = new SpeechSynthesisUtterance(text);
  utt.lang = "es-ES";
  utt.rate = rate;
  if (onEnd) utt.onend = onEnd;
  window.speechSynthesis.speak(utt);
}
function stopSpeak() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}

// ── DictChip ──────────────────────────────────────────────────────────
function DictChip({ word }) {
  const [open, setOpen] = useState(false);
  const entry = spanishA1Dict[word.toLowerCase()] || null;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span onClick={() => setOpen(!open)}
        style={{ cursor: "pointer", color: "#6366f1", fontWeight: 600, fontSize: 13, borderBottom: "1.5px dashed #6366f155", padding: "0 2px" }}>
        {word}
      </span>
      {open && (
        <div style={{ position: "absolute", bottom: "calc(100% + 6px)", left: 0, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "10px 12px", zIndex: 30, minWidth: 180, maxWidth: 240, boxShadow: "0 6px 20px rgba(0,0,0,0.2)" }}>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)", marginBottom: 2 }}>{word}</div>
          {entry ? (
            <>
              <div style={{ fontSize: 11, color: "#6366f1", marginBottom: 3 }}>{entry.partOfSpeech}</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 2 }}>{entry.zh}</div>
              <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{entry.en}</div>
            </>
          ) : <div style={{ fontSize: 12, color: "var(--text-faint)" }}>暫無收錄</div>}
          <button onClick={(e) => { e.stopPropagation(); setOpen(false); }}
            style={{ position: "absolute", top: 6, right: 8, background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 14 }}>✕</button>
        </div>
      )}
    </span>
  );
}

// ── QuestionCard ──────────────────────────────────────────────────────
function QuestionCard({ question, qNum, total, onAnswer, topicColor }) {
  const [selected, setSelected] = useState(null);
  const [input, setInput] = useState("");
  const [picked, setPicked] = useState([]);
  const [remaining, setRemaining] = useState(() => question.type === "sort" ? [...question.words] : []);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus();
  }, []);

  const color = topicColor || "#6366f1";

  function submit(ans) {
    let correct = false;
    if (question.type === "multiple-choice") correct = ans === question.answer;
    else if (question.type === "true-false") correct = ans === question.answer;
    else if (question.type === "fill-blank") correct = normalize(input) === normalize(question.answer);
    else if (question.type === "sort") correct = picked.join(" ") === question.answer.join(" ");
    setIsCorrect(correct);
    setSubmitted(true);
    onAnswer(correct);
  }

  function handleMC(opt) { setSelected(opt); submit(opt); }
  function handleTF(val) { setSelected(val); submit(val); }
  function pickWord(w, i) { setPicked([...picked, w]); const r = [...remaining]; r.splice(i, 1); setRemaining(r); }
  function unpickWord(w, i) { const p = [...picked]; p.splice(i, 1); setPicked(p); setRemaining([...remaining, w]); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* Question header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>問題 {qNum}/{total}</span>
        <span style={{ fontSize: 11, padding: "1px 8px", borderRadius: 6, background: `${color}18`, color, fontWeight: 700 }}>
          {question.type === "multiple-choice" ? "選擇題" : question.type === "true-false" ? "判斷題" : question.type === "fill-blank" ? "填空題" : "排序題"}
        </span>
      </div>

      {/* Question text */}
      <div style={{ padding: "14px 16px", borderRadius: 12, background: `${color}10`, border: `1px solid ${color}30` }}>
        <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)" }}>
          {question.type === "fill-blank" ? question.sentence : question.type === "sort" ? question.instruction : question.type === "true-false" ? question.statement : question.question}
        </div>
      </div>

      {/* Answer area */}
      {!submitted && (
        <>
          {question.type === "multiple-choice" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {question.options.map((opt, i) => (
                <button key={i} onClick={() => handleMC(opt)}
                  style={{ padding: "12px 16px", borderRadius: 10, border: `1px solid var(--border)`, background: "var(--panel)", color: "var(--text)", fontSize: 15, cursor: "pointer", textAlign: "left", transition: "all 0.12s" }}>
                  {opt}
                </button>
              ))}
            </div>
          )}
          {question.type === "true-false" && (
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => handleTF(true)} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid #10b981", background: "rgba(16,185,129,0.08)", color: "#10b981", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>✓ 正確</button>
              <button onClick={() => handleTF(false)} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid #ef4444", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>✗ 錯誤</button>
            </div>
          )}
          {question.type === "fill-blank" && (
            <div style={{ display: "flex", gap: 8 }}>
              <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && input.trim() && submit()}
                placeholder="輸入答案..."
                style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontSize: 15, outline: "none" }} />
              <button onClick={() => submit()} disabled={!input.trim()}
                style={{ padding: "12px 16px", borderRadius: 10, border: "none", background: input.trim() ? color : "var(--panel-alt)", color: input.trim() ? "#fff" : "var(--text-faint)", fontWeight: 700, cursor: input.trim() ? "pointer" : "not-allowed" }}>確認</button>
            </div>
          )}
          {question.type === "sort" && (
            <>
              <div style={{ minHeight: 50, background: "var(--panel-alt)", border: "2px dashed var(--border)", borderRadius: 12, padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {picked.length === 0 && <span style={{ color: "var(--text-faint)", fontSize: 13 }}>點擊下方單詞加入...</span>}
                {picked.map((w, i) => (
                  <button key={i} onClick={() => unpickWord(w, i)}
                    style={{ background: color, border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>{w}</button>
                ))}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {remaining.map((w, i) => (
                  <button key={i} onClick={() => pickWord(w, i)}
                    style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 13px", color: "var(--text)", fontSize: 14, cursor: "pointer" }}>{w}</button>
                ))}
              </div>
              <button onClick={() => submit()} disabled={picked.length !== question.answer.length}
                style={{ width: "100%", padding: "12px 0", borderRadius: 10, border: "none", background: picked.length === question.answer.length ? color : "var(--panel-alt)", color: picked.length === question.answer.length ? "#fff" : "var(--text-faint)", fontWeight: 700, cursor: picked.length === question.answer.length ? "pointer" : "not-allowed" }}>確認順序</button>
            </>
          )}
        </>
      )}

      {/* Feedback */}
      {submitted && (
        <div style={{ padding: "14px 16px", borderRadius: 12, background: isCorrect ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.06)", border: `1px solid ${isCorrect ? "#10b981" : "#ef4444"}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: isCorrect ? "#10b981" : "#ef4444", marginBottom: isCorrect ? 0 : 8 }}>
            {isCorrect ? "✅ 正確！" : "❌ 答錯了"}
          </div>
          {!isCorrect && (
            <div style={{ fontSize: 14, color: "var(--text)" }}>
              {question.type === "true-false" ? `正確答案：${question.answer ? "正確" : "錯誤"}` : `正確答案：`}
              {question.type !== "true-false" && (
                <strong style={{ color }}>
                  {question.type === "sort" ? question.answer.join(" ") : question.answer}
                </strong>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── AudioPlayer ───────────────────────────────────────────────────────
function AudioPlayer({ exercise, topicColor }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [showZh, setShowZh] = useState(false);
  const color = topicColor || "#6366f1";

  function playAudio(rate, label) {
    setIsPlaying(true);
    setSpeed(label);
    speak(exercise.audioText, rate, () => setIsPlaying(false));
  }
  function stop() { stopSpeak(); setIsPlaying(false); setSpeed(null); }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => playAudio(0.6, "慢速")}
          style={{ flex: 1, minWidth: 100, padding: "11px 0", borderRadius: 10, border: `1px solid ${color}55`, background: speed === "慢速" && isPlaying ? `${color}22` : "var(--panel)", color, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          🐢 慢速
        </button>
        <button onClick={() => playAudio(0.85, "正常")}
          style={{ flex: 1, minWidth: 100, padding: "11px 0", borderRadius: 10, border: `1px solid ${color}55`, background: speed === "正常" && isPlaying ? `${color}22` : "var(--panel)", color, fontWeight: 700, fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          🔊 正常
        </button>
        <button onClick={() => speed ? playAudio(speed === "慢速" ? 0.6 : 0.85, speed) : playAudio(0.85, "正常")}
          style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text-muted)", fontSize: 14, cursor: "pointer" }}>
          ↻
        </button>
        {isPlaying && (
          <button onClick={stop}
            style={{ padding: "11px 14px", borderRadius: 10, border: "1px solid #ef444455", background: "rgba(239,68,68,0.08)", color: "#ef4444", fontSize: 14, cursor: "pointer" }}>
            ⏹
          </button>
        )}
      </div>

      {/* Playing indicator */}
      {isPlaying && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", borderRadius: 8, background: `${color}10`, border: `1px solid ${color}33` }}>
          <span style={{ fontSize: 12, color, fontWeight: 600 }}>播放中（{speed}）...</span>
          <span style={{ display: "flex", gap: 3 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ display: "inline-block", width: 4, height: 14, background: color, borderRadius: 2, animation: `pulse 0.8s ease-in-out ${i * 0.15}s infinite alternate`, opacity: 0.7 }} />
            ))}
          </span>
        </div>
      )}

      {/* Toggles */}
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={() => setShowTranscript(!showTranscript)}
          style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${showTranscript ? color : "var(--border)"}`, background: showTranscript ? `${color}12` : "none", color: showTranscript ? color : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          📄 逐字稿
        </button>
        <button onClick={() => setShowZh(!showZh)}
          style={{ flex: 1, padding: "9px 0", borderRadius: 10, border: `1px solid ${showZh ? color : "var(--border)"}`, background: showZh ? `${color}12` : "none", color: showZh ? color : "var(--text-muted)", fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
          🇹🇼 中文翻譯
        </button>
      </div>

      {showTranscript && (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "var(--panel-alt)", border: "1px solid var(--border)", fontSize: 15, color: "var(--text)", lineHeight: 1.8, fontStyle: "italic" }}>
          {exercise.transcript}
        </div>
      )}
      {showZh && (
        <div style={{ padding: "12px 14px", borderRadius: 10, background: "rgba(99,102,241,0.06)", border: "1px solid #6366f133", fontSize: 14, color: "var(--text-dim)", lineHeight: 1.8 }}>
          {exercise.zh}
        </div>
      )}
      <style>{`@keyframes pulse { from { transform: scaleY(0.4); } to { transform: scaleY(1); } }`}</style>
    </div>
  );
}

// ── ExerciseView ──────────────────────────────────────────────────────
function ExerciseView({ exercise, onBack, onDone }) {
  const [qIdx, setQIdx] = useState(0);
  const [results, setResults] = useState([]);
  const [qAnswered, setQAnswered] = useState(false);

  const topic = listeningTopics.find((t) => t.id === exercise.topicId);
  const color = topic?.color || "#6366f1";
  const questions = exercise.questions;

  function handleAnswer(correct) {
    setResults((r) => [...r, correct]);
    setQAnswered(true);
  }

  function nextQuestion() {
    setQAnswered(false);
    if (qIdx + 1 < questions.length) {
      setQIdx(qIdx + 1);
    } else {
      onDone(results.concat()); // already updated via closure
    }
  }

  const correctCount = results.filter(Boolean).length;

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)" }}>
      {/* Header */}
      <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid var(--border)", background: "var(--panel-alt)", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{exercise.title}</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{exercise.scene}</div>
        </div>
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: `${levelColor(exercise.level)}22`, color: levelColor(exercise.level), fontWeight: 700 }}>{exercise.level}</span>
      </div>

      <div style={{ padding: "16px 16px 100px", display: "flex", flexDirection: "column", gap: 20 }}>
        {/* Audio player */}
        <AudioPlayer exercise={exercise} topicColor={color} />

        <div style={{ height: 1, background: "var(--border)" }} />

        {/* Questions */}
        {qIdx < questions.length ? (
          <>
            <QuestionCard
              key={`${exercise.id}-${qIdx}`}
              question={questions[qIdx]}
              qNum={qIdx + 1}
              total={questions.length}
              onAnswer={handleAnswer}
              topicColor={color}
            />
            {qAnswered && (
              <button onClick={nextQuestion}
                style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
                {qIdx + 1 < questions.length ? "下一題 →" : "查看結果 🎉"}
              </button>
            )}
            {/* Related words */}
            {qAnswered && exercise.relatedWords && exercise.relatedWords.length > 0 && (
              <div style={{ padding: "10px 14px", borderRadius: 10, background: "var(--panel)", border: "1px solid var(--border)" }}>
                <span style={{ fontSize: 12, color: "var(--text-faint)", marginRight: 8 }}>相關詞彙：</span>
                {exercise.relatedWords.map((w, i) => (
                  <span key={w}>{i > 0 && <span style={{ marginRight: 6 }} />}<DictChip word={w} /></span>
                ))}
              </div>
            )}
          </>
        ) : (
          // All questions done — show results inline before onDone fires
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>完成本段！{correctCount}/{questions.length} 題正確</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── TopicView ─────────────────────────────────────────────────────────
function TopicView({ topic, doneIds, onSelectExercise, onBack }) {
  const topicExercises = listeningExercises.filter((e) => e.topicId === topic.id);
  const doneCount = topicExercises.filter((e) => doneIds.has(e.id)).length;
  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ padding: "14px 18px 10px", borderBottom: "1px solid var(--border)", background: "var(--panel-alt)", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 20, cursor: "pointer", padding: "4px 8px" }}>←</button>
        <span style={{ fontSize: 20 }}>{topic.emoji}</span>
        <div style={{ flex: 1, fontSize: 15, fontWeight: 700 }}>{topic.title}</div>
        <span style={{ fontSize: 12, color: topic.color, fontWeight: 700 }}>{doneCount}/{topicExercises.length}</span>
      </div>
      <div style={{ padding: "14px 16px 80px", display: "flex", flexDirection: "column", gap: 8 }}>
        {topicExercises.map((ex) => (
          <button key={ex.id} onClick={() => onSelectExercise(ex)}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "var(--panel)", border: `1px solid ${doneIds.has(ex.id) ? topic.color + "66" : "var(--border)"}`, cursor: "pointer", textAlign: "left", width: "100%" }}>
            <span style={{ fontSize: 16 }}>{doneIds.has(ex.id) ? "✅" : "🎧"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{ex.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{ex.scene}</div>
            </div>
            <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 5, background: `${levelColor(ex.level)}18`, color: levelColor(ex.level), fontWeight: 700, flexShrink: 0 }}>{ex.level}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ── HomeView ──────────────────────────────────────────────────────────
function HomeView({ doneIds, onSelectExercise, onSelectTopic }) {
  const total = listeningExercises.length;
  const done = listeningExercises.filter((e) => doneIds.has(e.id)).length;
  const pct = Math.round((done / total) * 100);
  const undone = listeningExercises.filter((e) => !doneIds.has(e.id));
  const todayQueue = undone.slice(0, 3);

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ padding: "18px 18px 0" }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>🎧 A1 聽力練習</div>
        <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>10 個主題 · 100 段聽力</div>
      </div>

      {/* Progress */}
      <div style={{ margin: "14px 18px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>總進度</span>
          <span style={{ fontSize: 12, color: "#6366f1", fontWeight: 700 }}>{done}/{total} 段 · {pct}%</span>
        </div>
        <div style={{ height: 8, background: "var(--panel-alt)", borderRadius: 99, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99, transition: "width 0.6s" }} />
        </div>
      </div>

      {/* Today */}
      <div style={{ margin: "16px 16px 0", background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: "16px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>📅 今日聽力練習</div>
        {todayQueue.length === 0 ? (
          <div style={{ textAlign: "center", padding: "12px 0" }}>
            <div style={{ fontSize: 28, marginBottom: 6 }}>🎉</div>
            <div style={{ fontSize: 14, color: "var(--text-dim)" }}>所有聽力已完成！</div>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              {todayQueue.map((ex) => {
                const t = listeningTopics.find((t) => t.id === ex.topicId);
                return (
                  <button key={ex.id} onClick={() => onSelectExercise(ex)}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 10, background: `${t?.color || "#6366f1"}08`, border: `1px solid ${t?.color || "#6366f1"}33`, cursor: "pointer", textAlign: "left" }}>
                    <span style={{ fontSize: 18 }}>{t?.emoji}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{ex.title}</div>
                      <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{t?.title}</div>
                    </div>
                    <span style={{ fontSize: 18, color: "var(--text-faint)" }}>▶</span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Topics */}
      <div style={{ padding: "14px 16px 60px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>按主題練習</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {listeningTopics.map((t) => {
            const topicEx = listeningExercises.filter((e) => e.topicId === t.id);
            const topicDone = topicEx.filter((e) => doneIds.has(e.id)).length;
            const tPct = Math.round((topicDone / topicEx.length) * 100);
            return (
              <button key={t.id} onClick={() => onSelectTopic(t)}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", borderRadius: 12, background: "var(--panel)", border: `1px solid ${topicDone === topicEx.length && topicDone > 0 ? t.color + "66" : "var(--border)"}`, cursor: "pointer", textAlign: "left", width: "100%" }}>
                <span style={{ fontSize: 22, flexShrink: 0 }}>{t.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>{t.title}</div>
                  <div style={{ height: 3, background: "var(--panel-alt)", borderRadius: 99, marginTop: 6, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${tPct}%`, background: t.color, borderRadius: 99 }} />
                  </div>
                </div>
                <span style={{ fontSize: 12, color: t.color, fontWeight: 700, flexShrink: 0 }}>{topicDone}/{topicEx.length}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── ExerciseResult ────────────────────────────────────────────────────
function ExerciseResult({ results, exercise, onBack, onNext, hasNext }) {
  const correct = results.filter(Boolean).length;
  const total = results.length;
  const pct = Math.round((correct / total) * 100);
  const color = listeningTopics.find((t) => t.id === exercise.topicId)?.color || "#6366f1";
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "32px 20px", textAlign: "center", minHeight: "100%", background: "var(--bg)", justifyContent: "center" }}>
      <div style={{ fontSize: 56, marginBottom: 14 }}>{pct === 100 ? "🏆" : pct >= 67 ? "⭐" : "💪"}</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 6 }}>{pct === 100 ? "全對！" : pct >= 67 ? "做得不錯！" : "繼續加油！"}</div>
      <div style={{ fontSize: 15, color: "var(--text-dim)", marginBottom: 28 }}>{correct}/{total} 題正確</div>
      <div style={{ display: "flex", gap: 12, width: "100%", maxWidth: 320 }}>
        <button onClick={onBack} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "1px solid var(--border)", background: "none", color: "var(--text)", fontSize: 15, fontWeight: 600, cursor: "pointer" }}>← 返回</button>
        {hasNext && <button onClick={onNext} style={{ flex: 1, padding: "13px 0", borderRadius: 12, border: "none", background: `linear-gradient(135deg, ${color}, ${color}cc)`, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>下一段 →</button>}
      </div>
    </div>
  );
}

// ── MAIN ──────────────────────────────────────────────────────────────
export default function SpanishA1ListeningRoom({ user, db }) {
  const [view, setView] = useState("home"); // home | topic | exercise | result
  const [activeTopic, setActiveTopic] = useState(null);
  const [activeExercise, setActiveExercise] = useState(null);
  const [lastResults, setLastResults] = useState([]);
  const [doneIds, setDoneIds] = useState(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.uid || !db) { setLoaded(true); return; }
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const done = snap.data().spanishListeningDone || [];
        setDoneIds(new Set(done));
      }
      setLoaded(true);
    });
  }, [user?.uid, db]);

  async function markDone(exId) {
    const next = new Set([...doneIds, exId]);
    setDoneIds(next);
    if (user?.uid && db) {
      await updateDoc(doc(db, "users", user.uid), { spanishListeningDone: [...next] });
    }
  }

  function handleDone(results) {
    setLastResults(results);
    markDone(activeExercise.id);
    setView("result");
  }

  function getNextExercise() {
    if (!activeTopic) return null;
    const list = listeningExercises.filter((e) => e.topicId === activeTopic.id);
    const idx = list.findIndex((e) => e.id === activeExercise?.id);
    return idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  }

  function goBack() {
    if (view === "result") { setView(activeTopic ? "topic" : "home"); return; }
    if (view === "exercise") { setView(activeTopic ? "topic" : "home"); return; }
    if (view === "topic") { setActiveTopic(null); setView("home"); }
  }

  useEffect(() => () => stopSpeak(), []);

  if (!loaded) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-dim)", fontSize: 14 }}>載入中...</div>
  );

  if (view === "exercise") return (
    <ExerciseView exercise={activeExercise} onBack={goBack} onDone={handleDone} />
  );

  if (view === "result") {
    const next = getNextExercise();
    return (
      <ExerciseResult
        results={lastResults} exercise={activeExercise}
        onBack={goBack}
        hasNext={!!next}
        onNext={() => { setActiveExercise(next); setView("exercise"); }}
      />
    );
  }

  if (view === "topic") return (
    <TopicView topic={activeTopic} doneIds={doneIds}
      onSelectExercise={(ex) => { setActiveExercise(ex); setView("exercise"); }}
      onBack={goBack} />
  );

  return (
    <HomeView doneIds={doneIds}
      onSelectExercise={(ex) => { setActiveTopic(null); setActiveExercise(ex); setView("exercise"); }}
      onSelectTopic={(t) => { setActiveTopic(t); setView("topic"); }} />
  );
}
