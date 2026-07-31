import { useState, useEffect } from "react";
import { ChevronRight } from "lucide-react";

// Collapsible group for the sidebar nav list — remembers open/closed per
// folder (by id) in localStorage, but forces itself open whenever one of
// its children is the active view so a selection never hides invisibly
// inside a collapsed folder.
export default function NavFolder({ id, icon, label, hasActiveChild, children }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try { setOpen(localStorage.getItem(`cr-folder-${id}`) === "1"); } catch {}
  }, [id]);

  const toggle = () => {
    setOpen(v => {
      const next = !v;
      try { localStorage.setItem(`cr-folder-${id}`, next ? "1" : "0"); } catch {}
      return next;
    });
  };

  const expanded = open || hasActiveChild;

  return (
    <div style={{ padding: "0 10px 6px" }}>
      <button onClick={toggle}
        style={{
          width: "100%", display: "flex", alignItems: "center", gap: 10,
          padding: "9px 10px", borderRadius: "var(--radius-md)",
          border: "1px solid transparent", background: "transparent",
          color: "var(--text)", cursor: "pointer", textAlign: "left",
        }}>
        <div style={{ width: 34, height: 34, borderRadius: "var(--radius-md)", background: "var(--panel-alt)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0, fontWeight: 600, fontSize: 13 }}>{label}</div>
        <ChevronRight size={16} color="var(--text-dim)" style={{ flexShrink: 0, transition: "transform 0.15s", transform: expanded ? "rotate(90deg)" : "none" }} />
      </button>
      {expanded && (
        <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 4 }}>
          {children}
        </div>
      )}
    </div>
  );
}
