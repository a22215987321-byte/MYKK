import { useRef } from "react";
import { ToolButton, IconButton } from "./EditorShell";
import usePhotoEditorCore, { renderPhotoEditorDrawer, TOOLS } from "./usePhotoEditorCore";

// Inline/embedded layout for the standalone 圖片編輯室 (ImageEditorRoom) —
// same canvas/tool/history logic as the fullscreen PhotoEditor (both use
// usePhotoEditorCore), but laid out as a normal block within the page
// instead of a position:fixed overlay: no black backdrop, nothing covers
// the app's own sidebar/calendar, and all 8 tools stay directly visible
// (no mobile 5-icon/編輯-hub collapse — there's room here since this isn't
// squeezed under a fixed viewport-height chrome).
//
// onImportPhoto is optional: when the room opens straight into a blank
// canvas (desktop, no `file`), this lets the user bring in a real photo
// mid-session. Passing a new file re-keys usePhotoEditorCore's init effect,
// so it restarts the canvas fresh with that photo as the base — anything
// drawn on the blank canvas before that point is not carried over.
export default function PhotoEditorEmbedded({ file, draftId, onCancel, onExport, onImportPhoto }) {
  const core = usePhotoEditorCore({ file, draftId, onExport });
  const {
    canvasElRef, containerRef, ready, activeTool, selectTool, busy, canUndo, canRedo,
    undo, redo, eraseStrokeAt, handleExport,
  } = core;
  const importInputRef = useRef(null);

  const drawer = renderPhotoEditorDrawer(core);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0, background: "var(--panel)" }}>
      {/* Top bar — local to this embedded area, not stuck to the browser viewport.
          Padding matches the tool strip/drawer below (12px) for a consistent
          rhythm instead of each block picking its own inset. */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 4, padding: "12px",
        background: "#111", borderTopLeftRadius: "var(--radius-lg)", borderTopRightRadius: "var(--radius-lg)",
      }}>
        <IconButton label="返回" onClick={onCancel}>✕</IconButton>
        <IconButton label="復原" onClick={undo} disabled={!canUndo}>↶</IconButton>
        <IconButton label="重做" onClick={redo} disabled={!canRedo}>↷</IconButton>
        {onImportPhoto && (
          <>
            <input ref={importInputRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) onImportPhoto(f); }} />
            <IconButton label="匯入照片" onClick={() => importInputRef.current?.click()}>🖼️</IconButton>
          </>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={handleExport} disabled={!ready || busy}
          style={{
            minHeight: 44, padding: "0 22px", borderRadius: 999, border: "none",
            background: (!ready || busy) ? "#333" : "linear-gradient(135deg,var(--accent),var(--accent-2))",
            color: (!ready || busy) ? "#777" : "var(--accent-text)",
            boxShadow: (!ready || busy) ? "none" : "0 6px 16px rgba(0,0,0,0.45)",
            fontSize: 14, fontWeight: 700, cursor: (!ready || busy) ? "default" : "pointer",
          }}>
          {busy ? "處理中..." : "完成"}
        </button>
      </div>

      {/* Canvas area — sized to whatever's left, fitCanvasToContainer (via
          ResizeObserver in the core hook) keeps the canvas scaled to fill it
          whenever this area's own size changes, including when the drawer
          below opens/closes. */}
      <div ref={containerRef} style={{
        flex: 1, minHeight: 200, position: "relative", display: "flex",
        alignItems: "center", justifyContent: "center", background: "#000", overflow: "hidden",
      }}>
        <canvas ref={canvasElRef} onClick={activeTool === "brush-erase" ? eraseStrokeAt : undefined} />
        {!ready && <div style={{ position: "absolute", color: "#888", fontSize: 13 }}>載入中...</div>}
      </div>

      {/* Tool strip — all 8 tools directly, no mobile collapse */}
      <div style={{
        flexShrink: 0, display: "flex", gap: 4, overflowX: "auto", justifyContent: "flex-start",
        padding: "12px", background: "#111", borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
        {TOOLS.map(t => (
          <ToolButton key={t.id} tool={t} active={activeTool === t.id} onClick={() => selectTool(t.id)} />
        ))}
      </div>

      {/* Tool settings — inline block, not an overlay drawer */}
      {drawer && (
        <div style={{
          flexShrink: 0, maxHeight: "40dvh", overflowY: "auto", padding: "12px",
          background: "#181818", borderTop: "1px solid #222",
          borderBottomLeftRadius: "var(--radius-lg)", borderBottomRightRadius: "var(--radius-lg)",
        }}>
          {drawer}
        </div>
      )}
    </div>
  );
}
