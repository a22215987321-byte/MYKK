import { useState, useEffect, useMemo } from "react";
import { FRENCH_A1_WORDS, FRENCH_A1_CATEGORIES, PART_OF_SPEECH_LABELS } from "../lib/frenchA1Vocab";

const COMPLETED_KEY = "fr-vocab-completed-v1";
const FAVORITE_KEY = "fr-vocab-fav-v1";

const GENDER_COLOR = { m: "#60a5fa", f: "#f87171" };
const POS_COLOR = "#6366f1";
const LEVEL_COLOR = "#10b981";

const POS_FILTERS = [
  { id: "all", label: "全部" },
  { id: "noun", label: "名詞" },
  { id: "verb", label: "動詞" },
  { id: "adjective", label: "形容詞" },
  { id: "adverb", label: "副詞" },
  { id: "preposition", label: "介詞" },
  { id: "question-word", label: "疑問詞" },
  { id: "favorite", label: "已收藏" },
  { id: "unlearned", label: "尚未學習" },
  { id: "learned", label: "已學會" },
];

const SORT_OPTIONS = [
  { id: "recommended", label: "A1 推薦順序" },
  { id: "frequency", label: "最常用" },
  { id: "alpha", label: "字母順序" },
  { id: "unlearnedFirst", label: "尚未學習優先" },
];

function loadIdSet(key) {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch (_) { return new Set(); }
}
function saveIdSet(key, set) {
  try { if (typeof window !== "undefined") window.localStorage.setItem(key, JSON.stringify([...set])); } catch (_) {}
}
function shuffle(arr) { return [...arr].sort(() => Math.random() - 0.5); }

// ──────────────────────────────────────────────────────────────────────────
// Small shared UI bits
// ──────────────────────────────────────────────────────────────────────────

function ProgressBar({ pct, color = "#6366f1", height = 6 }) {
  return (
    <div style={{ height, borderRadius: 99, background: "var(--panel-alt)", overflow: "hidden" }}>
      <div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: color, transition: "width .3s" }} />
    </div>
  );
}

function GenderBadge({ gender }) {
  if (!gender) return null;
  const color = GENDER_COLOR[gender] || "var(--text-faint)";
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "1px 6px", borderRadius: 5, background: color + "22", color }}>
      {gender === "m" ? "陽性" : "陰性"}
    </span>
  );
}

function PosBadge({ pos }) {
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 6, background: POS_COLOR + "18", color: POS_COLOR }}>
      {PART_OF_SPEECH_LABELS[pos] || pos}
    </span>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Word card
// ──────────────────────────────────────────────────────────────────────────

const PERSON_LABELS = { je: "je", tu: "tu", ilElleOn: "il / elle / on", nous: "nous", vous: "vous", ilsElles: "ils / elles" };

function ConjugationTable({ conjugation }) {
  if (!conjugation) return null;
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>現在式變化</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {Object.keys(PERSON_LABELS).map(key => (
          <div key={key} style={{ display: "flex", justifyContent: "space-between", gap: 8, padding: "5px 9px", background: "var(--panel-alt)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{PERSON_LABELS[key]}</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{conjugation[key]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NounForms({ forms }) {
  if (!forms) return null;
  const rows = [
    ["不定冠詞單數", forms.indefiniteSingular],
    ["定冠詞單數", forms.definiteSingular],
    ["不定冠詞複數", forms.indefinitePlural],
    ["定冠詞複數", forms.definitePlural],
  ].filter(([, v]) => v);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>單複數與冠詞</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {rows.map(([label, val]) => (
          <div key={label} style={{ padding: "5px 10px", background: "var(--panel-alt)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AdjectiveForms({ forms }) {
  if (!forms) return null;
  const rows = [["陽性單數", forms.ms], ["陰性單數", forms.fs], ["陽性複數", forms.mp], ["陰性複數", forms.fp]].filter(([, v]) => v);
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>陰陽性變化</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {rows.map(([label, val]) => (
          <div key={label} style={{ padding: "5px 10px", background: "var(--panel-alt)", borderRadius: 8, border: "1px solid var(--border)" }}>
            <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WordCard({ word, categoryColor, completed, favorite, onToggleComplete, onToggleFavorite }) {
  const [open, setOpen] = useState(false);
  const color = categoryColor || POS_COLOR;
  const firstExample = word.examples?.[0];

  return (
    <div style={{ background: "var(--panel)", borderRadius: 14, border: `1px solid ${open ? color + "55" : "var(--border)"}`, overflow: "hidden", boxShadow: open ? `0 0 0 2px ${color}22` : "none", transition: "all .15s" }}>
      <div onClick={() => setOpen(o => !o)} style={{ padding: "12px 14px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            {completed && <span style={{ fontSize: 12, color: "#10b981", fontWeight: 700 }}>✓</span>}
            <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>{word.displayWord || word.word}</span>
            <PosBadge pos={word.partOfSpeech} />
            <GenderBadge gender={word.gender} />
          </div>
          <button onClick={e => { e.stopPropagation(); onToggleFavorite(word.id); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 17, color: favorite ? "#f59e0b" : "var(--text-faint)", padding: 2 }}>
            {favorite ? "★" : "☆"}
          </button>
        </div>
        <div style={{ fontSize: 14, color: "var(--text-muted)" }}>{word.meanings.join("、")}</div>
        {firstExample && !open && (
          <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.5 }}>
            {firstExample.french} — {firstExample.chinese}
          </div>
        )}
        {!open && (
          <div style={{ fontSize: 12, color, fontWeight: 600, marginTop: 2 }}>查看完整用法 ▾</div>
        )}
      </div>

      {open && (
        <div style={{ padding: "0 14px 14px", borderTop: "1px solid var(--border)" }}>
          {word.usageSummary && (
            <div style={{ marginTop: 10, marginBottom: 10, fontSize: 13, color: "var(--text)", lineHeight: 1.7 }}>{word.usageSummary}</div>
          )}

          {word.patterns?.length > 0 && (
            <div style={{ marginBottom: 10, padding: "8px 10px", background: color + "0c", borderRadius: 9, border: `1px solid ${color}22` }}>
              <div style={{ fontSize: 10, fontWeight: 700, color, marginBottom: 3, textTransform: "uppercase" }}>基本句型</div>
              {word.patterns.map((p, i) => <div key={i} style={{ fontSize: 13, color: "var(--text)" }}>{p}</div>)}
            </div>
          )}

          <ConjugationTable conjugation={word.conjugation} />
          <NounForms forms={word.partOfSpeech === "noun" ? word.forms : null} />
          <AdjectiveForms forms={word.partOfSpeech === "adjective" ? word.forms : null} />

          {word.examples?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>例句</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {word.examples.map((ex, i) => (
                  <div key={i} style={{ padding: "8px 10px", background: "var(--panel-alt)", borderRadius: 9, border: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{ex.french}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{ex.chinese}</div>
                    {ex.note && <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>💡 {ex.note}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {word.usageTip && (
            <div style={{ marginBottom: 10, padding: "8px 10px", background: "rgba(245,158,11,0.08)", borderRadius: 9, border: "1px solid rgba(245,158,11,0.2)" }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#d97706", marginBottom: 2, textTransform: "uppercase" }}>使用提醒</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{word.usageTip}</div>
            </div>
          )}

          {word.collocations?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>常見搭配</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {word.collocations.map((c, i) => (
                  <div key={i} style={{ padding: "4px 9px", background: "var(--panel-alt)", borderRadius: 8, border: "1px solid var(--border)", fontSize: 12 }}>
                    <b style={{ color: "var(--text)" }}>{c.french}</b> <span style={{ color: "var(--text-muted)" }}>{c.chinese}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {word.commonMistakes?.length > 0 && (
            <div style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#ef4444", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}>容易混淆／常見錯誤</div>
              {word.commonMistakes.map((m, i) => (
                <div key={i} style={{ padding: "8px 10px", background: "rgba(239,68,68,0.07)", borderRadius: 9, border: "1px solid rgba(239,68,68,0.2)", marginBottom: 5, fontSize: 12, lineHeight: 1.6 }}>
                  <span style={{ color: "#ef4444" }}>✗ {m.wrong}</span><br />
                  <span style={{ color: "#10b981" }}>✓ {m.correct}</span><br />
                  <span style={{ color: "var(--text-muted)" }}>{m.explanation}</span>
                </div>
              ))}
            </div>
          )}

          {word.relatedWords?.length > 0 && (
            <div style={{ marginBottom: 10, fontSize: 12, color: "var(--text-faint)" }}>
              相關單詞：{word.relatedWords.join("、")}
            </div>
          )}

          <button onClick={e => { e.stopPropagation(); onToggleComplete(word.id); }}
            style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "none", marginTop: 4,
              background: completed ? "#10b98118" : `linear-gradient(135deg,${color}cc,${color})`,
              color: completed ? "#10b981" : "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {completed ? "✓ 已學會" : "標記已學會"}
          </button>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Quiz
// ──────────────────────────────────────────────────────────────────────────

function buildFillBlank(word) {
  const ex = word.examples?.find(e => {
    const target = word.conjugation ? Object.values(word.conjugation) : [word.word];
    return target.some(t => new RegExp(`\\b${t}\\b`, "i").test(e.french));
  });
  if (!ex) return null;
  const target = word.conjugation
    ? Object.values(word.conjugation).find(t => new RegExp(`\\b${t}\\b`, "i").test(ex.french))
    : word.word;
  if (!target) return null;
  const blanked = ex.french.replace(new RegExp(`\\b${target}\\b`, "i"), "____");
  if (blanked === ex.french) return null;
  return { blanked, chinese: ex.chinese, answer: target };
}

function generateQuestions(pool, count) {
  const usable = pool.filter(w => w.meanings?.length && w.examples?.length);
  const picks = shuffle(usable).slice(0, Math.min(count, usable.length));
  const questions = [];
  picks.forEach(word => {
    const others = usable.filter(w => w.id !== word.id);
    const distractorWords = shuffle(others).slice(0, 3);
    const types = ["enZh", "zhEn", "exampleChoice"];
    if (word.partOfSpeech === "noun" && word.forms?.definiteSingular) types.push("article");
    const fillBlank = buildFillBlank(word);
    if (fillBlank) types.push("fillBlank");
    const type = types[Math.floor(Math.random() * types.length)];

    if (type === "enZh") {
      const opts = shuffle([{ id: word.id, label: word.meanings[0] }, ...distractorWords.map(d => ({ id: d.id, label: d.meanings[0] }))]);
      questions.push({ type, word, prompt: word.displayWord || word.word, opts, correctId: word.id,
        explanation: `「${word.displayWord || word.word}」的意思是「${word.meanings[0]}」。${word.usageTip || ""}` });
    } else if (type === "zhEn") {
      const opts = shuffle([{ id: word.id, label: word.displayWord || word.word }, ...distractorWords.map(d => ({ id: d.id, label: d.displayWord || d.word }))]);
      questions.push({ type, word, prompt: word.meanings[0], opts, correctId: word.id,
        explanation: `「${word.meanings[0]}」的法語是「${word.displayWord || word.word}」。${word.usageTip || ""}` });
    } else if (type === "exampleChoice") {
      const correctEx = word.examples[0];
      const distractorExamples = distractorWords.filter(d => d.examples?.length).map(d => ({ id: d.id, label: d.examples[0].french }));
      const opts = shuffle([{ id: word.id, label: correctEx.french }, ...distractorExamples]);
      questions.push({ type, word, prompt: `哪一句符合「${correctEx.chinese}」這個意思？`, opts, correctId: word.id,
        explanation: `正確答案是「${correctEx.french}」，意思是「${correctEx.chinese}」。` });
    } else if (type === "article") {
      const correct = word.forms.definiteSingular;
      const wrongArticle = word.gender === "m" ? correct.replace(/^le /, "la ").replace(/^l'/, "la ") : correct.replace(/^la /, "le ").replace(/^l'/, "le ");
      const otherNounForms = distractorWords.filter(d => d.forms?.definiteSingular).map(d => d.forms.definiteSingular);
      const opts = shuffle([correct, wrongArticle, ...otherNounForms].filter((v, i, a) => a.indexOf(v) === i).slice(0, 4).map(label => ({ id: label, label })));
      questions.push({ type, word, prompt: `「${word.word}」的正確冠詞形式是？`, opts, correctId: correct,
        explanation: `正確答案是「${correct}」，因為 ${word.word} 是${word.gender === "m" ? "陽性" : "陰性"}名詞。` });
    } else if (type === "fillBlank") {
      const distractorFills = distractorWords.slice(0, 3).map(d => ({ id: d.id, label: word.conjugation ? (d.conjugation ? Object.values(d.conjugation)[0] : d.word) : d.word }));
      const opts = shuffle([{ id: word.id, label: fillBlank.answer }, ...distractorFills]);
      questions.push({ type, word, prompt: fillBlank.blanked, promptZh: fillBlank.chinese, opts, correctId: word.id,
        explanation: `正確答案是「${fillBlank.answer}」。完整句子：${fillBlank.blanked.replace("____", fillBlank.answer)} — ${fillBlank.chinese}` });
    }
  });
  return questions.filter(q => q.opts.length >= 2);
}

function QuizView({ pool, title, onExit }) {
  const TOTAL = 8;
  const [questions] = useState(() => generateQuestions(pool, TOTAL));
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState(null);
  const [showResult, setShowResult] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  if (!questions.length) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
        這個分類的單詞資料還不夠豐富，暫時無法出題，請先多學習幾個單詞。
        <button onClick={onExit} style={{ display: "block", margin: "12px auto 0", padding: "8px 16px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", cursor: "pointer" }}>返回</button>
      </div>
    );
  }

  if (done) {
    return (
      <div style={{ padding: 18, background: "#10b98110", borderRadius: 14, border: "1px solid #10b98130", textAlign: "center" }}>
        <div style={{ fontSize: 30, marginBottom: 6 }}>🎉</div>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#10b981" }}>小測驗完成！{score}/{questions.length} 正確</div>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 12 }}>
          <button onClick={() => { setQIdx(0); setSelected(null); setShowResult(false); setScore(0); setDone(false); }}
            style={{ padding: "8px 18px", borderRadius: 10, border: "none", background: "#10b981", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            再試一次
          </button>
          <button onClick={onExit}
            style={{ padding: "8px 18px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            返回單詞列表
          </button>
        </div>
      </div>
    );
  }

  const q = questions[qIdx];

  function checkAnswer(optId) {
    if (showResult) return;
    setSelected(optId);
    setShowResult(true);
    if (optId === q.correctId) setScore(s => s + 1);
  }
  function next() {
    if (qIdx + 1 >= questions.length) setDone(true);
    else { setQIdx(i => i + 1); setSelected(null); setShowResult(false); }
  }

  return (
    <div style={{ padding: 16, background: "var(--panel)", borderRadius: 14, border: "1px solid var(--border)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>🧠 {title} 小測驗 {qIdx + 1}/{questions.length}</div>
        <div style={{ fontSize: 11, color: "#10b981", fontWeight: 700 }}>得分：{score}</div>
      </div>
      <div style={{ marginBottom: 12, fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{q.prompt}</div>
      {q.promptZh && <div style={{ marginBottom: 10, fontSize: 12, color: "var(--text-muted)" }}>{q.promptZh}</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
        {q.opts.map(opt => {
          const isCorrect = opt.id === q.correctId;
          const isSelected = opt.id === selected;
          let bg = "var(--panel-alt)", border = "var(--border)", col = "var(--text)";
          if (showResult) {
            if (isCorrect) { bg = "#10b98115"; border = "#10b981"; col = "#10b981"; }
            else if (isSelected) { bg = "#ef444415"; border = "#ef4444"; col = "#ef4444"; }
          } else if (isSelected) { bg = "#6366f115"; border = "#6366f1"; col = "#6366f1"; }
          return (
            <button key={String(opt.id)} onClick={() => checkAnswer(opt.id)}
              style={{ padding: "10px 12px", borderRadius: 10, border: `1px solid ${border}`, background: bg, color: col,
                cursor: showResult ? "default" : "pointer", fontSize: 13, fontWeight: 600, textAlign: "left" }}>
              {opt.label}
            </button>
          );
        })}
      </div>
      {showResult && (
        <div style={{ marginTop: 10, padding: "9px 12px", background: selected === q.correctId ? "#10b98110" : "#ef444410",
          borderRadius: 10, border: `1px solid ${selected === q.correctId ? "#10b98130" : "#ef444430"}` }}>
          <div style={{ fontSize: 12, color: selected === q.correctId ? "#10b981" : "#ef4444", fontWeight: 700, marginBottom: 4 }}>
            {selected === q.correctId ? "✓ 正確！" : "✗ 答錯了"}
          </div>
          <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>{q.explanation}</div>
        </div>
      )}
      {showResult && (
        <button onClick={next} style={{ marginTop: 10, width: "100%", padding: "10px 0", borderRadius: 10, border: "none",
          background: "#6366f1", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
          {qIdx + 1 >= questions.length ? "查看結果" : "下一題 →"}
        </button>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────
// Main page
// ──────────────────────────────────────────────────────────────────────────

export default function FrenchA1ExamScope() {
  const [completedIds, setCompletedIds] = useState(new Set());
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  useEffect(() => {
    setCompletedIds(loadIdSet(COMPLETED_KEY));
    setFavoriteIds(loadIdSet(FAVORITE_KEY));
  }, []);
  const [view, setView] = useState("home"); // home | category | daily
  const [activeCategory, setActiveCategory] = useState(null);
  const [search, setSearch] = useState("");
  const [posFilter, setPosFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recommended");
  const [showQuiz, setShowQuiz] = useState(false);

  function toggleComplete(id) {
    setCompletedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveIdSet(COMPLETED_KEY, next);
      return next;
    });
  }
  function toggleFavorite(id) {
    setFavoriteIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveIdSet(FAVORITE_KEY, next);
      return next;
    });
  }

  const totalWords = FRENCH_A1_WORDS.length;
  const totalDone = completedIds.size;
  const overallPct = totalWords > 0 ? Math.round((totalDone / totalWords) * 100) : 0;

  const wordsByCategory = useMemo(() => {
    const map = {};
    FRENCH_A1_CATEGORIES.forEach(c => { map[c.id] = []; });
    FRENCH_A1_WORDS.forEach(w => { if (map[w.category]) map[w.category].push(w); });
    return map;
  }, []);

  const dailyWords = useMemo(() => {
    const unlearned = FRENCH_A1_WORDS.filter(w => !completedIds.has(w.id));
    return [...unlearned].sort((a, b) => a.frequencyRank - b.frequencyRank).slice(0, 10);
  }, [completedIds]);

  function applySearchFilterSort(words) {
    let list = words;
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(w =>
        w.word.toLowerCase().includes(q) ||
        w.meanings.some(m => m.toLowerCase().includes(q)) ||
        w.examples?.some(e => e.french.toLowerCase().includes(q) || e.chinese.includes(q)) ||
        (FRENCH_A1_CATEGORIES.find(c => c.id === w.category)?.name || "").includes(q)
      );
    }
    if (posFilter === "favorite") list = list.filter(w => favoriteIds.has(w.id));
    else if (posFilter === "unlearned") list = list.filter(w => !completedIds.has(w.id));
    else if (posFilter === "learned") list = list.filter(w => completedIds.has(w.id));
    else if (posFilter !== "all") list = list.filter(w => w.partOfSpeech === posFilter);

    list = [...list];
    if (sortBy === "frequency" || sortBy === "recommended") list.sort((a, b) => a.frequencyRank - b.frequencyRank);
    else if (sortBy === "alpha") list.sort((a, b) => a.word.localeCompare(b.word));
    else if (sortBy === "unlearnedFirst") list.sort((a, b) => (completedIds.has(a.id) ? 1 : 0) - (completedIds.has(b.id) ? 1 : 0));
    return list;
  }

  const isSearchingOrFiltering = search.trim() !== "" || posFilter !== "all" || sortBy !== "recommended";
  const searchResults = isSearchingOrFiltering ? applySearchFilterSort(FRENCH_A1_WORDS) : [];

  const category = activeCategory ? FRENCH_A1_CATEGORIES.find(c => c.id === activeCategory) : null;
  const categoryWords = category ? applySearchFilterSort(wordsByCategory[category.id] || []) : [];
  const categoryAllWords = category ? wordsByCategory[category.id] || [] : [];
  const categoryDone = category ? categoryAllWords.filter(w => completedIds.has(w.id)).length : 0;

  function openCategory(id) {
    setActiveCategory(id); setView("category"); setShowQuiz(false); setSearch(""); setPosFilter("all"); setSortBy("recommended");
  }
  function goHome() {
    setView("home"); setActiveCategory(null); setShowQuiz(false); setSearch(""); setPosFilter("all"); setSortBy("recommended");
  }

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--bg)", color: "var(--text)" }}>
      <style>{`
        .fa1v-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; }
        @media (max-width: 900px) { .fa1v-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
        @media (max-width: 600px) { .fa1v-grid { grid-template-columns: 1fr; } }
      `}</style>

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "20px 16px 80px" }}>

        {/* Header */}
        {view !== "home" && (
          <button onClick={goHome} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: 0, fontSize: 13, marginBottom: 10 }}>
            ← 返回分類
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <span style={{ fontSize: 26 }}>📚</span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>法語 A1 常用單詞</h1>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>
          整理日常生活最常見的法語單詞，了解意思、用法和句子結構。
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-faint)", marginBottom: 5 }}>
          <span>已學習 {totalDone} / {totalWords} 個單詞</span>
          <span>{overallPct}%</span>
        </div>
        <ProgressBar pct={overallPct} />

        {/* Search + filter + sort */}
        <div style={{ marginTop: 16, marginBottom: 4 }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)", fontSize: 14 }}>🔍</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="搜尋法語單詞、中文意思、例句或分類..."
              style={{ width: "100%", padding: "10px 12px 10px 34px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontSize: 14, boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", padding: "10px 0 6px" }}>
          {POS_FILTERS.map(f => (
            <button key={f.id} onClick={() => setPosFilter(f.id)}
              style={{ padding: "6px 13px", borderRadius: 20, border: `1px solid ${posFilter === f.id ? "#6366f1" : "var(--border)"}`,
                background: posFilter === f.id ? "rgba(99,102,241,0.14)" : "var(--panel)", color: posFilter === f.id ? "#6366f1" : "var(--text-muted)",
                cursor: "pointer", fontSize: 12, fontWeight: posFilter === f.id ? 700 : 400, whiteSpace: "nowrap", flexShrink: 0 }}>
              {f.label}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: "var(--text-faint)" }}>排序：</span>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontSize: 12 }}>
            {SORT_OPTIONS.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
          </select>
        </div>

        {/* Search / filter results override normal views */}
        {isSearchingOrFiltering ? (
          <>
            <div style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 10 }}>找到 {searchResults.length} 個單詞</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {searchResults.map(w => (
                <WordCard key={w.id} word={w} categoryColor={FRENCH_A1_CATEGORIES.find(c => c.id === w.category)?.color}
                  completed={completedIds.has(w.id)} favorite={favoriteIds.has(w.id)}
                  onToggleComplete={toggleComplete} onToggleFavorite={toggleFavorite} />
              ))}
              {searchResults.length === 0 && (
                <div style={{ textAlign: "center", padding: 30, color: "var(--text-faint)", fontSize: 13 }}>沒有符合的單詞，換個關鍵字試試。</div>
              )}
            </div>
          </>
        ) : view === "home" ? (
          <>
            {/* Daily study CTA */}
            <div onClick={() => setView("daily")} style={{ cursor: "pointer", marginBottom: 18, padding: "14px 16px", borderRadius: 14,
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15 }}>📅 每日學習</div>
                <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>今天推薦 {dailyWords.length} 個尚未學習的單詞</div>
              </div>
              <span style={{ fontSize: 20 }}>→</span>
            </div>

            <div className="fa1v-grid">
              {FRENCH_A1_CATEGORIES.map(cat => {
                const words = wordsByCategory[cat.id] || [];
                const done = words.filter(w => completedIds.has(w.id)).length;
                const pct = words.length > 0 ? Math.round((done / words.length) * 100) : 0;
                return (
                  <div key={cat.id} onClick={() => words.length > 0 && openCategory(cat.id)}
                    style={{ padding: "16px", borderRadius: 16, background: "var(--panel)", border: "1px solid var(--border)",
                      cursor: words.length > 0 ? "pointer" : "default", opacity: words.length > 0 ? 1 : 0.55,
                      display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 22 }}>{cat.icon}</span>
                      <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{cat.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{words.length > 0 ? `${done} / ${words.length} 個單詞` : "即將推出"}</div>
                    {words.length > 0 && <ProgressBar pct={pct} color={cat.color} height={5} />}
                  </div>
                );
              })}
            </div>
          </>
        ) : view === "daily" ? (
          <>
            <div style={{ marginBottom: 12, fontSize: 14, fontWeight: 700, color: "var(--text)" }}>📅 今日推薦單詞（{dailyWords.length} 個）</div>
            {dailyWords.length === 0 ? (
              <div style={{ textAlign: "center", padding: 30, color: "var(--text-faint)", fontSize: 13 }}>🎉 目前已經學完全部單詞！</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {dailyWords.map(w => (
                  <WordCard key={w.id} word={w} categoryColor={FRENCH_A1_CATEGORIES.find(c => c.id === w.category)?.color}
                    completed={completedIds.has(w.id)} favorite={favoriteIds.has(w.id)}
                    onToggleComplete={toggleComplete} onToggleFavorite={toggleFavorite} />
                ))}
              </div>
            )}
          </>
        ) : (
          category && (
            <>
              <div style={{ marginBottom: 14, padding: "10px 14px", background: category.color + "0c", borderRadius: 12, border: `1px solid ${category.color}25`,
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: category.color }}>{category.icon} {category.name}</div>
                  <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{categoryAllWords.length} 個單詞 · {categoryDone} 已完成</div>
                </div>
                {categoryDone === categoryAllWords.length && categoryAllWords.length > 0 && <span style={{ fontSize: 20 }}>🎉</span>}
              </div>

              {!showQuiz ? (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                    {categoryWords.map(w => (
                      <WordCard key={w.id} word={w} categoryColor={category.color}
                        completed={completedIds.has(w.id)} favorite={favoriteIds.has(w.id)}
                        onToggleComplete={toggleComplete} onToggleFavorite={toggleFavorite} />
                    ))}
                  </div>
                  <button onClick={() => setShowQuiz(true)}
                    style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: "none",
                      background: `linear-gradient(135deg,${category.color}cc,${category.color})`, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
                    🧠 開始小測驗
                  </button>
                </>
              ) : (
                <>
                  <QuizView pool={categoryAllWords} title={category.name} onExit={() => setShowQuiz(false)} />
                  <button onClick={() => setShowQuiz(false)} style={{ marginTop: 10, width: "100%", padding: "10px 0", borderRadius: 12,
                    border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                    ← 返回單詞
                  </button>
                </>
              )}
            </>
          )
        )}
      </div>
    </div>
  );
}
