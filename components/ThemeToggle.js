import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { auth } from "../lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import useIsMobile from "../lib/useIsMobile";
import { CHAT_WORLDS, getWorldById, getSavedWorldId, getSavedVariantId, applyWorld } from "../lib/chatWorlds";
import { getSavedAccounts, setPendingLoginEmail } from "../lib/accountSwitcher";

// hidden:true 的主題暫時不在選單裡顯示（先隱藏、不是刪除）——如果使用者
// 之前剛好選到這個主題存在 localStorage 裡，套用邏輯還是正常運作，只是
// 這裡的清單不會再列出來讓人選。
const THEMES = [
  { id: "default", label: "☀️ 淺色預設" },
  { id: "neon", label: "🌌 霓虹深色", hidden: true },
  { id: "glass", label: "🥂 玻璃質感", hidden: true },
  { id: "pastel-pearl", label: "🪞 柔和珠光" },
  { id: "shadow-window", label: "🌙 幽影深窗" },
  // 從零重建的版面，第一階段只確立四張大卡（見 theme.css 的 Style 6）。
  { id: "clean-cards", label: "◻️ 簡約四卡" },
];
const VISIBLE_THEMES = THEMES.filter(t => !t.hidden);

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
      <span style={{ fontSize: 10, color: "var(--text)", whiteSpace: "nowrap", lineHeight: 1.2, userSelect: "text", WebkitUserSelect: "text" }}>{palette.label}</span>
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

// Same swatch-grid interaction as PaletteSwatch/PaletteGrid above, but each
// swatch previews an actual thumbnail crop of the world image instead of a
// flat color circle. "無背景" has no thumbnail — falls back to its own emoji.
function WorldSwatch({ world, thumbSrc, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(world.id)}
      aria-label={`${world.label}${selected ? "（目前選中）" : ""}`}
      aria-pressed={selected}
      style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 5,
        minWidth: 44, minHeight: 44, padding: "8px 4px",
        background: selected ? "var(--panel-hover)" : "transparent",
        border: selected ? "1.5px solid var(--accent)" : "1.5px solid transparent",
        borderRadius: 12, cursor: "pointer", fontFamily: "var(--font-body)",
      }}
    >
      <span style={{
        width: 30, height: 30, borderRadius: "50%", flexShrink: 0, overflow: "hidden",
        border: "1px solid rgba(0,0,0,0.15)", display: "flex", alignItems: "center", justifyContent: "center",
        background: thumbSrc ? `url(${thumbSrc}) center/cover` : "var(--panel-alt)", fontSize: 16,
      }}>
        {!thumbSrc && "🚫"}
        {selected && <span aria-hidden="true" style={{ fontSize: 12, fontWeight: 900, color: "#fff", textShadow: "0 0 3px rgba(0,0,0,0.8)" }}>✓</span>}
      </span>
      <span style={{ fontSize: 10, color: "var(--text)", whiteSpace: "nowrap", lineHeight: 1.2, userSelect: "text", WebkitUserSelect: "text" }}>{world.label.replace(/^\S+\s/, "")}</span>
    </button>
  );
}

function WorldGrid({ selected, onSelect }) {
  return (
    <div role="group" aria-label="選擇聊天背景" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4, padding: "6px 8px 10px" }}>
      {CHAT_WORLDS.map(w => (
        <WorldSwatch key={w.id} world={w} thumbSrc={w.variants?.[0]?.src} selected={selected === w.id} onSelect={onSelect} />
      ))}
    </div>
  );
}

// Sub-picker shown only for worlds with more than one image (currently just
// 水世界's 皇宮/小怪物) — same swatch style, one level deeper.
function WorldVariantGrid({ world, selected, onSelect }) {
  return (
    <div role="group" aria-label={`選擇${world.label}款式`} style={{ display: "flex", gap: 4, padding: "0 8px 10px", justifyContent: "center" }}>
      {world.variants.map(v => (
        <button key={v.id} onClick={() => onSelect(v.id)}
          aria-label={`${v.label}${selected === v.id ? "（目前選中）" : ""}`} aria-pressed={selected === v.id}
          style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: 4,
            background: selected === v.id ? "var(--panel-hover)" : "transparent",
            border: selected === v.id ? "1.5px solid var(--accent)" : "1.5px solid transparent",
            borderRadius: 10, cursor: "pointer",
          }}>
          <span style={{ width: 52, height: 36, borderRadius: 6, overflow: "hidden", background: `url(${v.src}) center/cover`, border: "1px solid rgba(0,0,0,0.15)" }} />
          <span style={{ fontSize: 10, color: "var(--text)", userSelect: "text", WebkitUserSelect: "text" }}>{v.label}</span>
        </button>
      ))}
    </div>
  );
}

export default function ThemeToggle({ mode = "floating", onOpenProfile, openUp = false, msgFontSize, onChangeMsgFontSize, onResetMsgFontSize }) {
  const [theme, setTheme] = useState("default");
  const [pastelPalette, setPastelPalette] = useState(DEFAULT_PASTEL_PALETTE);
  const [chatWorld, setChatWorld] = useState("none");
  const [chatWorldVariant, setChatWorldVariant] = useState(null);
  const [open, setOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const menuRef = useRef(null);
  const isMobile = useIsMobile();
  const router = useRouter();

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

    const savedWorld = getSavedWorldId();
    const savedVariant = getSavedVariantId(savedWorld);
    setChatWorld(savedWorld);
    setChatWorldVariant(savedVariant);
    // Unlike theme/palette (already set on <html> by the anti-flicker inline
    // script in _document.js before React even mounts), nothing has applied
    // the saved world's CSS variable yet — this is the first thing that does.
    applyWorld(savedWorld, savedVariant);
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

  // Refresh the switcher list each time the menu opens, so a nickname/avatar
  // change made just now (which also re-saves the entry — see pages/index.js)
  // shows up without needing a full reload.
  // MUST stay above the "floating + loggedIn" early return below — every
  // hook has to run unconditionally on every render (Rules of Hooks); this
  // one used to sit after that return and only ran when it *didn't* fire,
  // which crashed the whole app the moment loggedIn flipped true on any
  // page using mode="floating" ("Rendered fewer hooks than expected").
  useEffect(() => {
    if (open) setSavedAccounts(getSavedAccounts());
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

  const selectWorld = (id) => {
    setChatWorld(id);
    const world = CHAT_WORLDS.find(w => w.id === id);
    if (world?.variants) {
      const variant = getSavedVariantId(id);
      setChatWorldVariant(variant);
      applyWorld(id, variant);
      // Keep the menu open so 水世界's variant row (rendered below) is
      // reachable in the same interaction — same reasoning as pastel-pearl.
    } else {
      setChatWorldVariant(null);
      applyWorld(id, null);
      setOpen(false);
    }
  };

  const selectWorldVariant = (variantId) => {
    setChatWorldVariant(variantId);
    applyWorld(chatWorld, variantId);
    setOpen(false);
  };

  const openProfile = () => {
    if (onOpenProfile) onOpenProfile();
    else window.dispatchEvent(new CustomEvent("evon:open-profile"));
    setOpen(false);
  };

  // Not a real multi-session switch — signs out and, for a remembered
  // account, pre-fills its email on the login screen so the user only has
  // to type the password (see lib/accountSwitcher.js for why: true
  // simultaneous-session switching needs a much bigger auth rearchitecture).
  const switchToAccount = async (targetEmail) => {
    setPendingLoginEmail(targetEmail || "");
    setOpen(false);
    await auth.signOut();
    router.push("/");
  };
  const addAccount = () => switchToAccount("");
  const logout = () => switchToAccount("");

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
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          height: 42, padding: "0 14px", background: "var(--panel)", border: "1px solid var(--border)",
          borderRadius: 999, boxShadow: "var(--card-shadow)",
          backdropFilter: "var(--panel-blur)", WebkitBackdropFilter: "var(--panel-blur)",
          color: "var(--text)", fontSize: 14, fontWeight: 600, cursor: "pointer",
          whiteSpace: "nowrap",
        } : {
          background: "none", border: "none", color: "var(--text-faint)",
          cursor: "pointer", fontSize: 16, padding: 4, borderRadius: 6,
        }}
      >
        {mode === "floating" ? (
          /* 未登入（登入頁）才會走到這裡——顯示目前風格名稱的膠囊鈕，比原本
             一顆 ⚙️ 更清楚知道按下去是切換佈景。選單內容完全沒變，還是同一份
             4 種風格＋柔和珠光 6 種配色，讀寫的也是同一個 theme state。 */
          <>
            <span aria-hidden="true">{(THEMES.find(t => t.id === theme)?.label || "☀️ 淺色預設").slice(0, 2)}</span>
            <span>{(THEMES.find(t => t.id === theme)?.label || "☀️ 淺色預設").slice(2).trim()}</span>
            <span aria-hidden="true" style={{ fontSize: 10, color: "var(--text-faint)" }}>▾</span>
          </>
        ) : "⚙️"}
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
            maxHeight: "min(520px, calc(100vh - 80px))",
            overflowY: "auto",
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
                userSelect: "text", WebkitUserSelect: "text",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              👤 個人資料設定
            </button>
          )}

          {loggedIn && savedAccounts.filter(a => a.uid !== auth.currentUser?.uid).length > 0 && (
            <div style={{ borderBottom: "1px solid var(--border-soft)", padding: "6px 0" }}>
              {savedAccounts.filter(a => a.uid !== auth.currentUser?.uid).map(a => (
                <button key={a.uid} onClick={() => switchToAccount(a.email)}
                  style={{
                    display: "flex", alignItems: "center", gap: 8, width: "100%",
                    padding: "8px 14px", background: "none", border: "none",
                    color: "var(--text)", fontSize: 13, textAlign: "left", cursor: "pointer",
                    userSelect: "text", WebkitUserSelect: "text",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
                  onMouseLeave={e => e.currentTarget.style.background = "none"}>
                  {a.avatarImage ? (
                    <img src={a.avatarImage} alt="" style={{ width: 22, height: 22, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                  ) : (
                    <span style={{ width: 22, height: 22, borderRadius: "50%", background: a.color || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, flexShrink: 0 }}>{a.avatar || "😊"}</span>
                  )}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{a.nickname || a.email}</span>
                </button>
              ))}
            </div>
          )}

          {loggedIn && (
            <button
              onClick={addAccount}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "10px 14px", background: "none", border: "none",
                borderBottom: "1px solid var(--border-soft)", color: "var(--text)",
                fontSize: 13, textAlign: "left", cursor: "pointer",
                userSelect: "text", WebkitUserSelect: "text",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              ➕ 新增帳號
            </button>
          )}
          {onChangeMsgFontSize && (
            <div style={{ padding: "10px 14px", borderBottom: "1px solid var(--border-soft)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>訊息文字大小</span>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{msgFontSize}</span>
                  <button onClick={onResetMsgFontSize} title="復原文字大小與側欄/日曆版面尺寸"
                    style={{ background: "none", border: "1px solid var(--border)", borderRadius: 6, padding: "1px 6px", color: "var(--text-faint)", fontSize: 11, cursor: "pointer", userSelect: "text", WebkitUserSelect: "text" }}>
                    復原
                  </button>
                </div>
              </div>
              <input type="range" min={10} max={30} step={1} value={msgFontSize}
                onChange={e => onChangeMsgFontSize(Number(e.target.value))}
                style={{ width: "100%", cursor: "pointer" }} />
            </div>
          )}
          {VISIBLE_THEMES.map(t => (
            <button
              key={t.id}
              onClick={() => selectTheme(t.id)}
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%",
                padding: "9px 14px", background: "none", border: "none",
                borderBottom: t.id === "pastel-pearl" && showPaletteGrid && !isMobile ? "1px solid var(--border-soft)" : "none",
                color: "var(--text)", fontSize: 13, textAlign: "left", cursor: "pointer",
                userSelect: "text", WebkitUserSelect: "text",
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

          {/* Chat background ("世界") — per-device/browser only, applied to
              大廳/私訊/群組 message areas via a CSS variable (see chatWorlds.js). */}
          <div style={{ borderTop: "1px solid var(--border-soft)", padding: "8px 14px 0" }}>
            <div style={{ fontSize: 12, color: "var(--text-muted)" }}>聊天背景</div>
          </div>
          <WorldGrid selected={chatWorld} onSelect={selectWorld} />
          {chatWorld === "water" && (
            <WorldVariantGrid world={getWorldById("water")} selected={chatWorldVariant} onSelect={selectWorldVariant} />
          )}

          {loggedIn && (
            <button
              onClick={logout}
              style={{
                display: "flex", alignItems: "center", gap: 8, width: "100%",
                padding: "10px 14px", background: "none", border: "none",
                borderTop: "1px solid var(--border-soft)", color: "#ef4444",
                fontSize: 13, textAlign: "left", cursor: "pointer",
                userSelect: "text", WebkitUserSelect: "text",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
              onMouseLeave={e => e.currentTarget.style.background = "none"}
            >
              🚪 登出
            </button>
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
