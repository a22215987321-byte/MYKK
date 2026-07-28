import { useState, useRef, useEffect } from "react";
import { PhotoEditorEmbeddedLazy } from "./media-editor";
import { validatePhotoFile } from "./media-editor/mediaValidation";
import { loadDraft, deleteDraft } from "./media-editor/editorDb";
import { toast } from "../lib/toast";
import useIsMobile from "../lib/useIsMobile";

// Single fixed slot — this room only ever has one editing session in flight
// at a time, so there's no need to juggle multiple draft IDs the way a
// per-post/per-document editor would.
const DRAFT_ID = "image-editor-room";

// The download link's filename needs a real extension matching the actual
// export format the user picked in the editor (JPEG/PNG/WebP) — this room
// only sees the finished blob, not that choice, so it reads the extension
// back off the blob's own MIME type instead of assuming .jpg.
function resultExt(blob) {
  if (blob?.type === "image/png") return "png";
  if (blob?.type === "image/webp") return "webp";
  return "jpg";
}

// Standalone "圖片編輯" room — reuses the same fabric.js-based editor core
// that already powers post/avatar image editing (see Feed.js, profile/[uid].js),
// but through the embedded layout instead of their fullscreen one: editing
// happens inline in this room's own content area, sidebar/calendar stay
// visible the whole time, nothing covers the screen.
//
// Entry flow differs by device: desktop drops straight into a blank canvas
// (no photo required — crop/filter/adjust/mosaic are greyed out until a
// photo is imported via the editor's own 匯入照片 button, which adds it into
// the current canvas rather than starting over); mobile defaults to the
// camera directly instead of a generic "choose a file" prompt, but can also
// start blank.
export default function ImageEditorRoom() {
  const isMobile = useIsMobile();
  const [originalFile, setOriginalFile] = useState(null);
  const [editingPhoto, setEditingPhoto] = useState(false);
  const [result, setResult] = useState(null); // { url, blob, sceneJSON }
  const [resumeScene, setResumeScene] = useState(null); // scene from a resumed draft, before any export this session
  const [pasteFlash, setPasteFlash] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Draft found on IndexedDB from a previous visit (see saveDraft in
  // usePhotoEditorCore's handleExport) — null once checked-and-none-found,
  // or once the user has resumed/discarded it. `draftChecked` gates the
  // desktop auto-open effect below so it doesn't race ahead into a fresh
  // blank canvas before we know whether there's something to offer resuming.
  const [draftPrompt, setDraftPrompt] = useState(null);
  const [draftChecked, setDraftChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadDraft(DRAFT_ID).then(d => {
      if (!cancelled && d?.scene) setDraftPrompt(d);
    }).finally(() => { if (!cancelled) setDraftChecked(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    return () => { if (result?.url) URL.revokeObjectURL(result.url); };
  }, [result]);

  // Desktop only: nothing else to show first, so open straight into an
  // editable blank canvas. Re-fires (harmlessly re-entering the same state)
  // any time we land back on "nothing showing" — after a reset, or after
  // finishing and clearing the result. Held off until the draft check above
  // has finished and isn't offering something to resume — otherwise this
  // would open a fresh blank canvas a beat before the resume prompt appears.
  useEffect(() => {
    if (isMobile) return;
    if (!draftChecked || draftPrompt) return;
    if (!editingPhoto && !result) setEditingPhoto(true);
  }, [isMobile, editingPhoto, result, draftChecked, draftPrompt]);

  const resumeDraft = () => {
    setResumeScene(draftPrompt.scene);
    setOriginalFile(null);
    setEditingPhoto(true);
    setDraftPrompt(null);
  };
  const discardDraft = () => {
    deleteDraft(DRAFT_ID).catch(() => {});
    setDraftPrompt(null);
  };

  const pickFile = () => fileInputRef.current?.click();
  const takePhoto = () => cameraInputRef.current?.click();
  const startBlank = () => { setOriginalFile(null); setEditingPhoto(true); };

  // Shared by the file picker, camera capture, and clipboard paste — "open
  // the editor with this photo" only has one code path regardless of how
  // the file arrived. (The editor's own "匯入照片" button is separate: it
  // adds a photo into an already-open session instead of starting one.)
  const attachFile = (file) => {
    if (!file) return;
    const err = validatePhotoFile(file);
    if (err) { toast(err, "error"); return; }
    setResult(prev => { if (prev?.url) URL.revokeObjectURL(prev.url); return null; });
    setResumeScene(null);
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
    setResumeScene(null);
    setOriginalFile(null);
    setEditingPhoto(false);
    // Explicitly starting over — the persisted draft (if any) no longer
    // represents anything the user wants back, so it shouldn't keep
    // resurfacing as a resume prompt next visit.
    deleteDraft(DRAFT_ID).catch(() => {});
    // Desktop: the effect above immediately reopens a fresh blank canvas.
    // Mobile: this leaves the 拍照 prompt showing, as intended.
  };

  const showEditor = editingPhoto;

  return (
    <>
      {/* Room header — only shown before editing starts. Once a photo/blank
          canvas is open, the embedded editor's own top bar (✕/復原/重做/完成)
          is the only header for this view; keeping both stacked two title
          bars on top of each other for no reason. */}
      {!showEditor && (
        <div style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "var(--panel-alt)", flexShrink: 0 }}>
          <span style={{ fontSize: 20 }}>🖼️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>圖片編輯</div>
            <div style={{ fontSize: 11, color: "var(--text-faint)" }}>裁剪・濾鏡・貼圖・可直接貼上截圖</div>
          </div>
        </div>
      )}

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
          <div style={{ flex: 1, minHeight: 360, borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <PhotoEditorEmbeddedLazy
              file={originalFile}
              initialScene={result?.sceneJSON || resumeScene}
              draftId={DRAFT_ID}
              onCancel={() => setEditingPhoto(false)}
              onExport={(blob, sceneJSON) => {
                if (result?.url) URL.revokeObjectURL(result.url);
                setResumeScene(null);
                setResult({ url: URL.createObjectURL(blob), blob, sceneJSON });
                setEditingPhoto(false);
              }}
            />
          </div>
        )}

        {!showEditor && !result && draftPrompt && (
          <div style={{ textAlign: "center", color: "var(--text-dim)" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📝</div>
            <div style={{ fontSize: 16, color: "var(--text-faint)", marginBottom: 8 }}>找到未完成的編輯草稿</div>
            <div style={{ fontSize: 13, marginBottom: 20, color: "var(--text-dim)" }}>
              上次於 {new Date(draftPrompt.updatedAt).toLocaleString("zh-TW")} 儲存，要繼續編輯嗎？
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={resumeDraft}
                style={{ background: "linear-gradient(135deg,#2563eb,var(--accent-active))", border: "none", borderRadius: "var(--radius-md)", padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                繼續上次編輯
              </button>
              <button onClick={discardDraft}
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 24px", color: "var(--text)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                捨棄，重新開始
              </button>
            </div>
          </div>
        )}

        {!showEditor && !result && !draftPrompt && isMobile && (
          <div style={{ textAlign: "center", color: "var(--text-dim)" }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>📷</div>
            <div style={{ fontSize: 16, color: "var(--text-faint)", marginBottom: 8 }}>拍張照片開始編輯</div>
            <div style={{ fontSize: 13, marginBottom: 20, color: "var(--text-dim)" }}>拍完照直接進入編輯，也可以從相簿選擇、直接貼上截圖，或不用照片直接畫</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={takePhoto}
                style={{ background: "linear-gradient(135deg,#2563eb,var(--accent-active))", border: "none", borderRadius: "var(--radius-md)", padding: "10px 24px", color: "#fff", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                📷 拍照
              </button>
              <button onClick={pickFile}
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 24px", color: "var(--text)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                從相簿選擇
              </button>
              <button onClick={startBlank}
                style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "10px 24px", color: "var(--text)", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>
                空白畫布
              </button>
            </div>
          </div>
        )}

        {!showEditor && result && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, maxWidth: 480 }}>
            <img src={result.url} alt="編輯結果" style={{ maxWidth: "100%", maxHeight: 420, borderRadius: "var(--radius-lg)", border: "1px solid var(--panel)" }} />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <a href={result.url} download={`edited.${resultExt(result.blob)}`}
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
