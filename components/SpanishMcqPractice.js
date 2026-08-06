import { useState, useEffect } from "react";
import ClickableSpanishText from "./ClickableSpanishText";

const ACCENT = "#dc2626";
const STORAGE_KEY = "es-mcq-best";

// 跟 EnglishMcqPractice.js 同一套流程（讀短文/句子→作答→交卷→錯題解釋），
// 只是內容換成西班牙語。第 1 章是短文理解，第 2 章刻意不用短文、改成單句
// 動詞變位填空——跟現有的「西語動詞變位查詢」功能互補：那邊是查表工具，
// 這裡是「在句子情境裡挑出正確變位」的練習，兩者不是同一件事。
const CHAPTERS = [
  {
    id: "ch1",
    title: "第 1 章：Un día en la vida de Marta（Marta 的一天）",
    level: "初階（約 CEFR A2）",
    passage: `Marta se levanta a las siete de la mañana. Después de ducharse, desayuna un café con tostadas y sale de casa a las ocho. Trabaja en una oficina cerca del centro, así que va caminando todos los días.

A mediodía, almuerza con sus compañeros en un pequeño restaurante que está al lado de la oficina. Por la tarde, Marta estudia inglés en una academia porque quiere viajar a Canadá el próximo año.

Vuelve a casa a las ocho de la noche, cena algo ligero y ve una serie antes de dormir. Los fines de semana son diferentes: se levanta más tarde y sale con sus amigos a tomar algo.`,
    questions: [
      {
        id: "q1",
        text: "¿A qué hora se levanta Marta entre semana?",
        options: ["A las seis", "A las siete", "A las ocho", "A las nueve"],
        answerIndex: 1,
        explain: "第一句「Marta se levanta a las siete de la mañana」直接寫出時間——細節題，答案就在文章第一句。",
      },
      {
        id: "q2",
        text: "¿Cómo va Marta al trabajo?",
        options: ["En coche", "En autobús", "Caminando", "En bicicleta"],
        answerIndex: 2,
        explain: "「así que va caminando todos los días」——因為辦公室離家近，所以每天走路去，這題考的是「因果關係」的細節。",
      },
      {
        id: "q3",
        text: "¿Por qué estudia inglés Marta?",
        options: ["Porque es obligatorio en su trabajo", "Porque quiere viajar a Canadá el próximo año", "Porque le gusta mucho el idioma", "Porque sus amigos también lo estudian"],
        answerIndex: 1,
        explain: "文中明確寫「porque quiere viajar a Canadá el próximo año」——porque（因為）後面接的就是原因，這題答案幾乎是原句照抄。",
      },
      {
        id: "q4",
        text: "En la frase \"cena algo ligero\", ¿qué significa \"ligero\" en este contexto?",
        options: ["Una comida muy pesada y grande", "Una comida sencilla y no pesada", "Una comida muy picante", "Una comida muy cara"],
        answerIndex: 1,
        explain: "「ligero」在描述晚餐時，指份量小、不油膩的簡單餐點，跟中文「清淡」的用法很像——這是從上下文猜字義的題型，不是查字典直接翻譯就好。",
      },
      {
        id: "q5",
        text: "¿Qué hace Marta de forma diferente los fines de semana?",
        options: ["Trabaja hasta más tarde", "Se levanta más tarde y sale con amigos", "Estudia inglés todo el día", "Se queda en casa todo el tiempo"],
        answerIndex: 1,
        explain: "最後一句「se levanta más tarde y sale con sus amigos a tomar algo」——注意題目問的是「週末」跟平日「不一樣」的地方，不要選平日就有的日常活動。",
      },
      {
        id: "q6",
        text: "¿Cuál es el tiempo verbal que se usa principalmente en este texto?",
        options: ["Pretérito indefinido (過去式)", "Presente (現在式)", "Futuro simple (未來式)", "Condicional (條件式)"],
        answerIndex: 1,
        explain: "全文都是「se levanta」「desayuna」「trabaja」這種現在時變位，描述 Marta 平常固定的生活習慣——這種「描述日常規律」的短文幾乎都是用現在時寫的。",
      },
    ],
  },
  {
    id: "ch2",
    title: "第 2 章：動詞變位填空",
    level: "初階（約 CEFR A1-A2）",
    questions: [
      {
        id: "q1",
        text: "Yo ___ estudiante de español.",
        options: ["soy", "eres", "es", "somos"],
        answerIndex: 0,
        explain: "ser 動詞第一人稱單數（yo）變位是 soy——ser 用在描述「身分、本質」這類比較長期不變的事情，例如職業、國籍。",
      },
      {
        id: "q2",
        text: "Ella ___ muy cansada hoy porque no durmió bien.",
        options: ["es", "está", "son", "están"],
        answerIndex: 1,
        explain: "這裡是暫時的狀態（今天很累，不是她本來的個性），所以要用 estar 不是 ser——estar 第三人稱單數變位是 está。ser/estar 的選擇是西語最經典的文法重點之一。",
      },
      {
        id: "q3",
        text: "Nosotros ___ en Madrid desde 2020. (vivir)",
        options: ["vivo", "vives", "vivimos", "viven"],
        answerIndex: 2,
        explain: "vivir 是規則的 -ir 動詞，nosotros（我們）的變位是字根 viv- 加上 -imos，也就是 vivimos。",
      },
      {
        id: "q4",
        text: "¿Tú ___ hermanos? (tener)",
        options: ["tengo", "tienes", "tiene", "tenemos"],
        answerIndex: 1,
        explain: "tener 是不規則動詞，tú（你）的變位是 tienes（字根母音 e→ie 變化）——不能套用規則動詞的變位規則。",
      },
      {
        id: "q5",
        text: "Ellos ___ al cine esta noche. (ir)",
        options: ["voy", "vas", "va", "van"],
        answerIndex: 3,
        explain: "ir 是完全不規則的動詞，ellos（他們）的變位是 van，跟原形 ir 長得完全不像，只能直接背下來。",
      },
      {
        id: "q6",
        text: "Yo ___ la tarea todos los días. (hacer)",
        options: ["hago", "haces", "hace", "hacemos"],
        answerIndex: 0,
        explain: "hacer 只有 yo（我）這個人稱不規則，變成 hago（不是 haco），其他人稱（haces, hace, hacemos...）都照規則 -er 動詞變化。",
      },
    ],
  },
];

export default function SpanishMcqPractice({ onNav }) {
  const [chapterIdx, setChapterIdx] = useState(0);
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
          ← 🇪🇸 西語選擇題練習
        </button>
        {bestScores[chapter.id] != null && (
          <span style={{ fontSize: 11, color: "var(--text-faint)" }}>最佳成績：{bestScores[chapter.id]}/{total}</span>
        )}
      </div>

      {stage === "intro" && (
        <div style={{ display: "flex", gap: 4, padding: "6px 12px", overflowX: "auto", flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--panel-alt)" }}>
          {CHAPTERS.map((c, i) => {
            const active = i === chapterIdx;
            const best = bestScores[c.id];
            return (
              <button key={c.id} onClick={() => setChapterIdx(i)}
                style={{ display: "flex", alignItems: "center", gap: 4, padding: "5px 11px", borderRadius: 20,
                  border: `1px solid ${active ? ACCENT + "60" : "var(--border)"}`,
                  background: active ? ACCENT + "18" : "var(--panel)",
                  color: active ? ACCENT : "var(--text-faint)",
                  cursor: "pointer", fontSize: 11, fontWeight: active ? 700 : 400,
                  whiteSpace: "nowrap", flexShrink: 0, transition: "all .15s" }}>
                第 {i + 1} 章
                {best != null && <span style={{ background: "#10b98128", color: "#10b981", borderRadius: 10, padding: "1px 5px", fontSize: 9, fontWeight: 700 }}>{best}/{c.questions.length}</span>}
              </button>
            );
          })}
        </div>
      )}

      <div style={{ flex: 1, overflowY: "auto", padding: "16px 18px" }}>
        {stage === "intro" && (
          <div style={{ maxWidth: 640, margin: "0 auto" }}>
            <div style={{ padding: "14px 16px", background: ACCENT + "0c", borderRadius: 14, border: `1px solid ${ACCENT}30`, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 800, color: ACCENT }}>{chapter.title}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{chapter.level} · 共 {total} 題</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 8, lineHeight: 1.6 }}>
                {chapter.passage
                  ? "先讀一篇西語短文，再回答關於內容的選擇題，考的是「理解」不是「背答案」。"
                  : "這章沒有短文，是單句動詞變位填空——每題選出正確的動詞變位形式，答錯會有中文解釋規則。"}
                每題答錯後都會有中文解釋。
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

            {chapter.passage && (
              <div style={{ padding: "12px 14px", background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)", marginBottom: 14, maxHeight: 220, overflowY: "auto" }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", marginBottom: 6, textTransform: "uppercase" }}>📖 短文（點西語單字可以查意思）</div>
                {chapter.passage.split("\n\n").map((p, i) => (
                  <div key={i} style={{ marginBottom: i < chapter.passage.split("\n\n").length - 1 ? 8 : 0 }}>
                    <ClickableSpanishText text={p} style={{ fontSize: 13, lineHeight: 1.7, color: "var(--text)" }} />
                  </div>
                ))}
              </div>
            )}

            <div style={{ padding: "14px", background: "var(--panel)", borderRadius: 12, border: "1px solid var(--border)" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, lineHeight: 1.5 }}>
                <ClickableSpanishText text={chapter.questions[qIdx].text} />
              </div>
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
                {score === total ? "全對！可以挑戰下一章了。" : mistakes.length ? "以下是答錯的題目和解釋。" : ""}
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
