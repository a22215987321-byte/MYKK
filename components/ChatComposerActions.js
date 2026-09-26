import { useCallback, useId, useState } from "react";
import { LoaderCircle, Paperclip, Plus, Smile } from "lucide-react";
import PortalPopover from "./PortalPopover";
import styles from "./ChatComposerActions.module.css";

export default function ChatComposerActions({ anchorRef, onUpload, onEmoji, onOpen, uploading, isMobile }) {
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const close = useCallback(() => setOpen(false), []);

  return (
    <>
      <button ref={anchorRef} type="button" className={styles.trigger}
        aria-label={uploading ? "正在上傳附件" : "新增附件或表情"}
        title="附件與表情" aria-expanded={open} aria-controls={open ? menuId : undefined}
        disabled={uploading}
        onClick={() => {
          if (isMobile) document.activeElement?.blur?.();
          onOpen?.();
          setOpen(value => !value);
        }}>
        {uploading ? <LoaderCircle size={22} aria-hidden="true" /> : <Plus size={24} aria-hidden="true" />}
      </button>
      <PortalPopover anchorRef={anchorRef} open={open} onClose={close} placement="top-right" constrainToViewport>
        <div id={menuId} className={styles.menu} role="group" aria-label="附件與表情">
          <button type="button" onClick={() => {
            close();
            anchorRef.current?.focus({ preventScroll: true });
            // Keep the native file chooser in the original user click gesture.
            onUpload();
          }}><Paperclip size={20} aria-hidden="true" />圖片／影片／檔案</button>
          <button type="button" onClick={() => { close(); onEmoji(); }}>
            <Smile size={20} aria-hidden="true" />表情／貼圖
          </button>
        </div>
      </PortalPopover>
    </>
  );
}
