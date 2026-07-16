export default function NavItem({ icon, iconBg, label, sublabel, active, onClick, compact, mobileTouch }) {
  return (
    <button onClick={onClick} className={`fb ${active ? "act" : ""}`}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10,
        padding: compact ? "8px 10px" : "9px 10px",
        minHeight: mobileTouch ? 44 : undefined,
        borderRadius: "var(--radius-md)", border: "none",
        background: active ? "var(--accent-active)" : "transparent",
        color: "var(--text)", cursor: "pointer", textAlign: "left", transition: "background 0.15s",
      }}>
      <div style={{
        width: compact ? 32 : 34, height: compact ? 32 : 34, borderRadius: "var(--radius-md)",
        background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: compact ? 16 : 18, flexShrink: 0,
      }}>{icon}</div>
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sublabel}</div>}
      </div>
    </button>
  );
}
