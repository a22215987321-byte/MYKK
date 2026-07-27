import { useRef, useState } from "react";
import { ToolButton, IconButton, DrawerChipRow } from "./EditorShell";
import useIsMobile from "../../lib/useIsMobile";
import usePhotoEditorCore, {
  renderPhotoEditorDrawer, TOOLS, MOBILE_TOOLS, EDIT_GROUP_IDS, TRIM_TOOL, toolById, withPhotoToolState,
} from "./usePhotoEditorCore";
import TextPanel from "./TextPanel";

const ZOOM_OPTIONS = [50, 75, 100, 125, 150, 200, 300, 400];
// 去除留白 only exists here (see TRIM_TOOL) — appended after 馬賽克 on desktop's
// full strip, folded into mobile's 編輯 hub alongside the other "whole
// canvas" tools instead of a 6th direct icon.
const DESKTOP_TOOLS = [...TOOLS, TRIM_TOOL];
const EMBEDDED_EDIT_GROUP_IDS = [...EDIT_GROUP_IDS, "trim"];
const embeddedToolById = (id) => (id === "trim" ? TRIM_TOOL : toolById(id));

// Inline/embedded layout for the standalone 圖片編輯室 (ImageEditorRoom) —
// same canvas/tool/history logic as the fullscreen PhotoEditor (both use
// usePhotoEditorCore), but a light theme matching the app's own panel/text/
// border tokens (not a separate palette) with the tool strip as a left
// sidebar on desktop instead of a bottom strip. Mobile keeps the bottom
// strip (no room for a sidebar on a narrow screen) with the same 5-icon +
// 編輯-hub collapse as the fullscreen editor.
//
// --pe-* custom properties below re-theme the pieces shared with the
// fullscreen editor (ToolButton, IconButton, DrawerSlider/ChipRow,
// toolBtnStyle) — EditorShell.js sets the same variables to the original
// dark literals, so that component's own appearance is untouched.
export default function PhotoEditorEmbedded({ file, draftId, onCancel, onExport }) {
  const isMobile = useIsMobile();
  const [editHubOpen, setEditHubOpen] = useState(false);
  const core = usePhotoEditorCore({ file, draftId, onExport });
  const {
    canvasElRef, containerRef, ready, activeTool, setActiveTool, selectTool, busy, canUndo, canRedo,
    undo, redo, eraseStrokeAt, handleExport, hasImage, importPhoto,
    zoomPct, applyZoomPct, snapEnabled, setSnapEnabled,
  } = core;
  const importInputRef = useRef(null);

  const isEditGroupActive = EMBEDDED_EDIT_GROUP_IDS.includes(activeTool);

  const handleSelectTool = (id) => {
    if (id === "editHub") {
      if (isEditGroupActive) { setActiveTool(null); setEditHubOpen(false); }
      else setEditHubOpen(prev => !prev);
      return;
    }
    setEditHubOpen(false);
    selectTool(id);
  };

  const editHubPicker = (
    <DrawerChipRow
      items={EMBEDDED_EDIT_GROUP_IDS.map(embeddedToolById)}
      activeId={null}
      onSelect={(id) => { setActiveTool(id); setEditHubOpen(false); }}
      renderLabel={item => `${item.icon} ${item.label}`}
    />
  );

  // The text tool gets its own rich tabbed panel (TextPanel) instead of the
  // shared 2-button drawer — kept out of renderPhotoEditorDrawer entirely so
  // the fullscreen editor's text drawer is untouched.
  const drawer = activeTool === "text"
    ? <TextPanel core={core} />
    : (isMobile && editHubOpen && !isEditGroupActive ? editHubPicker : renderPhotoEditorDrawer(core));

  const tools = withPhotoToolState(isMobile ? MOBILE_TOOLS : DESKTOP_TOOLS, hasImage);
  const displayActiveTool = isMobile && (editHubOpen || isEditGroupActive) ? "editHub" : activeTool;

  return (
    <div style={{
      display: "flex", flexDirection: "column", height: "100%", minHeight: 0,
      background: "var(--pe-bg)",
      // Light theme, reusing the app's own tokens — not a separate palette.
      "--pe-bg": "var(--panel)", "--pe-bg-2": "var(--panel-alt)", "--pe-control-bg": "var(--panel-alt)",
      "--pe-text": "var(--text)", "--pe-text-dim": "var(--text-muted)", "--pe-text-disabled": "var(--text-dim)",
      "--pe-border": "var(--border)", "--pe-canvas-bg": "var(--border)",
      "--pe-selected-bg": "var(--accent-active)", "--pe-selected-text": "var(--text)",
    }}>
      {/* Top bar */}
      <div style={{
        flexShrink: 0, display: "flex", alignItems: "center", gap: 6, padding: "10px 12px",
        background: "var(--pe-bg)", borderBottom: "1px solid var(--pe-border)",
        borderTopLeftRadius: "var(--radius-lg)", borderTopRightRadius: "var(--radius-lg)",
        flexWrap: "wrap", rowGap: 8,
      }}>
        <IconButton label="返回" onClick={onCancel}>✕</IconButton>
        <IconButton label="復原" onClick={undo} disabled={!canUndo}>↶</IconButton>
        <IconButton label="重做" onClick={redo} disabled={!canRedo}>↷</IconButton>

        <input ref={importInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importPhoto(f); }} />
        <button onClick={() => importInputRef.current?.click()}
          style={{
            display: "flex", alignItems: "center", gap: 6, minHeight: 36, padding: "0 12px", borderRadius: 8,
            border: "1px solid var(--pe-border)", background: "var(--pe-control-bg)", color: "var(--pe-text)",
            fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
          📂 開啟圖片
        </button>

        <div style={{ flex: 1, minWidth: 8 }} />

        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--pe-text-dim)" }}>
          縮放
          <select value={zoomPct} onChange={e => applyZoomPct(Number(e.target.value))}
            style={{
              minHeight: 36, borderRadius: 8, border: "1px solid var(--pe-border)",
              background: "var(--pe-control-bg)", color: "var(--pe-text)", fontSize: 13, padding: "0 8px",
            }}>
            {ZOOM_OPTIONS.map(z => <option key={z} value={z}>{z}%</option>)}
          </select>
        </label>

        {/* Snap-to-guides is currently just this on/off switch — the actual
            guide-line/snap-correction behavior isn't built yet (see chat). */}
        <button onClick={() => setSnapEnabled(v => !v)} aria-pressed={snapEnabled}
          style={{
            minHeight: 36, padding: "0 12px", borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: "pointer",
            border: snapEnabled ? "1px solid var(--accent)" : "1px solid var(--pe-border)",
            background: snapEnabled ? "var(--accent-active)" : "var(--pe-control-bg)",
            color: "var(--pe-text)",
          }}>
          {snapEnabled ? "✓ 對齊輔助" : "對齊輔助"}
        </button>

        <button onClick={handleExport} disabled={!ready || busy}
          style={{
            minHeight: 36, padding: "0 20px", borderRadius: 999, border: "none",
            background: (!ready || busy) ? "var(--pe-control-bg)" : "linear-gradient(135deg,var(--accent),var(--accent-2))",
            color: (!ready || busy) ? "var(--pe-text-disabled)" : "var(--accent-text)",
            fontSize: 14, fontWeight: 700, cursor: (!ready || busy) ? "default" : "pointer",
          }}>
          {busy ? "處理中..." : "完成"}
        </button>
      </div>

      {/* Body: left tool sidebar (desktop) + canvas/drawer column */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "row" }}>
        {!isMobile && (
          <div style={{
            flexShrink: 0, width: 76, display: "flex", flexDirection: "column", gap: 4,
            padding: 8, overflowY: "auto", background: "var(--pe-bg-2)", borderRight: "1px solid var(--pe-border)",
          }}>
            {tools.map(t => (
              <ToolButton key={t.id} tool={t} active={activeTool === t.id} onClick={() => selectTool(t.id)}
                disabled={t.disabled} title={t.title} />
            ))}
          </div>
        )}

        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", minHeight: 0 }}>
          {/* Canvas area — sized to whatever's left, fitCanvasToContainer (via
              ResizeObserver in the core hook) keeps the canvas scaled to fill
              it whenever this area's own size changes. */}
          <div ref={containerRef} style={{
            flex: 1, minHeight: 200, position: "relative", display: "flex",
            alignItems: "center", justifyContent: "center", background: "var(--pe-canvas-bg)", overflow: "hidden",
          }}>
            <canvas ref={canvasElRef} onClick={activeTool === "brush" ? eraseStrokeAt : undefined} />
            {!ready && <div style={{ position: "absolute", color: "var(--pe-text-dim)", fontSize: 13 }}>載入中...</div>}
          </div>

          {/* Mobile tool strip — 5 icons + 編輯 hub, same as fullscreen */}
          {isMobile && (
            <div style={{
              flexShrink: 0, display: "flex", gap: 4, overflowX: tools.length > 5 ? "auto" : "visible",
              justifyContent: tools.length <= 5 ? "space-around" : "flex-start",
              padding: 12, background: "var(--pe-bg)", borderTop: "1px solid var(--pe-border)",
            }}>
              {tools.map(t => (
                <ToolButton key={t.id} tool={t} active={displayActiveTool === t.id} onClick={() => handleSelectTool(t.id)}
                  disabled={t.disabled} title={t.title} />
              ))}
            </div>
          )}

          {/* Tool settings — inline block, not an overlay drawer */}
          {drawer && (
            <div style={{
              flexShrink: 0, maxHeight: "40dvh", overflowY: "auto", padding: 12,
              background: "var(--pe-bg-2)", borderTop: "1px solid var(--pe-border)",
              borderBottomRightRadius: "var(--radius-lg)",
            }}>
              {drawer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
