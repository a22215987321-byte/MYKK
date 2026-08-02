import { useState } from "react";
import { PhotoEditorLazy, VideoEditorLazy } from "./index";
import { MAX_POST_IMAGES } from "../../lib/useMediaAttachments";

// 發文表單裡「已附加的媒體」預覽區——縮圖格、逐張移除、單張圖片可編輯、
// 影片可剪輯，點縮圖可以全螢幕預覽。Feed.js 跟 ProfileView.js 共用同一份。
export default function MediaAttachPreview({ media, thumbSize = 100 }) {
  const { imageFiles, imagePreviews, videoFile, videoPreview, fileRef, removeImage, replaceImage, removeVideo, replaceVideo } = media;
  const [editingPhotoIdx, setEditingPhotoIdx] = useState(null);
  const [editingVideo, setEditingVideo] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { type: "image", idx } | { type: "video" } | null

  if (!imagePreviews.length && !videoPreview) return null;

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
        {imagePreviews.map((src, idx) => (
          <div
            key={idx}
            onClick={() => setLightbox({ type: "image", idx })}
            style={{ position: "relative", width: thumbSize, height: thumbSize, borderRadius: 10, overflow: "hidden", cursor: "zoom-in", flexShrink: 0 }}
          >
            <img src={src} alt={`預覽 ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            {imagePreviews.length === 1 && (
              <button onClick={e => { e.stopPropagation(); setEditingPhotoIdx(idx); }} aria-label="編輯圖片"
                style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(0,0,0,0.65)", border: "none", borderRadius: 13, width: 26, height: 26, color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
                ✏️
              </button>
            )}
            <button onClick={e => { e.stopPropagation(); removeImage(idx); }} aria-label="移除圖片"
              style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ✕
            </button>
          </div>
        ))}

        {imagePreviews.length > 0 && imagePreviews.length < MAX_POST_IMAGES && (
          <button onClick={() => fileRef.current?.click()} aria-label="加入更多圖片"
            style={{ width: thumbSize, height: thumbSize, borderRadius: 10, border: "1px dashed var(--border)", background: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 22, flexShrink: 0 }}>
            ＋
          </button>
        )}

        {videoPreview && (
          <div
            onClick={() => setLightbox({ type: "video" })}
            style={{ position: "relative", width: thumbSize, height: thumbSize, borderRadius: 10, overflow: "hidden", cursor: "zoom-in", flexShrink: 0 }}
          >
            <video src={videoPreview} muted style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
            <button onClick={e => { e.stopPropagation(); setEditingVideo(true); }} aria-label="剪輯影片"
              style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(0,0,0,0.65)", border: "none", borderRadius: 13, width: 26, height: 26, color: "#fff", cursor: "pointer", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ✂️
            </button>
            <button onClick={e => { e.stopPropagation(); removeVideo(); }} aria-label="移除影片"
              style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ✕
            </button>
          </div>
        )}
      </div>

      {lightbox && (
        <div role="dialog" aria-modal="true" aria-label="媒體預覽" onClick={() => setLightbox(null)}
          style={{ position: "fixed", inset: 0, zIndex: 1500, background: "#000", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out" }}>
          {lightbox.type === "video"
            ? <video src={videoPreview} controls autoPlay onClick={e => e.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "92vh" }} />
            : <img src={imagePreviews[lightbox.idx]} alt="預覽" onClick={e => e.stopPropagation()} style={{ maxWidth: "92vw", maxHeight: "92vh", objectFit: "contain" }} />
          }
          <button onClick={() => setLightbox(null)} aria-label="關閉預覽"
            style={{ position: "absolute", top: 20, right: 20, background: "rgba(30,41,59,0.9)", border: "1px solid var(--border)", color: "#f1f5f9", fontSize: 20, width: 40, height: 40, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>
      )}

      {editingPhotoIdx != null && imageFiles[editingPhotoIdx] && (
        <PhotoEditorLazy
          file={imageFiles[editingPhotoIdx]}
          onCancel={() => setEditingPhotoIdx(null)}
          onExport={(blob) => {
            const src = imageFiles[editingPhotoIdx];
            const edited = new File([blob], src.name.replace(/\.\w+$/, "") + "-edited.jpg", { type: "image/jpeg" });
            replaceImage(editingPhotoIdx, edited, URL.createObjectURL(blob));
            setEditingPhotoIdx(null);
          }}
        />
      )}

      {editingVideo && videoFile && (
        <VideoEditorLazy
          files={[videoFile]}
          onCancel={() => setEditingVideo(false)}
          onExport={(videoBlob) => {
            const edited = new File([videoBlob], videoFile.name.replace(/\.\w+$/, "") + "-edited.mp4", { type: "video/mp4" });
            replaceVideo(edited, URL.createObjectURL(videoBlob));
            setEditingVideo(false);
          }}
        />
      )}
    </>
  );
}
