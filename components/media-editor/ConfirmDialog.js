// Minimal reusable confirm modal for the photo editor's yes/no(/no-thanks)
// prompts (leave-with-unsaved-changes, replace-vs-add-photo) — the app
// deliberately avoids native alert()/confirm() elsewhere (see lib/toast.js),
// so these need an actual dialog rather than a browser-native one. Follows
// the same fixed-overlay convention as ImageCropModal.js.
export default function ConfirmDialog({ title, message, actions, onDismiss }) {
  return (
    <div
      onClick={onDismiss}
      style={{
        position: "fixed", inset: 0, zIndex: 1300, background: "rgba(0,0,0,0.6)",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)",
          padding: 20, maxWidth: 360, width: "100%", boxShadow: "0 12px 40px rgba(0,0,0,0.3)",
        }}
      >
        {title && <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 8 }}>{title}</div>}
        {message && <div style={{ fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 16 }}>{message}</div>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {actions.map((a, i) => (
            <button
              key={i}
              onClick={a.onClick}
              style={{
                minHeight: 40, borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
                border: a.variant === "primary" || a.variant === "danger" ? "none" : "1px solid var(--border)",
                background: a.variant === "primary" ? "linear-gradient(135deg,var(--accent),var(--accent-2))"
                  : a.variant === "danger" ? "#dc2626"
                  : "var(--panel-alt)",
                color: a.variant === "primary" ? "var(--accent-text)" : a.variant === "danger" ? "#fff" : "var(--text)",
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
