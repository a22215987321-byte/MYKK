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
      // Local theme vars for the pieces shared with the embedded 圖片編輯室
      // layout (ToolButton, DrawerSlider, DrawerChipRow, toolBtnStyle) — set
      // here to the exact literals this fullscreen chrome always used, so
      // sharing that code with a differently-themed embedded layout (which
      // sets these to the app's light theme tokens instead) can't change
      // anything here.
      "--pe-bg": "#111", "--pe-bg-2": "#181818", "--pe-control-bg": "#222",
      "--pe-text": "#fff", "--pe-text-dim": "#aaa", "--pe-text-disabled": "#444", "--pe-border": "#333",
      "--pe-canvas-bg": "#000",
      "--pe-selected-bg": "linear-gradient(135deg,var(--accent),var(--accent-2))",
      "--pe-selected-text": "var(--accent-text)",
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
            minHeight: 44, padding: "0 22px", borderRadius: 999, border: "none",
            background: (nextDisabled || busy) ? "#333" : "linear-gradient(135deg,var(--accent),var(--accent-2))",
            color: (nextDisabled || busy) ? "#777" : "var(--accent-text)",
            boxShadow: (nextDisabled || busy) ? "none" : "0 6px 16px rgba(0,0,0,0.45)",
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
          more than that (desktop's full 8) falls back to a scrollable strip.
          A subtle top border + upward shadow separates this strip from the
          preview above it, instead of the two blending together. */}
      <div style={{
        flexShrink: 0, display: "flex", gap: 4,
        overflowX: tools.length > 5 ? "auto" : "visible",
        justifyContent: tools.length <= 5 ? "space-around" : "flex-start",
        padding: "8px calc(env(safe-area-inset-left) + 8px) 8px calc(env(safe-area-inset-right) + 8px)",
        background: "#111", borderTop: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 -6px 14px rgba(0,0,0,0.3)", position: "relative", zIndex: 1,
      }}>
        {tools.map(t => (
          <ToolButton key={t.id} tool={t} active={activeTool === t.id} onClick={() => onSelectTool(t.id)}
            disabled={t.disabled} title={t.title} />
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

// One tool-strip button: transparent when idle, filled with the accent
// gradient when selected; `elevated` (the fullscreen mobile 編輯 hub) gets a
// bigger raised circular treatment on top of the same fill logic. Shared by
// EditorShell's own strip and the embedded 圖片編輯室 layout's tool row.
export function ToolButton({ tool, active, onClick, disabled, title }) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled} title={title}
      style={{
        flexShrink: 0, minWidth: tool.elevated ? 60 : 56, minHeight: tool.elevated ? 52 : 44,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 2,
        borderRadius: tool.elevated ? 26 : 14, border: "none",
        marginTop: tool.elevated ? -14 : 0,
        boxShadow: tool.elevated ? (active ? "0 4px 16px rgba(0,0,0,0.45)" : "0 4px 12px rgba(0,0,0,0.35)") : "none",
        background: active
          ? "var(--pe-selected-bg)"
          : (tool.elevated ? "var(--pe-control-bg)" : "transparent"),
        color: active ? "var(--pe-selected-text)" : "var(--pe-text-dim)",
        cursor: disabled ? "not-allowed" : "pointer", padding: "4px 8px",
        opacity: disabled ? 0.4 : 1,
        transition: "background 0.15s, color 0.15s",
      }}>
      <span style={{ fontSize: tool.elevated ? 22 : 18, lineHeight: 1 }} aria-hidden="true">{tool.icon}</span>
      <span style={{ fontSize: 10, whiteSpace: "nowrap" }}>{tool.label}</span>
    </button>
  );
}

export function IconButton({ label, onClick, disabled, children }) {
  return (
    <button onClick={onClick} disabled={disabled} aria-label={label} title={label}
      style={{
        width: 44, height: 44, borderRadius: 22, border: "none", background: "transparent",
        color: disabled ? "var(--pe-text-disabled)" : "var(--pe-text)", fontSize: 20, cursor: disabled ? "default" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
      {children}
    </button>
  );
}

// Small reusable slider row for the "adjust" style panels (brightness/
// contrast/saturation/volume/speed...).
export function DrawerSlider({ label, value, min, max, step, onChange, disabled }) {
  return (
    <div style={{ marginBottom: 14, opacity: disabled ? 0.4 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--pe-text-dim)", marginBottom: 6 }}>
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} disabled={disabled}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", height: 44, cursor: disabled ? "not-allowed" : "pointer" }} />
    </div>
  );
}

// Horizontal scrollable chip row (filters, transitions, sticker picker...).
export function DrawerChipRow({ items, activeId, onSelect, renderLabel, disabled }) {
  const [hoverId, setHoverId] = useState(null);
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, opacity: disabled ? 0.4 : 1 }}>
      {items.map(item => (
        <button key={item.id} onClick={disabled ? undefined : () => onSelect(item.id)} disabled={disabled}
          onMouseEnter={() => setHoverId(item.id)} onMouseLeave={() => setHoverId(null)}
          style={{
            flexShrink: 0, minHeight: 44, padding: "0 14px", borderRadius: 20,
            border: activeId === item.id ? "1px solid var(--accent)" : "1px solid var(--pe-border)",
            background: activeId === item.id ? "var(--accent)" : (hoverId === item.id ? "var(--pe-control-bg)" : "var(--pe-bg-2)"),
            color: activeId === item.id ? "var(--accent-text)" : "var(--pe-text)",
            fontSize: 12, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", whiteSpace: "nowrap",
          }}>
          {renderLabel ? renderLabel(item) : item.label}
        </button>
      ))}
    </div>
  );
}
