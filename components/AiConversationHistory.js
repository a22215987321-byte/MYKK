import { useEffect, useRef, useState } from "react";
import { MessageSquare, SquarePen, Trash2, X } from "lucide-react";
import styles from "./AiConversationHistory.module.css";

function formatConvTime(timestamp) {
  const date = timestamp?.toDate ? timestamp.toDate() : (timestamp ? new Date(timestamp) : null);
  return date ? date.toLocaleDateString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "";
}

// UI selection stays local. Only the parent can delete authenticated Firestore records.
export default function AiConversationHistory({ id, conversations, activeConvId, loading, busy, deleting, onOpen, onDelete, onClose, onNew, triggerRef }) {
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef(null);
  const cancelRef = useRef(null);
  const deleteButtonRef = useRef(null);
  const previousConfirmation = useRef(false);
  const submittingRef = useRef(false);
  const selected = selectedIds.filter(id => conversations.some(conversation => conversation.id === id));
  const disabled = busy || deleting;

  useEffect(() => {
    const trigger = triggerRef.current;
    panelRef.current?.focus({ preventScroll: true });
    return () => trigger?.focus({ preventScroll: true });
  }, [triggerRef]);

  useEffect(() => {
    if (confirming) cancelRef.current?.focus({ preventScroll: true });
    else if (previousConfirmation.current) {
      const target = deleteButtonRef.current;
      (target && !target.disabled ? target : panelRef.current)?.focus({ preventScroll: true });
    }
    previousConfirmation.current = confirming;
  }, [confirming]);

  useEffect(() => {
    const onKeyDown = event => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      if (deleting) return;
      if (confirming) setConfirming(false);
      else onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [confirming, deleting, onClose]);

  useEffect(() => {
    // Firestore temporarily removes pending deletes from its local snapshot.
    // Preserve selection so a rejected batch can show the same choices on rollback.
    if (!deleting) setConfirming(false);
  }, [conversations, deleting]);

  const select = (id, checked) => {
    setSelectedIds(current => checked ? [...new Set([...current, id])] : current.filter(value => value !== id));
    setConfirming(false);
    setError("");
  };

  const removeSelected = async () => {
    if (disabled || !selected.length || submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    try {
      await onDelete(selected);
      setSelectedIds([]);
      setConfirming(false);
    } catch {
      setError("刪除失敗，請稍後重試。");
      setConfirming(false);
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <section id={id} ref={panelRef} className={styles.panel} role="dialog" aria-label="對話記錄" aria-busy={loading || deleting} tabIndex={-1}>
      <div className={styles.heading}>
        <div><h2>對話記錄</h2><p>開啟卡片繼續聊天，勾選後可批次刪除。</p></div>
        <button type="button" className={styles.iconButton} onClick={onClose} disabled={deleting} aria-label="關閉對話記錄"><X size={20} /></button>
      </div>
      <div className={styles.scroll}>
        {onNew && <button type="button" className={styles.newButton} onClick={onNew} disabled={disabled}><SquarePen size={16} />新對話</button>}
        {loading ? <p className={styles.empty}>正在載入對話…</p> : conversations.length === 0 ? (
          <p className={styles.empty}>還沒有過去的對話</p>
        ) : (
          <div className={styles.grid}>
            {conversations.map(conversation => {
              const checked = selected.includes(conversation.id);
              const title = conversation.title || "新對話";
              const preview = conversation.messages?.at(-1)?.content || "尚無訊息";
              return (
                <div key={conversation.id} className={styles.card} data-selected={checked} data-active={conversation.id === activeConvId}>
                  <button type="button" className={styles.openButton} onClick={() => onOpen(conversation)} disabled={disabled} aria-label={`開啟對話：${title}`}>
                    <span className={styles.cardTitle}><MessageSquare size={15} aria-hidden="true" /><span>{title}</span></span>
                    <span className={styles.preview}>{preview}</span>
                    <span className={styles.time}>{formatConvTime(conversation.updatedAt)}{conversation.id === activeConvId && <span>目前對話</span>}</span>
                  </button>
                  <label className={styles.selectControl}>
                    <input type="checkbox" checked={checked} disabled={disabled} onChange={event => select(conversation.id, event.target.checked)} aria-label={`選取對話：${title}`} />
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div className={styles.footer}>
        <div className={styles.selectionSummary}>
          <span aria-live="polite">已選取 {selected.length} 筆對話</span>
          <button type="button" className={styles.textButton} disabled={disabled || loading || !conversations.length} onClick={() => {
            setSelectedIds(selected.length === conversations.length ? [] : conversations.map(conversation => conversation.id));
            setConfirming(false);
            setError("");
          }}>{selected.length > 0 && selected.length === conversations.length ? "取消全選" : "全選"}</button>
        </div>
        {error && <p className={styles.error} role="alert">{error}</p>}
        {confirming && selected.length > 0 ? (
          <div className={styles.confirmation}>
            <p>確定刪除這 {selected.length} 筆對話？此操作無法復原。</p>
            <div className={styles.confirmActions}>
              <button type="button" ref={cancelRef} className={styles.cancelButton} disabled={deleting} onClick={() => setConfirming(false)}>取消</button>
              <button type="button" className={styles.deleteButton} disabled={disabled} onClick={removeSelected}><Trash2 size={16} />{deleting ? "刪除中…" : "確認刪除"}</button>
            </div>
          </div>
        ) : (
          <button type="button" ref={deleteButtonRef} className={styles.deleteButton} disabled={disabled || !selected.length} onClick={() => { setConfirming(true); setError(""); }}>
            <Trash2 size={16} />{deleting ? "刪除中…" : `刪除選取的對話${selected.length ? `（${selected.length}）` : ""}`}
          </button>
        )}
      </div>
    </section>
  );
}
