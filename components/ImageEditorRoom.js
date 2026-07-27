import { useState, useRef, useEffect } from "react";
import { PhotoEditorEmbeddedLazy } from "./media-editor";
import { toast } from "../lib/toast";
import useIsMobile from "../lib/useIsMobile";

// Standalone "圖片編輯" room — reuses the same fabric.js-based editor core
// that already powers post/avatar image editing (see Feed.js, profile/[uid].js),
// but through the embedded layout instead of their fullscreen one: editing
// happens inline in this room's own content area, sidebar/calendar stay
// visible the whole time, nothing covers the screen.
//
// Entry flow differs by device: desktop drops straight into a blank canvas
// (no photo required — crop/filter/adjust/mosaic just have nothing to act
// on until a photo is imported via the editor's own 匯入照片 button); mobile
// stays photo-first, but via the camera directly instead of a generic
// "choose a file" prompt.
export default function ImageEditorRoom() {
  const isMobile = useIsMobile();
  const [originalFile, setOriginalFile] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [result, setResult] = useState(null); // { url, blob }
  const [pasteFlash, setPasteFlash] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  useEffect(() => {
    return () => { if (result?.url) URL.revokeObjectURL(result.url); };
  }, [result]);

  // Desktop only: nothing else to show first, so open straight into an
  // editable blank canvas. Re-fires (harmlessly re-entering the same state)
  // any time we land back on "nothing showing" — after a reset, or after
  // finishing and clearing the result.
  useEffect(() => {
    if (isMobile) return;
    if (!editingPhoto && !result) setEditingPhoto(true);
  }, [isMobile, editingPhoto, result]);

  const pickFile = () => fileInputRef.current?.click();
  const takePhoto = () => cameraInputRef.current?.click();

  // Shared by the file picker, camera capture, clipboard paste, and the
  // editor's own "匯入照片" button — "attach/replace the photo" only has one
  // code path regardless of how it arrived.
  const attachFile = (file) => {
    if (!file) return;
    setResult(prev => { if (prev?.url) URL.revokeObjectURL(prev.url); return null; });
    setOriginalFile(file);
    setEditingPhoto(true);
  };

  const onFileChosen = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    attachFile(file);
  };

  // Ctrl+V/⌘+V a screenshot anywhere in this room attaches it directly —
  // no file dialog, no extra click. Listens on document (not a container
  // div) since a plain <div> never receives paste events unless it's
  // focused, which nothing here forces.
  useEffect(() => {
    const onPaste = (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const imageItem = Array.from(items).find(it => it.type.startsWith("image/"));
      if (!imageItem) return;
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      const named = new File([file], file.name || `pasted-${Date.now()}.png`, { type: file.type });
      attachFile(named);
      toast("圖片已加入", "success");
      setPasteFlash(true);
      setTimeout(() => setPasteFlash(false), 900);
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  const reset = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
    setOriginalFile(null);
    setEditingPhoto(false);
    // Desktop: the effect above immediately reopens a fresh blank canvas.
    // Mobile: this leaves the 拍照 prompt showing, as intended.
  };

  const showEditor = editingPhoto;

  return (
    <>
      {/* Header */}
      <div style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "var(--panel-alt)", flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>🖼️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>圖片編輯</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>裁剪・濾鏡・貼圖・可直接貼上截圖</div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChosen} style={{ display: "none" }} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onFileChosen} style={{ display: "none" }} />

      {/* Body — empty/result states stay centered; the embedded editor
          manages its own internal layout and just fills this area. */}
      <div style={{
        flex: 1, minHeight: 0, overflowY: "auto",
        padding: showEditor ? 16 : "24px 28px",
        display: "flex", flexDirection: "column",
        alignItems: showEditor ? "stretch" : "center",
        justifyContent: showEditor ? "flex-start" : "center",
        border: pasteFlash ? "2px solid var(--accent)" : "2px solid transparent",
        boxSizing: "border-box", transition: "border-color 0.2s",
      }}>
        {showEditor && (
          <div style={{ flex: 1, minHeight: 480, borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <PhotoEditorEmbeddedLazy
              file={originalFile}
              onCancel={() => setEditingPhoto(false)}
              onExport={(blob) => {
                if (result?.url) URL.revokeObjectURL(result.url);
                setResult({ url: URL.createObjectURL(blob), blob });
                setEditingPhoto(false);
              }}
              onImportPhoto={(file) => setOriginalFile(file)}
            />
          </div>
        )}

        {!showEditor && !result && isMobile && (
          <div style={{ textAlign: "center", color: "var(--text-dim)" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📷</div>
            <div style={{ fontSize: 16, color: "var(--text-faint)", marginBottom: 8 }}>拍張照片開始編輯</div>
            <div style={{ fontSize: 13, marginBottom: 20, color: "var(--text-dim)" }}>拍完照直接進入編輯，也可以從相簿選擇或直接貼上截圖</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={takePhoto}
                style={{ background: "linear-gradient(135deg,#2563eb,var(--accent-active))", border: "none", borderRadius: "var(--radius-md)", padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                📷 拍照
              </button>
              <button onClick={pickFile}
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 24px", color: "var(--text)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                從相簿選擇
              </button>
            </div>
          </div>
        )}

        {!showEditor && result && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 480 }}>
            <img src={result.url} alt="編輯結果" style={{ maxWidth: "100%", maxHeight: 420, borderRadius: "var(--radius-lg)", border: "1px solid var(--panel)" }} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <a href={result.url} download="edited.jpg"
                style={{ background: "linear-gradient(135deg,#2563eb,var(--accent-active))", border: "none", borderRadius: "var(--radius-md)", padding: "9px 18px", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer", textDecoration: "none" }}>
                下載圖片
              </a>
              <button onClick={() => setEditingPhoto(true)}
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "9px 18px", color: "var(--text)", fontSize: 13, cursor: "pointer" }}>
                重新編輯
              </button>
              <button onClick={reset}
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "9px 18px", color: "var(--text-muted)", fontSize: 13, cursor: "pointer" }}>
                編輯新圖片
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
