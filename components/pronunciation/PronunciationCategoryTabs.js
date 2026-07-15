export default function PronunciationCategoryTabs({ categories, active, onChange, accentColor = "#dc2626" }) {
  return (
    <div className="pron-cat" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, marginBottom: 20 }}>
      <style>{`
        .pron-cat::-webkit-scrollbar { height: 4px; }
        .pron-cat::-webkit-scrollbar-thumb { background: var(--border); border-radius: 99px; }
      `}</style>
      {categories.map(cat => {
        const isActive = active === cat;
        return (
          <button key={cat} onClick={() => onChange(cat)}
            style={{
              padding: "7px 14px", borderRadius: 20,
              border: `1px solid ${isActive ? accentColor : "var(--border)"}`,
              background: isActive ? accentColor + "1f" : "var(--panel)",
              color: isActive ? accentColor : "var(--text-muted)",
              cursor: "pointer", fontSize: 13, fontWeight: isActive ? 700 : 400,
              whiteSpace: "nowrap", flexShrink: 0, transition: "all 0.15s",
            }}>
            {cat}
          </button>
        );
      })}
    </div>
  );
}
