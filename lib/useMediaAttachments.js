import { useRef, useState } from "react";
import { toast } from "./toast";
import { uploadToR2 } from "./uploadToR2";
import { validatePhotoFile, validateVideoFile } from "../components/media-editor/mediaValidation";

// 一篇貼文可以貼幾張圖——影片維持一次一支（跟原本一樣，剪輯功能也只認得
// 單一檔案），圖片可以多張、逐張獨立移除/替換。
export const MAX_POST_IMAGES = 9;

// Feed.js 跟 ProfileView.js 的「發新貼文」表單本來是各自複製一份幾乎一樣的
// 附加媒體邏輯——這裡抽成共用 hook，兩邊改成呼叫同一份，之後多圖/影片的
// 行為只要改一個地方，不會再兩邊各自長出不同的 bug。
export function useMediaAttachments() {
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const fileRef = useRef();

  const mediaType = videoFile ? "video" : (imageFiles.length ? "image" : null);
  const hasMedia = imageFiles.length > 0 || !!videoFile;

  const attachImages = (files) => {
    if (videoFile) { toast("已經有附加影片了，請先移除再加入圖片"); return false; }
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
    const err = validateVideoFile(file);
    if (err) { toast(err); return false; }
    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
    return true;
  };

  // 檔案選擇器一次可能同時選到圖片+影片——影片優先（跟原本單一媒體行為一致，
  // 只取第一支），沒有影片才把選到的圖片全部加進去。
  const onFile = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const videos = files.filter(f => f.type.startsWith("video/"));
    const images = files.filter(f => f.type.startsWith("image/"));
    if (videos.length) attachVideo(videos[0]);
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
    if (fileRef.current) fileRef.current.value = "";
  };

  const replaceVideo = (file, previewUrl) => {
    setVideoFile(file);
    setVideoPreview(previewUrl);
  };

  const removeAll = () => {
    setImageFiles([]);
    setImagePreviews([]);
    setVideoFile(null);
    setVideoPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const upload = async () => {
    if (videoFile) {
      const url = await uploadToR2(videoFile);
      return { imageUrls: [], videoUrl: url };
    }
    if (imageFiles.length) {
      const urls = await Promise.all(imageFiles.map(f => uploadToR2(f)));
      return { imageUrls: urls, videoUrl: null };
    }
    return { imageUrls: [], videoUrl: null };
  };

  return {
    imageFiles, imagePreviews, videoFile, videoPreview, mediaType, hasMedia, fileRef,
    attachImages, attachVideo, onFile, onPasteImages,
    removeImage, replaceImage, removeVideo, replaceVideo, removeAll,
    upload,
  };
}
