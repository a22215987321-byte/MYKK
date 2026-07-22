// Shared loading / stalled / error UI for the auth+data gates that guard
// pages/index.js, pages/feed.js, pages/profile/[uid].js and ChatRoom.js.
// Centralizing it means every one of those screens gets the same
// screen-reader announcement and retry affordance for free.
export default function LoadingState({ label = "載入中...", error, onRetry, minHeight = "100vh" }) {
  return (
    <div
      role={error ? "alert" : "status"}
      aria-live={error ? "assertive" : "polite"}
      style={{
        minHeight, width: "100%", boxSizing: "border-box",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 16, padding: 24, textAlign: "center", background: "var(--bg)",
      }}
    >
      {error ? (
        <>
          <div aria-hidden="true" style={{ fontSize: 40 }}>⚠️</div>
          <div style={{ color: "var(--text-muted)", fontSize: 15, maxWidth: 320, lineHeight: 1.6 }}>{error}</div>
          {onRetry && (
            <button
              onClick={onRetry}
              style={{
                background: "var(--accent)", border: "none", borderRadius: "var(--radius-md)",
                padding: "10px 22px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
              }}
            >
              重新整理
            </button>
          )}
        </>
      ) : (
        <>
          <div className="evon-spinner" aria-hidden="true" />
          <div style={{ color: "var(--text-dim)", fontSize: 14, letterSpacing: 1 }}>{label}</div>
        </>
      )}
    </div>
  );
}
