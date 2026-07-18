// 共用的圖片/影片上傳（Cloudflare R2，經 /api/upload）。
// 貼圖製作流程用這份共用版本；聊天室/動態消息/個人頁既有的頭像、
// 聊天圖片上傳各自有自己的一份相同邏輯，維持原樣不動，避免無關改動。
export async function uploadToR2(file) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileName: file.name, fileType: file.type, fileData: base64 }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "上傳失敗");
  return data.url;
}
