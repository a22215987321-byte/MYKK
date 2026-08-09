import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import LoadingState from "./LoadingState";

// 跟 ChatRoom.js 裡「AI 助手」全頁功能用同一支 dynamic import——react-markdown
// 這包套件不會因為這個小工具視窗一直存在（不管有沒有打開）就跟著進每個人
// 的首屏載入，只有真的點開視窗那一刻才下載。兩邊各自呼叫 dynamic() 是刻意
// 的，Next.js 用 import 路徑當快取 key，不會因為呼叫兩次就真的打包兩份。
const AiChatRoom = dynamic(() => import("./AiChatRoom"), {
  ssr: false,
  loading: () => <LoadingState label="載入 AI 助手..." minHeight="100%" />,
});

const EDGE_MARGIN = 16;
const COLLAPSED_SIZE = 56;
const WIN_WIDTH = 380;

// 隨處可見的浮動 AI 對話小工具。開關狀態是受控的（open/onOpenChange，由
// ChatRoom.js 管理）：桌面版的觸發鈕是資料夾 rail 上方那顆小圖示，這裡只
// 負責「開啟後長什麼樣子」；showTrigger 為 true 時（目前只有手機版會傳，
// 手機沒有資料夾 rail 可以掛觸發鈕）才會自己再多畫一顆貼在左下角的圓形鈕。
//
// 開啟時視窗一律「高度拉滿到頂部」——跟 .cr-shell 用同一組 CSS 變數
// （--shell-margin／--viewport-h／safe-area-inset）算出一模一樣的上下邊界，
// 視覺上就是貼著資料夾 rail 那條窄欄往上長成一整條到底的面板。因為高度已經
// 固定頂到底，拖曳只剩水平方向有意義——按住頂部（EVON AI 那條 header，見
// AiChatRoom.js 的 compact 版）左右拖，放開就停在放開的位置，不再需要「滑回
// 底部」那段動畫（以前是小視窗才需要，現在整個視窗本來就是頂到底）。
const MINI_HEIGHT = 44; // 跟 AiChatRoom.js 縮小版 header 自己的高度一致

export default function FloatingAiChat({ user, db, open, onOpenChange, showTrigger = false }) {
  const [left, setLeft] = useState(EDGE_MARGIN);
  // 縮小狀態——跟開關（open）是分開的兩件事：縮小之後視窗還是「開著」的，
  // 只是變成貼底部的一個小方塊，AiChatRoom 沒有被卸載（見它自己 compact+
  // minimized 那段的處理），對話內容/捲動位置都還在，不會因為縮小又展開
  // 就重置。
  const [minimized, setMinimized] = useState(false);
  const winRef = useRef(null);
  const dragRef = useRef({ dragging: false });

  useEffect(() => {
    if (typeof window === "undefined" || !open) return;
    setLeft(l => Math.max(EDGE_MARGIN, Math.min(l, window.innerWidth - WIN_WIDTH - EDGE_MARGIN)));
  }, [open]);

  const onHeaderPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = winRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { dragging: true, pointerId: e.pointerId, grabX: e.clientX - rect.left };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };

  const onHeaderPointerMove = (e) => {
    const st = dragRef.current;
    if (!st.dragging || e.pointerId !== st.pointerId) return;
    e.preventDefault();
    const el = winRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const x = Math.max(4, Math.min(e.clientX - st.grabX, window.innerWidth - w - 4));
    el.style.left = `${x}px`;
  };

  const endDrag = () => {
    const st = dragRef.current;
    if (!st.dragging) return;
    dragRef.current = { dragging: false };
    const el = winRef.current;
    if (!el) return;
    setLeft(el.getBoundingClientRect().left);
  };

  if (!open) {
    if (!showTrigger) return null;
    return (
      <button onClick={() => onOpenChange(true)} aria-label="開啟 AI 對話"
        style={{
          position: "fixed", left: EDGE_MARGIN, bottom: EDGE_MARGIN, zIndex: 2500,
          width: COLLAPSED_SIZE, height: COLLAPSED_SIZE, borderRadius: "50%",
          background: "linear-gradient(135deg,#4f46e5,#7c3aed)", border: "none",
          color: "#fff", fontSize: 24, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
        }}>
        🤖
      </button>
    );
  }

  return (
    <div ref={winRef} style={{
      position: "fixed", left, width: WIN_WIDTH,
      ...(minimized
        ? { top: "auto", bottom: EDGE_MARGIN, height: MINI_HEIGHT }
        : {
            top: "calc(var(--shell-margin, 0px) + env(safe-area-inset-top))",
            height: "calc(var(--viewport-h, 100vh) - var(--shell-margin, 0px) * 2 - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
          }),
      maxWidth: `calc(100vw - ${EDGE_MARGIN * 2}px)`,
      zIndex: 2500, display: "flex", flexDirection: "column",
      background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg, 18px)",
      boxShadow: "0 16px 48px rgba(0,0,0,0.4)", overflow: "hidden",
    }}>
      <AiChatRoom
        user={user} db={db} compact
        onClose={() => onOpenChange(false)}
        minimized={minimized}
        onMinimize={() => setMinimized(v => !v)}
        headerDragProps={{
          onPointerDown: onHeaderPointerDown,
          onPointerMove: onHeaderPointerMove,
          onPointerUp: endDrag,
          onPointerCancel: endDrag,
        }}
      />
    </div>
  );
}
