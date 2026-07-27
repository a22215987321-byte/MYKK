import { useRef, useState } from "react";
import { ToolButton, IconButton, DrawerChipRow } from "./EditorShell";
import useIsMobile from "../../lib/useIsMobile";
import usePhotoEditorCore, {
  renderPhotoEditorDrawer, TOOLS, MOBILE_TOOLS, EDIT_GROUP_IDS, toolById, withPhotoToolState,
} from "./usePhotoEditorCore";

// Inline/embedded layout for the standalone 圖片編輯室 (ImageEditorRoom) —
// same canvas/tool/history logic as the fullscreen PhotoEditor (both use
// usePhotoEditorCore), but laid out as a normal block within the page
// instead of a position:fixed overlay: no black backdrop, nothing covers
// the app's own sidebar/calendar. Mobile still collapses to the same
// 5-icon + 編輯-hub strip as the fullscreen editor (same MOBILE_TOOLS); only
// desktop keeps all 8 expanded, since there's no cramped fixed-height
// chrome forcing the collapse there.
export default function PhotoEditorEmbedded({ file, draftId, onCancel, onExport }) {
  const isMobile = useIsMobile();
  const [editHubOpen, setEditHubOpen] = useState(false);
  const core = usePhotoEditorCore({ file, draftId, onExport });
  const {
    canvasElRef, containerRef, ready, activeTool, setActiveTool, selectTool, busy, canUndo, canRedo,
    undo, redo, eraseStrokeAt, handleExport, hasImage, importPhoto,
  } = core;
  const importInputRef = useRef(null);

  const isEditGroupActive = EDIT_GROUP_IDS.includes(activeTool);

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
      items={EDIT_GROUP_IDS.map(toolById)}
      activeId={null}
      onSelect={(id) => { setActiveTool(id); setEditHubOpen(false); }}
      renderLabel={item => `${item.icon} ${item.label}`}
    />
  );

  const drawer = isMobile && editHubOpen && !isEditGroupActive
    ? editHubPicker
    : renderPhotoEditorDrawer(core);

  const tools = withPhotoToolState(isMobile ? MOBILE_TOOLS : TOOLS, hasImage);
  const displayActiveTool = isMobile && (editHubOpen || isEditGroupActive) ? "editHub" : activeTool;

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
        <input ref={importInputRef} type="file" accept="image/*" style={{ display: "none" }}
          onChange={e => { const f = e.target.files?.[0]; e.target.value = ""; if (f) importPhoto(f); }} />
        <IconButton label="匯入照片" onClick={() => importInputRef.current?.click()}>🖼️</IconButton>
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
        <canvas ref={canvasElRef} onClick={activeTool === "brush" ? eraseStrokeAt : undefined} />
        {!ready && <div style={{ position: "absolute", color: "#888", fontSize: 13 }}>載入中...</div>}
      </div>

      {/* Tool strip — 8 tools on desktop; mobile collapses to the same
          5-icon + 編輯 hub strip as the fullscreen editor. */}
      <div style={{
        flexShrink: 0, display: "flex", gap: 4, overflowX: tools.length > 5 ? "auto" : "visible",
        justifyContent: tools.length <= 5 ? "space-around" : "flex-start",
        padding: "12px", background: "#111", borderTop: "1px solid rgba(255,255,255,0.08)",
      }}>
        {tools.map(t => (
          <ToolButton key={t.id} tool={t} active={displayActiveTool === t.id} onClick={() => handleSelectTool(t.id)}
            disabled={t.disabled} title={t.title} />
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
