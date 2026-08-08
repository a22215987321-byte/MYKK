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
const DEFAULT_W = 360;
const DEFAULT_H = 480;
const EXPANDED_W = 480;
const EXPANDED_H = 660;

// 隨處可見的浮動 AI 對話小工具——跟側欄裡完整的「AI 助手」功能頁是兩個
// 不同的入口，這個不管使用者切到哪個功能頁面都一直浮在畫面上（掛在
// ChatApp 最外層，不是 .cr-main 裡面），預設收合成一顆貼在左下角的圓形
// 按鈕。展開後可以按住頂部標題列拖到畫面任何地方（跟手指/滑鼠即時同步），
// 放開手之後視窗會自己滑回畫面「底部」，但保留放開當下的水平位置——
// 不是回到原本的左下角，是「回到你放開的那個位置正下方的底部」。
export default function FloatingAiChat({ user, db }) {
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [left, setLeft] = useState(EDGE_MARGIN);
  const winRef = useRef(null);
  const dragRef = useRef({ dragging: false });

  const width = Math.min(expanded ? EXPANDED_W : DEFAULT_W, typeof window !== "undefined" ? window.innerWidth - EDGE_MARGIN * 2 : DEFAULT_W);
  const height = Math.min(expanded ? EXPANDED_H : DEFAULT_H, typeof window !== "undefined" ? window.innerHeight - EDGE_MARGIN * 2 : DEFAULT_H);

  // 放大/縮小之後視窗寬度變了，原本的 left 可能會讓視窗跑出畫面右邊——
  // 開合當下重新夾一次範圍。
  useEffect(() => {
    if (typeof window === "undefined") return;
    setLeft(l => Math.max(EDGE_MARGIN, Math.min(l, window.innerWidth - width - EDGE_MARGIN)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded, open]);

  const onHeaderPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = winRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = {
      dragging: true, pointerId: e.pointerId,
      grabX: e.clientX - rect.left, grabY: e.clientY - rect.top,
    };
    el.style.transition = "none";
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };

  const onHeaderPointerMove = (e) => {
    const st = dragRef.current;
    if (!st.dragging || e.pointerId !== st.pointerId) return;
    e.preventDefault();
    const el = winRef.current;
    if (!el) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    const x = Math.max(4, Math.min(e.clientX - st.grabX, window.innerWidth - w - 4));
    const y = Math.max(4, Math.min(e.clientY - st.grabY, window.innerHeight - h - 4));
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.bottom = "auto";
  };

  const endDrag = (e) => {
    const st = dragRef.current;
    if (!st.dragging) return;
    dragRef.current = { dragging: false };
    const el = winRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const finalLeft = Math.max(EDGE_MARGIN, Math.min(rect.left, window.innerWidth - rect.width - EDGE_MARGIN));
    setLeft(finalLeft);
    // 放開手的瞬間，用 CSS transition 滑回底部——水平位置維持在放開當下
    // 的地方，只有垂直方向「掉」回底部，跟前面拖曳時的即時跟手是分開的
    // 兩段動畫，拖曳中完全不做 transition（不然會延遲跟手感覺卡卡的）。
    el.style.transition = "left 0.28s cubic-bezier(0.22,1,0.36,1), top 0.28s cubic-bezier(0.22,1,0.36,1), bottom 0.28s cubic-bezier(0.22,1,0.36,1)";
    el.style.left = `${finalLeft}px`;
    el.style.top = "auto";
    el.style.bottom = `${EDGE_MARGIN}px`;
  };

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} aria-label="開啟 AI 對話"
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
      position: "fixed", left, bottom: EDGE_MARGIN, width, height,
      zIndex: 2500, display: "flex", flexDirection: "column",
      background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 16,
      boxShadow: "0 16px 48px rgba(0,0,0,0.4)", overflow: "hidden",
    }}>
      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          height: 40, flexShrink: 0, display: "flex", alignItems: "center", gap: 8, padding: "0 8px 0 12px",
          background: "var(--panel-alt)", borderBottom: "1px solid var(--border)",
          cursor: "grab", touchAction: "none", userSelect: "none",
        }}>
        <span style={{ fontSize: 14 }}>🤖</span>
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "var(--text)" }}>AI 對話</span>
        <button onClick={() => setExpanded(v => !v)} aria-label={expanded ? "縮小視窗" : "放大視窗"}
          onPointerDown={e => e.stopPropagation()}
          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, padding: 6, lineHeight: 1 }}>
          {expanded ? "⤡" : "⤢"}
        </button>
        <button onClick={() => setOpen(false)} aria-label="關閉"
          onPointerDown={e => e.stopPropagation()}
          style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, padding: 6, lineHeight: 1 }}>
          ✕
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <AiChatRoom user={user} db={db} />
      </div>
    </div>
  );
}
