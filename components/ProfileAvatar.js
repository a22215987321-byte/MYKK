import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Eye, ImagePlus, X } from "lucide-react";
import PortalPopover from "./PortalPopover";
import styles from "./ProfileAvatar.module.css";

export default function ProfileAvatar({ profile, isOwner, status, onRequestChange }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [viewing, setViewing] = useState(false);
  const buttonRef = useRef(null);
  const dialogRef = useRef(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  useEffect(() => {
    if (!viewing) return;
    const dialog = dialogRef.current;
    const trigger = buttonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      trigger?.focus({ preventScroll: true });
    };
  }, [viewing]);

  const viewAvatar = () => {
    setMenuOpen(false);
    setViewing(true);
  };

  return (
    <div className={`pp-avatar ${styles.avatar}`}>
      <button ref={buttonRef} type="button" className={styles.trigger}
        aria-label={isOwner ? "頭像選項" : "查看頭像"}
        aria-expanded={isOwner ? menuOpen : undefined}
        onClick={isOwner ? () => setMenuOpen(value => !value) : viewAvatar}>
        {profile.avatarImage
          ? <img src={profile.avatarImage} alt={`${profile.nickname || "使用者"}的頭像`} className={styles.image} />
          : <span className={styles.fallback} style={{ background: profile.color || "var(--accent)" }}>{profile.avatar || "😊"}</span>}
        <span className={styles.hint} aria-hidden="true"><Eye size={24} /></span>
      </button>
      {status && <span title={status.label} className={styles.status} style={{ background: status.color }} />}

      <PortalPopover anchorRef={buttonRef} open={isOwner && menuOpen} onClose={closeMenu}
        placement="bottom-left" constrainToViewport>
        <div role="group" aria-label="頭像選項" className={styles.actions}>
          <button type="button" onClick={viewAvatar}><Eye size={18} aria-hidden="true" />查看頭像</button>
          <button type="button" onClick={() => { setMenuOpen(false); onRequestChange(); }}>
            <ImagePlus size={18} aria-hidden="true" />更換頭像
          </button>
        </div>
      </PortalPopover>

      {viewing && createPortal(
        <dialog ref={dialogRef} className={styles.viewer} aria-label="查看頭像"
          onCancel={() => setViewing(false)}
          onClick={event => { if (event.target === event.currentTarget) setViewing(false); }}>
          <button type="button" className={styles.close} aria-label="關閉頭像檢視" onClick={() => setViewing(false)} autoFocus>
            <X size={24} aria-hidden="true" />
          </button>
          {profile.avatarImage
            ? <img src={profile.avatarImage} alt={`${profile.nickname || "使用者"}的頭像大圖`} className={styles.fullImage} />
            : <span className={styles.fullFallback} style={{ background: profile.color || "var(--accent)" }}>{profile.avatar || "😊"}</span>}
        </dialog>, document.body,
      )}
    </div>
  );
}
