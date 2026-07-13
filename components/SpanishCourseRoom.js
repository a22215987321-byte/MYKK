import { useState, useEffect, useRef } from "react";
import { doc, getDoc, updateDoc, arrayUnion } from "firebase/firestore";
import spanishCourseData from "../lib/spanishCourseData";
import spanishA1Dict from "../lib/spanishA1Dict";

const { chapters, lessons } = spanishCourseData;

// ── Dictionary lookup ──────────────────────────────────────────────────
function lookupWord(raw) {
  const clean = raw.replace(/^[¿¡«"'(]+|[.,;:!?»"')]+$/g, "").toLowerCase();
  return spanishA1Dict[clean] || spanishA1Dict[clean.normalize("NFD").replace(/[̀-ͯ]/g, "")] || null;
}

// ── WordPopup ──────────────────────────────────────────────────────────
function WordPopup({ popup, onClose, onAddVocab }) {
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    }
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("touchstart", handleClick);
    return () => { document.removeEventListener("mousedown", handleClick); document.removeEventListener("touchstart", handleClick); };
  }, [onClose]);

  if (!popup) return null;
  const { word, entry, anchor } = popup;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

  const content = (
    <div ref={ref} style={{
      background: "var(--panel)",
      border: "1px solid var(--border)",
      borderRadius: isMobile ? "20px 20px 0 0" : 14,
      padding: "16px 18px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
      minWidth: isMobile ? "100%" : 260,
      maxWidth: isMobile ? "100%" : 320,
      position: isMobile ? "fixed" : "absolute",
      bottom: isMobile ? 0 : undefined,
      left: isMobile ? 0 : undefined,
      right: isMobile ? 0 : undefined,
      top: isMobile ? undefined : (anchor ? anchor.y : 60),
      zIndex: 1000,
      ...((!isMobile && anchor) ? { left: Math.min(anchor.x, (typeof window !== "undefined" ? window.innerWidth : 400) - 340) } : {}),
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>{word}</span>
        {entry && (
          <span style={{ fontSize: 11, padding: "2px 7px", background: "rgba(99,102,241,0.15)", color: "#6366f1", borderRadius: 6, fontWeight: 700 }}>
            {entry.partOfSpeech}
          </span>
        )}
        {entry && (
          <span style={{ fontSize: 11, padding: "2px 6px", background: "rgba(16,185,129,0.12)", color: "#10b981", borderRadius: 6, fontWeight: 600 }}>
            {entry.level}
          </span>
        )}
      </div>
      {entry ? (
        <>
          <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>{entry.zh}</div>
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 10 }}>{entry.en}</div>
          {entry.example && (
            <div style={{ background: "var(--panel-alt)", borderRadius: 8, padding: "8px 10px", marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontStyle: "italic", color: "var(--text-dim)", marginBottom: 2 }}>{entry.example}</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{entry.exampleZh}</div>
            </div>
          )}
        </>
      ) : (
        <div style={{ fontSize: 14, color: "var(--text-faint)", marginBottom: 12 }}>暫無解釋，可稍後加入</div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => { speakES(word); }}
          style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}
        >🔊</button>
        {entry && (
          <button
            onClick={() => { onAddVocab(word); onClose(); }}
            style={{ flex: 2, padding: "8px 0", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}
          >+ 加入單字本</button>
        )}
        <button
          onClick={onClose}
          style={{ flex: 1, padding: "8px 0", borderRadius: 8, border: "1px solid var(--border)", background: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 14 }}
        >✕</button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.35)" }}>
        {content}
      </div>
    );
  }
  return <div style={{ position: "fixed", inset: 0, zIndex: 999 }} onClick={onClose}>{content}</div>;
}

// ── SpanishText ────────────────────────────────────────────────────────
function SpanishText({ text, onWordClick, style }) {
  const tokens = text.split(/(\s+)/);
  return (
    <span style={style}>
      {tokens.map((token, i) => {
        if (/^\s+$/.test(token)) return <span key={i}>{token}</span>;
        const clean = token.replace(/^[¿¡«"'(]+|[.,;:!?»"')]+$/g, "").toLowerCase();
        const isWord = /[a-záéíóúüñ]/i.test(clean);
        if (!isWord) return <span key={i}>{token}</span>;
        const hasEntry = !!spanishA1Dict[clean] || !!spanishA1Dict[clean.normalize("NFD").replace(/[̀-ͯ]/g, "")];
        return (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.target.getBoundingClientRect();
              onWordClick(token, { x: rect.left, y: rect.bottom + 6 });
            }}
            style={{
              cursor: "pointer",
              borderBottom: hasEntry ? "1.5px dashed rgba(99,102,241,0.5)" : "1.5px dashed rgba(160,160,160,0.3)",
              borderRadius: 2,
              display: "inline",
            }}
          >{token}</span>
        );
      })}
    </span>
  );
}

function speakES(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-ES";
  u.rate = 0.82;
  window.speechSynthesis.speak(u);
}

function getLessonsByChapter(chId) {
  return lessons.filter((l) => l.chapter === chId).sort((a, b) => a.lessonNum - b.lessonNum);
}

function getAllVocab(completed) {
  const seen = new Set();
  const result = [];
  for (const l of lessons) {
    if (!completed.includes(l.id)) continue;
    for (const v of l.vocab) {
      if (!seen.has(v.word)) {
        seen.add(v.word);
        result.push({ ...v, lessonId: l.id });
      }
    }
  }
  return result;
}

// ── Styles ─────────────────────────────────────────────────────────────
const S = {
  page: {
    minHeight: "100%",
    background: "var(--bg)",
    color: "var(--text)",
    fontFamily: "inherit",
    overflowY: "auto",
  },
  header: {
    padding: "16px 20px 12px",
    borderBottom: "1px solid var(--border)",
    background: "var(--panel-alt)",
    display: "flex",
    alignItems: "center",
    gap: 12,
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "var(--text-muted)",
    fontSize: 20,
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: 8,
    lineHeight: 1,
  },
  card: {
    background: "var(--panel)",
    border: "1px solid var(--border)",
    borderRadius: 16,
    padding: "18px 20px",
    margin: "0 16px 12px",
  },
  primaryBtn: {
    width: "100%",
    padding: "14px 0",
    borderRadius: 14,
    border: "none",
    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
    color: "#fff",
    fontSize: 16,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: 0.3,
    boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
  },
  ghostBtn: {
    background: "none",
    border: "1px solid var(--border)",
    borderRadius: 10,
    color: "var(--text-muted)",
    padding: "8px 16px",
    cursor: "pointer",
    fontSize: 14,
  },
};

// ── HOME VIEW ──────────────────────────────────────────────────────────
function HomeView({ completed, streak, onOpenLesson, onGoReview, onGoProgress }) {
  const completedSet = new Set(completed);
  const totalLessons = lessons.length;
  const doneCount = completed.length;
  const pct = Math.round((doneCount / totalLessons) * 100);

  function getNextLesson() {
    for (const l of lessons) {
      if (!completedSet.has(l.id)) return l;
    }
    return null;
  }
  const next = getNextLesson();

  function isLessonUnlocked(lesson) {
    if (lesson.chapter === 1 && lesson.lessonNum === 1) return true;
    const prev = lessons.find(
      (l) => l.chapter === lesson.chapter && l.lessonNum === lesson.lessonNum - 1
    );
    if (prev && !completedSet.has(prev.id)) return false;
    if (lesson.lessonNum === 1) {
      const prevChapter = chapters.find((c) => c.id === lesson.chapter - 1);
      if (!prevChapter) return true;
      const prevChLessons = getLessonsByChapter(prevChapter.id);
      return prevChLessons.every((l) => completedSet.has(l.id));
    }
    return true;
  }

  const reviewCount = getAllVocab(completed).length;

  return (
    <div style={S.page}>
      {/* Top bar */}
      <div style={{ padding: "20px 20px 0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>🇪🇸 西語 A1 課程</div>
          <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>完全初學者，從生活情境開始</div>
        </div>
        <button onClick={onGoProgress} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 14px", cursor: "pointer", color: "var(--text)", fontSize: 13, fontWeight: 600 }}>
          {streak > 0 ? `🔥 ${streak}天` : "📊"}
        </button>
      </div>

      {/* Progress bar */}
      <div style={{ margin: "16px 20px 0", background: "var(--panel-alt)", borderRadius: 99, height: 8, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99, transition: "width 0.6s" }} />
      </div>
      <div style={{ margin: "4px 20px 0", fontSize: 12, color: "var(--text-faint)" }}>{doneCount} / {totalLessons} 課已完成 · {pct}%</div>

      {/* Continue button */}
      {next && (
        <div style={{ margin: "16px 16px 0" }}>
          <button onClick={() => onOpenLesson(next)} style={S.primaryBtn}>
            ▶ 繼續今天的課：{next.emoji} {next.title}
          </button>
        </div>
      )}

      {/* Daily tasks */}
      <div style={{ ...S.card, marginTop: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>今日任務</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {next && (
            <TaskRow emoji="📖" label={`學習：${next.title}`} done={false} onClick={() => onOpenLesson(next)} />
          )}
          <TaskRow
            emoji="🗂️"
            label={reviewCount > 0 ? `複習 ${Math.min(reviewCount, 10)} 個單字` : "完成第一課後開始複習"}
            done={false}
            onClick={reviewCount > 0 ? onGoReview : null}
          />
        </div>
      </div>

      {/* Chapter map */}
      <div style={{ padding: "4px 16px 24px" }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", margin: "8px 4px 12px" }}>學習地圖</div>
        {chapters.map((ch) => {
          const chLessons = getLessonsByChapter(ch.id);
          const chDone = chLessons.filter((l) => completedSet.has(l.id)).length;
          const chTotal = chLessons.length;
          const chPct = Math.round((chDone / chTotal) * 100);
          const isChUnlocked =
            ch.id === 1 ||
            getLessonsByChapter(ch.id - 1).every((l) => completedSet.has(l.id));

          return (
            <div key={ch.id} style={{ marginBottom: 12 }}>
              {/* Chapter header */}
              <div style={{
                display: "flex", alignItems: "center", gap: 10,
                background: isChUnlocked ? `${ch.color}18` : "var(--panel-alt)",
                border: `1px solid ${isChUnlocked ? ch.color + "44" : "var(--border)"}`,
                borderRadius: 14, padding: "10px 14px", marginBottom: 6,
              }}>
                <div style={{ fontSize: 22 }}>{isChUnlocked ? ch.emoji : "🔒"}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: isChUnlocked ? "var(--text)" : "var(--text-dim)" }}>
                    第 {ch.id} 章：{ch.title}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                    {isChUnlocked ? `${chDone}/${chTotal} 課` : "完成前一章後解鎖"}
                  </div>
                </div>
                {chPct === 100 && <div style={{ fontSize: 18 }}>✅</div>}
                {chPct > 0 && chPct < 100 && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: ch.color }}>{chPct}%</div>
                )}
              </div>

              {/* Lessons */}
              {isChUnlocked && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingLeft: 12 }}>
                  {chLessons.map((lesson) => {
                    const done = completedSet.has(lesson.id);
                    const unlocked = isLessonUnlocked(lesson);
                    return (
                      <button
                        key={lesson.id}
                        disabled={!unlocked}
                        onClick={() => unlocked && onOpenLesson(lesson)}
                        style={{
                          display: "flex", alignItems: "center", gap: 10,
                          background: done ? `${ch.color}22` : "var(--panel)",
                          border: `1px solid ${done ? ch.color + "55" : "var(--border)"}`,
                          borderRadius: 10, padding: "9px 12px",
                          cursor: unlocked ? "pointer" : "not-allowed",
                          opacity: unlocked ? 1 : 0.5, textAlign: "left", width: "100%",
                        }}
                      >
                        <span style={{ fontSize: 16 }}>{done ? "✅" : unlocked ? lesson.emoji : "🔒"}</span>
                        <span style={{ fontSize: 13, color: "var(--text)", fontWeight: done ? 600 : 400 }}>
                          {lesson.lessonNum}. {lesson.title}
                        </span>
                        {done && <span style={{ marginLeft: "auto", fontSize: 11, color: ch.color }}>完成</span>}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskRow({ emoji, label, done, onClick }) {
  return (
    <div
      onClick={onClick || undefined}
      style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 12px",
        background: done ? "rgba(99,102,241,0.1)" : "var(--panel-alt)",
        border: `1px solid ${done ? "#6366f144" : "var(--border)"}`,
        borderRadius: 10,
        cursor: onClick ? "pointer" : "default",
        opacity: onClick ? 1 : 0.5,
      }}
    >
      <span style={{ fontSize: 18 }}>{done ? "✅" : emoji}</span>
      <span style={{ fontSize: 13, color: done ? "var(--text-dim)" : "var(--text)", textDecoration: done ? "line-through" : "none" }}>{label}</span>
      {onClick && !done && <span style={{ marginLeft: "auto", fontSize: 12, color: "#6366f1", fontWeight: 600 }}>開始 →</span>}
    </div>
  );
}

// ── LESSON VIEW ────────────────────────────────────────────────────────
function LessonView({ lesson, onComplete, onBack, onAddVocab }) {
  const [step, setStep] = useState(0); // 0:context, 1:sentences, 2:vocab, 3:grammar, 4:listening, 5:sentenceOrder, 6:done
  const [grammarOpen, setGrammarOpen] = useState(false);
  const [listeningSelected, setListeningSelected] = useState(null);
  const [listeningDone, setListeningDone] = useState(false);
  const [orderPicked, setOrderPicked] = useState([]);
  const [orderDone, setOrderDone] = useState(false);
  const [orderCorrect, setOrderCorrect] = useState(null);
  const [popup, setPopup] = useState(null);
  const totalSteps = 6;

  function handleWordClick(token, anchor) {
    const entry = lookupWord(token);
    const clean = token.replace(/^[¿¡«"'(]+|[.,;:!?»"')]+$/g, "");
    setPopup({ word: clean, entry, anchor });
  }

  const ch = chapters.find((c) => c.id === lesson.chapter);
  const color = ch?.color || "#6366f1";

  const shuffledOrderWords = useRef(
    [...lesson.sentenceOrder.words].sort(() => Math.random() - 0.5)
  );
  const [remaining, setRemaining] = useState(shuffledOrderWords.current);

  function handleOrderPick(word, idx) {
    const next = [...orderPicked, word];
    setOrderPicked(next);
    const rem = [...remaining];
    rem.splice(idx, 1);
    setRemaining(rem);
  }

  function handleOrderUnpick(word, idx) {
    const next = [...orderPicked];
    next.splice(idx, 1);
    setOrderPicked(next);
    setRemaining([...remaining, word]);
  }

  function checkOrder() {
    const correct = lesson.sentenceOrder.answer.join(" ");
    const picked = orderPicked.join(" ");
    setOrderCorrect(picked === correct);
    setOrderDone(true);
  }

  function handleListeningPick(idx) {
    if (listeningDone) return;
    setListeningSelected(idx);
    setListeningDone(true);
  }

  const steps = ["情境", "核心句子", "單字", "文法", "聽力練習", "句子排序"];

  return (
    <div style={S.page}>
      {popup && <WordPopup popup={popup} onClose={() => setPopup(null)} onAddVocab={onAddVocab} />}
      {/* Header */}
      <div style={S.header}>
        <button onClick={onBack} style={S.backBtn}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>{lesson.emoji} {lesson.title}</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>第 {lesson.chapter} 章 · 第 {lesson.lessonNum} 課</div>
        </div>
        <div style={{ fontSize: 12, color: color, fontWeight: 700 }}>{step}/{totalSteps}</div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--panel-alt)" }}>
        <div style={{ height: "100%", width: `${(step / totalSteps) * 100}%`, background: color, transition: "width 0.4s" }} />
      </div>

      {/* Step tabs */}
      <div style={{ display: "flex", overflowX: "auto", gap: 6, padding: "10px 16px", borderBottom: "1px solid var(--border)" }}>
        {steps.map((s, i) => (
          <div key={i} style={{
            padding: "4px 10px", borderRadius: 20, fontSize: 12, whiteSpace: "nowrap",
            background: step === i ? color : "var(--panel-alt)",
            color: step === i ? "#fff" : (i < step ? "var(--text-dim)" : "var(--text-faint)"),
            fontWeight: step === i ? 700 : 400,
            border: i < step ? `1px solid ${color}44` : "1px solid var(--border)",
          }}>{i < step ? "✓ " : ""}{s}</div>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px 100px" }}>

        {/* STEP 0: Context */}
        {step === 0 && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>📍 情境</div>
            <div style={{ ...S.card, margin: 0, marginBottom: 16, background: `${color}14`, border: `1px solid ${color}33` }}>
              <div style={{ fontSize: 15, lineHeight: 1.7, color: "var(--text)" }}>{lesson.context}</div>
            </div>
            <button onClick={() => setStep(1)} style={S.primaryBtn}>開始學習 →</button>
          </div>
        )}

        {/* STEP 1: Core sentences */}
        {step === 1 && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>🗣️ 核心句子</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {lesson.sentences.map((s, i) => (
                <div key={i} style={{ ...S.card, margin: 0, display: "flex", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>
                      <SpanishText text={s.es} onWordClick={handleWordClick} />
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-dim)" }}>{s.cn}</div>
                  </div>
                  <button onClick={() => speakES(s.es)} style={{ background: `${color}22`, border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 16, flexShrink: 0 }}>🔊</button>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(2)} style={S.primaryBtn}>下一步：單字 →</button>
          </div>
        )}

        {/* STEP 2: Vocab */}
        {step === 2 && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>📚 本課單字</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {lesson.vocab.map((v, i) => (
                <div key={i} style={{ ...S.card, margin: 0, display: "flex", alignItems: "center", gap: 12 }}>
                  <button onClick={() => speakES(v.word)} style={{ background: `${color}22`, border: "none", borderRadius: 8, padding: "6px 8px", cursor: "pointer", fontSize: 15, flexShrink: 0 }}>🔊</button>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span
                        onClick={(e) => { e.stopPropagation(); const rect = e.target.getBoundingClientRect(); handleWordClick(v.word, { x: rect.left, y: rect.bottom + 6 }); }}
                        style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", cursor: "pointer", borderBottom: "1.5px dashed rgba(99,102,241,0.5)", borderRadius: 2 }}
                      >{v.word}</span>
                      {v.gender === "m" && <span style={{ fontSize: 10, padding: "1px 5px", background: "rgba(96,165,250,0.15)", color: "#60a5fa", borderRadius: 4, fontWeight: 700 }}>m.</span>}
                      {v.gender === "f" && <span style={{ fontSize: 10, padding: "1px 5px", background: "rgba(248,113,113,0.15)", color: "#f87171", borderRadius: 4, fontWeight: 700 }}>f.</span>}
                      <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{v.phonetic}</span>
                      <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{v.pos}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--text-dim)", marginTop: 2 }}>{v.cn}</div>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(3)} style={S.primaryBtn}>下一步：文法小貼士 →</button>
          </div>
        )}

        {/* STEP 3: Grammar tip */}
        {step === 3 && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>📝 文法小貼士</div>
            <div style={{ ...S.card, margin: 0, marginBottom: 20, border: `1px solid ${color}44` }}>
              <button
                onClick={() => setGrammarOpen(!grammarOpen)}
                style={{ width: "100%", background: "none", border: "none", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", padding: 0 }}
              >
                <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>💡 {lesson.grammarTip.title}</span>
                <span style={{ color: "var(--text-dim)", fontSize: 18 }}>{grammarOpen ? "▲" : "▼"}</span>
              </button>
              {grammarOpen && (
                <div style={{ marginTop: 12, fontSize: 14, lineHeight: 1.7, color: "var(--text-dim)", paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  {lesson.grammarTip.content}
                </div>
              )}
              {!grammarOpen && (
                <div style={{ marginTop: 6, fontSize: 12, color: "var(--text-faint)" }}>點擊展開說明</div>
              )}
            </div>
            <button onClick={() => { setGrammarOpen(true); setTimeout(() => setStep(4), 200); }} style={S.primaryBtn}>
              下一步：聽力練習 →
            </button>
          </div>
        )}

        {/* STEP 4: Listening quiz */}
        {step === 4 && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>🎧 聽力練習</div>
            <div style={{ ...S.card, margin: 0, marginBottom: 16, background: `${color}10`, border: `1px solid ${color}33` }}>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 8 }}>對話內容：</div>
              <div style={{ fontSize: 14, lineHeight: 1.7, color: "var(--text-dim)", marginBottom: 10 }}>
                {lesson.listening.script.split("\n").map((line, i) => (
                  <div key={i}><SpanishText text={line} onWordClick={handleWordClick} /></div>
                ))}
              </div>
              <button
                onClick={() => speakES(lesson.listening.script)}
                style={{ background: color, border: "none", borderRadius: 10, padding: "8px 16px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}
              >
                🔊 播放對話
              </button>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--text)", marginBottom: 10 }}>
              {lesson.listening.question}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {lesson.listening.options.map((opt, i) => {
                const isCorrect = i === lesson.listening.answer;
                const isPicked = listeningSelected === i;
                let bg = "var(--panel)";
                let border = "var(--border)";
                if (listeningDone && isCorrect) { bg = "rgba(16,185,129,0.15)"; border = "#10b981"; }
                if (listeningDone && isPicked && !isCorrect) { bg = "rgba(239,68,68,0.12)"; border = "#ef4444"; }
                return (
                  <button
                    key={i}
                    onClick={() => handleListeningPick(i)}
                    style={{ background: bg, border: `1px solid ${border}`, borderRadius: 10, padding: "12px 14px", cursor: listeningDone ? "default" : "pointer", textAlign: "left", fontSize: 14, color: "var(--text)", fontWeight: isPicked ? 600 : 400 }}
                  >
                    {String.fromCharCode(65 + i)}. {opt}
                    {listeningDone && isCorrect && " ✓"}
                    {listeningDone && isPicked && !isCorrect && " ✗"}
                  </button>
                );
              })}
            </div>
            {listeningDone && (
              <button onClick={() => setStep(5)} style={S.primaryBtn}>下一步：句子排序 →</button>
            )}
          </div>
        )}

        {/* STEP 5: Sentence order */}
        {step === 5 && (
          <div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, marginBottom: 10 }}>🔀 句子排序</div>
            <div style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 14 }}>按正確順序排列以下單詞：</div>

            {/* Answer area */}
            <div style={{ minHeight: 48, background: "var(--panel-alt)", border: "2px dashed var(--border)", borderRadius: 12, padding: "10px 12px", marginBottom: 12, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              {orderPicked.length === 0 && <span style={{ color: "var(--text-faint)", fontSize: 13 }}>點擊下方單詞...</span>}
              {orderPicked.map((word, i) => (
                <button key={i} onClick={() => handleOrderUnpick(word, i)} style={{ background: color, border: "none", borderRadius: 8, padding: "6px 12px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                  {word}
                </button>
              ))}
            </div>

            {/* Word bank */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              {remaining.map((word, i) => (
                <button
                  key={i}
                  onClick={() => handleOrderPick(word, i)}
                  style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 8, padding: "7px 13px", color: "var(--text)", fontSize: 14, cursor: "pointer" }}
                >
                  {word}
                </button>
              ))}
            </div>

            {!orderDone && orderPicked.length === lesson.sentenceOrder.answer.length && (
              <button onClick={checkOrder} style={S.primaryBtn}>確認答案</button>
            )}

            {orderDone && (
              <div>
                <div style={{ padding: "12px 14px", borderRadius: 10, marginBottom: 14, background: orderCorrect ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)", border: `1px solid ${orderCorrect ? "#10b981" : "#ef4444"}`, fontSize: 14, color: "var(--text)" }}>
                  {orderCorrect ? "✅ 正確！" : `❌ 正確答案：${lesson.sentenceOrder.answer.join(" ")}`}
                </div>
                <button onClick={() => setStep(6)} style={S.primaryBtn}>完成課程 🎉</button>
              </div>
            )}
          </div>
        )}

        {/* STEP 6: Done */}
        {step === 6 && (
          <div style={{ textAlign: "center", padding: "24px 0" }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>課程完成！</div>
            <div style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 6 }}>你學了 {lesson.vocab.length} 個新單字</div>
            <div style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 24 }}>和 {lesson.sentences.length} 個核心句子</div>
            <button onClick={onComplete} style={S.primaryBtn}>
              返回學習地圖
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── REVIEW VIEW ────────────────────────────────────────────────────────
function ReviewView({ completed, wordData, onSaveWord, onBack }) {
  const vocab = getAllVocab(completed);

  // Sort: unknowns first, then by ease
  const sorted = [...vocab].sort((a, b) => {
    const ea = wordData[a.word]?.ease ?? 0;
    const eb = wordData[b.word]?.ease ?? 0;
    return ea - eb;
  });
  const queue = sorted.slice(0, 10);

  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [stats, setStats] = useState({ know: 0, fuzzy: 0, dontKnow: 0 });

  if (vocab.length === 0) {
    return (
      <div style={{ ...S.page, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>📚</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>還沒有單字可複習</div>
        <div style={{ fontSize: 14, color: "var(--text-dim)", marginBottom: 24 }}>完成第一課後，這裡就會出現你學過的單字。</div>
        <button onClick={onBack} style={{ ...S.primaryBtn, maxWidth: 260 }}>← 返回學習地圖</button>
      </div>
    );
  }

  function handleAnswer(ease) {
    const word = queue[idx];
    onSaveWord(word.word, ease);
    setStats((s) => ({
      ...s,
      know: ease === 3 ? s.know + 1 : s.know,
      fuzzy: ease === 2 ? s.fuzzy + 1 : s.fuzzy,
      dontKnow: ease === 1 ? s.dontKnow + 1 : s.dontKnow,
    }));
    if (idx + 1 >= queue.length) {
      setDone(true);
    } else {
      setFlipped(false);
      setIdx((i) => i + 1);
    }
  }

  if (done) {
    return (
      <div style={{ ...S.page, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 32, textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🌟</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text)", marginBottom: 16 }}>複習完成！</div>
        <div style={{ display: "flex", gap: 12, justifyContent: "center", marginBottom: 24 }}>
          <StatChip label="認識" value={stats.know} color="#10b981" />
          <StatChip label="模糊" value={stats.fuzzy} color="#f59e0b" />
          <StatChip label="不會" value={stats.dontKnow} color="#ef4444" />
        </div>
        <button onClick={onBack} style={{ ...S.primaryBtn, maxWidth: 260 }}>← 返回學習地圖</button>
      </div>
    );
  }

  const word = queue[idx];
  const progress = ((idx + 1) / queue.length) * 100;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button onClick={onBack} style={S.backBtn}>←</button>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>🗂️ 單字複習</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{idx + 1} / {queue.length}</div>
        </div>
      </div>
      <div style={{ height: 4, background: "var(--panel-alt)" }}>
        <div style={{ height: "100%", width: `${progress}%`, background: "#6366f1", transition: "width 0.3s" }} />
      </div>

      <div style={{ padding: "32px 16px 0", display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* Flashcard */}
        <div
          onClick={() => setFlipped(!flipped)}
          style={{
            width: "100%", maxWidth: 380, minHeight: 200,
            background: "var(--panel)", border: "1px solid var(--border)",
            borderRadius: 20, padding: "28px 24px", cursor: "pointer",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
            textAlign: "center", marginBottom: 24,
            boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
          }}
        >
          {!flipped ? (
            <>
              <div style={{ fontSize: 32, fontWeight: 800, color: "var(--text)", marginBottom: 8 }}>{word.word}</div>
              <div style={{ fontSize: 14, color: "var(--text-faint)" }}>{word.phonetic}</div>
              {word.gender === "m" && <span style={{ marginTop: 8, fontSize: 11, padding: "2px 7px", background: "rgba(96,165,250,0.15)", color: "#60a5fa", borderRadius: 4, fontWeight: 700 }}>m.</span>}
              {word.gender === "f" && <span style={{ marginTop: 8, fontSize: 11, padding: "2px 7px", background: "rgba(248,113,113,0.15)", color: "#f87171", borderRadius: 4, fontWeight: 700 }}>f.</span>}
              <div style={{ marginTop: 16, fontSize: 12, color: "var(--text-faint)" }}>點擊翻面</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 22, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{word.cn}</div>
              <div style={{ fontSize: 13, color: "var(--text-dim)", marginBottom: 10 }}>{word.pos}</div>
              <button onClick={(e) => { e.stopPropagation(); speakES(word.word); }} style={{ background: "rgba(99,102,241,0.15)", border: "none", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 14, color: "#6366f1" }}>
                🔊 播放
              </button>
            </>
          )}
        </div>

        {flipped && (
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 380 }}>
            <button onClick={() => handleAnswer(1)} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid #ef4444", background: "rgba(239,68,68,0.1)", color: "#ef4444", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              ✗ 不會
            </button>
            <button onClick={() => handleAnswer(2)} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid #f59e0b", background: "rgba(245,158,11,0.1)", color: "#f59e0b", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              ～ 模糊
            </button>
            <button onClick={() => handleAnswer(3)} style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid #10b981", background: "rgba(16,185,129,0.1)", color: "#10b981", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              ✓ 認識
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, value, color }) {
  return (
    <div style={{ background: `${color}18`, border: `1px solid ${color}44`, borderRadius: 10, padding: "8px 16px", textAlign: "center" }}>
      <div style={{ fontSize: 22, fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{label}</div>
    </div>
  );
}

// ── PROGRESS VIEW ──────────────────────────────────────────────────────
function ProgressView({ completed, streak, wordData, onBack }) {
  const completedSet = new Set(completed);
  const allVocab = getAllVocab(completed);
  const knownCount = allVocab.filter((v) => (wordData[v.word]?.ease ?? 0) >= 3).length;

  return (
    <div style={S.page}>
      <div style={S.header}>
        <button onClick={onBack} style={S.backBtn}>←</button>
        <div style={{ fontSize: 15, fontWeight: 700 }}>📊 我的進度</div>
      </div>

      <div style={{ padding: "20px 16px" }}>
        {/* Stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
          <BigStat emoji="🔥" value={streak} label="連續學習天數" color="#ef4444" />
          <BigStat emoji="📖" value={completed.length} label="已完成課程" color="#6366f1" />
          <BigStat emoji="📚" value={allVocab.length} label="已學單字數" color="#10b981" />
          <BigStat emoji="⭐" value={knownCount} label="已掌握單字" color="#f59e0b" />
        </div>

        {/* Chapter progress */}
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", margin: "4px 0 10px" }}>各章節進度</div>
        {chapters.map((ch) => {
          const chLessons = getLessonsByChapter(ch.id);
          const done = chLessons.filter((l) => completedSet.has(l.id)).length;
          const total = chLessons.length;
          const pct = Math.round((done / total) * 100);
          return (
            <div key={ch.id} style={{ marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                <span style={{ fontSize: 13, color: "var(--text)" }}>{ch.emoji} {ch.title}</span>
                <span style={{ fontSize: 12, color: ch.color, fontWeight: 600 }}>{done}/{total}</span>
              </div>
              <div style={{ height: 6, background: "var(--panel-alt)", borderRadius: 99, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${pct}%`, background: ch.color, borderRadius: 99, transition: "width 0.5s" }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function BigStat({ emoji, value, label, color }) {
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 14px", textAlign: "center" }}>
      <div style={{ fontSize: 24 }}>{emoji}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, margin: "4px 0 2px" }}>{value}</div>
      <div style={{ fontSize: 12, color: "var(--text-dim)" }}>{label}</div>
    </div>
  );
}

// ── MAIN COMPONENT ─────────────────────────────────────────────────────
export default function SpanishCourseRoom({ user, db }) {
  const [view, setView] = useState("home"); // home | lesson | review | progress
  const [activeLesson, setActiveLesson] = useState(null);
  const [completed, setCompleted] = useState([]);
  const [streak, setStreak] = useState(0);
  const [wordData, setWordData] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user?.uid || !db) { setLoaded(true); return; }
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setCompleted(d.spanishCourseCompleted || []);
        setStreak(d.spanishCourseStreak || 0);
        setWordData(d.spanishCourseWords || {});
      }
      setLoaded(true);
    });
  }, [user?.uid, db]);

  async function handleCompleteLesson(lessonId) {
    if (completed.includes(lessonId)) return;
    const next = [...completed, lessonId];
    setCompleted(next);

    const today = new Date().toISOString().slice(0, 10);
    let newStreak = streak;
    if (user?.uid && db) {
      const snap = await getDoc(doc(db, "users", user.uid));
      const lastDate = snap.data()?.spanishCourseLastActive || "";
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      if (lastDate === today) {
        newStreak = streak;
      } else if (lastDate === yesterday) {
        newStreak = streak + 1;
      } else {
        newStreak = 1;
      }
      setStreak(newStreak);
      await updateDoc(doc(db, "users", user.uid), {
        spanishCourseCompleted: arrayUnion(lessonId),
        spanishCourseStreak: newStreak,
        spanishCourseLastActive: today,
      });
    }
    setView("home");
  }

  async function handleSaveWord(word, ease) {
    const next = { ...wordData, [word]: { ease } };
    setWordData(next);
    if (user?.uid && db) {
      await updateDoc(doc(db, "users", user.uid), {
        spanishCourseWords: next,
      });
    }
  }

  if (!loaded) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "var(--text-dim)", fontSize: 14 }}>
        載入中...
      </div>
    );
  }

  if (view === "lesson" && activeLesson) {
    return (
      <LessonView
        lesson={activeLesson}
        onComplete={() => handleCompleteLesson(activeLesson.id)}
        onBack={() => setView("home")}
        onAddVocab={(word) => handleSaveWord(word, 1)}
      />
    );
  }

  if (view === "review") {
    return (
      <ReviewView
        completed={completed}
        wordData={wordData}
        onSaveWord={handleSaveWord}
        onBack={() => setView("home")}
      />
    );
  }

  if (view === "progress") {
    return (
      <ProgressView
        completed={completed}
        streak={streak}
        wordData={wordData}
        onBack={() => setView("home")}
      />
    );
  }

  return (
    <HomeView
      completed={completed}
      streak={streak}
      onOpenLesson={(lesson) => { setActiveLesson(lesson); setView("lesson"); }}
      onGoReview={() => setView("review")}
      onGoProgress={() => setView("progress")}
    />
  );
}
