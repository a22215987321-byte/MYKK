export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 16,
        padding: "24px",
        textAlign: "center",
        background: "var(--bg)",
        color: "var(--text)",
        fontFamily: "var(--font-body)",
        boxSizing: "border-box",
        paddingTop: "calc(24px + env(safe-area-inset-top))",
        paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
      }}
    >
      <div style={{ fontSize: 48 }}>📡</div>
      <div style={{ fontSize: 20, fontWeight: 800 }}>目前沒有網絡連線</div>
      <div style={{ fontSize: 14, color: "var(--text-muted)" }}>請檢查網絡後再試一次</div>
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: 8,
          padding: "10px 28px",
          borderRadius: "var(--radius-md)",
          border: "none",
          background: "linear-gradient(135deg,var(--accent),var(--accent-2))",
          color: "#fff",
          fontSize: 14,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        重新載入
      </button>
    </div>
  );
}
