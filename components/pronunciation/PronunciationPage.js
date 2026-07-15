import { useState } from "react";
import PronunciationCategoryTabs from "./PronunciationCategoryTabs";
import PronunciationSoundCard from "./PronunciationSoundCard";

export default function PronunciationPage({
  backLabel, onBack, emoji, title, subtitle,
  categories, items, footerTip, accentColor = "#dc2626", cardAccent, showCompletion = false,
}) {
  const [activeCat, setActiveCat] = useState(categories[0]);
  const filtered = activeCat === categories[0] ? items : items.filter(s => s.category === activeCat);

  return (
    <div style={{ height: "100%", overflowY: "auto", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "20px 16px 80px" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 13 }}>
          <button onClick={onBack} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: 0 }}>
            {backLabel}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <span style={{ fontSize: 26 }}>{emoji}</span>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>{title}</h1>
        </div>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>{subtitle}</div>

        <PronunciationCategoryTabs categories={categories} active={activeCat} onChange={setActiveCat} accentColor={accentColor} />

        {filtered.map(item => <PronunciationSoundCard key={item.id} item={item} accent={cardAccent} showCompletion={showCompletion} />)}

        {footerTip && (
          <div style={{ textAlign: "center", padding: "20px 0 0", color: "var(--text-faint)", fontSize: 12 }}>{footerTip}</div>
        )}
      </div>
    </div>
  );
}
