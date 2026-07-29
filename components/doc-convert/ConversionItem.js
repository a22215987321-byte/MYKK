function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const btnStyle = {
  minHeight: 36, padding: "0 16px", borderRadius: 8, border: "none", cursor: "pointer",
  background: "linear-gradient(135deg,var(--accent),var(--accent-2))", color: "var(--accent-text)",
  fontSize: 13, fontWeight: 600,
};
const btnDisabledStyle = { ...btnStyle, background: "var(--panel-hover)", color: "var(--text-dim)", cursor: "not-allowed" };

// One row in the conversion queue — file info, target-format picker, convert
// button, progress bar, and (once done) a download link or an error message.
// Kept presentational: all state transitions/actual conversion calls live in
// DocConvertRoom, this just renders whatever `item` currently says.
export default function ConversionItem({ item, onChangeTarget, onConvert, onRemove }) {
  const { file, kind, status, targetOptions, targetFormat, progress, error, resultBlob, resultUrl, resultName } = item;

  return (
    <div style={{
      border: "1px solid var(--border)", borderRadius: "var(--radius-md)", background: "var(--panel)",
      padding: 14, display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 22, flexShrink: 0 }}>{kind === "image" ? "🖼️" : "🎬"}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{file.name}</div>
          <div style={{ fontSize: 11, color: "var(--text-faint)" }}>{formatBytes(file.size)}</div>
        </div>
        <button onClick={() => onRemove(item.id)} title="移除"
          style={{ background: "none", border: "none", color: "var(--text-faint)", fontSize: 16, cursor: "pointer", padding: 4 }}>
          ✕
        </button>
      </div>

      {file.type === "image/gif" && (
        <div style={{ fontSize: 11, color: "var(--text-faint)" }}>
          ⚠️ GIF 沒有輸出選項，只能轉出動畫的第一格畫面（瀏覽器目前都無法輸出動畫 GIF）
        </div>
      )}

      {status === "loading" && (
        <div style={{ fontSize: 12, color: "var(--text-faint)" }}>偵測這個瀏覽器可用的格式中...</div>
      )}

      {status !== "loading" && targetOptions.length === 0 && (
        <div style={{ fontSize: 12, color: "#dc2626" }}>此瀏覽器不支援轉換這個檔案，換一個檔案或瀏覽器試試</div>
      )}

      {status !== "loading" && targetOptions.length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>轉成</span>
          <select value={targetFormat} disabled={status === "converting"} onChange={e => onChangeTarget(item.id, e.target.value)}
            style={{
              minHeight: 36, borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel-alt)",
              color: "var(--text)", fontSize: 13, padding: "0 10px",
            }}>
            {targetOptions.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>

          {status === "done" && resultBlob ? (
            <a href={resultUrl} download={resultName}
              style={{ ...btnStyle, textDecoration: "none", display: "inline-flex", alignItems: "center" }}>
              ⬇ 下載（{formatBytes(resultBlob.size)}）
            </a>
          ) : (
            <button onClick={() => onConvert(item.id)} disabled={status === "converting"}
              style={status === "converting" ? btnDisabledStyle : btnStyle}>
              {status === "converting" ? "轉換中..." : status === "error" ? "重試" : "轉換"}
            </button>
          )}
        </div>
      )}

      {status === "converting" && (
        <div style={{ height: 6, borderRadius: 3, background: "var(--panel-hover)", overflow: "hidden" }}>
          {/* Image conversion resolves almost instantly (a single canvas
              encode), so a real percentage isn't meaningful there — just
              fill the bar. Media conversion reports real progress via
              mediabunny's onProgress callback. */}
          <div style={{
            height: "100%", borderRadius: 3, background: "var(--accent)",
            width: kind === "media" ? `${progress}%` : "100%",
            transition: "width 0.2s ease",
          }} />
        </div>
      )}

      {status === "error" && error && (
        <div style={{ fontSize: 12, color: "#dc2626" }}>{error}</div>
      )}
    </div>
  );
}
