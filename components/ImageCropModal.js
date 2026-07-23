import { useState, useRef, useEffect, useCallback } from "react";

// Minimal drag+zoom crop modal — no external crop library. The viewport box
// is sized to match `aspect` (width/height), the image is shown "cover"-style
// at zoom=1 and can be dragged/zoomed; on confirm we map the visible window
// back onto the natural image resolution and draw it into an output canvas.
export default function ImageCropModal({ file, aspect = 1, outputWidth = 512, title = "調整圖片", onCancel, onConfirm }) {
  const [imgEl, setImgEl] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [saving, setSaving] = useState(false);
  const dragRef = useRef(null);
  const viewportRef = useRef(null);

  const viewW = 320;
  const viewH = Math.round(viewW / aspect);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => setImgEl(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const baseScale = imgEl ? Math.max(viewW / imgEl.width, viewH / imgEl.height) : 1;
  const effScale = baseScale * zoom;
  const dispW = imgEl ? imgEl.width * effScale : 0;
  const dispH = imgEl ? imgEl.height * effScale : 0;

  const clampOffset = useCallback((o, dW = dispW, dH = dispH) => ({
    x: Math.min(0, Math.max(viewW - dW, o.x)),
    y: Math.min(0, Math.max(viewH - dH, o.y)),
  }), [dispW, dispH, viewW, viewH]);

  // Re-clamp whenever zoom/image changes so a smaller zoom never leaves a gap.
  useEffect(() => {
    setOffset(o => clampOffset(o));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [zoom, imgEl]);

  const startDrag = (x, y) => { dragRef.current = { startX: x, startY: y, origin: offset }; };
  const moveDrag = (x, y) => {
    if (!dragRef.current) return;
    const { startX, startY, origin } = dragRef.current;
    setOffset(clampOffset({ x: origin.x + (x - startX), y: origin.y + (y - startY) }));
  };
  const endDrag = () => { dragRef.current = null; };

  const confirm = async () => {
    if (!imgEl) return;
    setSaving(true);
    try {
      const outH = Math.round(outputWidth / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outputWidth;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      const sx = -offset.x / effScale;
      const sy = -offset.y / effScale;
      const sw = viewW / effScale;
      const sh = viewH / effScale;
      ctx.drawImage(imgEl, sx, sy, sw, sh, 0, 0, outputWidth, outH);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
      await onConfirm(blob);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={title}
      style={{ position: "fixed", inset: 0, zIndex: 1200, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={onCancel}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: "var(--panel)", borderRadius: 16, padding: 20, width: viewW + 40, maxWidth: "100%", boxSizing: "border-box", border: "1px solid var(--border)" }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 12 }}>{title}</div>

        <div
          ref={viewportRef}
          style={{
            width: viewW, height: viewH, margin: "0 auto", position: "relative", overflow: "hidden",
            borderRadius: aspect === 1 ? "50%" : 12, background: "var(--panel-alt)", border: "1px solid var(--border)",
            cursor: dragRef.current ? "grabbing" : "grab", touchAction: "none", userSelect: "none",
          }}
          onMouseDown={e => startDrag(e.clientX, e.clientY)}
          onMouseMove={e => { if (e.buttons === 1) moveDrag(e.clientX, e.clientY); }}
          onMouseUp={endDrag}
          onMouseLeave={endDrag}
          onTouchStart={e => { const t = e.touches[0]; startDrag(t.clientX, t.clientY); }}
          onTouchMove={e => { const t = e.touches[0]; moveDrag(t.clientX, t.clientY); }}
          onTouchEnd={endDrag}
          onWheel={e => { e.preventDefault(); setZoom(z => Math.min(3, Math.max(1, z - e.deltaY * 0.001))); }}
        >
          {imgEl && (
            <img src={imgEl.src} alt="" draggable={false}
              style={{ position: "absolute", left: offset.x, top: offset.y, width: dispW, height: dispH, maxWidth: "none", pointerEvents: "none" }} />
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <span style={{ fontSize: 16, color: "var(--text-faint)" }}>−</span>
          <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))}
            style={{ flex: 1 }} aria-label="縮放" />
          <span style={{ fontSize: 16, color: "var(--text-faint)" }}>+</span>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 16 }}>
          <button onClick={onCancel} disabled={saving}
            style={{ background: "none", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 16px", color: "var(--text-muted)", cursor: "pointer", fontSize: 13 }}>
            取消
          </button>
          <button onClick={confirm} disabled={saving || !imgEl}
            style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-2))", border: "none", borderRadius: 10, padding: "8px 18px", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
            {saving ? "上傳中..." : "確認"}
          </button>
        </div>
      </div>
    </div>
  );
}
