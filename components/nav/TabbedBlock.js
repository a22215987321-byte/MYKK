import { useCallback, useRef, useState } from "react";

// 分頁拖曳控制器——跟 ChatRoom.js 裡 useSidebarLayout 的 startDrag 同一種
// 手感（按住 500ms 才觸發拖曳，放開沒拖動就是單純點擊，拖曳中原地那個
// 分頁隱藏、改由 TabDragGhost 畫一份跟著滑鼠跑的浮動複本），差別是命中
// 測試的對象是分頁本身跟分頁列，不是資料夾。
//
// 拖過去另一塊只是把 key 從一塊的 tabs[] 搬到另一塊——功能元件本身渲染在
// ChatRoom.js 另外一份 flat grid 裡（不是這裡的子節點），所以拖曳過程中
// 不會真的卸載/重掛任何功能元件，AI 對話打到一半、影片播到一半的狀態都
// 還在。
//
// 效能：mousemove 事件觸發頻率很高（滑鼠/軌跡板可以到每秒上百次），拖曳中
// 的浮動複本位置改成直接寫 DOM（見 ghostRef），不透過 setState——跟著滑鼠
// 移動這件事完全不需要經過 React 重新渲染。dropTarget 也只在真的換了目標
// 時才 setState，不是每次 mousemove 都呼叫（哪怕懸停在原地不動也會因為
// currentDrop 是新物件參照而被判定成「變了」，逼 React 每 tick 都重繪兩份
// 分頁列——這是原本卡頓的主因）。
//
// 這個 hook 只需要在 ChatRoom.js 呼叫一次（因為命中測試要同時看得到兩塊
// 的分頁列），回傳的 controller 物件傳給兩份 <TabBar/>。
export function useTabDragController({ onMoveTab, onReorderTab }) {
  const [dragState, setDragState] = useState(null); // {key, fromBlock, label, icon, x, y, w, h} —只在拖曳開始/結束時設定一次，過程中的位置改由 ghostRef 直接寫 DOM
  const [dropTarget, setDropTarget] = useState(null); // {block, beforeKey} | null
  const tabRefs = useRef(new Map());   // key -> {el, block}
  const zoneRefs = useRef(new Map());  // block -> el（分頁列容器，拖到那塊分頁列範圍內都算數）
  const justDraggedRef = useRef(null);
  const ghostRef = useRef(null);       // 浮動複本的 DOM 節點，拖曳過程中直接寫它的 left/top

  const registerTab = useCallback((key, block) => (el) => {
    if (el) tabRefs.current.set(key, { el, block }); else tabRefs.current.delete(key);
  }, []);
  const registerZone = useCallback((block) => (el) => {
    if (el) zoneRefs.current.set(block, el); else zoneRefs.current.delete(block);
  }, []);
  const registerGhost = useCallback((el) => { ghostRef.current = el; }, []);

  const startDrag = useCallback((key, fromBlock, meta) => (e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    let armed = false, moved = false;
    let currentDrop = null;
    let currentDropSig = "";  // dropTarget 的字串簽章，用來判斷是否真的變了
    let grabX = 0, grabY = 0;
    const timer = setTimeout(() => {
      const ref = tabRefs.current.get(key);
      if (!ref) return;
      armed = true;
      const rect = ref.el.getBoundingClientRect();
      grabX = e.clientX - rect.left;
      grabY = e.clientY - rect.top;
      setDragState({
        key, fromBlock, label: meta?.label || "", icon: meta?.icon || "",
        x: rect.left, y: rect.top, w: rect.width, h: rect.height,
      });
    }, 500);

    const onMove = (ev) => {
      if (!armed) return;
      moved = true;
      ev.preventDefault();
      if (ghostRef.current) {
        ghostRef.current.style.left = `${ev.clientX - grabX}px`;
        ghostRef.current.style.top = `${ev.clientY - grabY}px`;
      }
      const cx = ev.clientX, cy = ev.clientY;

      // 先測是不是壓在另一個分頁上（同塊內＝插在它前面重新排序，跨塊＝放進
      // 那塊、插在它前面）。
      let next = null;
      for (const [k, v] of tabRefs.current) {
        if (k === key) continue;
        const r = v.el.getBoundingClientRect();
        if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
          next = { block: v.block, beforeKey: k };
          break;
        }
      }
      // 沒壓到特定分頁，測是不是至少在某一塊的分頁列範圍內（拖到那塊最後面）。
      if (!next) {
        for (const [b, el] of zoneRefs.current) {
          const r = el.getBoundingClientRect();
          if (cx >= r.left && cx <= r.right && cy >= r.top - 30 && cy <= r.bottom + 260) {
            next = { block: b, beforeKey: null };
            break;
          }
        }
      }
      const nextSig = next ? `${next.block}:${next.beforeKey || ""}` : "";
      if (nextSig !== currentDropSig) {
        currentDropSig = nextSig;
        currentDrop = next;
        setDropTarget(next);
      }
    };

    const onUp = () => {
      clearTimeout(timer);
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      setDragState(null);
      setDropTarget(null);
      if (armed && moved) {
        justDraggedRef.current = key;
        if (currentDrop) {
          if (currentDrop.block === fromBlock) {
            if (currentDrop.beforeKey) onReorderTab(fromBlock, key, currentDrop.beforeKey);
          } else {
            onMoveTab(key, fromBlock, currentDrop.block, currentDrop.beforeKey);
          }
        }
      }
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [onMoveTab, onReorderTab]);

  const wasJustDragged = useCallback((key) => {
    if (justDraggedRef.current === key) { justDraggedRef.current = null; return true; }
    return false;
  }, []);

  return { dragState, dropTarget, startDrag, wasJustDragged, registerTab, registerZone, registerGhost };
}

// 拖曳中浮在最上層、跟著滑鼠跑的分頁複本——position:fixed 不受版面影響，
// pointerEvents:none 避免擋到底下的命中測試。left/top 只在第一次渲染時用
// dragState.x/y 定位（剛好是按下那一刻的位置，不會閃一下跑位），拖曳過程
// 中的每一步都是 controller 直接寫 DOM，不會再讓這個元件重新渲染。
export function TabDragGhost({ controller }) {
  const { dragState, registerGhost } = controller;
  if (!dragState) return null;
  return (
    <div ref={registerGhost} style={{
      position: "fixed", left: dragState.x, top: dragState.y,
      width: dragState.w, height: dragState.h, zIndex: 2000,
      pointerEvents: "none", opacity: 0.92, transform: "scale(1.02)",
      boxShadow: "0 10px 30px rgba(0,0,0,0.45)", borderRadius: 8, overflow: "hidden",
      display: "flex", alignItems: "center", gap: 6, padding: "0 10px",
      background: "var(--panel)", border: "1px solid var(--border)", fontSize: 13,
    }}>
      <span>{dragState.icon}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{dragState.label}</span>
    </div>
  );
}

// 一塊大方塊上方的瀏覽器式分頁列——只畫分頁本身，實際功能內容渲染在
// ChatRoom.js 另一份 flat grid 裡，這裡不接觸任何功能元件。
export function TabBar({ block, tabs, active, meta, onActivate, onClose, onDoubleClickTab, controller }) {
  const { dragState, dropTarget, startDrag, wasJustDragged, registerTab, registerZone } = controller;
  const isDropTarget = dropTarget?.block === block;
  return (
    <div ref={registerZone(block)} className={`cr-blocktabs${isDropTarget ? " drop-target" : ""}`}>
      {tabs.map((key) => {
        const m = meta[key] || {};
        const isDragging = dragState?.key === key;
        return (
          <button
            key={key}
            ref={registerTab(key, block)}
            onMouseDown={startDrag(key, block, m)}
            onClickCapture={(e) => { if (wasJustDragged(key)) { e.stopPropagation(); e.preventDefault(); } }}
            onClick={() => onActivate(block, key)}
            onDoubleClick={() => onDoubleClickTab?.(block, key)}
            className={`cr-blocktab${key === active ? " act" : ""}`}
            style={{ visibility: isDragging ? "hidden" : "visible" }}
            title={m.label}
          >
            <span className="cr-blocktab-icon">{m.icon}</span>
            <span className="cr-blocktab-label">{m.label}</span>
            <span
              className="cr-blocktab-close"
              role="button"
              tabIndex={-1}
              onClick={(e) => { e.stopPropagation(); onClose(block, key); }}
              aria-label={`關閉${m.label}`}
            >
              ×
            </span>
          </button>
        );
      })}
      {tabs.length === 0 && <span className="cr-blocktabs-empty">還沒有開啟的分頁——從左側點一個功能開始</span>}
    </div>
  );
}
