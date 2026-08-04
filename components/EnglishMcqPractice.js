import { useState, useEffect } from "react";

const ACCENT = "#0ea5e9";
const STORAGE_KEY = "en-mcq-best";

// 先做第一章讓使用者看效果——之後要加更多章節，把新章節物件加進這個陣列
// 就好，元件其餘部分（作答流程、計分、錯題檢討）完全不用動。
const CHAPTERS = [
  {
    id: "ch1",
    title: "第 1 章：社區回收計劃",
    level: "中階（約 IELTS 4.5-5.5）",
    passage: `Every Saturday morning, the residents of Green Valley gather at the community centre to sort recyclable waste. The programme began three years ago when a small group of neighbours noticed how much plastic and paper was simply thrown away without a second thought. What started as a modest effort with a handful of volunteers has since grown into one of the most successful recycling schemes in the region.

Today, the community collects over two tonnes of recyclable material each month. Local schools now bring students to observe the sorting process, and several nearby towns have asked for advice on setting up similar programmes of their own. Organisers say the key to their success was not complicated equipment, but consistency: showing up every single week, rain or shine, until the habit became part of daily life.

Despite this progress, challenges remain. Contamination — when non-recyclable items are mixed in with recyclables — still causes roughly fifteen percent of collected material to be rejected at the processing plant. Volunteers are now focusing on clearer labelling and short workshops to teach residents exactly what can and cannot be recycled.`,
    questions: [
      {
        id: "q1",
        text: "What does the word \"modest\" most likely mean in the first paragraph?",
        options: ["Expensive and complicated", "Small and not showy", "Extremely popular", "Poorly organised"],
        answerIndex: 1,
        explain: "「modest」在描述「一開始只有一小群志工的努力」時，指規模小、不張揚，而不是評價好壞或花費——這種在段落裡從前後文猜字義的題型，是選擇題常考的重點。",
      },
      {
        id: "q2",
        text: "According to the passage, why have other towns contacted the Green Valley organisers?",
        options: [
          "To complain about the noise on Saturdays",
          "To buy their recycling equipment",
          "To learn how to start a similar programme",
          "To recruit their volunteers",
        ],
        answerIndex: 2,
        explain: "第二段明確寫出「several nearby towns have asked for advice on setting up similar programmes」——這是「找出文中明確提到的細節」的題型，答案就在文字裡，不用推論太多。",
      },
      {
        id: "q3",
        text: "What do the organisers believe was the main reason for the programme's success?",
        options: ["Government funding", "Advanced sorting machines", "Consistency over time", "Media coverage"],
        answerIndex: 2,
        explain: "文中說「the key to their success was not complicated equipment, but consistency」——這裡故意用「not A but B」的句型，如果只看到 equipment 就選錯，要讀完整句才抓得到真正重點在 consistency。",
      },
      {
        id: "q4",
        text: "What percentage of collected material is currently rejected due to contamination?",
        options: ["About 5%", "About 15%", "About 30%", "About 50%"],
        answerIndex: 1,
        explain: "第三段直接寫「roughly fifteen percent of collected material to be rejected」——數字細節題，重點是要在文中準確定位到那句話，不要跟別的數字搞混。",
      },
      {
        id: "q5",
        text: "What are volunteers currently doing to address the contamination problem?",
        options: [
          "Buying new sorting equipment",
          "Reducing the number of collection days",
          "Providing clearer labelling and workshops",
          "Asking residents to stop recycling paper",
        ],
        answerIndex: 2,
        explain: "文末「focusing on clearer labelling and short workshops to teach residents」——這題考的是「文章最後提出的解決方案」，注意題目問的是現在正在做的事，不是過去已經做完的事。",
      },
      {
        id: "q6",
        text: "Which of the following best describes the overall tone of the passage?",
        options: [
          "Critical and discouraging",
          "Informative and cautiously positive",
          "Purely humorous",
          "Angry and accusatory",
        ],
        answerIndex: 1,
        explain: "全文先講成功的故事，最後一段又老實承認「還有挑戰」，屬於「有事實根據、整體正面但不誇張」的語氣——這種「整體語氣」題不是找單一句子，而是綜合全文的感覺來判斷。",
      },
    ],
  },
];

export default function EnglishMcqPractice({ onNav }) {
  const [chapterIdx] = useState(0);
  const [stage, setStage] = useState("intro"); // intro | quiz | result
  const [qIdx, setQIdx] = useState(0);
  const [answers, setAnswers] = useState({});
  const [bestScores, setBestScores] = useState({});

  const chapter = CHAPTERS[chapterIdx];
  const total = chapter.questions.length;

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) setBestScores(JSON.parse(s));
    } catch (_) {}
  }, []);

  function startQuiz() {
    setAnswers({});
    setQIdx(0);
    setStage("quiz");
  }

  function selectAnswer(optIdx) {
    setAnswers(prev => ({ ...prev, [chapter.questions[qIdx].id]: optIdx }));
  }

  function next() {
    if (qIdx + 1 >= total) {
      submit();
    } else {
      setQIdx(i => i + 1);
    }
  }

  function submit() {
    const score = chapter.questions.reduce((s, q) => s + (answers[q.id] === q.answerIndex ? 1 : 0), 0);
    setBestScores(prev => {
      const next = { ...prev, [chapter.id]: Math.max(prev[chapter.id] || 0, score) };
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch (_) {}
      return next;
    });
    setStage("result");
  }

  const score = chapter.questions.reduce((s, q) => s + (answers[q.id] === q.answerIndex ? 1 : 0), 0);
  const mistakes = chapter.questions.filter(q => answers[q.id] !== q.answerIndex);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>
      <div style={{ padding: "10px 18px 8px", borderBottom: "1px solid var(--border)", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button onClick={() => onNav && onNav()}
          style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, color: "var(--text)", fontSize: 15, fontWeight: 800, padding: 0 }}>
          ← 📝 英文選擇題練習
        </button>
        {bestScores[chapter.id] != null && (
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>最佳成績：{bestScores[chapter.id]}/{total}</span>
        )}
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
        {stage === "intro" && (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ padding: "14px 16px", background: ACCENT + "0c", borderRadius: 14, border: `1px solid ${ACCENT}30`, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: ACCENT }}>{chapter.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{chapter.level} · 共 {total} 題</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8, lineHeight: 1.6 }}>
                先讀一篇短文，再回答關於內容的選擇題。這種題型考的是「理解」而不是「背答案」——每題答錯後都會有中文解釋，說明正確答案在文章裡的依據，不是單純翻譯。
              </div>
            </div>
            <button onClick={startQuiz}
              style={{ width: "100%", padding: "13px 0", borderRadius: 12, border: "none",
                background: `linear-gradient(135deg,${ACCENT}cc,${ACCENT})`, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
              開始作答
            </button>
          </div>
        )}

        {stage === "quiz" && (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-faint)", marginBottom: 4 }}>
                <span>第 {qIdx + 1} / {total} 題</span>
              </div>
              <div style={{ height: 4, borderRadius: 2, background: "var(--border)" }}>
                <div style={{ height: "100%", borderRadius: 2, background: ACCENT, width: `${((qIdx + 1) / total) * 100}%`, transition: "width .2s" }} />
              </div>
            </div>

            <div style={{ padding: "12px 14px", background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 14, maxHeight: 220, overflowY: "auto" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", marginBottom: 6, textTransform: "uppercase" }}>📖 短文</div>
              {chapter.passage.split("\n\n").map((p, i) => (
                <p key={i} style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text)", marginBottom: i < chapter.passage.split("\n\n").length - 1 ? 8 : 0 }}>{p}</p>
              ))}
            </div>

            <div style={{ padding: "14px", background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, lineHeight: 1.5 }}>{chapter.questions[qIdx].text}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {chapter.questions[qIdx].options.map((opt, i) => {
                  const selected = answers[chapter.questions[qIdx].id] === i;
                  return (
                    <button key={i} onClick={() => selectAnswer(i)}
                      style={{ padding: "10px 12px", borderRadius: 9, textAlign: "left",
                        border: `1px solid ${selected ? ACCENT : "var(--border)"}`,
                        background: selected ? ACCENT + "15" : "var(--panel-alt)",
                        color: selected ? ACCENT : "var(--text)",
                        cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all .15s" }}>
                      {String.fromCharCode(65 + i)}. {opt}
                    </button>
                  );
                })}
              </div>
              <button onClick={next} disabled={answers[chapter.questions[qIdx].id] == null}
                style={{ marginTop: 14, width: "100%", padding: "11px 0", borderRadius: 10, border: "none",
                  background: answers[chapter.questions[qIdx].id] == null ? "var(--border)" : ACCENT,
                  color: "#fff", fontWeight: 700, fontSize: 13,
                  cursor: answers[chapter.questions[qIdx].id] == null ? "not-allowed" : "pointer",
                  opacity: answers[chapter.questions[qIdx].id] == null ? 0.6 : 1 }}>
                {qIdx + 1 >= total ? "提交答案" : "下一題 →"}
              </button>
            </div>
          </div>
        )}

        {stage === "result" && (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ padding: "18px", background: ACCENT + "0c", borderRadius: 14, border: `1px solid ${ACCENT}30`, textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 32, marginBottom: 6 }}>{score === total ? "🎉" : score >= total * 0.6 ? "👍" : "💪"}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: ACCENT }}>{score} / {total} 答對</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 6 }}>
                {score === total ? "全對！可以挑戰下一章了。" : mistakes.length ? "以下是答錯的題目和解釋，建議重讀一次文章相關段落。" : ""}
              </div>
            </div>

            {mistakes.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 16 }}>
                {mistakes.map(q => (
                  <div key={q.id} style={{ padding: "12px 14px", background: "var(--panel)", borderRadius: 12, border: "1px solid #ef444430" }}>
                    <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 8 }}>{q.text}</div>
                    <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 3 }}>
                      你的答案：{answers[q.id] != null ? `${String.fromCharCode(65 + answers[q.id])}. ${q.options[answers[q.id]]}` : "（未作答）"}
                    </div>
                    <div style={{ fontSize: 12, color: "#10b981", marginBottom: 6 }}>
                      正確答案：{String.fromCharCode(65 + q.answerIndex)}. {q.options[q.answerIndex]}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6, paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                      {q.explain}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={startQuiz}
                style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "1px solid var(--border)",
                  background: "var(--panel)", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                再試一次
              </button>
              <button onClick={() => setStage("intro")}
                style={{ flex: 1, padding: "11px 0", borderRadius: 12, border: "none",
                  background: `linear-gradient(135deg,${ACCENT}cc,${ACCENT})`, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
                返回章節介紹
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
