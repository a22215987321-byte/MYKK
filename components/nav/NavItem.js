import { useState, useEffect, useRef } from "react";

const NAV_MIN_H = 36;
const NAV_MAX_H = 160;

export default function NavItem({ icon, iconBg, label, sublabel, active, onClick, compact, mobileTouch }) {
  // 每個項目的高度可以自己拖曳調整、各自記住——用 label 當 localStorage key，
  // 因為側欄裡每個項目的 label 本來就是唯一的，不用另外幫每個呼叫端加 id prop。
  const [heightOverride, setHeightOverride] = useState(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`cr-navh-${label}`);
      const h = raw ? parseInt(raw, 10) : NaN;
      if (h >= NAV_MIN_H && h <= NAV_MAX_H) setHeightOverride(h);
    } catch {}
  }, [label]);

  const startResize = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const startY = e.clientY;
    const startH = e.currentTarget.parentElement.offsetHeight;
    const onMove = (ev) => {
      const h = Math.min(NAV_MAX_H, Math.max(NAV_MIN_H, startH + (ev.clientY - startY)));
      setHeightOverride(h);
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setHeightOverride(h => {
        try { localStorage.setItem(`cr-navh-${label}`, String(h)); } catch {}
        return h;
      });
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const resetHeight = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setHeightOverride(null);
    try { localStorage.removeItem(`cr-navh-${label}`); } catch {}
  };

  return (
    <button onClick={onClick} className={`fb ${active ? "act" : ""}`}
      style={{
        width: "100%", display: "flex", alignItems: "center", gap: 10, position: "relative",
        padding: compact ? "8px 10px" : "9px 10px", boxSizing: "border-box",
        height: heightOverride ? `${heightOverride}px` : undefined,
        minHeight: heightOverride ? undefined : `var(--navcard-height, ${mobileTouch ? "44px" : "auto"})`,
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
      <div>
        <div style={{ fontWeight: 600, fontSize: 13 }}>{label}</div>
        {sublabel && <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{sublabel}</div>}
      </div>

      {/* 高度拖曳把手：貼在項目底部邊緣的一條窄條，平常幾乎看不到，滑過去游標
          會變成上下拖曳的樣子。點下去/雙擊都會 stopPropagation，不會誤觸上面
          按鈕本身的 onClick（切換頁面）。 */}
      <div onMouseDown={startResize} onDoubleClick={resetHeight} onClick={e => e.stopPropagation()}
        title="拖曳調整高度（雙擊重設）"
        style={{ position: "absolute", left: 6, right: 6, bottom: -3, height: 6, cursor: "row-resize", zIndex: 5 }} />
    </button>
  );
}
