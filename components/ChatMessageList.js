import { useEffect, useRef } from "react";
import styles from "./ChatMessageList.module.css";

// Keep scrolling local to this room. Background snapshots must never move the
// document, and incoming messages must not interrupt someone reading history.
export default function ChatMessageList({ conversationKey, messages, currentUserId, children, style }) {
  const viewportRef = useRef(null);
  const contentRef = useRef(null);
  const pinnedRef = useRef(true);
  const previousRef = useRef(null);
  const lastMessage = messages.at(-1);
  const lastId = lastMessage?.id;
  const lastSender = lastMessage?.senderId;

  useEffect(() => {
    const viewport = viewportRef.current;
    const previous = previousRef.current;
    const switched = !previous || previous.key !== conversationKey;
    const sentByMe = previous?.lastId !== lastId && lastId != null && lastSender === currentUserId;
    if (switched || sentByMe) pinnedRef.current = true;
    if (pinnedRef.current && viewport.clientHeight > 0) viewport.scrollTop = viewport.scrollHeight;
    previousRef.current = { key: conversationKey, lastId };
  }, [conversationKey, lastId, lastSender, currentUserId]);

  useEffect(() => {
    const viewport = viewportRef.current;
    const content = contentRef.current;
    const followBottom = () => {
      if (pinnedRef.current && viewport.clientHeight > 0) viewport.scrollTop = viewport.scrollHeight;
    };
    // Images/video and the mobile keyboard change the available height after
    // the snapshot renders. Observe that height, without delayed forced jumps.
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(followBottom) : null;
    observer?.observe(content);
    observer?.observe(viewport);
    content.addEventListener("load", followBottom, true);
    content.addEventListener("loadedmetadata", followBottom, true);
    window.addEventListener("resize", followBottom);
    return () => {
      observer?.disconnect();
      content.removeEventListener("load", followBottom, true);
      content.removeEventListener("loadedmetadata", followBottom, true);
      window.removeEventListener("resize", followBottom);
    };
  }, []);

  return (
    <div ref={viewportRef} className={`cr-chat-panel ${styles.viewport}`} style={style}
      data-conversation={conversationKey}
      onScroll={() => {
        const viewport = viewportRef.current;
        if (viewport.clientHeight > 0) {
          pinnedRef.current = viewport.scrollHeight - viewport.clientHeight - viewport.scrollTop <= 64;
        }
      }}>
      <div ref={contentRef} className={`cr-message-column ${styles.content}`}>{children}</div>
    </div>
  );
}
