// Shared client-side gatekeeping for anything entering EVON Studio. This is
// a UX guard only (fast, friendly rejection before the user spends time
// editing something that will fail to upload) — it is NOT a security
// boundary. The server/upload endpoint must never trust a file's declared
// type or size just because it passed this check.
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
// 瀏覽器/作業系統回報 mp3 的 MIME type 不太一致，常見的都收；如果完全沒有
// type（某些來源會這樣）就退回看副檔名。
export const AUDIO_MIME_TYPES = ["audio/mpeg", "audio/mp3", "audio/mpeg3", "audio/x-mpeg-3"];

export const PHOTO_MAX_BYTES = 20 * 1024 * 1024; // 20MB
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024; // 200MB
export const AUDIO_MAX_BYTES = 25 * 1024 * 1024; // 25MB，一首歌的 mp3 綽綽有餘

export function validatePhotoFile(file) {
  if (!file) return "找不到檔案";
  if (!PHOTO_MIME_TYPES.includes(file.type)) return "不支援的圖片格式";
  if (file.size > PHOTO_MAX_BYTES) return `圖片檔案不可超過 ${PHOTO_MAX_BYTES / 1024 / 1024}MB`;
  return null;
}

export function validateVideoFile(file) {
  if (!file) return "找不到檔案";
  if (!VIDEO_MIME_TYPES.includes(file.type)) return "不支援的影片格式";
  if (file.size > VIDEO_MAX_BYTES) return `影片檔案不可超過 ${VIDEO_MAX_BYTES / 1024 / 1024}MB`;
  return null;
}

export function isAudioFile(file) {
  if (!file) return false;
  if (AUDIO_MIME_TYPES.includes(file.type)) return true;
  if (!file.type) return /\.mp3$/i.test(file.name || "");
  return false;
}

export function validateAudioFile(file) {
  if (!file) return "找不到檔案";
  if (!isAudioFile(file)) return "只支援 MP3 音檔";
  if (file.size > AUDIO_MAX_BYTES) return `音檔不可超過 ${AUDIO_MAX_BYTES / 1024 / 1024}MB`;
  return null;
}
