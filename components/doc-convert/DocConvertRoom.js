import { useEffect, useRef, useState } from "react";
import FileDropZone from "./FileDropZone";
import ConversionItem from "./ConversionItem";
import { validateConvertFile, detectConvertKind, MAX_QUEUE_FILES } from "../../lib/convertValidation";
import { IMAGE_OUTPUT_FORMATS, detectImageFormatId, convertImageFile } from "../../lib/imageConvert";
import { getSupportedMediaTargets, convertMediaFile } from "../../lib/mediaConvert";
import { toast } from "../../lib/toast";

function stripExt(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(0, i) : name;
}

let nextId = 0;
const newItemId = () => `dc-${Date.now()}-${nextId++}`;

// Standalone "文檔轉換" room — image format conversion (Canvas API) and
// video/audio conversion (mediabunny), both 100% client-side. No server
// endpoint backs this at all, so there's no upload/bandwidth/compute cost on
// our end regardless of how much it's used — see lib/imageConvert.js and
// lib/mediaConvert.js. The queue caps (MAX_QUEUE_FILES, per-type byte caps in
// lib/convertValidation.js) exist purely to keep a visitor's own browser tab
// from choking on too much at once, not to prevent server abuse.
export default function DocConvertRoom() {
  const [queue, setQueue] = useState([]);
  const queueRef = useRef(queue);
  queueRef.current = queue;

  // Revoke every still-held result: URL on unmount — nothing else does this
  // for items that are simply left in the queue instead of explicitly removed.
  useEffect(() => {
    return () => {
      queueRef.current.forEach(it => { if (it.resultUrl) URL.revokeObjectURL(it.resultUrl); });
    };
  }, []);

  const updateItem = (id, patch) => {
    setQueue(q => q.map(it => (it.id === id ? { ...it, ...(typeof patch === "function" ? patch(it) : patch) } : it)));
  };

  const handleFiles = (files) => {
    const room = MAX_QUEUE_FILES - queue.length;
    if (room <= 0) {
      toast(`一次最多同時處理 ${MAX_QUEUE_FILES} 個檔案，請先移除已完成的項目`, "error");
      return;
    }
    const accepted = [];
    for (const file of files) {
      const err = validateConvertFile(file);
      if (err) { toast(`${file.name}：${err}`, "error"); continue; }
      accepted.push(file);
    }
    if (accepted.length > room) {
      toast(`一次最多同時處理 ${MAX_QUEUE_FILES} 個檔案，只加入前 ${room} 個`, "error");
    }

    for (const file of accepted.slice(0, room)) {
      const kind = detectConvertKind(file);
      const id = newItemId();

      if (kind === "image") {
        const sourceFormatId = detectImageFormatId(file);
        const targetFormat = (IMAGE_OUTPUT_FORMATS.find(f => f.id !== sourceFormatId) || IMAGE_OUTPUT_FORMATS[0]).id;
        setQueue(q => [...q, {
          id, file, kind, status: "ready",
          targetOptions: IMAGE_OUTPUT_FORMATS, targetFormat,
          progress: 0, error: null, resultBlob: null, resultUrl: null, resultName: null,
        }]);
      } else {
        setQueue(q => [...q, {
          id, file, kind, status: "loading",
          targetOptions: [], targetFormat: null,
          progress: 0, error: null, resultBlob: null, resultUrl: null, resultName: null,
        }]);
        getSupportedMediaTargets(file).then(targetOptions => {
          updateItem(id, { status: "ready", targetOptions, targetFormat: targetOptions[0]?.id || null });
        }).catch(() => {
          updateItem(id, { status: "ready", targetOptions: [] });
        });
      }
    }
  };

  const handleChangeTarget = (id, targetFormat) => updateItem(id, { targetFormat });

  const handleRemove = (id) => {
    const item = queueRef.current.find(it => it.id === id);
    if (item?.resultUrl) URL.revokeObjectURL(item.resultUrl);
    setQueue(q => q.filter(it => it.id !== id));
  };

  const handleConvert = async (id) => {
    const item = queueRef.current.find(it => it.id === id);
    if (!item || !item.targetFormat) return;
    updateItem(id, { status: "converting", progress: 0, error: null });

    try {
      let blob, ext;
      if (item.kind === "image") {
        blob = await convertImageFile(item.file, { format: item.targetFormat });
        ext = IMAGE_OUTPUT_FORMATS.find(f => f.id === item.targetFormat)?.ext || item.targetFormat;
      } else {
        blob = await convertMediaFile(item.file, {
          targetId: item.targetFormat,
          onProgress: (pct) => updateItem(id, { progress: pct }),
        });
        ext = item.targetFormat;
      }
      const resultUrl = URL.createObjectURL(blob);
      updateItem(id, {
        status: "done", progress: 100, resultBlob: blob, resultUrl,
        resultName: `${stripExt(item.file.name)}.${ext}`,
      });
    } catch (e) {
      updateItem(id, { status: "error", error: e?.message || "轉換失敗，請再試一次" });
    }
  };

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: "auto", display: "flex", flexDirection: "column" }}>
      <div style={{ height: 56, borderBottom: "1px solid var(--panel)", display: "flex", alignItems: "center", padding: "0 20px", gap: 12, background: "var(--panel-alt)", flexShrink: 0 }}>
        <span style={{ fontSize: 20 }}>🔄</span>
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>文檔轉換</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>圖片・影音格式互轉，全部在您的裝置本地完成，檔案不會上傳到伺服器</div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 20, display: "flex", flexDirection: "column", gap: 16, maxWidth: 640, margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <FileDropZone
          onFiles={handleFiles}
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,video/x-matroska,audio/mpeg,audio/wav,audio/ogg,audio/flac"
          label="拖曳檔案到這裡，或點擊選擇檔案"
          hint={`支援圖片（JPG/PNG/WebP/GIF）與影音格式，一次最多 ${MAX_QUEUE_FILES} 個檔案`}
        />

        {queue.length === 0 ? (
          <div style={{ textAlign: "center", color: "var(--text-faint)", fontSize: 13, padding: "20px 0" }}>
            還沒有加入任何檔案
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {queue.map(item => (
              <ConversionItem
                key={item.id}
                item={item}
                onChangeTarget={handleChangeTarget}
                onConvert={handleConvert}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
