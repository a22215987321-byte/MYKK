import { useRef, useState } from "react";

// Reusable multi-file drag-and-drop upload zone — click also opens the
// native file picker via a hidden <input>. Purely presentational: the
// caller (DocConvertRoom) decides what to do with the files (validate,
// queue, reject).
export default function FileDropZone({ onFiles, accept, label, hint }) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length) onFiles(files);
  };

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      style={{
        border: `2px dashed ${dragOver ? "var(--accent)" : "var(--border)"}`,
        borderRadius: "var(--radius-lg)",
        background: dragOver ? "var(--panel-hover)" : "var(--panel-alt)",
        padding: "40px 20px",
        textAlign: "center",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={accept}
        style={{ display: "none" }}
        onChange={e => { handleFiles(e.target.files); e.target.value = ""; }}
      />
      <div style={{ fontSize: 36, marginBottom: 10 }}>📥</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "var(--text)", marginBottom: 4 }}>{label}</div>
      {hint && <div style={{ fontSize: 12, color: "var(--text-faint)" }}>{hint}</div>}
    </div>
  );
}
