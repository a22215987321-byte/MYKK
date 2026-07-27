import { useState } from "react";
import EditorShell, { DrawerChipRow } from "./EditorShell";
import useIsMobile from "../../lib/useIsMobile";
import usePhotoEditorCore, {
  renderPhotoEditorDrawer, TOOLS, MOBILE_TOOLS, EDIT_GROUP_IDS, toolById,
} from "./usePhotoEditorCore";

// Fullscreen wrapper used by post composers (Feed.js, profile/[uid].js) —
// "quick edit before posting" is meant to be an immersive, full-screen
// experience. All the actual canvas/tool logic lives in usePhotoEditorCore;
// this file is just the fullscreen chrome + the mobile "8 tools -> 5 icons
// with a 編輯 hub" collapse, which is specific to this cramped fullscreen
// bottom strip and not used by the embedded 圖片編輯室 layout.
export default function PhotoEditor({ file, draftId, onCancel, onExport }) {
  const isMobile = useIsMobile();
  const [editHubOpen, setEditHubOpen] = useState(false);

  const core = usePhotoEditorCore({ file, draftId, onExport });
  const { canvasElRef, containerRef, ready, activeTool, setActiveTool, busy, canUndo, canRedo, undo, redo, eraseStrokeAt, handleExport } = core;

  const isEditGroupActive = EDIT_GROUP_IDS.includes(activeTool);

  const handleSelectTool = (id) => {
    if (id === "editHub") {
      if (isEditGroupActive) { setActiveTool(null); setEditHubOpen(false); }
      else setEditHubOpen(prev => !prev);
      return;
    }
    setEditHubOpen(false);
    setActiveTool(prev => prev === id ? null : id);
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

  return (
    <EditorShell
      onBack={onCancel}
      onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
      onNext={handleExport} nextLabel="發布" nextDisabled={!ready} busy={busy}
      tools={isMobile ? MOBILE_TOOLS : TOOLS}
      activeTool={isMobile && (editHubOpen || isEditGroupActive) ? "editHub" : activeTool}
      onSelectTool={handleSelectTool}
      drawer={drawer}
      preview={
        <div ref={containerRef} style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <canvas ref={canvasElRef} onClick={activeTool === "brush-erase" ? eraseStrokeAt : undefined} />
          {!ready && <div style={{ position: "absolute", color: "#888", fontSize: 13 }}>載入中...</div>}
        </div>
      }
    />
  );
}
