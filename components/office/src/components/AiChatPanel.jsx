import { useEffect, useRef, useState } from "react";
import { ChatsCircle, FileText, PaperPlaneRight, SpinnerGap, X } from "@phosphor-icons/react";

const MIN_HEIGHT = 220;
const DEFAULT_HEIGHT = 330;

function initialHeight() {
  const saved = Number(window.localStorage.getItem("ai-office-chat-height"));
  return Number.isFinite(saved) && saved >= MIN_HEIGHT ? saved : DEFAULT_HEIGHT;
}

function taskStatusLabel(status) {
  return { running: "執行中", completed: "已完成", failed: "執行失敗" }[status] || status;
}

export function AiChatPanel({ open, messages, sending, connected, onClose, onSend, onOpenTask }) {
  const [draft, setDraft] = useState("");
  const [height, setHeight] = useState(initialHeight);
  const [resizing, setResizing] = useState(false);
  const resizeStart = useRef(null);
  const messageList = useRef(null);

  useEffect(() => {
    if (!open) return;
    const list = messageList.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages, open, sending]);

  useEffect(() => {
    window.localStorage.setItem("ai-office-chat-height", String(Math.round(height)));
  }, [height]);

  if (!open) return null;

  const beginResize = (event) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    resizeStart.current = { y: event.clientY, height };
    setResizing(true);
  };

  const resize = (event) => {
    if (!resizeStart.current) return;
    const maximum = Math.max(MIN_HEIGHT, Math.min(720, window.innerHeight - 90));
    setHeight(Math.max(MIN_HEIGHT, Math.min(maximum, resizeStart.current.height + resizeStart.current.y - event.clientY)));
  };

  const finishResize = () => {
    resizeStart.current = null;
    setResizing(false);
  };

  const submit = (event) => {
    event.preventDefault();
    const value = draft.trim();
    if (!value || sending) return;
    setDraft("");
    onSend(value);
  };

  return (
    <section className={`ai-chat-panel ${resizing ? "resizing" : ""}`} style={{ height }} aria-label="AI 對話">
      <div className="ai-chat-resize" onPointerDown={beginResize} onPointerMove={resize} onPointerUp={finishResize} onPointerCancel={finishResize} aria-label="拖曳調整對話窗高度"><span /></div>
      <header className="ai-chat-head">
        <div><span><ChatsCircle size={18} weight="fill" /></span><div><strong>AI 對話</strong><small>{connected ? "可回答並指派真實任務" : "等待 DeepSeek 連線"}</small></div></div>
        <button type="button" onClick={onClose} aria-label="關閉 AI 對話"><X size={17} /></button>
      </header>
      <div className="ai-chat-messages" ref={messageList} aria-live="polite">
        {!messages.length ? <div className="ai-chat-empty"><ChatsCircle size={30} /><strong>有甚麼需要處理？</strong><p>可以直接聊天，或說「請阿研整理今天的 GitHub 專案」建立真實任務。</p></div> : null}
        {messages.map((message) => (
          <article className={`ai-chat-message ${message.role}`} key={message.id}>
            <div>{message.content}</div>
            {message.taskTitle ? <section className={`ai-chat-task ${message.taskStatus || "running"}`}>
              <span><strong>{message.taskTitle}</strong><small>{taskStatusLabel(message.taskStatus || "running")}</small></span>
              {message.taskId && ["completed", "failed"].includes(message.taskStatus) ? <button type="button" onClick={() => onOpenTask(message.taskId)}><FileText size={14} />查看結果</button> : null}
            </section> : null}
            <time>{new Date(message.createdAt).toLocaleTimeString("zh-HK", { hour: "2-digit", minute: "2-digit" })}</time>
          </article>
        ))}
        {sending ? <div className="ai-chat-thinking"><SpinnerGap size={16} className="spin" />AI 正在處理…</div> : null}
      </div>
      <form className="ai-chat-compose" onSubmit={submit}>
        <textarea value={draft} onChange={(event) => setDraft(event.target.value)} onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) submit(event);
        }} placeholder={connected ? "輸入訊息或直接指派任務…" : "請先連線 DeepSeek"} rows="1" disabled={!connected} />
        <button type="submit" disabled={!connected || sending || !draft.trim()} aria-label="傳送訊息"><PaperPlaneRight size={17} weight="fill" /></button>
      </form>
    </section>
  );
}
