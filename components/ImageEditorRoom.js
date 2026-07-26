import { useState, useRef, useEffect } from "react";
import { PhotoEditorLazy } from "./media-editor";

// Standalone "圖片編輯" room — reuses the same fabric.js-based PhotoEditor
// that already powers post/avatar image editing (see Feed.js, profile/[uid].js),
// instead of pulling in a second, unrelated canvas library just for this entry.
export default function ImageEditorRoom() {
  const [originalFile, setOriginalFile] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [result, setResult] = useState(null); // { url, blob }
  const fileInputRef = useRef(null);

  useEffect(() => {
    return () => { if (result?.url) URL.revokeObjectURL(result.url); };
  }, [result]);

  const pickFile = () => fileInputRef.current?.click();

  const onFileChosen = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
    setOriginalFile(file);
    setEditingPhoto(true);
  };

  const reset = () => {
    if (result?.url) URL.revokeObjectURL(result.url);
    setResult(null);
    setOriginalFile(null);
    setEditingPhoto(false);
  };

  return (
    <>
      {/* Header */}
      <div style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "var(--panel-alt)", flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>🖼️</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>圖片編輯</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>裁剪・濾鏡・貼圖</div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" onChange={onFileChosen} style={{ display: "none" }} />

      {/* Body */}
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "24px 28px" }}>
        {!result && (
          <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-dim)" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🖼️</div>
            <div style={{ fontSize: 16, color: "var(--text-faint)", marginBottom: 8 }}>選一張圖片開始編輯</div>
            <div style={{ fontSize: 13, marginBottom: 20, color: "var(--text-dim)" }}>裁剪、濾鏡、加貼圖，編輯完可直接下載</div>
            <button onClick={pickFile}
              style={{ background: "linear-gradient(135deg,#2563eb,var(--accent-active))", border: "none", borderRadius: "var(--radius-md)", padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
              選擇圖片
            </button>
          </div>
        )}

        {result && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 480, margin: "0 auto" }}>
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

      {editingPhoto && originalFile && (
        <PhotoEditorLazy
          file={originalFile}
          onCancel={() => setEditingPhoto(false)}
          onExport={(blob) => {
            if (result?.url) URL.revokeObjectURL(result.url);
            setResult({ url: URL.createObjectURL(blob), blob });
            setEditingPhoto(false);
          }}
        />
      )}
    </>
  );
}
