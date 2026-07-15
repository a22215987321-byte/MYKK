import { useEffect, useState } from "react";

const DISMISS_KEY = "evonchat_install_dismissed_at";
const DISMISS_DAYS = 7;

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIos() {
  if (typeof window === "undefined") return false;
  return /iphone|ipad|ipod/i.test(window.navigator.userAgent);
}

function isDismissedRecently() {
  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    const elapsedMs = Date.now() - Number(raw);
    return elapsedMs < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch (_) {
    return false;
  }
}

function markDismissed() {
  try {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
  } catch (_) {}
}

export default function InstallPrompt() {
  const [mode, setMode] = useState(null); // "android" | "ios" | null
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    if (isStandalone() || isDismissedRecently()) return;

    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
      setMode("android");
    }

    function onAppInstalled() {
      setMode(null);
      setDeferredPrompt(null);
      markDismissed();
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);

    if (isIos()) {
      setMode("ios");
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  if (!mode) return null;

  async function handleInstallClick() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setMode(null);
    markDismissed();
  }

  function handleDismiss() {
    setMode(null);
    markDismissed();
  }

  return (
    <div
      style={{
        position: "fixed",
        left: "calc(12px + env(safe-area-inset-left))",
        right: "calc(12px + env(safe-area-inset-right))",
        bottom: "calc(12px + env(safe-area-inset-bottom))",
        zIndex: 400,
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "12px 14px",
        borderRadius: "var(--radius-md)",
        background: "var(--panel)",
        border: "1px solid var(--border)",
        boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
        maxWidth: 420,
        margin: "0 auto",
      }}
    >
      <div style={{ fontSize: 22, flexShrink: 0 }}>📲</div>
      <div style={{ flex: 1, minWidth: 0, fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>
        {mode === "android" ? (
          "安裝 Evonchat 到主畫面，享受更快速的使用體驗"
        ) : (
          <>點擊分享 <span style={{ fontWeight: 700 }}>⎋</span>，再選擇「加入主畫面」即可安裝 Evonchat</>
        )}
      </div>
      {mode === "android" && (
        <button
          onClick={handleInstallClick}
          style={{
            flexShrink: 0,
            padding: "8px 14px",
            borderRadius: "var(--radius-sm)",
            border: "none",
            background: "linear-gradient(135deg,var(--accent),var(--accent-2))",
            color: "#fff",
            fontSize: 13,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          安裝 Evonchat
        </button>
      )}
      <button
        onClick={handleDismiss}
        style={{
          flexShrink: 0,
          background: "none",
          border: "none",
          color: "var(--text-faint)",
          fontSize: 16,
          cursor: "pointer",
          padding: 4,
          lineHeight: 1,
        }}
      >
        ✕
      </button>
    </div>
  );
}
