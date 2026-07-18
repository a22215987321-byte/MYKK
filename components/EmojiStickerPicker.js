import { useEffect, useMemo, useRef, useState } from "react";
import { gesturePacks, searchGestureItems } from "../data/chat/gesturePacks";
import { getRecentEmojis, addRecentEmoji } from "../lib/recentEmojis";
import MyStickersPanel from "./MyStickersPanel";

function StickerItemButton({ item, onClick, size = 40 }) {
  return (
    <button
      onClick={() => onClick(item)}
      title={item.label}
      style={{
        width: size, height: size, borderRadius: 10, background: "none", border: "none",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: size * 0.6, flexShrink: 0, transition: "background 0.12s",
      }}
      onMouseEnter={e => e.currentTarget.style.background = "var(--panel-hover)"}
      onMouseLeave={e => e.currentTarget.style.background = "none"}
    >
      {item.type === "sticker"
        ? <img src={item.src} alt={item.label} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
        : item.emoji}
    </button>
  );
}

// isMobile：手機版用 bottom sheet（貼底、45-55vh、下滑關閉）；桌面版用貼在觸發按鈕上方的 popover。
// onInsertEmoji(char)：一般表情，插入輸入框，不關閉面板（可以連續插入多個）。
// onSendItem(item)：手勢分類 / 真的貼圖（type:"sticker"），直接送出一則訊息，並關閉面板。
// uid：目前登入用戶，用來讀取/管理「我的貼圖」（自製貼圖是跨聊天室共用的，同一個 uid 在哪個聊天頁都看得到）。
export default function EmojiStickerPicker({ isMobile, onClose, onInsertEmoji, onSendItem, anchorRef, uid }) {
  const [activeCat, setActiveCat] = useState("recent");
  const [query, setQuery] = useState("");
  const [recent, setRecent] = useState([]);
  const panelRef = useRef(null);
  const dragStartYRef = useRef(null);

  useEffect(() => { setRecent(getRecentEmojis()); }, []);

  useEffect(() => {
    if (isMobile) return;
    function onDocClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target) &&
          !(anchorRef?.current && anchorRef.current.contains(e.target))) {
        onClose();
      }
    }
    function onKey(e) { if (e.key === "Escape") onClose(); }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [isMobile, onClose, anchorRef]);

  const searchResults = useMemo(() => (query.trim() ? searchGestureItems(query) : null), [query]);

  function isDirectSend(item, packId) {
    return packId === "gestures" || item.type === "sticker";
  }

  function handlePick(item, packId) {
    addRecentEmoji({ ...item, packId });
    setRecent(getRecentEmojis());
    if (isDirectSend(item, packId)) {
      onSendItem({ ...item, packId });
      onClose();
    } else {
      onInsertEmoji(item.emoji);
    }
  }

  function handleSendCustomSticker(sticker) {
    onSendItem({
      id: sticker.id, type: "sticker", packId: sticker.packId || "custom",
      src: sticker.src, label: sticker.name || "貼圖",
    });
    onClose();
  }

  function handleSheetTouchStart(e) {
    dragStartYRef.current = e.touches[0].clientY;
  }
  function handleSheetTouchMove(e) {
    if (dragStartYRef.current == null || !panelRef.current) return;
    const dy = e.touches[0].clientY - dragStartYRef.current;
    if (dy > 0) panelRef.current.style.transform = `translateY(${dy}px)`;
  }
  function handleSheetTouchEnd(e) {
    if (dragStartYRef.current == null || !panelRef.current) return;
    const dy = e.changedTouches[0].clientY - dragStartYRef.current;
    dragStartYRef.current = null;
    panelRef.current.style.transition = "transform 0.2s ease";
    if (dy > 80) {
      onClose();
    } else {
      panelRef.current.style.transform = "translateY(0)";
    }
    setTimeout(() => { if (panelRef.current) panelRef.current.style.transition = "none"; }, 200);
  }

  const categories = [
    { id: "recent", name: "常用", icon: "🕐" },
    { id: "custom", name: "我的貼圖", icon: "🖼️" },
    ...gesturePacks.map(p => ({ id: p.id, name: p.name, icon: p.icon })),
  ];

  const activeItems = activeCat === "recent" ? recent : (gesturePacks.find(p => p.id === activeCat)?.items || []);

  const body = (
    <div ref={panelRef} onClick={e => e.stopPropagation()}
      onTouchStart={isMobile ? handleSheetTouchStart : undefined}
      onTouchMove={isMobile ? handleSheetTouchMove : undefined}
      onTouchEnd={isMobile ? handleSheetTouchEnd : undefined}
      style={isMobile ? {
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 650,
        height: "min(55vh, 480px)", minHeight: "45vh",
        background: "var(--panel)", borderRadius: "18px 18px 0 0",
        boxShadow: "0 -8px 30px rgba(0,0,0,0.25)",
        display: "flex", flexDirection: "column", overflow: "hidden",
        paddingBottom: "env(safe-area-inset-bottom)",
      } : {
        position: "absolute", bottom: "calc(100% + 8px)", left: 0,
        width: 340, maxWidth: "92vw", height: 360,
        background: "var(--panel)", borderRadius: 16, border: "1px solid var(--border)",
        boxShadow: "0 12px 36px rgba(0,0,0,0.3)",
        display: "flex", flexDirection: "column", overflow: "hidden", zIndex: 650,
      }}>
      {isMobile && (
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 0 4px", flexShrink: 0 }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: "var(--border)" }} />
        </div>
      )}
      <div style={{ padding: "8px 12px", flexShrink: 0 }}>
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="搜尋表情或手勢..."
          style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 10, padding: "8px 12px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box" }}
        />
      </div>

      {!searchResults && (
        <div style={{ display: "flex", gap: 2, padding: "0 8px 6px", overflowX: "auto", flexShrink: 0 }}>
          {categories.map(cat => (
            <button key={cat.id} onClick={() => setActiveCat(cat.id)} data-cat-tab={cat.id}
              style={{
                flexShrink: 0, padding: "6px 10px", borderRadius: 10, border: "none", cursor: "pointer",
                background: activeCat === cat.id ? "var(--accent-active)" : "none",
                color: activeCat === cat.id ? "var(--accent)" : "var(--text-faint)",
                fontSize: 12, fontWeight: activeCat === cat.id ? 700 : 500,
                display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap",
              }}>
              <span style={{ fontSize: 15 }}>{cat.icon}</span>{cat.name}
            </button>
          ))}
        </div>
      )}

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "4px 10px 12px" }}>
        {searchResults ? (
          searchResults.length === 0 ? (
            <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-faint)", fontSize: 13 }}>找不到相關表情</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))", gap: 2 }}>
              {searchResults.map(item => (
                <StickerItemButton key={item.id} item={item} onClick={() => handlePick(item, item.packId)} />
              ))}
            </div>
          )
        ) : activeCat === "recent" && recent.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 0", color: "var(--text-faint)", fontSize: 13 }}>還沒有常用表情<br />點過的表情會顯示在這裡</div>
        ) : activeCat === "custom" ? (
          <MyStickersPanel uid={uid} isMobile={isMobile} onSend={handleSendCustomSticker} />
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(40px, 1fr))", gap: 2 }}>
            {activeItems.map(item => (
              <StickerItemButton key={item.id} item={item} onClick={() => handlePick(item, activeCat === "recent" ? item.packId : activeCat)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 640 }}>
        {body}
      </div>
    );
  }
  return body;
}
