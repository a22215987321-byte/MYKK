import Link from "next/link";

// Same visual language as NavItem, but for entries that navigate to a
// standalone route (e.g. /french/*) instead of toggling in-SPA state.
export default function NavLinkItem({ href, icon, iconBg, label, sublabel, compact }) {
  return (
    <Link href={href} className="fb" style={{
      width: "100%", display: "flex", alignItems: "center", gap: 10,
      padding: compact ? "8px 10px" : "9px 10px", minHeight: 44, boxSizing: "border-box",
      borderRadius: "var(--radius-md)", background: "transparent",
      color: "var(--text)", textDecoration: "none",
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
    </Link>
  );
}
