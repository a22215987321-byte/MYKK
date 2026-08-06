import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

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
export default function PortalPopover({ anchorRef, open, onClose, children, placement = "bottom-right", offset = 6, minWidth }) {
  const [pos, setPos] = useState(null);

  useEffect(() => {
    if (!open || !anchorRef.current) { setPos(null); return; }
    const update = () => {
      const r = anchorRef.current.getBoundingClientRect();
      if (placement === "top-right") setPos({ bottom: window.innerHeight - r.top + offset, right: window.innerWidth - r.right });
      else if (placement === "right") setPos({ top: r.top, left: r.right + offset });
      else setPos({ top: r.bottom + offset, right: window.innerWidth - r.right });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open, anchorRef, placement, offset]);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e) => {
      if (anchorRef.current && anchorRef.current.contains(e.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [open, anchorRef, onClose]);

  if (!open || !pos || typeof document === "undefined") return null;

  return createPortal(
    <div style={{ position: "fixed", zIndex: 2000, minWidth, ...pos }}>
      {children}
    </div>,
    document.body,
  );
}
