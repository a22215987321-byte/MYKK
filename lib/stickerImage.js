// 自製貼圖的前端圖片處理：裁切／縮圖／白邊／圓角，全部在 canvas 上完成，
// 上傳前就把檔案壓到 512x512（縮圖 128x128），不會把原圖直接當貼圖發送。
const MAIN_SIZE = 512;
const THUMB_SIZE = 128;

export function generateStickerId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `stk_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}

let _webpSupport = null;
export function supportsWebp() {
  if (_webpSupport !== null) return _webpSupport;
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  _webpSupport = canvas.toDataURL("image/webp").startsWith("data:image/webp");
  return _webpSupport;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("canvas toBlob failed"));
    }, type, quality);
  });
}

// offsetX/offsetY/scale 描述使用者在方形裁切框裡「移動/縮放」圖片的狀態：
// scale=1 時圖片以 cover 方式剛好填滿方框；offsetX/offsetY 是額外的像素位移（裁切框座標系）。
function drawCropped(ctx, img, size, offsetX, offsetY, scale, whiteBorder, rounded) {
  ctx.clearRect(0, 0, size, size);

  const pad = whiteBorder ? Math.round(size * 0.06) : 0;
  const innerSize = size - pad * 2;

  if (rounded) {
    ctx.save();
    ctx.beginPath();
    const r = innerSize / 2;
    ctx.arc(size / 2, size / 2, r, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();
  }

  if (whiteBorder) {
    ctx.fillStyle = "#ffffff";
    if (rounded) {
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillRect(0, 0, size, size);
    }
  }

  const baseScale = Math.max(innerSize / img.width, innerSize / img.height) * scale;
  const drawW = img.width * baseScale;
  const drawH = img.height * baseScale;
  const cx = pad + innerSize / 2 + offsetX;
  const cy = pad + innerSize / 2 + offsetY;
  ctx.drawImage(img, cx - drawW / 2, cy - drawH / 2, drawW, drawH);

  if (rounded) ctx.restore();
}

// 回傳 { mainBlob, thumbBlob, mainType } — 512x512 主圖 + 128x128 縮圖，
// 都優先輸出 webp（支援的瀏覽器），否則退回 png（保留透明背景）。
export async function renderSticker(img, { offsetX = 0, offsetY = 0, scale = 1, whiteBorder = false, rounded = false } = {}) {
  const type = supportsWebp() ? "image/webp" : "image/png";

  const mainCanvas = document.createElement("canvas");
  mainCanvas.width = MAIN_SIZE; mainCanvas.height = MAIN_SIZE;
  drawCropped(mainCanvas.getContext("2d"), img, MAIN_SIZE, offsetX, offsetY, scale, whiteBorder, rounded);

  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = THUMB_SIZE; thumbCanvas.height = THUMB_SIZE;
  const thumbScaleFactor = THUMB_SIZE / MAIN_SIZE;
  drawCropped(thumbCanvas.getContext("2d"), img, THUMB_SIZE, offsetX * thumbScaleFactor, offsetY * thumbScaleFactor, scale, whiteBorder, rounded);

  let mainBlob = await canvasToBlob(mainCanvas, type, 0.85);
  // 300KB 以下的壓縮目標：webp 品質不夠就再降一次，png 沒有品質參數就不重試。
  if (type === "image/webp" && mainBlob.size > 300 * 1024) {
    mainBlob = await canvasToBlob(mainCanvas, type, 0.65);
  }
  const thumbBlob = await canvasToBlob(thumbCanvas, type, 0.8);

  return { mainBlob, thumbBlob, mainType: type };
}

export function blobToFile(blob, baseName, type) {
  const ext = type === "image/webp" ? "webp" : "png";
  return new File([blob], `${baseName}.${ext}`, { type });
}
