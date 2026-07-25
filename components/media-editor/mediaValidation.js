// Shared client-side gatekeeping for anything entering EVON Studio. This is
// a UX guard only (fast, friendly rejection before the user spends time
// editing something that will fail to upload) — it is NOT a security
// boundary. The server/upload endpoint must never trust a file's declared
// type or size just because it passed this check.
export const PHOTO_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export const PHOTO_MAX_BYTES = 20 * 1024 * 1024; // 20MB
export const VIDEO_MAX_BYTES = 200 * 1024 * 1024; // 200MB

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
