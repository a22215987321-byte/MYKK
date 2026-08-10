import { useRef, useState } from "react";
import { toast } from "./toast";
import { uploadToR2 } from "./uploadToR2";
import { validatePhotoFile, validateVideoFile, validateAudioFile, isAudioFile } from "../components/media-editor/mediaValidation";

// 一篇貼文可以貼幾張圖——影片、音樂(MP3) 維持一次一支（跟原本一樣，剪輯
// 功能也只認得單一檔案），圖片可以多張、逐張獨立移除/替換。三種媒體
// 互斥——一篇貼文只能是「一堆圖片」或「一支影片」或「一首歌」其中一種。
export const MAX_POST_IMAGES = 9;

// 影片貼文之前完全沒有真正的封面圖——影片格網（VideoHub／ProfileView 的
// 影片分頁）是靠 <video preload="metadata"> 載入後自己 seek 到某一幀當
// 縮圖，慢連線或某些瀏覽器 range-request 支援不好的情況下會整個顯示黑畫面，
// 使用者反映「影片必須顯示封面」。改成在使用者選好影片檔案、真正上傳之前，
// 用一個離屏 <video>+<canvas> 從影片中間擷取一幀，轉成 JPEG 上傳到 R2，
// 存成貼文的 thumbnailUrl——格網跟播放器都改用這張真的圖片當封面（見
// VideoHub.js／ProfileView.js 的 VideoThumb／VideoPlayer 的 poster prop），
// 不用等影片本身載入就能立刻顯示，也不會再有黑畫面的問題。任何一步失敗都
// 不擋貼文送出，只是那篇貼文沒有封面圖（回退到舊的 seek-frame 顯示方式）。
function captureVideoThumbnail(file) {
  return new Promise((resolve) => {
    let settled = false;
    const finish = (result) => {
      if (settled) return;
      settled = true;
      URL.revokeObjectURL(url);
      resolve(result);
    };
    const video = document.createElement("video");
    const url = URL.createObjectURL(file);
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    video.src = url;
    video.onloadedmetadata = () => {
      try { video.currentTime = Math.min(1, (video.duration || 1) / 2); }
      catch { finish(null); }
    };
    video.onseeked = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 360;
        canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(blob => finish(blob), "image/jpeg", 0.82);
      } catch {
        finish(null);
      }
    };
    video.onerror = () => finish(null);
    // 保險逾時——某些瀏覽器對沒有加進 DOM 的 <video> 不會確實觸發
    // loadedmetadata/seeked，不能無限等下去卡住貼文送出流程。
    setTimeout(() => finish(null), 8000);
  });
}

// Feed.js 跟 ProfileView.js 的「發新貼文」表單本來是各自複製一份幾乎一樣的
// 附加媒體邏輯——這裡抽成共用 hook，兩邊改成呼叫同一份，之後多圖/影片/音樂的
// 行為只要改一個地方，不會再兩邊各自長出不同的 bug。
export function useMediaAttachments() {
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [audioPreview, setAudioPreview] = useState(null);
  // 字幕（AI 自動生成，瀏覽器端跑 Whisper，見 MediaAttachPreview 裡的
  // 生成按鈕跟 lib/generateSubtitles.js）——只是純資料（[{start,end,text}]），
  // 換一支影片或移除影片就要跟著清掉，不然會變成另一支影片的字幕。
  const [subtitles, setSubtitles] = useState(null);
  const fileRef = useRef();

  const mediaType = videoFile ? "video" : (audioFile ? "audio" : (imageFiles.length ? "image" : null));
  const hasMedia = imageFiles.length > 0 || !!videoFile || !!audioFile;

  const attachImages = (files) => {
    if (videoFile) { toast("已經有附加影片了，請先移除再加入圖片"); return false; }
    if (audioFile) { toast("已經有附加音樂了，請先移除再加入圖片"); return false; }
    const room = MAX_POST_IMAGES - imageFiles.length;
    if (room <= 0) { toast(`最多只能加 ${MAX_POST_IMAGES} 張圖片`); return false; }
    const valid = [];
    let firstErr = null;
    for (const f of files) {
      if (valid.length >= room) break;
      const err = validatePhotoFile(f);
      if (err) { firstErr = firstErr || err; continue; }
      valid.push(f);
    }
    if (!valid.length) { toast(firstErr || "沒有可加入的圖片"); return false; }
    setImageFiles(prev => [...prev, ...valid]);
    setImagePreviews(prev => [...prev, ...valid.map(f => URL.createObjectURL(f))]);
    if (valid.length < files.length) toast(`已加入 ${valid.length} 張圖片，其餘未加入（格式或張數限制）`, "success");
    else toast(valid.length > 1 ? `已加入 ${valid.length} 張圖片` : "圖片已加入", "success");
    return true;
  };

  const attachVideo = (file) => {
    if (imageFiles.length) { toast("已經有附加圖片了，請先移除再加入影片"); return false; }
    if (audioFile) { toast("已經有附加音樂了，請先移除再加入影片"); return false; }
    const err = validateVideoFile(file);
    if (err) { toast(err); return false; }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    return true;
  };

  const attachAudio = (file) => {
    if (imageFiles.length) { toast("已經有附加圖片了，請先移除再加入音樂"); return false; }
    if (videoFile) { toast("已經有附加影片了，請先移除再加入音樂"); return false; }
    const err = validateAudioFile(file);
    if (err) { toast(err); return false; }
    setAudioFile(file);
    setAudioPreview(URL.createObjectURL(file));
    return true;
  };

  // 檔案選擇器一次可能同時選到圖片/影片/音樂——影片優先、音樂其次（都只取
  // 第一個），沒有影片也沒有音樂才把選到的圖片全部加進去。
  const onFile = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const videos = files.filter(f => f.type.startsWith("video/"));
    const audios = files.filter(f => isAudioFile(f));
    const images = files.filter(f => f.type.startsWith("image/"));
    if (videos.length) attachVideo(videos[0]);
    else if (audios.length) attachAudio(audios[0]);
    else if (images.length) attachImages(images);
    e.target.value = "";
  };

  // 回傳 true 代表「這次貼上已經被媒體附加邏輯處理掉了」，呼叫端要
  // preventDefault 並且不要再跑自己原本的文字貼上邏輯。
  const onPasteImages = (items, preventDefault) => {
    const imageItems = Array.from(items || []).filter(it => it.type.startsWith("image/"));
    if (!imageItems.length) return false;
    preventDefault();
    if (videoFile) { toast("已經有附加影片了，請先移除再貼上圖片"); return true; }
    if (audioFile) { toast("已經有附加音樂了，請先移除再貼上圖片"); return true; }
    const files = imageItems.map((it, i) => {
      const f = it.getAsFile();
      if (!f) return null;
      return new File([f], f.name || `pasted-${Date.now()}-${i}.png`, { type: f.type });
    }).filter(Boolean);
    if (files.length) attachImages(files);
    return true;
  };

  const removeImage = (idx) => {
    setImageFiles(prev => prev.filter((_, i) => i !== idx));
    setImagePreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const replaceImage = (idx, file, previewUrl) => {
    setImageFiles(prev => prev.map((f, i) => (i === idx ? file : f)));
    setImagePreviews(prev => prev.map((p, i) => (i === idx ? previewUrl : p)));
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setSubtitles(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const replaceVideo = (file, previewUrl) => {
    setVideoFile(file);
    setVideoPreview(previewUrl);
    setSubtitles(null);
  };

  const removeAudio = () => {
    setAudioFile(null);
    setAudioPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeAll = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setVideoFile(null);
    setVideoPreview(null);
    setAudioFile(null);
    setAudioPreview(null);
    setSubtitles(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const upload = async () => {
    if (videoFile) {
      const [url, thumbBlob] = await Promise.all([
        uploadToR2(videoFile),
        captureVideoThumbnail(videoFile),
      ]);
      let thumbnailUrl = null;
      if (thumbBlob) {
        try {
          thumbnailUrl = await uploadToR2(new File([thumbBlob], "thumb.jpg", { type: "image/jpeg" }));
        } catch (err) {
          console.error("[useMediaAttachments] thumbnail upload failed", err);
        }
      }
      return { imageUrls: [], videoUrl: url, audioUrl: null, subtitles: subtitles || null, thumbnailUrl };
    }
    if (audioFile) {
      const url = await uploadToR2(audioFile);
      return { imageUrls: [], videoUrl: null, audioUrl: url, subtitles: null };
    }
    if (imageFiles.length) {
      const urls = await Promise.all(imageFiles.map(f => uploadToR2(f)));
      return { imageUrls: urls, videoUrl: null, audioUrl: null, subtitles: null };
    }
    return { imageUrls: [], videoUrl: null, audioUrl: null, subtitles: null };
  };

  return {
    imageFiles, imagePreviews, videoFile, videoPreview, audioFile, audioPreview, mediaType, hasMedia, fileRef,
    subtitles, setSubtitles,
    attachImages, attachVideo, attachAudio, onFile, onPasteImages,
    removeImage, replaceImage, removeVideo, replaceVideo, removeAudio, removeAll,
    upload,
  };
}
