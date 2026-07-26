import { useEffect, useRef, useState } from "react";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import useIsMobile from "../lib/useIsMobile";

const THEMES = [
  { id: "default", label: "☀️ 淺色預設" },
  { id: "neon", label: "🌌 霓虹深色" },
  { id: "glass", label: "🥂 玻璃質感" },
  { id: "pastel-pearl", label: "🪞 柔和珠光" },
];

const PASTEL_PALETTES = [
  { id: "champagne", label: "香檳奶油", color: "#F4BF45" },
  { id: "coral-peach", label: "珊瑚蜜桃", color: "#F5A58C" },
  { id: "mist-blue", label: "霧霾粉藍", color: "#A2C3E7" },
  { id: "lavender", label: "灰紫薰衣草", color: "#C0ADDE" },
  { id: "pearl-silver", label: "珍珠銀灰", color: "#D9D8D9" },
  { id: "mint-sea-salt", label: "薄荷海鹽", color: "#A7D7CC" },
];
const PASTEL_PALETTE_IDS = PASTEL_PALETTES.map(p => p.id);
const DEFAULT_PASTEL_PALETTE = "mist-blue";

function applyTheme(next) {
  localStorage.setItem("theme", next);
  if (next === "default") document.documentElement.removeAttribute("data-theme");
  else document.documentElement.setAttribute("data-theme", next);
}

function applyPalette(id) {
  localStorage.setItem("pastelPalette", id);
  document.documentElement.setAttribute("data-pastel-palette", id);
}

function PaletteSwatch({ palette, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(palette.id)}
      aria-label={`${palette.label}配色${selected ? "（目前選中）" : ""}`}
      aria-pressed={selected}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5,
        minWidth: 44, minHeight: 44, padding: "8px 4px",
        background: selected ? "var(--panel-hover)" : "transparent",
        border: selected ? "1.5px solid #444444" : "1.5px solid transparent",
        borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-body)",
      }}
    >
      <span style={{
        width: 26, height: 26, borderRadius: "50%", flexShrink: 0,
        background: palette.color, border: "1px solid rgba(0,0,0,0.15)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        {selected && <span aria-hidden="true" style={{ fontSize: 12, fontWeight: 900, color: "#444444" }}>✓</span>}
      </span>
      <span style={{ fontSize: 10, color: "var(--text)", whiteSpace: "nowrap", lineHeight: 1.2 }}>{palette.label}</span>
    </button>
  );
}

function PaletteGrid({ selected, onSelect }) {
  return (
    <div role="group" aria-label="選擇柔和珠光配色" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 4, padding: "6px 8px 10px" }}>
      {PASTEL_PALETTES.map(p => (
        <PaletteSwatch key={p.id} palette={p} selected={selected === p.id} onSelect={onSelect} />
      ))}
    </div>
  );
}

export default function ThemeToggle({ mode = "floating", onOpenProfile, openUp = false }) {
  const [theme, setTheme] = useState("default");
  const [pastelPalette, setPastelPalette] = useState(DEFAULT_PASTEL_PALETTE);
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const menuRef = useRef(null);
  const isMobile = useIsMobile();

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

    const savedPalette = localStorage.getItem("pastelPalette");
    setPastelPalette(PASTEL_PALETTE_IDS.includes(savedPalette) ? savedPalette : DEFAULT_PASTEL_PALETTE);
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
    if (id === "pastel-pearl") {
      // First-ever pick with nothing saved yet: persist the default palette
      // immediately so a refresh right after this click still restores the
      // same look via the anti-flicker script instead of guessing again.
      if (!localStorage.getItem("pastelPalette")) applyPalette(pastelPalette);
      // Keep the menu open so the palette grid (rendered below, since
      // theme === "pastel-pearl") is reachable in the same interaction.
    } else {
      setOpen(false);
    }
  };

  const selectPalette = (id) => {
    setPastelPalette(id);
    applyPalette(id);
    setOpen(false);
  };

  const openProfile = () => {
    if (onOpenProfile) onOpenProfile();
    else window.dispatchEvent(new CustomEvent("evon:open-profile"));
    setOpen(false);
  };

  const showPaletteGrid = open && theme === "pastel-pearl";

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
            minWidth: showPaletteGrid && !isMobile ? 220 : 190,
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
                borderBottom: t.id === "pastel-pearl" && showPaletteGrid && !isMobile ? "1px solid var(--border-soft)" : "none",
                color: "var(--text)", fontSize: 13, textAlign: "left", cursor: "pointer",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              <span>{t.label}</span>
              {theme === t.id && <span>✓</span>}
            </button>
          ))}

          {/* Second-level accent picker, expanded inline once 柔和珠光 is the
              active theme. On mobile this is skipped here and rendered as a
              bottom sheet below instead, so it never gets clipped by the
              dropdown's own width/height. */}
          {showPaletteGrid && !isMobile && (
            <PaletteGrid selected={pastelPalette} onSelect={selectPalette} />
          )}
        </div>
      )}

      {showPaletteGrid && isMobile && (
        <>
          <div
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 9998 }}
          />
          <div
            style={{
              position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 9999,
              background: "var(--panel)", borderTopLeftRadius: 20, borderTopRightRadius: 20,
              padding: "14px 12px calc(14px + env(safe-area-inset-bottom))",
              boxShadow: "0 -8px 30px rgba(0,0,0,0.25)", maxHeight: "70vh", overflowY: "auto",
            }}
          >
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)", margin: "0 auto 12px" }} />
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", padding: "0 8px 4px" }}>柔和珠光配色</div>
            <PaletteGrid selected={pastelPalette} onSelect={selectPalette} />
          </div>
        </>
      )}
    </div>
  );
}
