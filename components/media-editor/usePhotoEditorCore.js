import { useState, useEffect, useRef, useCallback } from "react";
import * as fabric from "fabric";
import { DrawerSlider, DrawerChipRow } from "./EditorShell";
import { saveDraft } from "./editorDb";

// Working resolution cap — raised from the original 1440 so exports (in
// particular the member-facing 圖片編輯室) hold up at social/print sizes
// instead of visibly soft output; still capped rather than unbounded so a
// giant source photo can't tank canvas perf on a mid-range phone. If a
// photo is smaller than this to begin with, it's used at its own size.
const MAX_EDIT_DIMENSION = 2400;
const HISTORY_LIMIT = 30;
// Default working size when the editor opens with no photo at all (see the
// `file` being null/undefined below) — a blank sheet to draw/type/stick on.
const BLANK_CANVAS_SIZE = 1080;

// Reads a File as a data: URL instead of an object: URL. Object URLs
// (URL.createObjectURL) only stay valid for the lifetime of the page that
// created them — fine for a same-session import, but once a fabric image
// built from one gets serialized into canvas.toJSON() and persisted as a
// draft (see saveDraft in handleExport), reopening that draft after a real
// page reload/browser restart would try to reload a blob: URL that no
// longer resolves to anything, silently dropping the photo. A data: URL has
// no such lifetime limit, so it round-trips through a draft correctly.
function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export const ASPECTS = [
  { id: "original", label: "原圖", ratio: null },
  { id: "free", label: "自由", ratio: null, freeform: true },
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

// System font stacks only (no web-font loading) — matches how the app's own
// --font-body already falls back through this exact family list.
export const FONT_FAMILIES = [
  { id: "sans", label: "Noto Sans TC", value: "'Noto Sans TC', 'PingFang TC', 'Microsoft JhengHei', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" },
  { id: "system", label: "系統預設", value: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', sans-serif" },
  { id: "serif", label: "Noto Serif TC", value: "'Noto Serif TC', Georgia, serif" },
  { id: "mono", label: "等寬 Monospace", value: "'Courier New', Courier, monospace" },
];

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

// 去除留白 — deliberately NOT part of TOOLS/MOBILE_TOOLS: it only matters in
// the embedded 圖片編輯室 (where a blank canvas can leave extra margin around
// an imported photo). The fullscreen editor always opens already sized to
// its photo, so it never sees this tool at all — PhotoEditorEmbedded.js
// appends it to its own tools list instead of it living in the shared arrays.
export const TRIM_TOOL = { id: "trim", icon: "⛶", label: "去除留白" };

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

// These act on the base photo itself (filters/adjust recolor it, privacy
// mosaics/blurs a region of it) — meaningless with no photo loaded yet
// (blank canvas), so both layouts grey these out and skip straight to a
// no-op instead of letting the user fiddle with controls that do nothing.
export const DISABLED_WITHOUT_IMAGE = ["filter", "adjust", "privacy", "trim"];
export const DISABLED_HINT = "請先匯入照片再使用此工具";

// Augments a TOOLS/MOBILE_TOOLS array with disabled/title for whichever
// entries need a base photo that isn't loaded yet — shared so the fullscreen
// and embedded tool strips grey these out identically instead of each
// re-deriving the same list.
export function withPhotoToolState(tools, hasImage) {
  return tools.map(t => (
    DISABLED_WITHOUT_IMAGE.includes(t.id) && !hasImage
      ? { ...t, disabled: true, title: DISABLED_HINT }
      : t
  ));
}

// The base photo is tagged with data.role="base" at creation instead of
// tracked via a separate ref — a plain ref goes stale the moment the canvas
// is rebuilt from JSON (undo/redo, restoring a previous session), since the
// old object instance it points to is no longer part of the live canvas.
// Reading the tag straight off whatever's actually on the canvas right now
// can't drift out of sync the way a cached reference can.
export function getBaseImage(canvas) {
  return canvas?.getObjects().find(o => o.data?.role === "base") || null;
}

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
export default function usePhotoEditorCore({ file, initialScene, draftId, onExport }) {
  const canvasElRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const containerRef = useRef(null);
  const cropRectRef = useRef(null);
  const historyRef = useRef({ stack: [], index: -1, suspend: false });

  const [ready, setReady] = useState(false);
  const [activeTool, setActiveTool] = useState(null);
  const [busy, setBusy] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Mirror base-image-presence/canvas-object-count into state so tool buttons and
  // drawer controls can reactively grey themselves out — refs alone don't
  // trigger a re-render when they change.
  const [hasImage, setHasImage] = useState(false);
  const [hasObjects, setHasObjects] = useState(false);
  // True once anything has changed since the session opened (or since the
  // last successful export) — drives the leave-without-saving confirmation.
  // Deliberately NOT reset by undo/redo: navigating history still leaves the
  // canvas different from whatever was last exported/loaded.
  const [isDirty, setIsDirty] = useState(false);
  const addOffsetRef = useRef(0);

  const [aspect, setAspectState] = useState("original");
  const [presetFilter, setPresetFilter] = useState("none");
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [brushColor, setBrushColor] = useState("#ff3b30");
  const [brushWidth, setBrushWidth] = useState(6);
  const [privacyMode, setPrivacyMode] = useState("pixelate"); // pixelate | blur
  const [exportFormat, setExportFormat] = useState("jpeg"); // jpeg | png | webp
  const [exportQuality, setExportQuality] = useState(0.92); // ignored for png

  // Display-only zoom (canvas.setZoom) — a "camera" over the canvas's own
  // coordinate space, independent of fitCanvasToContainer's CSS-level
  // resize-to-fit; doesn't touch the actual working resolution/export size.
  const [zoomPct, setZoomPctState] = useState(100);
  // Snap-to-guides toggle — currently just the on/off state; the actual
  // snapping behavior (guide lines + coordinate correction on object
  // "moving") is a separate, not-yet-built feature.
  const [snapEnabled, setSnapEnabled] = useState(false);
  // The live-selected object (for the text property panel) and a tick that
  // bumps on every .set() so controls re-read fresh values — the object
  // reference itself never changes on mutation, so state alone wouldn't
  // trigger a re-render.
  const [selectedObj, setSelectedObj] = useState(null);
  const [selTick, setSelTick] = useState(0);

  const pushHistory = useCallback(() => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || historyRef.current.suspend) return;
    const h = historyRef.current;
    const isFirst = h.stack.length === 0;
    // ["data"] keeps the base-image role tag (see getBaseImage) round-tripping
    // through undo/redo and session restore — fabric's default serialization
    // drops any custom property that isn't explicitly requested.
    const json = JSON.stringify(canvas.toJSON(["data"]));
    h.stack = h.stack.slice(0, h.index + 1);
    h.stack.push(json);
    if (h.stack.length > HISTORY_LIMIT) h.stack.shift();
    h.index = h.stack.length - 1;
    setCanUndo(h.index > 0);
    setCanRedo(false);
    setHasObjects(canvas.getObjects().length > 0);
    setHasImage(!!getBaseImage(canvas));
    if (!isFirst) setIsDirty(true);
  }, []);

  // ---- init ----
  useEffect(() => {
    let disposed = false;

    async function init() {
      const canvas = new fabric.Canvas(canvasElRef.current, {
        preserveObjectStacking: true,
        selection: true,
      });
      fabricCanvasRef.current = canvas;

      if (initialScene) {
        // Restoring a previously-finished session ("重新編輯") — the exact
        // canvas that was last exported, not the original source file.
        canvas.setDimensions({ width: initialScene.width, height: initialScene.height });
        await canvas.loadFromJSON(initialScene.canvasJSON);
        if (disposed) return;
        canvas.renderAll();
      } else if (file) {
        const dataUrl = await fileToDataURL(file);
        const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: "anonymous" });
        if (disposed) return;

        const scale = Math.min(1, MAX_EDIT_DIMENSION / Math.max(img.width, img.height));
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        canvas.setDimensions({ width: w, height: h });
        img.set({
          left: 0, top: 0, scaleX: w / img.width, scaleY: h / img.height,
          selectable: false, evented: false, data: { role: "base" },
        });
        canvas.add(img);
        canvas.renderAll();
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
      }

      fitCanvasToContainer(canvas, containerRef.current);
      setZoomPctState(100);

      canvas.on("object:modified", pushHistory);
      canvas.on("object:added", pushHistory);
      canvas.on("object:removed", pushHistory);
      canvas.on("path:created", pushHistory);
      canvas.on("selection:created", () => setSelectedObj(canvas.getActiveObject() || null));
      canvas.on("selection:updated", () => setSelectedObj(canvas.getActiveObject() || null));
      canvas.on("selection:cleared", () => setSelectedObj(null));

      pushHistory();
      setReady(true);
    }

    init();
    return () => {
      disposed = true;
      fabricCanvasRef.current?.dispose();
      fabricCanvasRef.current = null;
    };
    // `initialScene`/`file` are only meant to be read once per mount (the
    // parent room fully unmounts/remounts the editor for each new session
    // rather than swapping these props on a live instance).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, initialScene]);

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

  // Brings a photo into the CURRENT canvas as a new object (centered, scaled
  // to fit within it) instead of rebuilding the canvas from scratch — the
  // init effect above only runs again when `file` itself changes, which
  // would otherwise silently wipe out anything already drawn/typed. If
  // there's no base photo yet (blank canvas), this one becomes it — sent to
  // the back so existing text/stickers/strokes stay on top — and unlocks
  // filter/adjust/privacy. If a base photo already exists, the imported
  // photo is added as a regular selectable/movable object instead (so a
  // second import can't silently replace edits already made to the first).
  // `replace: true` is how the UI honors the user's choice when importing a
  // photo while a base image already exists (see the replace-vs-add prompt
  // in PhotoEditorEmbedded) — without it, a second import always adds as a
  // regular movable object instead of silently replacing prior edits.
  const importPhoto = async (file, { replace = false } = {}) => {
    if (!file) return;
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    // Data URL, not an object URL — this image can end up serialized into a
    // saved draft (see fileToDataURL's comment above), which needs to survive
    // past this page load.
    const dataUrl = await fileToDataURL(file);
    const img = await fabric.FabricImage.fromURL(dataUrl, { crossOrigin: "anonymous" });
    const existingBase = getBaseImage(canvas);
    if (existingBase && replace) canvas.remove(existingBase);
    const becomesBase = !existingBase || replace;
    const scale = Math.min(canvas.width / img.width, canvas.height / img.height, 1);
    img.set({
      scaleX: scale, scaleY: scale,
      selectable: !becomesBase, evented: !becomesBase,
      ...(becomesBase ? { data: { role: "base" } } : {}),
    });
    canvas.add(img);
    // canvas.centerObject() instead of hand-rolled left/top math — it
    // accounts for the object's actual origin/transform internally, so it
    // can't drift off-center the way manually computing (canvas.width-w)/2
    // did (the imported photo used to land top-left-biased instead of
    // centered). The canvas itself keeps its current size here — any extra
    // blank space around the photo is a separate, explicit action (the 去除
    //留白 tool below), not something importing a photo does on its own.
    canvas.centerObject(img);
    img.setCoords();
    if (becomesBase) canvas.sendObjectToBack(img);
    canvas.renderAll();
    pushHistory();
  };

  // 去除留白 — shrinks the canvas down to exactly the base photo's own
  // bounding box, carrying every other object along by the same offset so
  // their position relative to the photo doesn't change. A separate,
  // explicit tool rather than something importPhoto does automatically,
  // since auto-shrinking surprised users who expected the canvas to stay put.
  const trimToContent = () => {
    const canvas = fabricCanvasRef.current;
    const img = getBaseImage(canvas);
    if (!canvas || !img) return;
    const bounds = img.getBoundingRect();
    const dx = bounds.left, dy = bounds.top;
    canvas.getObjects().forEach(o => {
      o.set({ left: o.left - dx, top: o.top - dy });
      o.setCoords();
    });
    canvas.setDimensions({ width: Math.round(bounds.width), height: Math.round(bounds.height) });
    canvas.backgroundColor = "";
    canvas.renderAll();
    setZoomPctState(100);
    fitCanvasToContainer(canvas, containerRef.current);
    pushHistory();
  };

  const restoreHistory = useCallback(async (index) => {
    const canvas = fabricCanvasRef.current;
    const h = historyRef.current;
    if (!canvas || index < 0 || index >= h.stack.length) return;
    h.suspend = true;
    // selectable/evented are standard fabric properties and already
    // round-trip through toJSON/loadFromJSON on their own — no need to
    // re-guess which object is the base image by array position (that
    // assumption broke as soon as z-order changed, e.g. after 去除留白 or
    // any tool that reorders objects).
    await canvas.loadFromJSON(JSON.parse(h.stack[index]));
    canvas.renderAll();
    h.index = index;
    h.suspend = false;
    setCanUndo(h.index > 0);
    setCanRedo(h.index < h.stack.length - 1);
    // pushHistory() normally keeps these mirrors in sync, but it's suspended
    // during a restore — update them explicitly so tool-disabled states and
    // the text panel don't go stale after undo/redo.
    setHasImage(!!getBaseImage(canvas));
    setHasObjects(canvas.getObjects().length > 0);
    setSelectedObj(canvas.getActiveObject() || null);
    setIsDirty(true);
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
  // Mirrors every object's position (and its own rendered content, via
  // flipX/flipY) across the canvas's center line — consistent with rotate90
  // acting on everything, not just the base photo. A no-op with nothing on
  // the canvas at all (checked by the caller via hasObjects).
  const flip = (axis) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas || canvas.getObjects().length === 0) return;
    const { width, height } = canvas;
    canvas.getObjects().forEach(o => {
      const w = o.width * o.scaleX, h = o.height * o.scaleY;
      if (axis === "x") o.set({ left: width - o.left - w, flipX: !o.flipX });
      else o.set({ top: height - o.top - h, flipY: !o.flipY });
      o.setCoords();
    });
    canvas.renderAll();
    pushHistory();
  };

  // ---- tool: filters / adjust ----
  const applyImageFilters = useCallback((preset, b, c, s) => {
    const img = getBaseImage(fabricCanvasRef.current);
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
  // Zeroes the sliders back to "no change" — deliberately leaves presetFilter
  // alone, since that's a separate tool tab (濾鏡) with its own chip row, not
  // part of what "重設" on the 調整 sliders means.
  const resetAdjustments = () => { setBrightness(0); setContrast(0); setSaturation(0); };

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
    if (!def || aspectId === "original") return;
    const { width, height } = canvas;
    const ratio = def.ratio;
    let w, h;
    if (ratio) {
      const curRatio = width / height;
      if (curRatio > ratio) { h = height * 0.9; w = h * ratio; } else { w = width * 0.9; h = w / ratio; }
    } else {
      // Freeform ("自由") — no locked ratio, just a generous starting box.
      w = width * 0.8; h = height * 0.8;
    }

    const rect = new fabric.Rect({
      left: (width - w) / 2, top: (height - h) / 2, width: w, height: h,
      fill: "rgba(0,0,0,0.01)", stroke: "#fff", strokeWidth: 2, strokeDashArray: [8, 6],
      cornerColor: "#fff", cornerStyle: "circle", transparentCorners: false,
      lockRotation: true, hasRotatingPoint: false,
      excludeFromExport: true, // never let this ghost box end up in history/export JSON
    });
    rect.setControlsVisibility({ mt: false, mb: false, ml: false, mr: false, mtr: false });
    if (ratio) {
      // Corner drag resizes both handles at once by design, but we still snap
      // height back to width*ratio on every tick so it can never drift off
      // the locked aspect ratio (fabric's own corner controls don't enforce
      // a *specific* ratio on their own, only proportional-from-origin).
      rect.on("scaling", () => {
        const w2 = rect.width * rect.scaleX;
        rect.set({ height: w2 / ratio, scaleY: rect.scaleX });
      });
    }
    // Freeform: no scaling handler at all — corner drag is left to fabric's
    // own default (independent width/height), which is exactly what "自由"
    // means here.
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

  // Successive new text/stickers cascade 20px down-right instead of landing
  // on the exact same spot every time (cycles back once it'd drift too far).
  const nextAddOffset = () => {
    const off = addOffsetRef.current;
    addOffsetRef.current = off + 20 > 160 ? 0 : off + 20;
    return off;
  };

  // ---- tool: text ----
  const addText = () => {
    const canvas = fabricCanvasRef.current;
    const off = nextAddOffset();
    // White+outline reads on a photo; on a blank (white) canvas that same
    // combo would be invisible, so it defaults to dark ink instead.
    const hasBase = !!getBaseImage(canvas);
    const text = new fabric.IText("雙擊編輯文字", {
      left: canvas.width / 2 - 60 + off, top: canvas.height / 2 - 15 + off,
      fontSize: 32, fontFamily: "sans-serif", fontWeight: 700,
      ...(hasBase ? { fill: "#ffffff", stroke: "#000000", strokeWidth: 1 } : { fill: "#1a1a1a" }),
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  // ---- tool: stickers ----
  const addEmojiSticker = (emoji) => {
    const canvas = fabricCanvasRef.current;
    const off = nextAddOffset();
    const t = new fabric.FabricText(emoji, {
      left: canvas.width / 2 - 24 + off, top: canvas.height / 2 - 24 + off, fontSize: 56,
    });
    canvas.add(t);
    canvas.setActiveObject(t);
    canvas.renderAll();
  };

  const addImageSticker = async (fileList) => {
    const f = fileList?.[0];
    if (!f) return;
    // Data URL — see fileToDataURL's comment on importPhoto above; a sticker
    // image gets serialized into the canvas JSON the same as the base photo.
    const dataUrl = await fileToDataURL(f);
    const img = await fabric.FabricImage.fromURL(dataUrl);
    const canvas = fabricCanvasRef.current;
    const scale = Math.min(1, (canvas.width * 0.4) / img.width);
    img.set({ scaleX: scale, scaleY: scale });
    canvas.add(img);
    canvas.centerObject(img); // same centering fix as importPhoto — see its comment
    img.setCoords();
    canvas.setActiveObject(img);
    canvas.renderAll();
  };

  const deleteActiveObject = () => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas.getActiveObject();
    if (obj && obj.data?.role !== "base") canvas.remove(obj);
  };

  // ---- display zoom (embedded 圖片編輯室's zoom dropdown) ----
  const applyZoomPct = (pct) => {
    const canvas = fabricCanvasRef.current;
    if (!canvas) return;
    const clamped = Math.max(25, Math.min(400, Math.round(pct)));
    canvas.setZoom(clamped / 100);
    canvas.renderAll();
    setZoomPctState(clamped);
  };

  // ---- text object property panel (embedded 圖片編輯室 only) ----
  // Generic partial-update for whatever's currently selected — used by every
  // tab of the text panel (content/style/spacing/etc.) except shadow, which
  // needs its sub-properties merged into a fabric.Shadow instance instead of
  // being flat props. `commit:false` skips pushHistory for continuous inputs
  // (color/slider dragging) — call commitTextProp() once the drag/pick ends
  // so history doesn't get an entry per intermediate tick.
  const updateTextProp = (patch, { commit = true } = {}) => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    obj.set(patch);
    canvas.renderAll();
    setSelTick(t => t + 1);
    if (commit) pushHistory();
  };
  const commitTextProp = () => pushHistory();

  const updateTextShadow = (patch, { commit = true } = {}) => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    if (patch.enabled === false) {
      obj.set({ shadow: null });
    } else {
      const cur = obj.shadow;
      obj.set({
        shadow: new fabric.Shadow({
          color: patch.color ?? cur?.color ?? "rgba(0,0,0,0.5)",
          blur: patch.blur ?? cur?.blur ?? 6,
          offsetX: patch.offsetX ?? cur?.offsetX ?? 3,
          offsetY: patch.offsetY ?? cur?.offsetY ?? 3,
        }),
      });
    }
    canvas.renderAll();
    setSelTick(t => t + 1);
    if (commit) pushHistory();
  };

  // Object-vs-canvas alignment (点 15 — distinct from textAlign's
  // paragraph-level alignment above): centers/edges the selected object
  // against the canvas bounds. Works on any object, not just text.
  const alignObjectToCanvas = (mode) => {
    const canvas = fabricCanvasRef.current;
    const obj = canvas?.getActiveObject();
    if (!obj) return;
    const w = obj.width * obj.scaleX, h = obj.height * obj.scaleY;
    const patch = {};
    if (mode === "center-h") patch.left = (canvas.width - w) / 2;
    else if (mode === "center-v") patch.top = (canvas.height - h) / 2;
    else if (mode === "left") patch.left = 0;
    else if (mode === "right") patch.left = canvas.width - w;
    else if (mode === "top") patch.top = 0;
    else if (mode === "bottom") patch.top = canvas.height - h;
    else return;
    obj.set(patch);
    obj.setCoords();
    canvas.renderAll();
    setSelTick(t => t + 1);
    pushHistory();
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
    const img = getBaseImage(canvas);
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
      // A blank canvas (no imported photo) always carries an explicit white
      // backgroundColor so it doesn't flatten to black as JPEG (see the init
      // effect's blank-canvas branch) — but that's wrong for PNG/WebP with no
      // base photo, where a member exporting e.g. a sticker/text composition
      // actually wants real transparency. Temporarily clear it for just this
      // export when that applies, then restore it for continued editing.
      const hadBase = !!getBaseImage(canvas);
      const wantsTransparency = exportFormat !== "jpeg" && !hadBase;
      const prevBg = canvas.backgroundColor;
      if (wantsTransparency) canvas.backgroundColor = "";
      canvas.renderAll();
      const blob = await canvas.toBlob({ format: exportFormat, quality: exportQuality });
      if (wantsTransparency) { canvas.backgroundColor = prevBg; canvas.renderAll(); }
      // Passed back to the caller (and optionally persisted as a draft) so
      // "重新編輯" can reload the exact finished canvas instead of restarting
      // from the original source file — width/height travel alongside the
      // object JSON since fabric's own toJSON doesn't include canvas dimensions.
      const scene = { canvasJSON: canvas.toJSON(["data"]), width: canvas.width, height: canvas.height };
      if (draftId) {
        await saveDraft({ id: draftId, type: "photo", updatedAt: Date.now(), scene });
      }
      onExport(blob, scene);
      setIsDirty(false);
    } finally {
      setBusy(false);
    }
  };

  return {
    canvasElRef, containerRef,
    ready, activeTool, setActiveTool, selectTool, busy, canUndo, canRedo,
    hasImage, hasObjects, isDirty, importPhoto, trimToContent,
    aspect, presetFilter, setPresetFilter, brightness, setBrightness, contrast, setContrast,
    saturation, setSaturation, brushColor, setBrushColor, brushWidth, setBrushWidth, privacyMode, setPrivacyMode,
    zoomPct, applyZoomPct, snapEnabled, setSnapEnabled,
    exportFormat, setExportFormat, exportQuality, setExportQuality,
    selectedObj, selTick, updateTextProp, commitTextProp, updateTextShadow, alignObjectToCanvas,
    undo, redo,
    rotate90, flip,
    setAspect: selectAspect, applyCrop,
    commitAdjustments, resetAdjustments,
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
            <div style={{ fontSize: 11, color: "var(--pe-text-dim)", marginTop: 8 }}>拖曳白框角落調整大小、拖曳框內移動位置</div>
          )}
          <button onClick={p.applyCrop} style={applyBtnStyle}>套用裁剪</button>
        </div>
      );
    case "rotate": {
      const flipDisabled = !p.hasObjects;
      const flipTitle = flipDisabled ? "畫布上還沒有任何內容可以翻轉" : undefined;
      return (
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={p.rotate90} style={toolBtnStyle}>⟳ 旋轉 90°</button>
          <button onClick={() => p.flip("x")} disabled={flipDisabled} title={flipTitle} style={disabledStyle(toolBtnStyle, flipDisabled)}>⇋ 水平翻轉</button>
          <button onClick={() => p.flip("y")} disabled={flipDisabled} title={flipTitle} style={disabledStyle(toolBtnStyle, flipDisabled)}>⇵ 垂直翻轉</button>
        </div>
      );
    }
    case "filter":
      return (
        <div>
          <DrawerChipRow items={PRESET_FILTERS} activeId={p.presetFilter} onSelect={p.setPresetFilter} disabled={!p.hasImage} />
          {!p.hasImage && <div style={{ fontSize: 11, color: "var(--pe-text-dim)", marginTop: 8 }}>{DISABLED_HINT}</div>}
        </div>
      );
    case "adjust":
      return (
        <div>
          <DrawerSlider label="亮度" value={p.brightness} min={-1} max={1} step={0.05} onChange={p.setBrightness} disabled={!p.hasImage} />
          <DrawerSlider label="對比" value={p.contrast} min={-1} max={1} step={0.05} onChange={p.setContrast} disabled={!p.hasImage} />
          <DrawerSlider label="飽和度" value={p.saturation} min={-1} max={1} step={0.05} onChange={p.setSaturation} disabled={!p.hasImage} />
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={p.resetAdjustments} disabled={!p.hasImage} style={disabledStyle({ ...toolBtnStyle, marginTop: 10, flex: 1 }, !p.hasImage)}>重設</button>
            <button onClick={p.commitAdjustments} disabled={!p.hasImage} style={disabledStyle({ ...applyBtnStyle, flex: 2 }, !p.hasImage)}>完成調整</button>
          </div>
          {!p.hasImage && <div style={{ fontSize: 11, color: "var(--pe-text-dim)", marginTop: 4 }}>{DISABLED_HINT}</div>}
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
            <span style={{ fontSize: 12, color: "var(--pe-text-dim)" }}>畫筆顏色</span>
          </div>
          <DrawerSlider label="筆刷粗細" value={p.brushWidth} min={2} max={30} step={1} onChange={p.setBrushWidth} />
          <div style={{ fontSize: 11, color: "var(--pe-text-dim)" }}>提示：點擊已畫的線條可將其刪除（橡皮擦）</div>
        </div>
      );
    case "privacy": {
      const d = !p.hasImage;
      return (
        <div>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            <button onClick={() => p.setPrivacyMode("pixelate")} disabled={d} style={disabledStyle({ ...toolBtnStyle, background: p.privacyMode === "pixelate" ? "var(--accent)" : "var(--pe-control-bg)" }, d)}>馬賽克</button>
            <button onClick={() => p.setPrivacyMode("blur")} disabled={d} style={disabledStyle({ ...toolBtnStyle, background: p.privacyMode === "blur" ? "var(--accent)" : "var(--pe-control-bg)" }, d)}>模糊</button>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={p.startPrivacySelection} disabled={d} style={disabledStyle(toolBtnStyle, d)}>+ 新增遮蔽區域</button>
            <button onClick={p.applyPrivacyRegion} disabled={d} style={disabledStyle(applyBtnStyle, d)}>套用</button>
          </div>
          <div style={{ fontSize: 11, color: "var(--pe-text-dim)", marginTop: 8 }}>{d ? DISABLED_HINT : "拖曳/縮放白色方框對準要遮蔽的區域，再按套用"}</div>
        </div>
      );
    }
    // Embedded-only (see TRIM_TOOL) — never reachable from the fullscreen
    // editor since its TOOLS/MOBILE_TOOLS arrays don't include this id.
    case "trim": {
      const d = !p.hasImage;
      return (
        <div>
          <button onClick={p.trimToContent} disabled={d} style={disabledStyle(applyBtnStyle, d)}>套用：移除多餘空白</button>
          <div style={{ fontSize: 11, color: "var(--pe-text-dim)", marginTop: 8 }}>
            {d ? DISABLED_HINT : "把畫布縮小到跟目前照片一樣大，去掉周圍多餘的空白區域；畫布上其他物件的相對位置不會改變。"}
          </div>
        </div>
      );
    }
    default:
      return null;
  }
}

const toolBtnStyle = {
  minHeight: 44, padding: "0 14px", borderRadius: 10, border: "1px solid var(--pe-border)",
  background: "var(--pe-control-bg)", color: "var(--pe-text)", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const applyBtnStyle = { ...toolBtnStyle, marginTop: 10, width: "100%", background: "var(--accent)", color: "var(--accent-text)", border: "none" };

function disabledStyle(base, disabled) {
  return disabled ? { ...base, opacity: 0.4, cursor: "not-allowed" } : base;
}
