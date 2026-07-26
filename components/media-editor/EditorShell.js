import { useState } from "react";

// Shared mobile-first layout for both editors: top bar (back/undo/redo/next),
// center preview, bottom tool strip, optional bottom drawer for a tool's
// settings. Single full-screen overlay — never a route change, never a new
// tab, so "back" is always just closing this overlay.
export default function EditorShell({
  onBack, onUndo, onRedo, canUndo, canRedo, onNext, nextLabel = "下一步", nextDisabled,
  preview, tools, activeTool, onSelectTool, drawer, busy,
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 2000, background: "#000",
      height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden",
      touchAction: "none",
    }}>
      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 4,
        padding: "calc(env(safe-area-inset-top) + 8px) 8px 8px",
        background: "#111",
      }}>
        <IconButton label="返回" onClick={onBack}>✕</IconButton>
        <IconButton label="復原" onClick={onUndo} disabled={!canUndo}>↶</IconButton>
        <IconButton label="重做" onClick={onRedo} disabled={!canRedo}>↷</IconButton>
        <div style={{ flex: 1 }} />
        <button onClick={onNext} disabled={nextDisabled || busy}
          style={{
            minHeight: 44, padding: "0 20px", borderRadius: 22, border: "none",
            background: (nextDisabled || busy) ? "#333" : "linear-gradient(135deg,var(--accent),var(--accent-2))",
            color: (nextDisabled || busy) ? "#777" : "#fff",
            fontSize: 14, fontWeight: 700, cursor: (nextDisabled || busy) ? "default" : "pointer",
          }}>
          {busy ? "處理中..." : nextLabel}
        </button>
      </div>

      {/* Preview */}
      <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", background: "#000", overflow: "hidden" }}>
        {preview}
      </div>

      {/* Bottom tool strip. 5 or fewer tools (mobile: content tools + one
          centered "編輯" hub covering crop/rotate/adjust/privacy) get an
          evenly-spaced, non-scrolling row with the hub raised like a FAB;
          more than that (desktop's full 8) falls back to a scrollable strip. */}
      <div style={{
        flexShrink: 0, display: "flex", gap: 4,
        overflowX: tools.length > 5 ? "auto" : "visible",
        justifyContent: tools.length <= 5 ? "space-around" : "flex-start",
        padding: "8px calc(env(safe-area-inset-left) + 8px) 8px calc(env(safe-area-inset-right) + 8px)",
        background: "#111", borderTop: "1px solid #222",
      }}>
        {tools.map(t => (
          <button key={t.id} onClick={() => onSelectTool(t.id)}
            style={{
              flexShrink: 0, minWidth: t.elevated ? 60 : 56, minHeight: t.elevated ? 52 : 44,
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 2,
              borderRadius: t.elevated ? 26 : 12, border: "none",
              marginTop: t.elevated ? -14 : 0,
              boxShadow: t.elevated ? "0 4px 14px rgba(0,0,0,0.4)" : "none",
              background: t.elevated ? "linear-gradient(135deg,var(--accent),var(--accent-2))" : (activeTool === t.id ? "rgba(255,255,255,0.15)" : "transparent"),
              color: t.elevated ? "var(--accent-text)" : (activeTool === t.id ? "#fff" : "#aaa"),
              cursor: "pointer", padding: "4px 8px",
            }}>
            <span style={{ fontSize: t.elevated ? 22 : 18, lineHeight: 1 }} aria-hidden="true">{t.icon}</span>
            <span style={{ fontSize: 10, whiteSpace: "nowrap" }}>{t.label}</span>
          </button>
        ))}
      </div>

      {/* Bottom drawer (tool settings) */}
      {drawer && (
        <div style={{
          flexShrink: 0, maxHeight: "40dvh", overflowY: "auto",
          padding: "12px calc(env(safe-area-inset-left) + 12px) calc(env(safe-area-inset-bottom) + 12px) calc(env(safe-area-inset-right) + 12px)",
          background: "#181818", borderTop: "1px solid #222",
        }}>
          {drawer}
        </div>
      )}
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label}
      style={{
        width: 44, height: 44, borderRadius: 22, border: "none", background: "transparent",
        color: disabled ? "#444" : "#fff", fontSize: 20, cursor: disabled ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
      {children}
    </button>
  );
}

// Small reusable slider row for the "adjust" style panels (brightness/
// contrast/saturation/volume/speed...).
export function DrawerSlider({ label, value, min, max, step, onChange }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "#aaa", marginBottom: 6 }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", height: 44 }} />
    </div>
  );
}

// Horizontal scrollable chip row (filters, transitions, sticker picker...).
export function DrawerChipRow({ items, activeId, onSelect, renderLabel }) {
  const [hoverId, setHoverId] = useState(null);
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
      {items.map(item => (
        <button key={item.id} onClick={() => onSelect(item.id)}
          onMouseEnter={() => setHoverId(item.id)} onMouseLeave={() => setHoverId(null)}
          style={{
            flexShrink: 0, minHeight: 44, padding: "0 14px", borderRadius: 20,
            border: activeId === item.id ? "1px solid var(--accent)" : "1px solid #333",
            background: activeId === item.id ? "var(--accent)" : (hoverId === item.id ? "#222" : "#181818"),
            color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap",
          }}>
          {renderLabel ? renderLabel(item) : item.label}
        </button>
      ))}
    </div>
  );
}
