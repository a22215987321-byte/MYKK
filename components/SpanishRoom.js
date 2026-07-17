import { useState, useEffect, useCallback } from "react";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import spanishVocabData from "../lib/spanishVocabData";
import ClickableSentence from "./ClickableSentence";

const LEVELS = ["A1", "A2"];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateQuizOptions(correct, allWords) {
  const others = allWords.filter((w) => w.word !== correct.word);
  const distractors = shuffle(others).slice(0, 3);
  return shuffle([correct, ...distractors]);
}

function speakSpanish(word) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = "es-ES";
  utter.rate = 0.85;
  window.speechSynthesis.speak(utter);
}

function GenderBadge({ gender }) {
  if (!gender) return null;
  if (gender === "m") return (
    <span style={{ fontSize: 11, padding: "1px 6px", background: "var(--accent-hover)", color: "#60a5fa", borderRadius: 4, fontWeight: 700 }}>m.</span>
  );
  if (gender === "f") return (
    <span style={{ fontSize: 11, padding: "1px 6px", background: "#4c1d1d", color: "#f87171", borderRadius: 4, fontWeight: 700 }}>f.</span>
  );
  return (
    <span style={{ fontSize: 11, padding: "1px 6px", background: "#2d1f6e", color: "#a78bfa", borderRadius: 4, fontWeight: 700 }}>{gender}</span>
  );
}

export default function SpanishRoom({ user, db }) {
  const [activeLevel, setActiveLevel] = useState("A1");
  const [activeCategory, setActiveCategory] = useState(Object.keys(spanishVocabData["A1"])[0]);
  const [mode, setMode] = useState("browse");
  const [showBookmarksOnly, setShowBookmarksOnly] = useState(false);
  const [learnedWords, setLearnedWords] = useState(new Set());
  const [bookmarkedWords, setBookmarkedWords] = useState(new Set());

  // Flashcard state
  const [cardIndex, setCardIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Quiz state
  const [quizWords, setQuizWords] = useState([]);
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizOptions, setQuizOptions] = useState([]);
  const [quizSelected, setQuizSelected] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const allWords = Object.values(spanishVocabData).flatMap((level) => Object.values(level).flat());
  const levelCategories = Object.keys(spanishVocabData[activeLevel] || {});
  const categoryWords = (spanishVocabData[activeLevel] || {})[activeCategory] || [];
  const displayWords = showBookmarksOnly
    ? categoryWords.filter((w) => bookmarkedWords.has(w.word))
    : categoryWords;

  useEffect(() => {
    if (!user?.uid || !db) return;
    getDoc(doc(db, "users", user.uid)).then((snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setLearnedWords(new Set(data.spanishLearnedWords || []));
        setBookmarkedWords(new Set(data.spanishBookmarkedWords || []));
      }
    });
  }, [user?.uid, db]);

  const resetFlashcard = useCallback(() => {
    setCardIndex(0);
    setFlipped(false);
  }, []);

  const resetQuiz = useCallback((words) => {
    const shuffled = shuffle(words || displayWords);
    setQuizWords(shuffled);
    setQuizIndex(0);
    setQuizSelected(null);
    setQuizScore(0);
    setQuizFinished(false);
    if (shuffled.length > 0) {
      setQuizOptions(generateQuizOptions(shuffled[0], allWords));
    }
  }, [displayWords, allWords]);

  useEffect(() => {
    const firstCat = Object.keys(spanishVocabData[activeLevel] || {})[0];
    setActiveCategory(firstCat);
    setShowBookmarksOnly(false);
    resetFlashcard();
  }, [activeLevel]);

  useEffect(() => {
    resetFlashcard();
    resetQuiz();
    setShowBookmarksOnly(false);
  }, [activeCategory]);

  useEffect(() => {
    if (mode === "flashcard") resetFlashcard();
    if (mode === "quiz") resetQuiz();
  }, [mode]);

  const toggleLearned = async (word) => {
    const next = new Set(learnedWords);
    if (next.has(word)) {
      next.delete(word);
      await updateDoc(doc(db, "users", user.uid), { spanishLearnedWords: arrayRemove(word) });
    } else {
      next.add(word);
      await updateDoc(doc(db, "users", user.uid), { spanishLearnedWords: arrayUnion(word) });
    }
    setLearnedWords(next);
  };

  const toggleBookmark = async (word) => {
    const next = new Set(bookmarkedWords);
    if (next.has(word)) {
      next.delete(word);
      await updateDoc(doc(db, "users", user.uid), { spanishBookmarkedWords: arrayRemove(word) });
    } else {
      next.add(word);
      await updateDoc(doc(db, "users", user.uid), { spanishBookmarkedWords: arrayUnion(word) });
    }
    setBookmarkedWords(next);
  };

  const handleQuizAnswer = (option) => {
    if (quizSelected !== null) return;
    const correct = quizWords[quizIndex];
    setQuizSelected(option.word);
    if (option.word === correct.word) setQuizScore((s) => s + 1);
    const totalQ = Math.min(quizWords.length, 10);
    setTimeout(() => {
      const nextIndex = quizIndex + 1;
      if (nextIndex >= totalQ) {
        setQuizFinished(true);
      } else {
        setQuizIndex(nextIndex);
        setQuizOptions(generateQuizOptions(quizWords[nextIndex], allWords));
        setQuizSelected(null);
      }
    }, 1200);
  };

  const cardWord = displayWords[cardIndex] || null;
  const quizWord = quizWords[quizIndex] || null;
  const totalQuizQuestions = Math.min(displayWords.length, 10);
  const learnedCount = categoryWords.filter((w) => learnedWords.has(w.word)).length;

  return (
    <div style={{ flex: 1, minHeight: 0, background: "var(--bg)", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", color: "var(--text)" }}>

      {/* Header */}
      <div style={{ padding: "16px 20px 0", background: "var(--panel-alt)", borderBottom: "1px solid var(--panel)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🇪🇸</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>西班牙語學習</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)" }}>CEFR A1/A2 · 16個主題 · 240個單字</div>
            </div>
          </div>

          {/* Level + Mode buttons */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            {/* Level */}
            <div style={{ display: "flex", gap: 4, background: "var(--panel)", borderRadius: 8, padding: 3 }}>
              {LEVELS.map((lv) => (
                <button
                  key={lv}
                  onClick={() => setActiveLevel(lv)}
                  style={{
                    padding: "4px 14px",
                    borderRadius: 6,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 13,
                    fontWeight: 700,
                    background: activeLevel === lv ? (lv === "A1" ? "#dc2626" : "#9333ea") : "transparent",
                    color: activeLevel === lv ? "#fff" : "var(--text-faint)",
                    transition: "all 0.15s",
                  }}
                >{lv}</button>
              ))}
            </div>

            {/* Mode */}
            {[
              { key: "browse", label: "📋 瀏覽" },
              { key: "flashcard", label: "🃏 閃卡" },
              { key: "quiz", label: "✏️ 測驗" },
            ].map((m) => (
              <button
                key={m.key}
                onClick={() => setMode(m.key)}
                style={{
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 600,
                  background: mode === m.key ? "var(--accent)" : "var(--panel)",
                  color: mode === m.key ? "#fff" : "var(--text-muted)",
                  transition: "all 0.15s",
                }}
              >{m.label}</button>
            ))}
          </div>
        </div>

        {/* Category pills */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12, scrollbarWidth: "none" }}>
          {levelCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                padding: "5px 12px",
                borderRadius: 20,
                border: "none",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 600,
                whiteSpace: "nowrap",
                background: activeCategory === cat
                  ? (activeLevel === "A1" ? "linear-gradient(135deg,#7c1d1d,#dc2626)" : "linear-gradient(135deg,#4c1d95,#9333ea)")
                  : "var(--panel)",
                color: activeCategory === cat ? "#fff" : "var(--text-muted)",
                transition: "all 0.15s",
              }}
            >{cat}</button>
          ))}
          <button
            onClick={() => setShowBookmarksOnly((v) => !v)}
            style={{
              padding: "5px 12px",
              borderRadius: 20,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: 600,
              whiteSpace: "nowrap",
              background: showBookmarksOnly ? "linear-gradient(135deg,#78350f,#f59e0b)" : "var(--panel)",
              color: showBookmarksOnly ? "#fff" : "var(--text-muted)",
            }}
          >⭐ 我的書籤</button>
        </div>

        {/* Stats */}
        <div style={{ display: "flex", gap: 16, paddingBottom: 10, fontSize: 12, color: "var(--text-faint)" }}>
          <span>📖 {categoryWords.length} 個單字</span>
          <span>✅ 已學會 {learnedCount}/{categoryWords.length}</span>
          <span>⭐ 書籤 {categoryWords.filter((w) => bookmarkedWords.has(w.word)).length}</span>
          <span style={{
            padding: "1px 8px",
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
            background: activeLevel === "A1" ? "#7c1d1d" : "#4c1d95",
            color: "#fff",
          }}>{activeLevel}</span>
        </div>
      </div>

      {/* Main content */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 16 }}>

        {/* === BROWSE MODE === */}
        {mode === "browse" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {displayWords.length === 0 && (
              <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⭐</div>
                <div>未有書籤單字</div>
                <div style={{ fontSize: 12, marginTop: 6 }}>在單字卡右上角點 ⭐ 加入書籤</div>
              </div>
            )}
            {displayWords.map((item) => (
              <div
                key={item.word}
                style={{
                  background: learnedWords.has(item.word) ? "#0f2e1c" : "var(--panel)",
                  border: `1px solid ${learnedWords.has(item.word) ? "#166534" : "var(--border)"}`,
                  borderRadius: 12,
                  padding: "14px 16px",
                  transition: "all 0.15s",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 18, fontWeight: 700, color: "#f87171" }}>{item.word}</span>
                      <button
                        onClick={() => speakSpanish(item.word)}
                        title="聽西班牙語發音"
                        style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "8px", minWidth: 36, minHeight: 36, borderRadius: 6, color: "#f87171", opacity: 0.7 }}
                        onMouseEnter={e => e.currentTarget.style.opacity = 1}
                        onMouseLeave={e => e.currentTarget.style.opacity = 0.7}
                      >🔊</button>
                      <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{item.phonetic}</span>
                      <span style={{ fontSize: 11, padding: "1px 6px", background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 4 }}>{item.pos}</span>
                      <GenderBadge gender={item.gender} />
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: "var(--text)", marginTop: 4 }}>{item.cn}</div>
                    <div style={{ fontSize: 13, color: "var(--text-subtle)", marginTop: 6, lineHeight: 1.5 }}>
                      <ClickableSentence text={item.example} lang="es" />
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2, lineHeight: 1.5 }}>{item.exampleCn}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginLeft: 10 }}>
                    <button onClick={() => toggleBookmark(item.word)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 8, minWidth: 36, minHeight: 36, opacity: bookmarkedWords.has(item.word) ? 1 : 0.3, transition: "opacity 0.15s" }} title="書籤">⭐</button>
                    <button onClick={() => toggleLearned(item.word)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 8, minWidth: 36, minHeight: 36, opacity: learnedWords.has(item.word) ? 1 : 0.3, transition: "opacity 0.15s" }} title="標記已學">✅</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* === FLASHCARD MODE === */}
        {mode === "flashcard" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {displayWords.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🃏</div>
                <div>沒有可用的單字</div>
              </div>
            ) : (
              <>
                <div style={{ width: "100%", maxWidth: 480 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "var(--text-faint)" }}>
                    <span>{cardIndex + 1} / {displayWords.length}</span>
                    <span>點擊卡片翻面</span>
                  </div>
                  <div style={{ height: 4, background: "var(--panel)", borderRadius: 4 }}>
                    <div style={{ height: "100%", background: activeLevel === "A1" ? "linear-gradient(90deg,#7c1d1d,#dc2626)" : "linear-gradient(90deg,#4c1d95,#9333ea)", borderRadius: 4, width: `${((cardIndex + 1) / displayWords.length) * 100}%`, transition: "width 0.3s" }} />
                  </div>
                </div>

                {cardWord && (
                  <div
                    onClick={() => setFlipped((f) => !f)}
                    style={{
                      width: "100%",
                      maxWidth: 480,
                      minHeight: 240,
                      background: flipped ? "#0f2e1c" : "var(--accent-hover)",
                      border: `2px solid ${flipped ? "#166534" : "var(--accent-active)"}`,
                      borderRadius: 20,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                      padding: 28,
                      textAlign: "center",
                      transition: "background 0.3s, border-color 0.3s",
                      userSelect: "none",
                      boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
                    }}
                  >
                    {!flipped ? (
                      <>
                        <div style={{ fontSize: 32, fontWeight: 800, color: "#f87171", marginBottom: 6 }}>{cardWord.word}</div>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
                          <GenderBadge gender={cardWord.gender} />
                          <span style={{ fontSize: 13, color: "var(--text-muted)" }}>{cardWord.pos}</span>
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); speakSpanish(cardWord.word); }}
                          style={{ background: "var(--accent-hover)", border: "1px solid #dc2626", cursor: "pointer", fontSize: 16, padding: "4px 14px", borderRadius: 20, color: "#f87171", marginBottom: 8 }}
                        >🔊 發音</button>
                        <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 4 }}>{cardWord.phonetic}</div>
                        <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 12 }}>👆 點擊看答案</div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 26, fontWeight: 700, color: "#4ade80", marginBottom: 10 }}>{cardWord.cn}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                          <span style={{ fontSize: 15, color: "#f87171" }}>{cardWord.word}</span>
                          <GenderBadge gender={cardWord.gender} />
                          <button
                            onClick={e => { e.stopPropagation(); speakSpanish(cardWord.word); }}
                            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, color: "#f87171", padding: 0 }}
                          >🔊</button>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--text-subtle)", marginTop: 8, lineHeight: 1.6 }}>{cardWord.example}</div>
                        <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 4 }}>{cardWord.exampleCn}</div>
                      </>
                    )}
                  </div>
                )}

                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={() => { setCardIndex((i) => Math.max(0, i - 1)); setFlipped(false); }} disabled={cardIndex === 0}
                    style={{ padding: "10px 20px", borderRadius: 10, border: "none", cursor: cardIndex === 0 ? "not-allowed" : "pointer", background: "var(--panel)", color: cardIndex === 0 ? "var(--border)" : "var(--text)", fontWeight: 600, fontSize: 14 }}>← 上一個</button>
                  {cardWord && (
                    <button onClick={() => toggleBookmark(cardWord.word)}
                      style={{ padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: bookmarkedWords.has(cardWord.word) ? "#78350f" : "var(--panel)", color: "#f59e0b", fontSize: 14 }}>⭐</button>
                  )}
                  {cardWord && (
                    <button onClick={() => toggleLearned(cardWord.word)}
                      style={{ padding: "10px 16px", borderRadius: 10, border: "none", cursor: "pointer", background: learnedWords.has(cardWord.word) ? "#0f2e1c" : "var(--panel)", color: "#4ade80", fontSize: 14 }}>✅</button>
                  )}
                  <button onClick={() => { if (cardIndex < displayWords.length - 1) { setCardIndex((i) => i + 1); setFlipped(false); } }} disabled={cardIndex >= displayWords.length - 1}
                    style={{ padding: "10px 20px", borderRadius: 10, border: "none", cursor: cardIndex >= displayWords.length - 1 ? "not-allowed" : "pointer", background: cardIndex >= displayWords.length - 1 ? "var(--panel)" : "var(--accent-active)", color: cardIndex >= displayWords.length - 1 ? "var(--border)" : "#fff", fontWeight: 600, fontSize: 14 }}>下一個 →</button>
                </div>
              </>
            )}
          </div>
        )}

        {/* === QUIZ MODE === */}
        {mode === "quiz" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
            {displayWords.length < 4 ? (
              <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 40 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>✏️</div>
                <div>測驗需要至少 4 個單字</div>
              </div>
            ) : quizFinished ? (
              <div style={{ textAlign: "center", background: "var(--panel)", borderRadius: 20, padding: 40, maxWidth: 400, width: "100%" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>
                  {quizScore >= totalQuizQuestions * 0.8 ? "🎉" : quizScore >= totalQuizQuestions * 0.5 ? "👍" : "💪"}
                </div>
                <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>測驗完成！</div>
                <div style={{ fontSize: 40, fontWeight: 800, color: "#4ade80", marginBottom: 8 }}>{quizScore} / {totalQuizQuestions}</div>
                <div style={{ fontSize: 14, color: "var(--text-faint)", marginBottom: 24 }}>
                  {quizScore >= totalQuizQuestions * 0.8 ? "¡Excelente! 非常出色！" : quizScore >= totalQuizQuestions * 0.5 ? "¡Bien! 不錯，繼續練習！" : "¡Sigue! 繼續努力！"}
                </div>
                <button onClick={() => resetQuiz()}
                  style={{ padding: "12px 28px", borderRadius: 12, border: "none", cursor: "pointer", background: activeLevel === "A1" ? "linear-gradient(135deg,#7c1d1d,#dc2626)" : "linear-gradient(135deg,#4c1d95,#9333ea)", color: "#fff", fontWeight: 700, fontSize: 15 }}>
                  再試一次
                </button>
              </div>
            ) : quizWord && quizOptions.length > 0 ? (
              <>
                <div style={{ width: "100%", maxWidth: 480 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13, color: "var(--text-faint)" }}>
                    <span>題目 {quizIndex + 1} / {totalQuizQuestions}</span>
                    <span style={{ color: "#4ade80" }}>分數: {quizScore}</span>
                  </div>
                  <div style={{ height: 4, background: "var(--panel)", borderRadius: 4 }}>
                    <div style={{ height: "100%", background: activeLevel === "A1" ? "linear-gradient(90deg,#7c1d1d,#dc2626)" : "linear-gradient(90deg,#4c1d95,#9333ea)", borderRadius: 4, width: `${(quizIndex / totalQuizQuestions) * 100}%`, transition: "width 0.3s" }} />
                  </div>
                </div>

                <div style={{ width: "100%", maxWidth: 480, background: "var(--accent-hover)", border: "2px solid var(--accent-active)", borderRadius: 20, padding: 28, textAlign: "center" }}>
                  <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 8 }}>以下哪個西班牙語單字的意思是⋯⋯</div>
                  <div style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}>{quizWord.cn}</div>
                  <div style={{ fontSize: 13, color: "var(--text-faint)", marginTop: 6 }}>{quizWord.pos}{quizWord.gender ? ` · ${quizWord.gender === "m" ? "陽性" : "陰性"}` : ""}</div>
                </div>

                <div style={{ width: "100%", maxWidth: 480, display: "flex", flexDirection: "column", gap: 10 }}>
                  {quizOptions.map((option) => {
                    const isCorrect = option.word === quizWord.word;
                    const isSelected = quizSelected === option.word;
                    let bg = "var(--panel)", border = "var(--border)", color = "var(--text)";
                    if (quizSelected !== null) {
                      if (isCorrect) { bg = "#0f2e1c"; border = "#16a34a"; color = "#4ade80"; }
                      else if (isSelected) { bg = "#2d1515"; border = "#dc2626"; color = "#f87171"; }
                    }
                    return (
                      <button key={option.word} onClick={() => handleQuizAnswer(option)}
                        style={{ padding: "14px 18px", borderRadius: 12, border: `2px solid ${border}`, cursor: quizSelected !== null ? "default" : "pointer", background: bg, color, fontWeight: 600, fontSize: 16, textAlign: "left", transition: "all 0.2s", display: "flex", alignItems: "center", gap: 10 }}>
                        {quizSelected !== null && isCorrect && <span>✅</span>}
                        {quizSelected !== null && isSelected && !isCorrect && <span>❌</span>}
                        <span>{option.word}</span>
                        {option.gender && <GenderBadge gender={option.gender} />}
                        {quizSelected !== null && isCorrect && (
                          <span style={{ fontSize: 13, color: "var(--text-faint)", marginLeft: "auto" }}>{option.cn}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
