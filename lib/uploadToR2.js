// 共用的圖片/影片上傳（Cloudflare R2）。分兩步：先跟 /api/upload 要一個
// 預簽名網址（小 JSON，不含檔案本身），再把檔案原始位元組直接 PUT 去 R2——
// 不會再把整個檔案塞進送給 Vercel serverless function 的請求裡，所以不會再
// 卡到 Vercel 平台本身的 request body 大小上限（這正是先前大檔案，例如
// 5 分鐘 1080p 影片，會直接「上傳失敗」的原因）。
// 貼圖製作流程用這份共用版本；聊天室/動態消息/個人頁既有的頭像、
// 聊天圖片上傳各自有自己的一份相同邏輯，維持原樣不動，避免無關改動。
export async function uploadToR2(file) {
  const presignRes = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type }),
  });
  const presignData = await presignRes.json();
  if (!presignRes.ok) throw new Error(presignData.error || "上傳失敗");

  const putRes = await fetch(presignData.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!putRes.ok) throw new Error("上傳失敗，請重試");

  return presignData.publicUrl;
}
