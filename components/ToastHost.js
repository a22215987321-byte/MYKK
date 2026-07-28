import { useCallback, useEffect, useState } from "react";
import { subscribeToast } from "../lib/toast";

const AUTO_DISMISS_MS = 4500;

const COLORS = {
  error:   { bg: "#450a0a", border: "#ef4444", text: "#fca5a5" },
  success: { bg: "#052e1c", border: "#22c55e", text: "#86efac" },
};

// Mounted once in pages/_app.js. Renders whatever lib/toast.js's toast()
// publishes, so any component can surface an error without a blocking
// native alert().
export default function ToastHost() {
  const [items, setItems] = useState([]);

  const dismiss = useCallback((id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  }, []);

  useEffect(() => {
    return subscribeToast((item) => {
      setItems(prev => [...prev, item]);
      setTimeout(() => dismiss(item.id), AUTO_DISMISS_MS);
    });
  }, [dismiss]);

  if (!items.length) return null;

  return (
    <div
      style={{
        position: "fixed", left: "50%", bottom: "calc(20px + env(safe-area-inset-bottom))",
        transform: "translateX(-50%)", zIndex: 10000, display: "flex", flexDirection: "column",
        gap: 8, width: "min(360px, calc(100vw - 32px))", pointerEvents: "none",
      }}
    >
      {items.map(item => {
        const c = COLORS[item.type] || COLORS.error;
        return (
          <div
            key={item.id}
            role="alert"
            style={{
              pointerEvents: "auto", display: "flex", alignItems: "flex-start", gap: 10,
              background: c.bg, border: `1px solid ${c.border}`, borderRadius: "var(--radius-md, 12px)",
              padding: "10px 12px", color: c.text, fontSize: 13.5, lineHeight: 1.5,
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          >
            <span style={{ flex: 1 }}>{item.message}</span>
            <button
              onClick={() => dismiss(item.id)}
              aria-label="關閉提示"
              style={{
                background: "none", border: "none", color: "inherit", cursor: "pointer",
                fontSize: 14, lineHeight: 1, padding: 2, flexShrink: 0, opacity: 0.8,
              }}
            >
              ✕
            </button>
          </div>
        );
      })}
    </div>
  );
}
