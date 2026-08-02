import { useState } from "react";
import { PhotoEditorLazy, VideoEditorLazy } from "./index";
import { MAX_POST_IMAGES } from "../../lib/useMediaAttachments";
import { generateSubtitles } from "../../lib/generateSubtitles";
import { toast } from "../../lib/toast";

const SUBTITLE_PROGRESS_LABEL = {
  model: "下載語音辨識模型中",
  decode: "讀取影片聲音中",
  transcribe: "辨識字幕中",
};

// 影片字幕生成按鈕——完全在瀏覽器裡跑 Whisper（見 lib/generateSubtitles.js），
// 第一次用會下載語音模型（幾十 MB），瀏覽器快取後之後不用重下。這是選擇性
// 動作（使用者自己按），不是貼影片就自動觸發，避免沒開口的人也要等模型下載。
function SubtitleGenerateButton({ videoFile, subtitles, onSubtitles }) {
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(null);

  const run = async () => {
    setGenerating(true);
    setProgress({ stage: "decode" });
    try {
      const result = await generateSubtitles(videoFile, (p) => setProgress(p));
      if (!result.length) {
        toast("沒有辨識到可用的語音內容");
      } else {
        onSubtitles(result);
        toast(`已生成 ${result.length} 段字幕`, "success");
      }
    } catch (e) {
      console.error("[SubtitleGenerateButton] generate failed", e);
      toast(e?.message || "字幕生成失敗，請重試");
    } finally {
      setGenerating(false);
      setProgress(null);
    }
  };

  if (generating) {
    const label = SUBTITLE_PROGRESS_LABEL[progress?.stage] || "處理中";
    const pct = progress?.stage === "model" && typeof progress.progress === "number" ? `${Math.round(progress.progress)}%` : "";
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-faint)", marginTop: 6 }}>
        <span className="cr-spinner" style={{ width: 12, height: 12, border: "2px solid var(--border)", borderTopColor: "var(--accent)", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
        {label}{pct && ` ${pct}`}...
        <style>{"@keyframes spin { to { transform: rotate(360deg); } }"}</style>
      </div>
    );
  }

  if (subtitles?.length) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
        <span style={{ fontSize: 12, color: "var(--accent)" }}>✓ 已生成 {subtitles.length} 段字幕</span>
        <button onClick={run} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 12, padding: 0, textDecoration: "underline" }}>
          重新生成
        </button>
        <button onClick={() => onSubtitles(null)} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 12, padding: 0, textDecoration: "underline" }}>
          移除
        </button>
      </div>
    );
  }

  return (
    <button onClick={run}
      style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 6, background: "none", border: "1px solid var(--border)", borderRadius: 8, padding: "4px 10px", color: "var(--text-faint)", cursor: "pointer", fontSize: 12 }}>
      🤖 自動生成字幕
    </button>
  );
}

// 發文表單裡「已附加的媒體」預覽區——縮圖格、逐張移除、單張圖片可編輯、
// 影片可剪輯，點縮圖可以全螢幕預覽。Feed.js 跟 ProfileView.js 共用同一份。
export default function MediaAttachPreview({ media, thumbSize = 100 }) {
  const {
    imageFiles, imagePreviews, videoFile, videoPreview, audioFile, audioPreview, fileRef,
    removeImage, replaceImage, removeVideo, replaceVideo, removeAudio, subtitles, setSubtitles,
  } = media;
  const [editingPhotoIdx, setEditingPhotoIdx] = useState(null);
  const [editingVideo, setEditingVideo] = useState(false);
  const [lightbox, setLightbox] = useState(null); // { type: "image", idx } | { type: "video" } | null

  if (!imagePreviews.length && !videoPreview && !audioPreview) return null;

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

        {audioPreview && (
          <div style={{ position: "relative", width: thumbSize, height: thumbSize, borderRadius: 10, overflow: "hidden", background: "var(--panel-alt)", border: "1px solid var(--border)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 8, flexShrink: 0, boxSizing: "border-box" }}>
            <span style={{ fontSize: 26 }}>🎵</span>
            <span style={{ fontSize: 10, color: "var(--text-faint)", textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%", marginTop: 4 }}>
              {audioFile?.name}
            </span>
            <button onClick={e => { e.stopPropagation(); removeAudio(); }} aria-label="移除音樂"
              style={{ position: "absolute", top: 4, right: 4, background: "rgba(0,0,0,0.65)", border: "none", borderRadius: "50%", width: 22, height: 22, color: "#fff", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
              ✕
            </button>
          </div>
        )}
      </div>

      {audioPreview && (
        <audio src={audioPreview} controls style={{ width: "100%", marginTop: 8, height: 34 }} />
      )}

      {videoFile && (
        <div onClick={e => e.stopPropagation()}>
          <SubtitleGenerateButton videoFile={videoFile} subtitles={subtitles} onSubtitles={setSubtitles} />
        </div>
      )}

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
