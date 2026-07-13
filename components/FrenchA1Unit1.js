import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";

const PHRASES = [
  {
    fr: "Bonjour",
    zh: "你好（正式）",
    context: "白天任何時候都可以用，見到陌生人、老師、老闆都適合。比英語的 Hello 更正式。",
    example: { fr: "Bonjour, je m'appelle Marie.", zh: "你好，我叫 Marie。" },
  },
  {
    fr: "Salut",
    zh: "嗨（非正式）",
    context: "只用於朋友或熟人之間，相當於英語的 Hi。也可以用來說「再見」。",
    example: { fr: "Salut Thomas, ça va ?", zh: "嗨 Thomas，你好嗎？" },
  },
  {
    fr: "Au revoir",
    zh: "再見",
    context: "正式的告別語，任何場合都適用。字面意思是「到再見面時」。",
    example: { fr: "Au revoir, à demain !", zh: "再見，明天見！" },
  },
  {
    fr: "Ça va ?",
    zh: "你好嗎？/ 還好嗎？",
    context: "非正式問候，朋友之間最常用。回答也可以說「Ça va」（還好）或「Ça va bien」（很好）。",
    example: { fr: "— Ça va ? — Oui, ça va bien, merci !", zh: "— 你好嗎？— 是的，很好，謝謝！" },
  },
  {
    fr: "Comment tu t'appelles ?",
    zh: "你叫什麼名字？",
    context: "非正式問法，問朋友或同齡人。正式場合用 Comment vous appelez-vous ?",
    example: { fr: "— Comment tu t'appelles ? — Je m'appelle Léa.", zh: "— 你叫什麼名字？— 我叫 Léa。" },
  },
  {
    fr: "Je m'appelle…",
    zh: "我叫⋯（自我介紹）",
    context: "字面意思是「我稱自己為⋯」，是最標準的自我介紹說法。",
    example: { fr: "Je m'appelle Pierre, enchanté !", zh: "我叫 Pierre，很高興認識你！" },
  },
  {
    fr: "Moi, c'est…",
    zh: "我是⋯（口語版自我介紹）",
    context: "更口語隨性，年輕人常用。字面意思是「我，就是⋯」。",
    example: { fr: "— Et toi ? — Moi, c'est Sophie.", zh: "— 那你呢？— 我是 Sophie。" },
  },
];

const QUIZ = [
  { q: "「Bonjour」的中文意思是？", opts: ["再見", "謝謝", "你好（正式）", "請"], ans: 2, exp: "Bonjour 是法語最基本的正式問候，白天任何時候都能用。" },
  { q: "遇到好朋友，用哪個非正式問候？", opts: ["Bonjour", "Au revoir", "Comment allez-vous ?", "Salut"], ans: 3, exp: "Salut 相當於英語的 Hi，只用於熟人之間。Bonjour 比較正式。" },
  { q: "「Au revoir」是什麼意思？", opts: ["你好", "謝謝", "請進", "再見"], ans: 3, exp: "Au revoir 字面是「到再見面時」，是正式的告別語。" },
  { q: "「Ça va ?」是什麼意思？", opts: ["你叫什麼名字？", "你從哪裡來？", "你好嗎？", "你多大了？"], ans: 2, exp: "Ça va ? 是最常見的非正式問候，朋友之間問「你還好嗎？」" },
  { q: "怎麼用法語說「我叫 Lucas」？", opts: ["Tu t'appelles Lucas", "Il s'appelle Lucas", "Je m'appelle Lucas", "Vous vous appelez Lucas"], ans: 2, exp: "Je m'appelle + 名字，是最標準的自我介紹說法。" },
];

function speak(text, rate = 0.85) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "fr-FR";
  u.rate = rate;
  window.speechSynthesis.speak(u);
}

function QuizSection({ user, db, onComplete }) {
  const [step, setStep] = useState(0);
  const [selected, setSelected] = useState(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [saved, setSaved] = useState(false);

  function handleSelect(idx) {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === QUIZ[step].ans) setScore(s => s + 1);
  }

  function next() {
    if (step + 1 >= QUIZ.length) {
      setDone(true);
      if (score + (selected === QUIZ[step].ans ? 1 : 0) >= 4) saveProgress();
    } else {
      setStep(s => s + 1);
      setSelected(null);
    }
  }

  async function saveProgress() {
    if (saved || !user?.uid) return;
    setSaved(true);
    try { await updateDoc(doc(db, "users", user.uid), { "frenchProgress.a1u1": true }); } catch {}
  }

  const finalScore = done ? score + (selected === QUIZ[step - 1 < 0 ? 0 : step - 1]?.ans ? 1 : 0) : null;

  if (done) {
    const realScore = score;
    const passed = realScore >= 4;
    return (
      <div style={{ padding: "24px", borderRadius: 16, background: passed ? "rgba(16,185,129,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${passed ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.2)"}`, textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 10 }}>{passed ? "🎉" : "💪"}</div>
        <div style={{ fontSize: 18, fontWeight: 800, color: passed ? "#10b981" : "#ef4444", marginBottom: 6 }}>
          {realScore} / {QUIZ.length} 答對
        </div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 16 }}>
          {passed ? "太棒了！你已掌握基本法語問候。" : "再複習一次，你快要會了！"}
        </div>
        {!passed && (
          <button onClick={() => { setStep(0); setSelected(null); setScore(0); setDone(false); setSaved(false); }}
            style={{ padding: "10px 24px", borderRadius: 12, border: "none", background: "rgba(59,130,246,0.15)", color: "#3b82f6", cursor: "pointer", fontWeight: 700, fontSize: 14, marginBottom: 12, width: "100%" }}>
            重新練習
          </button>
        )}
        {passed && (
          <button onClick={() => { saveProgress(); onComplete(); }}
            style={{ padding: "12px 24px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#8b5cf6,#6366f1)", color: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 14, width: "100%" }}>
            ✓ 標記完成 · 進入文法
          </button>
        )}
      </div>
    );
  }

  const q = QUIZ[step];
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5 }}>小測驗</span>
        <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{step + 1} / {QUIZ.length}</span>
      </div>
      <div style={{ height: 4, background: "var(--border)", borderRadius: 99, marginBottom: 16 }}>
        <div style={{ height: "100%", borderRadius: 99, background: "#8b5cf6", width: `${((step) / QUIZ.length) * 100}%`, transition: "width 0.3s" }} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 14, lineHeight: 1.5 }}>{q.q}</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
        {q.opts.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = i === q.ans;
          const showResult = selected !== null;
          let bg = "var(--panel-alt)", border = "var(--border)", color = "var(--text)";
          if (showResult && isCorrect) { bg = "rgba(16,185,129,0.12)"; border = "#10b981"; color = "#10b981"; }
          else if (showResult && isSelected && !isCorrect) { bg = "rgba(239,68,68,0.1)"; border = "#ef4444"; color = "#ef4444"; }
          return (
            <button key={i} onClick={() => handleSelect(i)} disabled={selected !== null}
              style={{ padding: "11px 14px", borderRadius: 10, border: `1px solid ${border}`, background: bg,
                color, textAlign: "left", cursor: selected ? "default" : "pointer", fontSize: 14, fontWeight: isSelected || (showResult && isCorrect) ? 700 : 400, transition: "all 0.15s" }}>
              {showResult && isCorrect && "✓ "}{showResult && isSelected && !isCorrect && "✗ "}{opt}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <>
          {selected !== q.ans && (
            <div style={{ padding: "9px 12px", borderRadius: 10, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 13, color: "#f59e0b", marginBottom: 10, lineHeight: 1.6 }}>
              💡 {q.exp}
            </div>
          )}
          <button onClick={next}
            style={{ width: "100%", padding: "11px 0", borderRadius: 12, border: "none", background: selected === q.ans ? "linear-gradient(135deg,#10b981,#059669)" : "linear-gradient(135deg,#6366f1,#8b5cf6)",
              color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {step + 1 >= QUIZ.length ? "查看結果" : "下一題 →"}
          </button>
        </>
      )}
    </div>
  );
}

export default function FrenchA1Unit1({ user, db, onNav }) {
  const [quizVisible, setQuizVisible] = useState(false);
  const [completed, setCompleted] = useState(false);

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", overflow: "hidden" }}>
      <style>{`
        .fa1-body::-webkit-scrollbar { width: 6px; }
        .fa1-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
      `}</style>

      {/* Header bar */}
      <div style={{ padding: "12px 24px", borderBottom: "1px solid var(--border)", flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button onClick={() => onNav ? onNav('home') : null}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 16, color: "var(--text-faint)" }}>←</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: "var(--text)" }}>A1 打招呼</span>
          </button>
          <span style={{ fontSize: 11, background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 20, padding: "2px 9px", color: "var(--text-muted)", fontWeight: 600, flexShrink: 0 }}>7 個表達</span>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="fa1-body" style={{ flex: 1, overflowY: "auto", padding: "20px 28px 40px" }}>

        {/* Badges */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <span style={{ fontSize: 11, padding: "3px 10px", background: "rgba(139,92,246,0.15)", color: "#a78bfa", borderRadius: 20, fontWeight: 700, border: "1px solid rgba(139,92,246,0.25)" }}>🇫🇷 A1</span>
          <span style={{ fontSize: 11, padding: "3px 10px", background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text-faint)", borderRadius: 20 }}>第 1 單元</span>
          <span style={{ fontSize: 11, padding: "3px 10px", background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text-faint)", borderRadius: 20 }}>打招呼與自我介紹</span>
        </div>

        {/* Tip */}
        <div style={{ padding: "11px 16px", borderRadius: 12, background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.18)", fontSize: 13, color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.7 }}>
          💡 建議：先看每個表達的<strong style={{ color: "var(--text)" }}>使用情境</strong>，再播放發音模仿，最後完成小測驗。
        </div>

        {/* Phrase cards */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
          {PHRASES.map((p, i) => (
            <div key={i} style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16, overflow: "hidden" }}>
              <div style={{ padding: "14px 20px", background: "rgba(139,92,246,0.06)", borderBottom: "1px solid rgba(139,92,246,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa", letterSpacing: 0.3 }}>{p.fr}</div>
                  <div style={{ fontSize: 14, color: "var(--text-muted)", fontWeight: 600, marginTop: 3 }}>{p.zh}</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => speak(p.fr, 0.55)}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--panel-alt)", color: "var(--text-faint)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    🐢 慢
                  </button>
                  <button onClick={() => speak(p.fr, 0.85)}
                    style={{ display: "flex", alignItems: "center", gap: 4, padding: "7px 12px", borderRadius: 10, border: "1px solid rgba(139,92,246,0.3)", background: "rgba(139,92,246,0.1)", color: "#a78bfa", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
                    🔊 念
                  </button>
                </div>
              </div>
              <div style={{ padding: "14px 20px" }}>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.75, marginBottom: 12, padding: "10px 14px", background: "var(--panel-alt)", borderRadius: 10, border: "1px solid var(--border)" }}>
                  📍 {p.context}
                </div>
                <div style={{ borderLeft: "3px solid rgba(139,92,246,0.4)", paddingLeft: 14 }}>
                  <div style={{ fontSize: 14, color: "#c4b5fd", fontStyle: "italic", lineHeight: 1.6, marginBottom: 3 }}>{p.example.fr}</div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{p.example.zh}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Quiz */}
        {!quizVisible && !completed && (
          <button onClick={() => setQuizVisible(true)}
            style={{ width: "100%", padding: "15px 0", borderRadius: 14, border: "1px solid rgba(139,92,246,0.35)", background: "rgba(139,92,246,0.08)", color: "#a78bfa", cursor: "pointer", fontWeight: 800, fontSize: 15, marginBottom: 16 }}>
            ✏️ 開始小測驗（5 題）
          </button>
        )}
        {quizVisible && !completed && (
          <QuizSection user={user} db={db} onComplete={() => { setCompleted(true); setQuizVisible(false); }} />
        )}
        {completed && (
          <div style={{ padding: "20px", borderRadius: 14, background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", textAlign: "center", marginBottom: 20 }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>✅</div>
            <div style={{ fontWeight: 800, color: "#10b981", fontSize: 16 }}>第一單元完成！</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>你已掌握基本法語問候語</div>
          </div>
        )}

        {/* Navigation */}
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <button onClick={() => onNav ? onNav('pron') : null}
            style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text-muted)", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            ← 上一課：發音
          </button>
          <button onClick={() => onNav ? onNav('grammar') : null}
            style={{ flex: 1, padding: "12px 0", borderRadius: 12, border: "1px solid rgba(16,185,129,0.35)", background: "rgba(16,185,129,0.08)", color: "#10b981", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            下一課：文法 →
          </button>
        </div>

      </div>
    </div>
  );
}
