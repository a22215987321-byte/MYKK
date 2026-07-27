import { useState, useEffect, useRef, useCallback } from "react";
import * as fabric from "fabric";
import { DrawerSlider, DrawerChipRow } from "./EditorShell";
import { saveDraft } from "./editorDb";

// Working resolution cap — social output never needs more than this, and
// capping it keeps both the live canvas and the exported Blob fast on
// mid-range phones (see "降解析度預覽" in the perf requirements). If a
// photo is smaller than this to begin with, it's used at its own size.
const MAX_EDIT_DIMENSION = 1440;
const HISTORY_LIMIT = 30;
// Default working size when the editor opens with no photo at all (see the
// `file` being null/undefined below) — a blank sheet to draw/type/stick on.
const BLANK_CANVAS_SIZE = 1080;

export const ASPECTS = [
  { id: "original", label: "原圖", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

// Each preset composes onto whatever the brightness/contrast/saturation
// sliders are already doing — they're independent filter slots on the
// same image, not mutually exclusive "pick one" modes.
export const PRESET_FILTERS = [
  { id: "none", label: "原圖", make: () => null },
  { id: "bw", label: "黑白", make: () => new fabric.filters.Grayscale() },
  { id: "sepia", label: "復古棕", make: () => new fabric.filters.Sepia() },
  { id: "vintage", label: "陳舊", make: () => new fabric.filters.Vintage() },
  { id: "kodachrome", label: "柯達", make: () => new fabric.filters.Kodachrome() },
  { id: "technicolor", label: "特藝彩色", make: () => new fabric.filters.Technicolor() },
  { id: "polaroid", label: "拍立得", make: () => new fabric.filters.Polaroid() },
  { id: "brownie", label: "布朗尼", make: () => new fabric.filters.Brownie() },
  { id: "blackwhite", label: "高反差黑白", make: () => new fabric.filters.BlackWhite() },
  { id: "invert", label: "反相", make: () => new fabric.filters.Invert() },
];

export const STICKER_EMOJIS = ["❤️", "🔥", "😂", "😍", "🎉", "✨", "👍", "🥳", "💯", "🙌", "😎", "⭐"];

export const TOOLS = [
  { id: "crop", icon: "⬚", label: "裁剪" },
  { id: "rotate", icon: "⟳", label: "旋轉" },
  { id: "filter", icon: "◐", label: "濾鏡" },
  { id: "adjust", icon: "☀", label: "調整" },
  { id: "text", icon: "T", label: "文字" },
  { id: "sticker", icon: "😊", label: "貼圖" },
  { id: "brush", icon: "✎", label: "畫筆" },
  { id: "privacy", icon: "▦", label: "馬賽克" },
];
export const toolById = id => TOOLS.find(t => t.id === id);

// Mobile bottom strip (fullscreen EditorShell only) collapses the 8 tools
// down to 5: the 4 "whole image" tools (crop/rotate/adjust/privacy) fold
// into one centered, raised 編輯 hub button. The embedded layout (圖片編輯
// room) always shows all 8 directly and doesn't use these.
export const EDIT_GROUP_IDS = ["crop", "rotate", "adjust", "privacy"];
export const MOBILE_TOOLS = [
  toolById("filter"),
  toolById("text"),
  { id: "editHub", icon: "🖊️", label: "編輯", elevated: true },
  toolById("sticker"),
  toolById("brush"),
];

export function fitCanvasToContainer(canvas, container) {
  if (!container || !canvas) return;
  const pad = 16;
  const availW = container.clientWidth - pad * 2;
  const availH = container.clientHeight - pad * 2;
  if (availW <= 0 || availH <= 0) return;
  const scale = Math.min(availW / canvas.width, availH / canvas.height);
  canvas.setDimensions(
    { width: canvas.width * scale, height: canvas.height * scale },
    { cssOnly: true }
  );
}

// All of the fabric.js canvas/history/tool logic, independent of whatever
// chrome renders around it — the fullscreen EditorShell wrapper
// (PhotoEditor.js) and the inline 圖片編輯室 layout (PhotoEditorEmbedded.js)
// both call this and just differ in how they lay out the returned pieces.
export default function usePhotoEditorCore({ file, draftId, onExport }) {
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const imageObjRef = useRef(null);
  const containerRef = useRef(null);
  const cropRectRef = useRef(null);
  const historyRef = useRef({ stack: [], index: -1, suspend: false });

  const [ready, setReady] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [busy, setBusy] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  const [aspect, setAspectState] = useState("original");
  const [presetFilter, setPresetFilter] = useState("none");
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [brushColor, setBrushColor] = useState("#ff3b30");
  const [brushWidth, setBrushWidth] = useState(6);
  const [privacyMode, setPrivacyMode] = useState("pixelate"); // pixelate | blur

  const pushHistory = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyRef.current.suspend) return;
    const h = historyRef.current;
    const json = JSON.stringify(canvas.toJSON());
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(json);
    if (h.stack.length > HISTORY_LIMIT) h.stack.shift();
    h.index = h.stack.length - 1;
    setCanUndo(h.index > 0);
    setCanRedo(false);
  }, []);

  // ---- init ----
  useEffect(() => {
    let disposed = false;
    let objectUrl = null;

    async function init() {
      const canvas = new fabric.Canvas(canvasElRef.current, {
        preserveObjectStacking: true,
        selection: true,
      });
      fabricCanvasRef.current = canvas;

      if (file) {
        objectUrl = URL.createObjectURL(file);
        const img = await fabric.FabricImage.fromURL(objectUrl, { crossOrigin: "anonymous" });
        if (disposed) return;

        const scale = Math.min(1, MAX_EDIT_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        canvas.setDimensions({ width: w, height: h });
        img.set({ left: 0, top: 0, scaleX: w / img.width, scaleY: h / img.height, selectable: false, evented: false });
        canvas.add(img);
        canvas.renderAll();
        imageObjRef.current = img;
      } else {
        // No photo — a blank sheet to draw/type/stick on. Sized to match
        // the container's own aspect ratio (falling back to a square if the
        // container isn't measurable yet) so it fills the available area
        // edge-to-edge instead of a fixed square leaving big empty margins
        // in a wide/short embedded layout. fabric canvases are transparent
        // by default, which flattens to solid black once exported as JPEG,
        // so this also needs an explicit white background.
        const c = containerRef.current;
        const pad = 16;
        const blankW = c ? Math.max(Math.round(c.clientWidth - pad * 2), 100) : BLANK_CANVAS_SIZE;
        const blankH = c ? Math.max(Math.round(c.clientHeight - pad * 2), 100) : BLANK_CANVAS_SIZE;
        canvas.setDimensions({ width: blankW, height: blankH });
        canvas.backgroundColor = "#ffffff";
        canvas.renderAll();
        imageObjRef.current = null;
      }

      fitCanvasToContainer(canvas, containerRef.current);

      canvas.on("object:modified", pushHistory);
      canvas.on("object:added", pushHistory);
      canvas.on("object:removed", pushHistory);
      canvas.on("path:created", pushHistory);

      pushHistory();
      setReady(true);
    }

    init();
    return () => {
      disposed = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      fabricCanvasRef.current?.dispose();
      fabricCanvasRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // Refit whenever the container's actual size changes — a window resize in
  // the fullscreen wrapper, or (in the embedded layout) the canvas area
  // shrinking/growing as a tool drawer opens/closes below it. Replaces a
  // plain window "resize" listener, which only covered the fullscreen case
  // and was never removed on unmount.
  useEffect(() => {
    if (!ready || !containerRef.current) return;
    const container = containerRef.current;
    const ro = new ResizeObserver(() => {
      fitCanvasToContainer(fabricCanvasRef.current, container);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [ready]);

  const restoreHistory = useCallback(async (index) => {
    const canvas = fabricCanvasRef.current;
    const h = historyRef.current;
    if (!canvas || index < 0 || index >= h.stack.length) return;
    h.suspend = true;
    await canvas.loadFromJSON(JSON.parse(h.stack[index]));
    canvas.getObjects().forEach(o => { if (o === canvas.getObjects()[0]) o.set({ selectable: false, evented: false }); });
    canvas.renderAll();
    h.index = index;
    h.suspend = false;
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.stack.length - 1);
  }, []);

  const undo = () => restoreHistory(historyRef.current.index - 1);
  const redo = () => restoreHistory(historyRef.current.index + 1);

  // Tapping the currently-selected tool again closes its drawer — the one
  // interaction rule shared by every tool button in both layouts.
  const selectTool = (id) => setActiveTool(prev => prev === id ? null : id);

  // ---- tool: rotate/flip ----
  const rotate90 = () => {
    const canvas = fabricCanvasRef.current;
    const { width, height } = canvas;
    canvas.setDimensions({ width: height, height: width });
    canvas.getObjects().forEach(o => {
      const cx = height / 2, cy = width / 2;
      const relX = o.left - width / 2, relY = o.top - height / 2;
      o.set({ left: cx - relY, top: cy + relX, angle: (o.angle || 0) + 90 });
      o.setCoords();
    });
    canvas.renderAll();
    pushHistory();
  };
  const flip = (axis) => {
    const img = imageObjRef.current;
    if (!img) return; // no base photo (blank canvas) — nothing to flip
    img.set(axis === "x" ? { flipX: !img.flipX } : { flipY: !img.flipY });
    fabricCanvasRef.current.renderAll();
    pushHistory();
  };

  // ---- tool: filters / adjust ----
  const applyImageFilters = useCallback((preset, b, c, s) => {
    const img = imageObjRef.current;
    if (!img) return;
    const list = [];
    const presetDef = PRESET_FILTERS.find(p => p.id === preset);
    const presetInstance = presetDef?.make();
    if (presetInstance) list.push(presetInstance);
    if (b !== 0) list.push(new fabric.filters.Brightness({ brightness: b }));
    if (c !== 0) list.push(new fabric.filters.Contrast({ contrast: c }));
    if (s !== 0) list.push(new fabric.filters.Saturation({ saturation: s }));
    img.filters = list;
    img.applyFilters();
    fabricCanvasRef.current.renderAll();
  }, []);

  useEffect(() => {
    if (!ready) return;
    applyImageFilters(presetFilter, brightness, contrast, saturation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presetFilter, brightness, contrast, saturation, ready]);

  const commitAdjustments = () => pushHistory();

  // ---- tool: crop — a real draggable/resizable window, not just an
  // auto-centered guess. The aspect ratio is still locked to one of the
  // presets (that's what was asked for), but the window itself can be
  // dragged around and resized from its corners like Instagram's crop tool. ----
  const removeCropOverlay = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (cropRectRef.current && canvas) {
      canvas.remove(cropRectRef.current);
      cropRectRef.current = null;
      canvas.renderAll();
    }
  }, []);

  const showCropOverlay = useCallback((aspectId) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    removeCropOverlay();
    const def = ASPECTS.find(a => a.id === aspectId);
    if (!def?.ratio) return;
    const { width, height } = canvas;
    const ratio = def.ratio;
    const curRatio = width / height;
    let w, h;
    if (curRatio > ratio) { h = height * 0.9; w = h * ratio; } else { w = width * 0.9; h = w / ratio; }

    const rect = new fabric.Rect({
      left: (width - w) / 2, top: (height - h) / 2, width: w, height: h,
      fill: "rgba(0,0,0,0.01)", stroke: "#fff", strokeWidth: 2, strokeDashArray: [8, 6],
      cornerColor: "#fff", cornerStyle: "circle", transparentCorners: false,
      lockRotation: true, hasRotatingPoint: false,
      excludeFromExport: true, // never let this ghost box end up in history/export JSON
    });
    rect.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false, mtr: false });
    // Corner drag resizes both handles at once by design, but we still snap
    // height back to width*ratio on every tick so it can never drift off
    // the locked aspect ratio (fabric's own corner controls don't enforce
    // a *specific* ratio on their own, only proportional-from-origin).
    rect.on("scaling", () => {
      const w2 = rect.width * rect.scaleX;
      rect.set({ height: w2 / ratio, scaleY: rect.scaleX });
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
    cropRectRef.current = rect;
  }, [removeCropOverlay]);

  const selectAspect = (id) => {
    setAspectState(id);
    if (id === "original") removeCropOverlay();
    else showCropOverlay(id);
  };

  useEffect(() => {
    if (activeTool !== "crop") removeCropOverlay();
  }, [activeTool, removeCropOverlay]);

  const applyCrop = () => {
    const canvas = fabricCanvasRef.current;
    const rect = cropRectRef.current;
    if (!rect) { setActiveTool(null); return; }
    const left = rect.left, top = rect.top;
    const cropW = rect.width * rect.scaleX, cropH = rect.height * rect.scaleY;

    canvas.remove(rect);
    cropRectRef.current = null;
    canvas.getObjects().forEach(o => { o.set({ left: o.left - left, top: o.top - top }); o.setCoords(); });
    canvas.setDimensions({ width: Math.round(cropW), height: Math.round(cropH) });
    canvas.renderAll();
    fitCanvasToContainer(canvas, containerRef.current);
    setActiveTool(null);
    setAspectState("original");
    pushHistory();
  };

  // ---- tool: text ----
  const addText = () => {
    const canvas = fabricCanvasRef.current;
    const text = new fabric.IText("雙擊編輯文字", {
      left: canvas.width / 2 - 60, top: canvas.height / 2 - 15,
      fontSize: 32, fill: "#ffffff", stroke: "#000000", strokeWidth: 1,
      fontFamily: "sans-serif", fontWeight: 700,
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  // ---- tool: stickers ----
  const addEmojiSticker = (emoji) => {
    const canvas = fabricCanvasRef.current;
    const t = new fabric.FabricText(emoji, {
      left: canvas.width / 2 - 24, top: canvas.height / 2 - 24, fontSize: 56,
    });
    canvas.add(t);
    canvas.setActiveObject(t);
    canvas.renderAll();
  };

  const addImageSticker = async (fileList) => {
    const f = fileList?.[0];
    if (!f) return;
    const url = URL.createObjectURL(f);
    const img = await fabric.FabricImage.fromURL(url);
    const canvas = fabricCanvasRef.current;
    const scale = Math.min(1, (canvas.width * 0.4) / img.width);
    img.set({ left: canvas.width / 2 - (img.width * scale) / 2, top: canvas.height / 2 - (img.height * scale) / 2, scaleX: scale, scaleY: scale });
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.renderAll();
    URL.revokeObjectURL(url);
  };

  const deleteActiveObject = () => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas.getActiveObject();
    if (obj && obj !== imageObjRef.current) canvas.remove(obj);
  };

  // ---- tool: brush ----
  useEffect(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || !ready) return;
    if (activeTool === "brush") {
      canvas.isDrawingMode = true;
      canvas.freeDrawingBrush = new fabric.PencilBrush(canvas);
      canvas.freeDrawingBrush.color = brushColor;
      canvas.freeDrawingBrush.width = brushWidth;
    } else {
      canvas.isDrawingMode = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTool, brushColor, brushWidth, ready]);

  // "橡皮擦" here means tap a stroke to remove it — a real per-pixel eraser
  // needs a brush plugin fabric doesn't ship by default, and per-stroke
  // delete covers the common "oops, undo that scribble" case without one.
  const eraseStrokeAt = (e) => {
    const canvas = fabricCanvasRef.current;
    const target = canvas.findTarget(e);
    if (target && target.type === "path") canvas.remove(target);
  };

  // ---- tool: privacy blur/mosaic ----
  const applyPrivacyRegion = async () => {
    const canvas = fabricCanvasRef.current;
    const sel = canvas.getActiveObject();
    const img = imageObjRef.current;
    if (!sel || !img) return; // no base photo (blank canvas) — nothing to mosaic/blur
    const bounds = sel.getBoundingRect();
    canvas.remove(sel);

    const clone = await img.clone();
    clone.set({
      left: 0, top: 0,
      clipPath: new fabric.Rect({
        left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height,
        absolutePositioned: true,
      }),
      selectable: true, evented: true,
    });
    clone.filters = [privacyMode === "pixelate" ? new fabric.filters.Pixelate({ blocksize: 16 }) : new fabric.filters.Blur({ blur: 0.15 })];
    clone.applyFilters();
    canvas.add(clone);
    canvas.renderAll();
    pushHistory();
  };

  const startPrivacySelection = () => {
    const canvas = fabricCanvasRef.current;
    const rect = new fabric.Rect({
      left: canvas.width / 2 - 60, top: canvas.height / 2 - 60, width: 120, height: 120,
      fill: "rgba(255,255,255,0.25)", stroke: "#fff", strokeDashArray: [6, 4],
    });
    canvas.add(rect);
    canvas.setActiveObject(rect);
    canvas.renderAll();
  };

  // ---- export ----
  const handleExport = async () => {
    const canvas = fabricCanvasRef.current;
    setBusy(true);
    try {
      canvas.discardActiveObject();
      canvas.renderAll();
      const blob = await canvas.toBlob({ format: "jpeg", quality: 0.92 });
      const json = canvas.toJSON();
      if (draftId) {
        await saveDraft({ id: draftId, type: "photo", updatedAt: Date.now(), json });
      }
      onExport(blob, json);
    } finally {
      setBusy(false);
    }
  };

  return {
    canvasElRef, containerRef,
    ready, activeTool, setActiveTool, selectTool, busy, canUndo, canRedo,
    aspect, presetFilter, setPresetFilter, brightness, setBrightness, contrast, setContrast,
    saturation, setSaturation, brushColor, setBrushColor, brushWidth, setBrushWidth, privacyMode, setPrivacyMode,
    undo, redo,
    rotate90, flip,
    setAspect: selectAspect, applyCrop,
    commitAdjustments,
    addText, addEmojiSticker, addImageSticker, deleteActiveObject,
    eraseStrokeAt,
    startPrivacySelection, applyPrivacyRegion,
    handleExport,
  };
}

// Shared tool-settings panel content ("drawer") — identical between the
// fullscreen EditorShell and the embedded layout, just slotted into
// different chrome around it.
export function renderPhotoEditorDrawer(p) {
  switch (p.activeTool) {
    case "crop":
      return (
        <div>
          <DrawerChipRow items={ASPECTS} activeId={p.aspect} onSelect={p.setAspect} />
          {p.aspect !== "original" && (
            <div style={{ fontSize: 11, color: "#777", marginTop: 8 }}>拖曳白框角落調整大小、拖曳框內移動位置</div>
          )}
          <button onClick={p.applyCrop} style={applyBtnStyle}>套用裁剪</button>
        </div>
      );
    case "rotate":
      return (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={p.rotate90} style={toolBtnStyle}>⟳ 旋轉 90°</button>
          <button onClick={() => p.flip("x")} style={toolBtnStyle}>⇋ 水平翻轉</button>
          <button onClick={() => p.flip("y")} style={toolBtnStyle}>⇵ 垂直翻轉</button>
        </div>
      );
    case "filter":
      return <DrawerChipRow items={PRESET_FILTERS} activeId={p.presetFilter} onSelect={p.setPresetFilter} />;
    case "adjust":
      return (
        <div>
          <DrawerSlider label="亮度" value={p.brightness} min={-1} max={1} step={0.05} onChange={p.setBrightness} />
          <DrawerSlider label="對比" value={p.contrast} min={-1} max={1} step={0.05} onChange={p.setContrast} />
          <DrawerSlider label="飽和度" value={p.saturation} min={-1} max={1} step={0.05} onChange={p.setSaturation} />
          <button onClick={p.commitAdjustments} style={applyBtnStyle}>完成調整</button>
        </div>
      );
    case "text":
      return (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={p.addText} style={toolBtnStyle}>+ 新增文字</button>
          <button onClick={p.deleteActiveObject} style={toolBtnStyle}>刪除選取</button>
        </div>
      );
    case "sticker":
      return (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {STICKER_EMOJIS.map(e => (
              <button key={e} onClick={() => p.addEmojiSticker(e)} style={{ ...toolBtnStyle, fontSize: 22, width: 44, padding: 0 }}>{e}</button>
            ))}
          </div>
          <label style={{ ...toolBtnStyle, display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
            + 上傳貼圖圖片
            <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => p.addImageSticker(e.target.files)} />
          </label>
        </div>
      );
    case "brush":
      return (
        <div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <input type="color" value={p.brushColor} onChange={e => p.setBrushColor(e.target.value)} style={{ width: 44, height: 44, border: "none", background: "none" }} />
            <span style={{ fontSize: 12, color: "#aaa" }}>畫筆顏色</span>
          </div>
          <DrawerSlider label="筆刷粗細" value={p.brushWidth} min={2} max={30} step={1} onChange={p.setBrushWidth} />
          <div style={{ fontSize: 11, color: "#777" }}>提示：點擊已畫的線條可將其刪除（橡皮擦）</div>
        </div>
      );
    case "privacy":
      return (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button onClick={() => p.setPrivacyMode("pixelate")} style={{ ...toolBtnStyle, background: p.privacyMode === "pixelate" ? "var(--accent)" : "#222" }}>馬賽克</button>
            <button onClick={() => p.setPrivacyMode("blur")} style={{ ...toolBtnStyle, background: p.privacyMode === "blur" ? "var(--accent)" : "#222" }}>模糊</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={p.startPrivacySelection} style={toolBtnStyle}>+ 新增遮蔽區域</button>
            <button onClick={p.applyPrivacyRegion} style={applyBtnStyle}>套用</button>
          </div>
          <div style={{ fontSize: 11, color: "#777", marginTop: 8 }}>拖曳/縮放白色方框對準要遮蔽的區域，再按套用</div>
        </div>
      );
    default:
      return null;
  }
}

const toolBtnStyle = {
  minHeight: 44, padding: "0 14px", borderRadius: 10, border: "1px solid #333",
  background: "#222", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const applyBtnStyle = { ...toolBtnStyle, marginTop: 10, width: "100%", background: "var(--accent)", border: "none" };
