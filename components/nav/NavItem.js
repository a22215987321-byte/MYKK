export default function NavItem({ icon, iconBg, label, sublabel, active, onClick, compact, mobileTouch }) {
  return (
    <button onClick={onClick} className={`fb ${active ? "act" : ""}`}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10, position: "relative",
        padding: compact ? "8px 10px" : "9px 10px", boxSizing: "border-box",
        minHeight: `var(--navcard-height, ${mobileTouch ? "44px" : "auto"})`,
        borderRadius: "var(--navcard-radius, var(--radius-md))",
        border: active ? "1px solid var(--accent-active-border, transparent)" : "1px solid var(--navcard-border, transparent)",
        // Left-edge indicator bar — must come after the `border` shorthand
        // above so it can override just the left edge. Width comes from
        // --navcard-indicator-w (falls back to 1px, i.e. identical to the
        // border above) so active/inactive never differ in width and
        // nothing shifts when selection changes; only shadow-window widens
        // it to 3px to read as a real indicator instead of a border.
        borderLeft: `var(--navcard-indicator-w, 1px) solid ${active ? "var(--accent-active-border, transparent)" : "var(--navcard-border, transparent)"}`,
        background: active ? "var(--accent-active)" : "var(--navcard-bg, transparent)",
        boxShadow: active ? "var(--navcard-active-glow, none)" : "none",
        color: "var(--text)", cursor: "pointer", textAlign: "left", transition: "background 0.15s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "var(--navcard-hover-bg, var(--navcard-bg, transparent))"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "var(--navcard-bg, transparent)"; }}>
      <div style={{
        width: `var(--navcard-icon-size, ${compact ? "32px" : "34px"})`, height: `var(--navcard-icon-size, ${compact ? "32px" : "34px"})`,
        borderRadius: "var(--navcard-icon-radius, var(--radius-md))",
        background: iconBg, display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: compact ? 16 : 18, flexShrink: 0,
      }}>{icon}</div>
      <div style={{ minWidth: 0, overflow: "hidden" }}>
        <div style={{ fontWeight: 600, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{sublabel}</div>}
      </div>
    </button>
  );
}
