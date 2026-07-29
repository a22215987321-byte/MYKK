// Client-side gatekeeping for the 文檔轉換 room — this is a UX guard against
// choking the visitor's own browser tab (huge files / too many at once),
// NOT a server-abuse boundary. There is no server endpoint behind this
// feature at all (see lib/imageConvert.js and lib/mediaConvert.js — both
// run entirely client-side), so there's nothing server-side to protect.
export const CONVERT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const CONVERT_MEDIA_TYPES = ["video/mp4", "video/webm", "video/quicktime", "video/x-matroska", "audio/mpeg", "audio/wav", "audio/ogg", "audio/flac"];

// Matches the existing PHOTO_MAX_BYTES/VIDEO_MAX_BYTES caps in
// components/media-editor/mediaValidation.js — same reasoning, same numbers.
export const CONVERT_IMAGE_MAX_BYTES = 20 * 1024 * 1024; // 20MB
export const CONVERT_MEDIA_MAX_BYTES = 200 * 1024 * 1024; // 200MB

// One conversion queue at a time in the room — converting is CPU-heavy
// (especially video, which runs a real decode/encode pass), so this caps
// how many files a visitor can pile up before clearing some out.
export const MAX_QUEUE_FILES = 5;

export function detectConvertKind(file) {
  if (!file) return null;
  if (CONVERT_IMAGE_TYPES.includes(file.type)) return "image";
  if (CONVERT_MEDIA_TYPES.includes(file.type)) return "media";
  return null;
}

// Returns an error string, or null if the file is fine to queue.
export function validateConvertFile(file) {
  if (!file) return "找不到檔案";
  const kind = detectConvertKind(file);
  if (kind === "image") {
    if (file.size > CONVERT_IMAGE_MAX_BYTES) return `圖片檔案不可超過 ${CONVERT_IMAGE_MAX_BYTES / 1024 / 1024}MB`;
    return null;
  }
  if (kind === "media") {
    if (file.size > CONVERT_MEDIA_MAX_BYTES) return `影音檔案不可超過 ${CONVERT_MEDIA_MAX_BYTES / 1024 / 1024}MB`;
    return null;
  }
  return "不支援的檔案類型";
}
