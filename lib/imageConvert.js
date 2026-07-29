// Client-side image format conversion — decode via createImageBitmap, draw
// to an off-DOM <canvas>, re-encode via canvas.toBlob(). No new dependency:
// every browser this app targets already ships all three of these APIs.
//
// GIF is only ever a valid INPUT here, never an output — no browser
// implements canvas.toBlob("image/gif", ...). Decoding an animated GIF
// through createImageBitmap also only ever yields its first frame
// (ImageBitmap has no concept of animation), so a GIF fed through this
// conversion only ever produces a single still frame regardless of target.
const FORMAT_MIME = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const IMAGE_OUTPUT_FORMATS = [
  { id: "jpeg", label: "JPEG", ext: "jpg" },
  { id: "png", label: "PNG", ext: "png" },
  { id: "webp", label: "WebP", ext: "webp" },
];

// Best-effort mapping from an input File's own MIME type to one of
// IMAGE_OUTPUT_FORMATS' ids — used to pick a sensible default target format
// that isn't just "convert the file to itself" (e.g. a PNG defaults to
// JPEG, everything else defaults to PNG). GIF has no corresponding output
// format (see the module comment above), so it falls through to null.
export function detectImageFormatId(file) {
  if (file.type === "image/jpeg") return "jpeg";
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return null;
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) resolve(blob);
      else reject(new Error("轉換失敗：瀏覽器無法產生這個格式的檔案"));
    }, mime, quality);
  });
}

// format: one of IMAGE_OUTPUT_FORMATS' ids. quality: 0-1, ignored for png.
// maxWidth/maxHeight: optional — when given, the image is scaled down
// (never up) to fit within them, preserving aspect ratio.
export async function convertImageFile(file, { format, quality = 0.92, maxWidth, maxHeight } = {}) {
  const mime = FORMAT_MIME[format];
  if (!mime) throw new Error(`不支援的輸出格式：${format}`);

  const bitmap = await createImageBitmap(file);
  let width = bitmap.width, height = bitmap.height;
  if (maxWidth || maxHeight) {
    const scale = Math.min(1, maxWidth ? maxWidth / width : 1, maxHeight ? maxHeight / height : 1);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  // JPEG has no alpha channel — a transparent PNG/WebP source would
  // otherwise flatten to black instead of white.
  if (format === "jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  return canvasToBlob(canvas, mime, format === "png" ? undefined : quality);
}
