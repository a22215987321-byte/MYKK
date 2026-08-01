import { useState, useEffect, useRef } from "react";

const NAV_MIN_W = 80;
const NAV_MAX_W = 420;

export default function NavItem({ icon, iconBg, label, sublabel, active, onClick, compact, mobileTouch }) {
  // 每個項目的闊度可以自己拖曳調整、各自記住——用 label 當 localStorage key，
  // 因為側欄裡每個項目的 label 本來就是唯一的，不用另外幫每個呼叫端加 id prop。
  const [widthOverride, setWidthOverride] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`cr-navw-${label}`);
      const w = raw ? parseInt(raw, 10) : NaN;
      if (w >= NAV_MIN_W && w <= NAV_MAX_W) setWidthOverride(w);
    } catch {}
  }, [label]);

  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = e.currentTarget.parentElement.offsetWidth;
    const onMove = (ev) => {
      const w = Math.min(NAV_MAX_W, Math.max(NAV_MIN_W, startW + (ev.clientX - startX)));
      setWidthOverride(w);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setWidthOverride(w => {
        try { localStorage.setItem(`cr-navw-${label}`, String(w)); } catch {}
        return w;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const resetWidth = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setWidthOverride(null);
    try { localStorage.removeItem(`cr-navw-${label}`); } catch {}
  };

  return (
    <button onClick={onClick} className={`fb ${active ? "act" : ""}`}
      style={{
        width: widthOverride ? `${widthOverride}px` : "100%", display: "flex", alignItems: "center", gap: 10, position: "relative",
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

      {/* 闊度拖曳把手：貼在項目右側邊緣的一條窄條，平常幾乎看不到，滑過去游標
          會變成左右拖曳的樣子。點下去/雙擊都會 stopPropagation，不會誤觸上面
          按鈕本身的 onClick（切換頁面）。 */}
      <div onMouseDown={startResize} onDoubleClick={resetWidth} onClick={e => e.stopPropagation()}
        title="拖曳調整闊度（雙擊重設）"
        style={{ position: "absolute", top: 4, bottom: 4, right: -3, width: 6, cursor: "col-resize", zIndex: 5 }} />
    </button>
  );
}
