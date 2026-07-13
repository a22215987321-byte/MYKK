import { useEffect, useMemo, useState } from "react";
import { doc, getDoc } from "firebase/firestore";

const UNITS = [
  {
    id: "pron", number: 1, icon: "🎵", title: "法語發音入門", french: "Prononciation",
    description: "認識法語字母、母音、子音、鼻化音與小舌音。",
    points: ["法語字母發音", "核心母音", "鼻化音", "小舌音 ʁ", "發音規則"],
    total: 12, color: "#3b82f6", action: "pron", available: true,
  },
  {
    id: "greetings", number: 2, icon: "👋", title: "A1 打招呼", french: "Salutations",
    description: "學會最基本的問候、自我介紹與禮貌用語。",
    points: ["Bonjour / Salut", "Merci / Pardon", "Je m’appelle", "Ça va ?", "Au revoir"],
    total: 8, color: "#8b5cf6", action: "a1", available: true,
  },
  {
    id: "grammar", number: 3, icon: "📐", title: "基礎文法", french: "Grammaire",
    description: "掌握法語最基礎的句子結構。",
    points: ["主詞代詞", "être", "avoir", "名詞陰陽性", "基礎冠詞"],
    total: 10, color: "#10b981", action: "grammar", available: true,
  },
  {
    id: "vocab", number: 4, icon: "🗂️", title: "日常詞彙", french: "Vocabulaire",
    description: "從大型法語字典開始累積 A1 最常用的生活單字。",
    points: ["人物", "家庭", "食物", "地點", "數字與時間"],
    total: 18, color: "#06b6d4", action: "dictionary", available: true,
  },
  {
    id: "sentences", number: 5, icon: "✍️", title: "簡單句型", french: "Phrases simples",
    description: "開始運用核心句型組出自己的法語句子。",
    points: ["Je suis", "J’ai", "Je voudrais", "C’est", "Il y a"],
    total: 10, color: "#f59e0b", action: "sentences", available: false,
  },
  {
    id: "listening", number: 6, icon: "🎧", title: "聽力與跟讀", french: "Écoute et répétition",
    description: "透過短句跟讀建立節奏、連音與法語語感。",
    points: ["慢速跟讀", "正常語速", "聽句選意思", "模仿發音"],
    total: 8, color: "#ec4899", action: "listening", available: false,
  },
];

export default function FrenchHome({ user, db, onNavigate }) {
  const [progress, setProgress] = useState({});

  useEffect(() => {
    if (!user?.uid || !db) return;
    getDoc(doc(db, "users", user.uid)).then(snap => {
      if (snap.exists()) setProgress(snap.data().frenchProgress || {});
    }).catch(() => {});
  }, [user, db]);

  const completedByUnit = useMemo(() => ({
    pron: progress.pron ? 12 : 0,
    greetings: progress.a1u1 ? 8 : 0,
    grammar: progress.grammar_pronouns && progress.grammar_etre && progress.grammar_articles ? 10 : 0,
    vocab: Number(progress.vocabCount || 0),
    sentences: 0,
    listening: 0,
  }), [progress]);

  const totals = UNITS.reduce((sum, unit) => sum + unit.total, 0);
  const completed = UNITS.reduce((sum, unit) => sum + Math.min(completedByUnit[unit.id] || 0, unit.total), 0);
  const percent = Math.round((completed / totals) * 100);

  function navigate(unit) {
    if (!unit.available) return;
    if (onNavigate) {
      onNavigate(unit.action);
      return;
    }
    const paths = { pron: "/french/pronunciation", a1: "/french/a1", grammar: "/french/grammar", dictionary: "/" };
    window.location.href = paths[unit.action] || "/french";
  }

  return (
    <div className="fr-route-page">
      <style>{`
        .fr-route-page { height: 100%; min-height: 100vh; overflow-y: auto; color: var(--text); background:
          radial-gradient(circle at 18% 0%, rgba(37,99,235,.16), transparent 34%),
          radial-gradient(circle at 92% 12%, rgba(124,58,237,.14), transparent 30%), var(--bg); }
        .fr-route-shell { width: min(1180px, 100%); margin: 0 auto; padding: 26px 24px 64px; box-sizing: border-box; }
        .fr-route-hero { position: relative; overflow: hidden; padding: 28px; border: 1px solid rgba(96,165,250,.28); border-radius: 24px;
          background: linear-gradient(135deg, rgba(30,58,138,.42), rgba(76,29,149,.28) 58%, rgba(15,23,42,.78));
          box-shadow: 0 18px 60px rgba(2,6,23,.28); }
        .fr-route-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 16px; margin-top: 20px; }
        .fr-unit-card { position: relative; min-height: 330px; display: flex; flex-direction: column; padding: 20px; border-radius: 20px;
          background: linear-gradient(155deg, rgba(30,41,59,.92), rgba(15,23,42,.86)); border: 1px solid var(--border);
          box-shadow: 0 10px 30px rgba(2,6,23,.2); transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease; }
        .fr-unit-card.available { cursor: pointer; }
        .fr-unit-card.available:hover { transform: translateY(-5px); border-color: var(--unit-color); box-shadow: 0 18px 44px rgba(2,6,23,.34), 0 0 24px color-mix(in srgb, var(--unit-color) 25%, transparent); }
        .fr-unit-card.unavailable { opacity: .72; }
        .fr-tag { padding: 4px 8px; border-radius: 999px; font-size: 10px; font-weight: 700; background: rgba(148,163,184,.09); border: 1px solid rgba(148,163,184,.16); color: var(--text-muted); }
        .fr-start-btn { width: 100%; margin-top: auto; padding: 10px 12px; border-radius: 11px; border: none; color: white; font-size: 13px; font-weight: 800; cursor: pointer; }
        @media (max-width: 980px) { .fr-route-grid { grid-template-columns: repeat(2,minmax(0,1fr)); } }
        @media (max-width: 620px) {
          .fr-route-shell { padding: 16px 12px 42px; } .fr-route-hero { padding: 20px 17px; border-radius: 19px; }
          .fr-route-grid { grid-template-columns: 1fr; gap: 12px; } .fr-unit-card { min-height: 0; padding: 18px; }
        }
      `}</style>

      <main className="fr-route-shell">
        <section className="fr-route-hero">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 18, flexWrap: "wrap" }}>
            <div style={{ maxWidth: 760 }}>
              <div style={{ color: "#93c5fd", fontWeight: 800, fontSize: 12, letterSpacing: 1.6, textTransform: "uppercase", marginBottom: 8 }}>🇫🇷 Parcours débutant</div>
              <h1 style={{ margin: 0, fontSize: "clamp(25px,4vw,38px)", lineHeight: 1.2 }}>法語 A1 初學者路線</h1>
              <p style={{ margin: "10px 0 0", color: "var(--text-muted)", fontSize: 14, lineHeight: 1.8 }}>從發音、打招呼、基礎句型到日常詞彙，一步一步建立法語基礎。</p>
            </div>
            <div style={{ minWidth: 118, padding: "12px 16px", borderRadius: 16, background: "rgba(15,23,42,.48)", border: "1px solid rgba(147,197,253,.2)" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: "#93c5fd" }}>{percent}%</div>
              <div style={{ fontSize: 11, color: "var(--text-faint)" }}>整體完成度</div>
            </div>
          </div>
          <div style={{ marginTop: 20, height: 8, borderRadius: 99, overflow: "hidden", background: "rgba(15,23,42,.62)" }}>
            <div style={{ height: "100%", width: `${percent}%`, borderRadius: 99, background: "linear-gradient(90deg,#3b82f6,#8b5cf6)", transition: "width .5s" }} />
          </div>
          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", fontSize: 11, color: "var(--text-faint)" }}>
            {UNITS.map((unit, index) => <span key={unit.id} style={{ display: "contents" }}><b style={{ color: index === 0 ? "#93c5fd" : "var(--text-muted)" }}>{index + 1}. {unit.title.replace("A1 ", "")}</b>{index < UNITS.length - 1 && <span>→</span>}</span>)}
          </div>
        </section>

        <div style={{ margin: "24px 2px 8px" }}>
          <div style={{ fontSize: 17, fontWeight: 800 }}>學習路線</div>
          <div style={{ marginTop: 3, fontSize: 12, color: "var(--text-faint)" }}>依序完成六個單元，不需要猜下一步學甚麼。</div>
        </div>

        <section className="fr-route-grid">
          {UNITS.map(unit => {
            const done = Math.min(completedByUnit[unit.id] || 0, unit.total);
            const pct = Math.round((done / unit.total) * 100);
            return (
              <article key={unit.id} className={`fr-unit-card ${unit.available ? "available" : "unavailable"}`} style={{ "--unit-color": unit.color }} onClick={() => navigate(unit)}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: 1.1, color: unit.color }}>UNITÉ {unit.number}</span>
                  {!unit.available && <span style={{ fontSize: 10, padding: "3px 8px", borderRadius: 99, background: "rgba(245,158,11,.12)", color: "#fbbf24" }}>內容建置中</span>}
                </div>
                <div style={{ width: 50, height: 50, marginTop: 15, display: "grid", placeItems: "center", borderRadius: 15, fontSize: 25, background: `${unit.color}18`, border: `1px solid ${unit.color}40` }}>{unit.icon}</div>
                <h2 style={{ margin: "14px 0 2px", fontSize: 18 }}>{unit.title}</h2>
                <div style={{ fontSize: 12, color: unit.color, fontWeight: 700 }}>{unit.french}</div>
                <p style={{ margin: "10px 0", minHeight: 42, fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7 }}>{unit.description}</p>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 16 }}>{unit.points.map(point => <span className="fr-tag" key={point}>{point}</span>)}</div>
                <div style={{ marginTop: "auto", marginBottom: 8, display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-faint)" }}><span>學習進度</span><span>{done} / {unit.total}</span></div>
                <div style={{ height: 5, overflow: "hidden", borderRadius: 99, background: "rgba(148,163,184,.12)", marginBottom: 14 }}><div style={{ width: `${pct}%`, height: "100%", borderRadius: 99, background: unit.color }} /></div>
                <button className="fr-start-btn" disabled={!unit.available} onClick={event => { event.stopPropagation(); navigate(unit); }} style={{ background: unit.available ? `linear-gradient(135deg,${unit.color},#7c3aed)` : "rgba(71,85,105,.55)", cursor: unit.available ? "pointer" : "not-allowed" }}>{unit.available ? done > 0 ? "繼續學習 →" : "開始學習 →" : "即將開放"}</button>
              </article>
            );
          })}
        </section>
      </main>
    </div>
  );
}
