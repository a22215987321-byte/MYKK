import { createPortal } from "react-dom";
import { useEffect, useState, useRef } from "react";
import { getPopoverPosition } from "../lib/popoverPosition";

// 共用的「浮動彈出框」——用 React portal 直接掛到 document.body，不管呼叫端
// 自己的父層有沒有 overflow:hidden/auto（會裁切）或比較低的 z-index（會被
// 別的區塊蓋住）都不影響，因為這個彈出框在 DOM 樹裡已經不是那些容器的
// 子孫節點了。取代原本好幾個各自用 position:absolute 疊在自己父層裡面的
// 彈出框（資料夾新增、AI助手的歷史對話/模型選單）——那種寫法只要父層剛好
// 有 overflow:hidden（例如很窄的資料夾 rail）或者被別的更高層級的浮動面板
// 蓋住，彈出框就會被裁掉或擋住，這裡統一換成這個 portal 版本解決。
//
// anchorRef：觸發彈出框的按鈕（用來算位置、判斷「點擊在按鈕上」不算點外面）。
// placement："bottom-right"（預設，往下靠右對齊，選單常用）｜"top-right"
// （往上靠右對齊，貼底部工具列的選單用）｜"right"（往右側對齊，側邊窄欄用）。
export default function PortalPopover({ anchorRef, open, onClose, children, placement = "bottom-right", offset = 6, minWidth, constrainToViewport = false, zIndex = 2000 }) {
  const [pos, setPos] = useState(null);
  const contentRef = useRef(null);
  const positioned = Boolean(pos);

  useEffect(() => {
    if (!open || !anchorRef.current) { setPos(null); return; }
    const update = () => {
      const r = anchorRef.current.getBoundingClientRect();
      if (constrainToViewport && contentRef.current) {
        const content = contentRef.current;
        const viewport = window.visualViewport;
        setPos(getPopoverPosition(r, { width: content.offsetWidth, height: content.scrollHeight }, {
          left: viewport?.offsetLeft || 0, top: viewport?.offsetTop || 0,
          width: viewport?.width || window.innerWidth, height: viewport?.height || window.innerHeight,
        }, placement, offset));
      } else if (placement === "top-right") setPos({ bottom: window.innerHeight - r.top + offset, right: window.innerWidth - r.right });
      else if (placement === "right") setPos({ top: r.top, left: r.right + offset });
      else setPos({ top: r.bottom + offset, right: window.innerWidth - r.right });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    const viewport = window.visualViewport;
    if (constrainToViewport) {
      viewport?.addEventListener("resize", update);
      viewport?.addEventListener("scroll", update);
    }
    const observer = constrainToViewport && typeof ResizeObserver !== "undefined" ? new ResizeObserver(update) : null;
    if (contentRef.current) observer?.observe(contentRef.current);
    if (contentRef.current?.firstElementChild) observer?.observe(contentRef.current.firstElementChild);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      observer?.disconnect();
    };
  }, [open, anchorRef, placement, offset, constrainToViewport]);

  useEffect(() => {
    if (!open || !constrainToViewport || !positioned) return;
    contentRef.current?.querySelector("button:not(:disabled), [href], input")?.focus({ preventScroll: true });
    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
      anchorRef.current?.focus({ preventScroll: true });
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, constrainToViewport, positioned, anchorRef, onClose]);

  // 這裡曾經只排除「點在觸發鈕上」，沒有排除「點在彈出框自己的內容裡」——
  // 因為內容是用 portal 直接掛到 document.body，不是觸發鈕的子孫節點，所以
  // 點裡面任何一顆按鈕（模型選單的選項、歷史對話項目、「收藏 MP3」…）都會
  // 被這支 mousedown 判定成「點外面」，onClose() 先跑一步把彈出框關掉，
  // 按鈕在 click 事件真正觸發前就已經從 DOM 移除，onClick 完全沒機會執行——
  // 使用者反映「選單裡的東西點了沒反應」根源就在這裡。加一個 contentRef
  // 一起排除就對了。
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      if (contentRef.current && contentRef.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, anchorRef, onClose]);

  if (!open || (!pos && !constrainToViewport) || typeof document === "undefined") return null;

  return createPortal(
    <div ref={contentRef} style={{ position: "fixed", zIndex, minWidth, ...pos,
      ...(constrainToViewport ? { visibility: pos ? "visible" : "hidden", overflowY: "auto", overscrollBehavior: "contain", borderRadius: 14 } : {}),
    }}>
      {children}
    </div>,
    document.body,
  );
}
