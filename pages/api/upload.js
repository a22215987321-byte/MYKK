import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// 這支 API 只回傳一個「預簽名的 R2 上傳網址」（小小一段 JSON），不再經手
// 檔案本身的位元組——實際檔案是瀏覽器直接 PUT 去 Cloudflare R2，完全繞過
// Vercel serverless function 的請求大小限制（不管這裡的 bodyParser.sizeLimit
// 設多大，Vercel 平台本身對 function request body 有一個更小、改不了的硬性
// 上限，這就是之前 5 分鐘 1080p 影片會「上傳失敗」的真正原因——不是這支程式
// 裡的設定問題，是整個「把檔案塞進一次 API 請求」這個做法本身在大檔案上
// 走不通）。
const s3 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileName, fileType } = req.body || {};
    if (!fileName) {
      return res.status(400).json({ error: "Missing file name" });
    }

    const ext = fileName.includes(".") ? fileName.split(".").pop() : "bin";
    const key = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const uploadUrl = await getSignedUrl(
      s3,
      new PutObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME,
        Key: key,
        ContentType: fileType || "application/octet-stream",
      }),
      { expiresIn: 300 }
    );

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`;
    return res.status(200).json({ uploadUrl, publicUrl });
  } catch (err) {
    console.error("R2 presign error:", err);
    return res.status(500).json({ error: "Upload failed" });
  }
}
