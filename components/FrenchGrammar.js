import { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";

function speak(text, rate = 0.85) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR"; u.rate = rate;
  window.speechSynthesis.speak(u);
}

const LESSONS = [
  {
    id: "pronouns",
    title: "人稱代詞",
    icon: "👤",
    color: "#6366f1",
    rule: "法語有 8 個人稱代詞，分單複數——比英語多了「陰陽性複數」之分（ils 男生/混合，elles 全女生）。",
    table: [
      ["代詞", "意思", "說明"],
      ["je", "我", "第一人稱單數"],
      ["tu", "你（非正式）", "用於朋友、家人、同齡人"],
      ["il", "他", "男性第三人稱"],
      ["elle", "她", "女性第三人稱"],
      ["nous", "我們", "第一人稱複數"],
      ["vous", "你們 / 您", "複數或正式敬語（非常重要！）"],
      ["ils", "他們（男或混合）", "男性或男女混合複數"],
      ["elles", "她們（全女）", "純女性複數"],
    ],
    examples: [
      { fr: "Je parle français.", zh: "我說法語。" },
      { fr: "Tu es étudiant ?", zh: "你是學生嗎？" },
      { fr: "Il s'appelle Paul.", zh: "他叫 Paul。" },
      { fr: "Vous êtes professeur ?", zh: "您是老師嗎？" },
      { fr: "Ils sont français.", zh: "他們是法國人。" },
    ],
    quiz: [
      { q: "法語「我」是哪個代詞？", opts: ["tu", "il", "je", "nous"], ans: 2, exp: "je = 我，是第一人稱單數。在法語中 j 在母音前縮寫為 j'：j'aime（我喜歡）。" },
      { q: "「vous」有哪些意思？", opts: ["只有「你們」", "只有「您（正式）」", "「你們」和「您（正式）」都可以", "「他們」"], ans: 2, exp: "vous 很特別：可以表示複數「你們」，也可以對單人使用表示尊重（如對長輩、陌生人）。" },
      { q: "一群男生（或男女混合），用哪個代詞？", opts: ["elles", "nous", "vous", "ils"], ans: 3, exp: "ils 用於男性複數，或男女混合群體。只有全部是女性才用 elles。" },
      { q: "「elle」是什麼意思？", opts: ["他", "我", "她", "你"], ans: 2, exp: "elle = 她，是女性第三人稱單數。" },
      { q: "「tu」用於哪種場合？", opts: ["向老闆說話", "向陌生成年人說話", "向好友或家人說話", "正式會議"], ans: 2, exp: "tu 用於非正式場合：朋友、家人、同齡人。對不熟的大人或正式場合要用 vous。" },
    ],
  },
  {
    id: "etre",
    title: "être 動詞：我是/你是",
    icon: "🔤",
    color: "#8b5cf6",
    rule: "être 是法語最重要的動詞，意思是「是」。它高度不規則，必須死記每個人稱的形式——但這 6 個形式會讓你說出 80% 的自我介紹！",
    table: [
      ["主語", "être", "念法"],
      ["je", "suis", "sü-i（縫合的縫）"],
      ["tu", "es", "e（短促）"],
      ["il / elle", "est", "e（t 不念）"],
      ["nous", "sommes", "sɔm"],
      ["vous", "êtes", "εt"],
      ["ils / elles", "sont", "sɔ̃（鼻音）"],
    ],
    examples: [
      { fr: "Je suis étudiant.", zh: "我是學生。（男）" },
      { fr: "Elle est française.", zh: "她是法國人。" },
      { fr: "Nous sommes amis.", zh: "我們是朋友。" },
      { fr: "Vous êtes professeur ?", zh: "您是老師嗎？" },
      { fr: "Ils sont fatigués.", zh: "他們很累。" },
    ],
    quiz: [
      { q: "être 的「je」形式是？", opts: ["es", "est", "suis", "sommes"], ans: 2, exp: "je suis = 我是。suis 看起來不像 être，但這就是法語——必須整個記下來！" },
      { q: "「Il est médecin」的意思是？", opts: ["他們是醫生", "她是醫生", "他是醫生", "你是醫生"], ans: 2, exp: "il est = 他是；médecin = 醫生。注意 est 中的 t 不發音。" },
      { q: "être 的「nous」形式是？", opts: ["êtes", "sont", "est", "sommes"], ans: 3, exp: "nous sommes = 我們是。sommes 念作 sɔm，s 結尾不念。" },
      { q: "「Vous êtes」可以表達哪個意思？", opts: ["我是", "他們是", "你是/您是/你們是", "我們是"], ans: 2, exp: "vous 可以是「你們」（複數），也可以是「您」（敬稱），所以 vous êtes 有多種情境。" },
      { q: "être 的「ils」形式是？", opts: ["êtes", "sommes", "est", "sont"], ans: 3, exp: "ils sont = 他們是。sont 念作 sɔ̃，是鼻音，t 不發音。" },
    ],
  },
  {
    id: "articles",
    title: "名詞陰陽性與冠詞",
    icon: "🏷️",
    color: "#10b981",
    rule: "法語所有名詞都有「性別」——陽性（m）或陰性（f），這不是指實際性別，只是語法分類。冠詞會隨名詞性別改變。",
    table: [
      ["", "不定冠詞（一個⋯）", "定冠詞（那個⋯）"],
      ["陽性（m.）", "un", "le"],
      ["陰性（f.）", "une", "la"],
      ["複數", "des", "les"],
      ["母音開頭", "un / une", "l'（縮寫）"],
    ],
    examples: [
      { fr: "un chat / une chatte", zh: "一隻公貓 / 一隻母貓（陰陽性不同形）" },
      { fr: "le livre", zh: "那本書（陽性，le + livre）" },
      { fr: "la maison", zh: "那棟房子（陰性，la + maison）" },
      { fr: "les enfants", zh: "孩子們（複數，les + enfants）" },
      { fr: "l'ami / l'amie", zh: "那個朋友（母音開頭縮寫 l'）" },
    ],
    quiz: [
      { q: "「chat（貓）」是陽性名詞，不定冠詞應用？", opts: ["la", "le", "une", "un"], ans: 3, exp: "陽性名詞的不定冠詞是 un。un chat = 一隻貓（陽性）。" },
      { q: "「femme（女人）」是陰性名詞，不定冠詞應用？", opts: ["le", "un", "une", "des"], ans: 2, exp: "陰性名詞的不定冠詞是 une。une femme = 一個女人。" },
      { q: "陽性定冠詞是？", opts: ["la", "les", "un", "le"], ans: 3, exp: "陽性定冠詞是 le，如 le livre（那本書）。在母音開頭的名詞前縮寫為 l'。" },
      { q: "「les」用在哪種情況？", opts: ["陽性單數", "陰性單數", "複數（不分陰陽）", "疑問句"], ans: 2, exp: "les 是複數定冠詞，陰性陽性都用，如 les enfants（孩子們）。" },
      { q: "「la voiture」的意思是？", opts: ["一輛車", "那輛車（陽性）", "那輛車（陰性）", "一輛陽性車"], ans: 2, exp: "la 是陰性定冠詞；voiture（車）是陰性名詞，所以 la voiture = 那輛車。" },
    ],
  },
];

function LessonQuiz({ lesson, onPass, saved }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);

  function handleSelect(idx) {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === lesson.quiz[step].ans) setScore(s => s + 1);
  }

  function next() {
    const isLast = step + 1 >= lesson.quiz.length;
    if (isLast) {
      setDone(true);
    } else {
      setStep(s => s + 1);
      setSelected(null);
    }
  }

  function reset() {
    setStep(0); setSelected(null); setScore(0); setDone(false);
  }

  if (done) {
    const passed = score >= 4;
    return (
      <div style={{ textAlign: "center", padding: "20px", borderRadius: 14,
        background: passed ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.06)",
        border: `1px solid ${passed ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.2)"}` }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>{passed ? "🎉" : "💪"}</div>
        <div style={{ fontWeight: 800, fontSize: 16, color: passed ? "#10b981" : "#ef4444", marginBottom: 4 }}>{score} / {lesson.quiz.length}</div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 14 }}>{passed ? "太棒了！這一課你已掌握！" : "再複習一下，你很快就會了！"}</div>
        {!passed && <button onClick={reset} style={{ padding: "10px 24px", borderRadius: 12, border: "none", background: "rgba(99,102,241,0.15)", color: "#6366f1", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>重新練習</button>}
        {passed && !saved && <button onClick={onPass} style={{ padding: "11px 28px", borderRadius: 12, border: "none", background: `linear-gradient(135deg,${lesson.color},${lesson.color}cc)`, color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14 }}>✓ 標記完成</button>}
        {passed && saved && <div style={{ fontWeight: 700, color: "#10b981", fontSize: 14 }}>✅ 已完成</div>}
      </div>
    );
  }

  const q = lesson.quiz[step];
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5 }}>小測驗</span>
        <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{step + 1} / {lesson.quiz.length}</span>
      </div>
      <div style={{ height: 4, background: "var(--border)", borderRadius: 99, marginBottom: 14 }}>
        <div style={{ height: "100%", borderRadius: 99, background: lesson.color, width: `${(step / lesson.quiz.length) * 100}%`, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 12, lineHeight: 1.5 }}>{q.q}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {q.opts.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === q.ans;
          const show = selected !== null;
          let bg = "var(--panel-alt)", border = "var(--border)", color = "var(--text)";
          if (show && isCorrect) { bg = "rgba(16,185,129,0.12)"; border = "#10b981"; color = "#10b981"; }
          else if (show && isSelected) { bg = "rgba(239,68,68,0.09)"; border = "#ef4444"; color = "#ef4444"; }
          return (
            <button key={i} onClick={() => handleSelect(i)} disabled={!!selected}
              style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${border}`, background: bg, color, textAlign: "left", cursor: selected ? "default" : "pointer", fontSize: 14, fontWeight: (show && (isCorrect || isSelected)) ? 700 : 400, transition: "all 0.15s" }}>
              {show && isCorrect && "✓ "}{show && isSelected && !isCorrect && "✗ "}{opt}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <>
          {selected !== q.ans && (
            <div style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 13, color: "#f59e0b", marginBottom: 10, lineHeight: 1.7 }}>
              💡 {q.exp}
            </div>
          )}
          <button onClick={next}
            style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "none",
              background: selected === q.ans ? "linear-gradient(135deg,#10b981,#059669)" : `linear-gradient(135deg,${lesson.color},${lesson.color}cc)`,
              color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {step + 1 >= lesson.quiz.length ? "查看結果" : "下一題 →"}
          </button>
        </>
      )}
    </div>
  );
}

export default function FrenchGrammar({ user, db, onNav }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showQuiz, setShowQuiz] = useState({});
  const [saved, setSaved] = useState({});

  useEffect(() => {
    if (!user?.uid) return;
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if (snap.exists()) {
        const p = snap.data().frenchProgress || {};
        setSaved({
          pronouns: !!p.grammar_pronouns,
          etre: !!p.grammar_etre,
          articles: !!p.grammar_articles,
        });
      }
    }).catch(() => {});
  }, [user, db]);

  async function markLessonDone(lessonId) {
    setSaved(s => ({ ...s, [lessonId]: true }));
    if (!user?.uid) return;
    try { await updateDoc(doc(db, "users", user.uid), { [`frenchProgress.grammar_${lessonId}`]: true }); } catch {}
  }

  const lesson = LESSONS[activeIdx];

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>
      <style>{`
        .fg-tabs::-webkit-scrollbar { height: 4px; }
        .fg-tabs::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
        .fg-body::-webkit-scrollbar { width: 6px; }
        .fg-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
      `}</style>

      {/* Header bar */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => onNav ? onNav('home') : null}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 16, color: "var(--text-faint)" }}>←</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>基礎文法</span>
          </button>
          <span style={{ fontSize: 11, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 9px", color: "var(--text-muted)", fontWeight: 600, flexShrink: 0 }}>{LESSONS.length} 課</span>
        </div>
      </div>

      {/* Lesson tabs — horizontally scrollable */}
      <div className="fg-tabs" style={{ display: "flex", gap: 6, padding: "10px 20px", background: "var(--panel-alt)", borderBottom: "1px solid var(--border)", overflowX: "auto", flexShrink: 0 }}>
        {LESSONS.map((l, i) => (
          <button key={l.id} onClick={() => { setActiveIdx(i); setShowQuiz(s => ({ ...s, [l.id]: false })); }}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 20,
              border: `1px solid ${i === activeIdx ? l.color : "var(--border)"}`,
              background: i === activeIdx ? l.color + "18" : "var(--panel)",
              color: i === activeIdx ? l.color : "var(--text-muted)",
              cursor: "pointer", fontSize: 13, fontWeight: i === activeIdx ? 700 : 400,
              whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s" }}>
            <span>{l.icon}</span>
            <span>{l.title}</span>
            {saved[l.id] && <span style={{ fontSize: 11 }}>✅</span>}
          </button>
        ))}
      </div>

      {/* Content area — scrollable */}
      <div className="fg-body" style={{ flex: 1, overflowY: "auto", padding: "0 28px 40px" }}>

        {/* Lesson header */}
        <div style={{ padding: "20px 0 16px", borderBottom: `1px solid ${lesson.color}25`, marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 28 }}>{lesson.icon}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>{lesson.title}</div>
              <div style={{ fontSize: 12, color: lesson.color, fontWeight: 700, marginTop: 3 }}>
                {saved[lesson.id] ? "✅ 已完成" : `第 ${activeIdx + 1} 課 / 共 ${LESSONS.length} 課`}
              </div>
            </div>
            {saved[lesson.id] && (
              <span style={{ fontSize: 11, padding: "3px 10px", background: "rgba(16,185,129,0.1)", color: "#10b981", borderRadius: 20, fontWeight: 700, border: "1px solid rgba(16,185,129,0.25)" }}>已完成</span>
            )}
          </div>
          <div style={{ height: 4, background: "var(--border)", borderRadius: 99, marginTop: 14 }}>
            <div style={{ height: "100%", borderRadius: 99, background: lesson.color, width: `${((activeIdx + 1) / LESSONS.length) * 100}%`, transition: "width 0.4s" }} />
          </div>
        </div>

        {/* Core rule */}
        <div style={{ padding: "14px 18px", borderRadius: 14, background: lesson.color + "0d", border: `1px solid ${lesson.color}30`, marginBottom: 22, fontSize: 14, color: "var(--text)", lineHeight: 1.8 }}>
          <span style={{ fontWeight: 800, color: lesson.color }}>核心規則：</span>{lesson.rule}
        </div>

        {/* Table */}
        <div style={{ marginBottom: 22, borderRadius: 14, border: "1px solid var(--border)", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {lesson.table[0].map((h, j) => (
                  <th key={j} style={{ padding: "10px 16px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, background: "var(--panel-alt)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {lesson.table.slice(1).map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? "var(--panel)" : "var(--panel-alt)" }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: "10px 16px", fontSize: 14, borderBottom: "1px solid var(--border)",
                      fontWeight: ci === 0 ? 700 : 400,
                      color: ci === 0 ? "#a78bfa" : "var(--text)", whiteSpace: ci === 0 ? "nowrap" : "normal" }}>
                      {ci === 0 ? (
                        <button onClick={() => speak(cell)} style={{ background: "none", border: "none", cursor: "pointer", color: "#a78bfa", fontWeight: 700, fontSize: 14, padding: 0, fontFamily: "inherit", display: "flex", alignItems: "center", gap: 5 }}>
                          {cell} <span style={{ fontSize: 12, color: "var(--text-faint)" }}>🔊</span>
                        </button>
                      ) : cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Examples */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 12 }}>例句</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {lesson.examples.map((ex, i) => (
              <div key={i} style={{ display: "flex", gap: 12, padding: "12px 16px", background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", alignItems: "flex-start" }}>
                <button onClick={() => speak(ex.fr)} style={{ background: "none", border: "none", cursor: "pointer", color: "#a78bfa", fontSize: 18, padding: 0, flexShrink: 0, lineHeight: 1, marginTop: 2 }}>🔊</button>
                <div>
                  <div style={{ fontSize: 15, fontStyle: "italic", color: "#c4b5fd", lineHeight: 1.6, marginBottom: 4 }}>{ex.fr}</div>
                  <div style={{ fontSize: 13, color: "var(--text-muted)" }}>{ex.zh}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quiz toggle */}
        {!showQuiz[lesson.id] && (
          <button onClick={() => setShowQuiz(s => ({ ...s, [lesson.id]: true }))}
            style={{ width: "100%", padding: "14px 0", borderRadius: 14, border: `1px solid ${lesson.color}50`,
              background: lesson.color + "10", color: lesson.color, cursor: "pointer", fontWeight: 800, fontSize: 14 }}>
            ✏️ 開始練習（5 題）
          </button>
        )}
        {showQuiz[lesson.id] && (
          <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px" }}>
            <LessonQuiz lesson={lesson} saved={!!saved[lesson.id]} onPass={() => markLessonDone(lesson.id)} />
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10, marginTop: 24 }}>
          <button onClick={() => activeIdx > 0 ? setActiveIdx(i => i - 1) : (onNav ? onNav('a1') : null)}
            style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            ← {activeIdx > 0 ? "上一課：" + LESSONS[activeIdx - 1].title : "上一頁：打招呼"}
          </button>
          {activeIdx < LESSONS.length - 1 && (
            <button onClick={() => setActiveIdx(i => i + 1)}
              style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: `1px solid ${LESSONS[activeIdx + 1].color}50`,
                background: LESSONS[activeIdx + 1].color + "10", color: LESSONS[activeIdx + 1].color, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              下一課：{LESSONS[activeIdx + 1].title} →
            </button>
          )}
          {activeIdx === LESSONS.length - 1 && (
            <button onClick={() => onNav ? onNav('home') : null}
              style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.08)", color: "#10b981", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              ✅ 返回法語首頁
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
