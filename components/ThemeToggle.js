import { useEffect, useRef, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";

const THEMES = [
  { id: "default", label: "☀️ 淺色預設" },
  { id: "neon", label: "🌌 霓虹深色" },
  { id: "glass", label: "🥂 玻璃質感" },
];

function applyTheme(next) {
  localStorage.setItem("theme", next);
  if (next === "default") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", next);
}

export default function ThemeToggle({ mode = "floating", onOpenProfile, openUp = false }) {
  const [theme, setTheme] = useState("default");
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem("theme");
    if (THEMES.some(t => t.id === saved)) {
      setTheme(saved);
    } else {
      // Mirrors the inline script in pages/_document.js: with no explicit
      // choice saved, the OS dark-mode preference decides what's actually
      // showing, so reflect that here instead of always showing "淺色預設"
      // as checked.
      const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
      setTheme(prefersDark ? "neon" : "default");
    }
  }, []);

  useEffect(() => onAuthStateChanged(auth, u => setLoggedIn(!!u)), []);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = e => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  // Once logged in, the sidebar's own settings button takes over — avoid two settings buttons on screen.
  if (mode === "floating" && loggedIn) return null;

  const selectTheme = (id) => {
    setTheme(id);
    applyTheme(id);
    setOpen(false);
  };

  const openProfile = () => {
    if (onOpenProfile) onOpenProfile();
    else window.dispatchEvent(new CustomEvent("evon:open-profile"));
    setOpen(false);
  };

  return (
    <div ref={menuRef} style={mode === "floating"
      ? { position: "fixed", top: 12, right: 12, zIndex: 9999 }
      : { position: "relative", display: "inline-flex" }}>
      <button
        onClick={() => setOpen(v => !v)}
        title="設定"
        aria-label="設定選單"
        style={mode === "floating" ? {
          display: "flex", alignItems: "center", justifyContent: "center",
          width: 38, height: 38, background: "var(--panel)", border: "1px solid var(--border)",
          borderRadius: "var(--radius-md)", boxShadow: "var(--card-shadow)",
          backdropFilter: "var(--panel-blur)", WebkitBackdropFilter: "var(--panel-blur)",
          color: "var(--text)", fontSize: 17, cursor: "pointer",
        } : {
          background: "none", border: "none", color: "var(--text-faint)",
          cursor: "pointer", fontSize: 16, padding: 4, borderRadius: 6,
        }}
      >
        ⚙️
      </button>

      {open && (
        <div
          style={{
            position: "absolute",
            ...(openUp
              ? { bottom: mode === "floating" ? 46 : 26 }
              : { top: mode === "floating" ? 46 : 26 }),
            right: 0,
            minWidth: 190,
            background: "var(--panel)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--card-shadow)",
            backdropFilter: "var(--panel-blur)",
            WebkitBackdropFilter: "var(--panel-blur)",
            overflow: "hidden",
            fontFamily: "var(--font-body)",
            zIndex: 9999,
          }}
        >
          {loggedIn && (
            <button
              onClick={openProfile}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "10px 14px", background: "none", border: "none",
                borderBottom: "1px solid var(--border-soft)", color: "var(--text)",
                fontSize: 13, textAlign: "left", cursor: "pointer",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              👤 個人資料設定
            </button>
          )}
          {THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => selectTheme(t.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%",
                padding: "9px 14px", background: "none", border: "none",
                color: "var(--text)", fontSize: 13, textAlign: "left", cursor: "pointer",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <span>{t.label}</span>
              {theme === t.id && <span>✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
