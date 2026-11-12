import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import styles from './TypeWordsRoom.module.css';

export default function TypeWordsRoom({ active = true, onClose }) {
  const frame = useRef(null);
  const [started, setStarted] = useState(active);
  const syncActive = useCallback(() => {
    frame.current?.contentWindow?.postMessage(
      { type: 'evonchat:typewords-active', active: Boolean(active) },
      window.location.origin,
    );
  }, [active]);

  useEffect(() => { if (active) setStarted(true); }, [active]);
  useEffect(() => { syncActive(); }, [syncActive]);
  useEffect(() => {
    const onReady = event => {
      if (event.origin !== window.location.origin || event.source !== frame.current?.contentWindow
        || event.data?.type !== 'evonchat:typewords-ready') return;
      syncActive();
    };
    window.addEventListener('message', onReady);
    return () => window.removeEventListener('message', onReady);
  }, [syncActive]);

  return <section className={styles.room} aria-label="TypeWords" data-workspace-gesture-lock="true" data-disable-drawer-swipe="true">
    {onClose && <header className={styles.toolbar}>
      <button type="button" onClick={onClose} aria-label="返回功能選單"><ArrowLeft size={22} aria-hidden="true" /></button>
      <span>TypeWords</span>
    </header>}
    {started && <iframe ref={frame} title="TypeWords 英語練習" src="/apps/typewords/words" onLoad={syncActive} />}
  </section>;
}
