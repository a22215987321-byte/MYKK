import { useEffect, useRef, useState } from "react";

// Only deliberate reading gestures affect the chrome. Message pinning and
// ResizeObserver scrolls must not immediately hide a just-revealed tab strip.
export default function WorkspaceBlock({ block, maximized, hidden, active, tabBar, children }) {
  const [revealed, setRevealed] = useState(false);
  const positions = useRef(new WeakMap());
  const gesture = useRef({ until: 0, touchY: null, ignoreUntil: 0 });
  useEffect(() => {
    setRevealed(false);
    positions.current = new WeakMap();
    gesture.current.until = 0;
  }, [maximized, active]);

  const isEditor = target => target.closest?.("input, textarea, [contenteditable='true'], [role='dialog']");
  const showForDirection = delta => {
    if (!maximized || Math.abs(delta) < 3) return;
    gesture.current.ignoreUntil = Date.now() + 300;
    setRevealed(delta < 0);
  };
  const startScroll = event => {
    if (isEditor(event.target)) return;
    // Record the starting position for scrollbar drags and keyboard scrolling.
    let el = event.target;
    while (el && el !== event.currentTarget) {
      if (el.scrollHeight > el.clientHeight) positions.current.set(el, el.scrollTop);
      el = el.parentElement;
    }
    gesture.current.until = Date.now() + 1500;
  };
  const collapsed = maximized && !revealed;
  return (
    <section data-workspace-block={block} style={{
      flex: 1, minWidth: 0, display: hidden ? "none" : "flex", flexDirection: "column", position: "relative",
      overflow: "hidden", border: "var(--col-border, none)", borderRadius: "var(--col-radius, 0px)",
      boxShadow: "var(--col-shadow, none)", backdropFilter: "var(--col-blur, none)", WebkitBackdropFilter: "var(--col-blur, none)",
      background: "var(--force-panel-bg, var(--chat-world-transparent, var(--panel-alt)))",
      backgroundImage: "var(--chat-world-transparent, var(--panel-gradient-img, none))",
    }}>
      {maximized && <button className="cr-workspace-reveal" tabIndex={collapsed ? 0 : -1} onFocus={() => setRevealed(true)}
        onClick={() => setRevealed(true)} aria-label="顯示分頁列">顯示分頁列</button>}
      <div data-workspace-tabs={block} hidden={collapsed} style={{ flexShrink: 0 }}>{tabBar}</div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}
        onWheelCapture={event => {
          if (!isEditor(event.target) && Math.abs(event.deltaY) > Math.abs(event.deltaX)) showForDirection(event.deltaY);
        }}
        onTouchStartCapture={event => {
          if (!isEditor(event.target)) gesture.current.touchY = event.touches[0]?.clientY ?? null;
        }}
        onTouchMoveCapture={event => {
          const y = event.touches[0]?.clientY;
          if (isEditor(event.target) || y == null || gesture.current.touchY == null) return;
          const delta = gesture.current.touchY - y;
          if (Math.abs(delta) >= 6) { showForDirection(delta); gesture.current.touchY = y; }
        }}
        onTouchEndCapture={() => { gesture.current.touchY = null; }}
        onPointerDownCapture={startScroll}
        onPointerMoveCapture={event => { if (event.buttons) gesture.current.until = Date.now() + 1500; }}
        onKeyDownCapture={event => {
          if (isEditor(event.target)) return;
          startScroll(event);
          if (["ArrowUp", "PageUp", "Home"].includes(event.key)) showForDirection(-10);
          if (["ArrowDown", "PageDown", "End"].includes(event.key)) showForDirection(10);
        }}
        onScrollCapture={event => {
          const el = event.target;
          const previous = positions.current.get(el);
          positions.current.set(el, el.scrollTop);
          if (isEditor(el) || previous == null || Date.now() > gesture.current.until || Date.now() < gesture.current.ignoreUntil) return;
          showForDirection(el.scrollTop - previous);
        }}>
        {children}
      </div>
      <style jsx>{`
        .cr-workspace-reveal { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); }
        .cr-workspace-reveal:focus-visible { position: relative; width: auto; height: auto; margin: 2px; padding: 4px; clip-path: none; outline: 2px solid var(--accent); }
      `}</style>
    </section>
  );
}
