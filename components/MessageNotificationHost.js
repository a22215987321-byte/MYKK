import { useCallback, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { X } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { subscribeIncomingMessages } from "../lib/incomingMessages";
import styles from "./MessageNotificationHost.module.css";

export function MessageNotification({ item, onDismiss }) {
  const [paused, setPaused] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => onDismiss(item.id), 7000);
    return () => clearTimeout(timer);
  }, [item.id, onDismiss, paused]);

  return (
    <div className={styles.item} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
      onKeyDown={event => { if (event.key === "Escape") onDismiss(item.id); }}>
      {item.avatarImage && !imageFailed ? (
        <img className={styles.avatar} src={item.avatarImage} alt={`${item.senderName}的頭像`} onError={() => setImageFailed(true)} />
      ) : <span className={styles.avatar} aria-hidden="true">{item.avatar || item.senderName.slice(0, 1)}</span>}
      <div className={styles.bubble}>
        <strong className={styles.name}>{item.senderName}</strong>
        {item.groupName && <span className={styles.group}>{item.groupName}</span>}
        <p className={styles.text}>{item.text}</p>
        <button type="button" className={styles.close} onClick={() => onDismiss(item.id)} aria-label="關閉訊息通知"><X size={16} /></button>
      </div>
    </div>
  );
}

// Mounted once above route changes so /feed and /profile also receive previews.
// These are in-app notices, not OS push notifications or read receipts.
export default function MessageNotificationHost() {
  const [items, setItems] = useState([]);
  const dismiss = useCallback(id => setItems(current => current.filter(item => item.id !== id)), []);

  useEffect(() => {
    let generation = 0;
    let disposed = false;
    let stopMessages = () => {};
    const reset = () => { generation += 1; stopMessages(); stopMessages = () => {}; setItems([]); };
    const stopAuth = onAuthStateChanged(auth, user => {
      if (disposed) return;
      reset();
      if (!user || user.isAnonymous) return;
      const session = generation;
      stopMessages = subscribeIncomingMessages(db, user.uid, item => {
        if (disposed || session !== generation || document.visibilityState === "hidden") return;
        setItems(current => [...current.filter(existing => existing.id !== item.id), item].slice(-2));
      }, error => console.warn("[MessageNotification] listener unavailable", error?.code || "unknown"));
    }, () => { if (!disposed) reset(); });
    return () => { disposed = true; generation += 1; stopAuth(); stopMessages(); };
  }, []);

  return (
    <aside className={styles.host} aria-label="新訊息通知" aria-live="polite" aria-relevant="additions text">
      {items.map(item => <MessageNotification key={item.id} item={item} onDismiss={dismiss} />)}
    </aside>
  );
}
