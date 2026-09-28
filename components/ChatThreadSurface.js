import { useEffect, useRef } from "react";
import styles from "./ChatThreadSurface.module.css";

// UI-only overlay geometry. Message data and sending remain with ChatRoom.
export default function ChatThreadSurface({ children, centered, mobile, conversationKey, details = false }) {
  const rootRef = useRef(null);
  useEffect(() => {
    const root = rootRef.current;
    const mobileHeader = mobile ? root.closest(".cr-shell")?.querySelector(".cr-mobile-topbar") : null;
    const observed = new Set();
    const measure = () => {
      const header = root.querySelector(".cr-chat-header");
      const footer = root.querySelector(".cr-input-bar");
      [root, header, footer, mobileHeader].filter(Boolean).forEach(element => {
        if (!observed.has(element)) { observer?.observe(element); observed.add(element); }
      });
      const scroller = root.querySelector("[data-conversation]");
      const pinned = scroller?.clientHeight > 0 && scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop < 64;
      root.style.setProperty("--thread-header-height", `${Math.ceil((header || mobileHeader)?.getBoundingClientRect().height || 0)}px`);
      root.style.setProperty("--thread-footer-height", `${Math.ceil(footer?.getBoundingClientRect().height || 80)}px`);
      if (mobileHeader) mobileHeader.style.marginBottom = details ? "" : `-${Math.ceil(mobileHeader.getBoundingClientRect().height)}px`;
      if (pinned) scroller.scrollTop = scroller.scrollHeight;
    };
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    measure();
    const mutationObserver = typeof MutationObserver !== "undefined" ? new MutationObserver(measure) : null;
    mutationObserver?.observe(root, { childList: true });
    window.addEventListener("resize", measure);
    return () => { observer?.disconnect(); mutationObserver?.disconnect(); window.removeEventListener("resize", measure); if (mobileHeader) mobileHeader.style.marginBottom = ""; };
  }, [conversationKey, mobile, details]);
  return <section ref={rootRef} className={`${styles.root}${centered ? ` ${styles.centered}` : ""}${details ? ` ${styles.details}` : ""}`} data-chat-surface="true">{children}</section>;
}
