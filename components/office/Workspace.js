import { useEffect, useMemo, useState } from "react";
import {
  CaretLeft, CaretRight, Clock, DownloadSimple, FileText, GithubLogo, MagnifyingGlass,
  NotePencil, PencilSimple, Play, Plus, Trash, UploadSimple, UserFocus, X,
} from "@phosphor-icons/react";
import { formatBytes } from "./constants";

function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function displayDateTime(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "時間未設定";
  return new Intl.DateTimeFormat("zh-HK", {
    year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(date);
}

// 執行檔案庫——直接讀 officeTasks（見 OfficeMode.js），不像原本桌面版另外
// 存一份「執行紀錄」——這裡的 officeTasks 本身就是永久紀錄（每次重新執行
// 都是開一筆新文件，不會覆蓋舊的已完成/失敗結果），所以「目前任務流」跟
// 「執行檔案庫」讀的是同一份資料，只是右欄只顯示最新 4 筆、這裡是完整、
// 可搜尋/篩選的全部清單。
export function ExecutionArchive({ executions, getAgent, onOpen, onDownload, onDelete }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const filtered = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    return executions.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (!normalized) return true;
      const agent = getAgent(item.assigneeId);
      return [item.title, item.result, item.error, agent?.name, agent?.role]
        .some((value) => String(value || "").toLowerCase().includes(normalized));
    });
  }, [executions, getAgent, search, status]);

  return (
    <section className="workspace-view archive-view" aria-labelledby="archive-title">
      <header className="workspace-view-head">
        <div><span className="eyebrow">EXECUTION FILES</span><h1 id="archive-title">執行檔案庫</h1><p>所有已完成與失敗的執行紀錄都會獨立保存，新任務不會覆蓋舊報告。</p></div>
        <div className="archive-head-tools">
          <label className="view-search"><MagnifyingGlass size={18} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="搜尋報告、員工或內容" /></label>
          <select value={status} onChange={(event) => setStatus(event.target.value)} aria-label="篩選執行狀態">
            <option value="all">全部狀態</option>
            <option value="completed">已完成</option>
            <option value="failed">執行失敗</option>
          </select>
          <strong className="archive-count">{executions.length} 份檔案</strong>
        </div>
      </header>
      <div className="archive-list">
        {filtered.length ? filtered.map((item) => {
          const agent = getAgent(item.assigneeId);
          return (
            <article className={`archive-card ${item.status}`} key={item.id}>
              <button className="archive-open" onClick={() => onOpen(item)}>
                <span className="archive-file-icon"><FileText size={22} weight="fill" /></span>
                <span><strong>{item.title}</strong><small>{agent?.name || "未知員工"} · {displayDateTime(item.completedAt || item.createdAt)}</small></span>
                <em>{item.status === "completed" ? "已完成" : "失敗"}</em>
              </button>
              <div className="archive-card-actions">
                {item.result ? <button className="archive-download" onClick={() => onDownload(item)} aria-label={`下載 ${item.title}`}><DownloadSimple size={18} /></button> : null}
                <button className="archive-delete" onClick={() => onDelete(item)} aria-label={`刪除 ${item.title}`}><Trash size={18} /></button>
              </div>
            </article>
          );
        }) : <div className="view-empty"><FileText size={34} /><strong>還沒有符合的執行檔案</strong><span>完成第一個真實任務後，報告會出現在這裡。</span></div>}
      </div>
    </section>
  );
}

export function TemplateLibrary({ templates, agents, getAgent, onUse, onDelete, onCreate }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [assigneeId, setAssigneeId] = useState(agents[0]?.id || "");
  const [kind, setKind] = useState("standard");

  const submit = (event) => {
    event.preventDefault();
    const submittedDate = new FormData(event.currentTarget).get("targetDate")?.toString() || "";
    if (!name.trim() || (kind !== "github" && !title.trim())) return;
    onCreate({
      name: name.trim(),
      title: kind === "github" ? "GitHub 新開源專案整理" : title.trim(),
      brief: brief.trim(),
      assigneeId,
      kind,
      targetDate: submittedDate,
    });
    setName(""); setTitle(""); setBrief(""); setKind("standard");
    event.currentTarget.reset();
    setEditorOpen(false);
  };

  return (
    <section className="workspace-view template-view" aria-labelledby="template-title">
      <header className="template-library-head">
        <h1 id="template-title">任務儲存</h1>
        <button className="template-add-button" onClick={() => setEditorOpen(true)} aria-label="建立任務格式"><Plus size={20} weight="bold" /></button>
      </header>
      <div className="template-grid">
        {templates.length ? templates.map((template) => {
          const agent = getAgent(template.assigneeId);
          return (
            <article className="template-card" key={template.id}>
              <span className={`template-kind ${template.kind}`}>{template.kind === "github" ? <GithubLogo size={18} weight="fill" /> : <FileText size={18} />}</span>
              <div><strong>{template.name}</strong><p>{template.title}</p><small>{agent?.name || "未指定"}{template.targetDate ? ` · 資料日期 ${template.targetDate}` : " · 執行時選日期"}</small></div>
              <div className="template-actions">
                <button onClick={() => onUse(template)}><Play size={16} weight="fill" />使用範本</button>
                <button className="danger-icon" onClick={() => onDelete(template)} aria-label={`刪除 ${template.name}`}><Trash size={16} /></button>
              </div>
            </article>
          );
        }) : <div className="view-empty"><FileText size={34} /><strong>還沒有儲存任務</strong><span>按右上角的＋建立第一個可重複使用的任務格式。</span></div>}
      </div>
      {editorOpen ? <div className="modal-backdrop" role="presentation" onMouseDown={() => setEditorOpen(false)}>
        <section className="template-modal" role="dialog" aria-modal="true" aria-labelledby="template-editor-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-head"><div><span className="eyebrow">SAVED TASK</span><h2 id="template-editor-title">新增任務格式</h2></div><button className="icon-button" onClick={() => setEditorOpen(false)} aria-label="關閉"><X size={20} /></button></div>
          <form className="template-editor" onSubmit={submit}>
            <label>範本名稱<input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：每月競品比較" required /></label>
            <label>任務類型<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="standard">一般 DeepSeek 任務</option><option value="github">GitHub 新專案整理</option></select></label>
            {kind !== "github" ? <label>任務名稱<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：整理指定月份的競品變化" required /></label> : null}
            <label>資料日期（可選）<input name="targetDate" type="date" /><small>可選任何過往或未來日期，不限今天。</small></label>
            <label>預設員工<select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} · {agent.role}</option>)}</select></label>
            <label>任務內容與輸出格式<textarea rows="5" value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="寫下資料範圍、分析方法、輸出欄位與格式要求…" /></label>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setEditorOpen(false)}>取消</button><button className="primary-button" type="submit"><Plus size={17} weight="bold" />儲存任務格式</button></div>
          </form>
        </section>
      </div> : null}
    </section>
  );
}

export function NotesCenter({ notes, onSave, onDelete, prefill, onPrefillConsumed }) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [expandedId, setExpandedId] = useState("");
  const [editingId, setEditingId] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    if (!prefill) return;
    setEditingId("");
    setTitle(prefill.title || "");
    setContent(prefill.content || "");
    setEditorOpen(true);
    onPrefillConsumed?.();
  }, [prefill, onPrefillConsumed]);

  const clearEditor = () => { setEditingId(""); setTitle(""); setContent(""); setEditorOpen(false); };

  const submit = (event) => {
    event.preventDefault();
    if (!content.trim()) return;
    onSave({
      id: editingId || undefined,
      title: title.trim() || "未命名筆記",
      content: content.trim(),
    });
    clearEditor();
  };

  const edit = (note) => { setEditingId(note.id); setTitle(note.title); setContent(note.content); setExpandedId(""); setEditorOpen(true); };
  const addNote = () => { setEditingId(""); setTitle(""); setContent(""); setEditorOpen(true); };
  const expandedNote = notes.find((note) => note.id === expandedId);

  return (
    <section className="workspace-view notes-view" aria-labelledby="notes-title">
      <header className="notes-library-head">
        <h1 id="notes-title">筆記中心</h1>
        <button className="note-add-button" onClick={addNote} aria-label="儲存新筆記"><Plus size={20} weight="bold" /></button>
      </header>
      <div className="note-grid">
        {notes.length ? notes.map((note) => (
          <article className="note-card" key={note.id} role="button" tabIndex="0" onClick={() => setExpandedId(note.id)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setExpandedId(note.id); } }}>
            <div className="note-card-head"><span><NotePencil size={18} /></span><strong>{note.title}</strong></div>
            <p>{note.content}</p>
            <small>{note.sourceTaskTitle ? `提取自：${note.sourceTaskTitle}` : "手動筆記"} · {displayDateTime(note.updatedAt || note.createdAt)}</small>
            <div className="note-card-actions">
              <button onClick={(event) => { event.stopPropagation(); edit(note); }}><PencilSimple size={15} />編輯</button>
              <button className="danger-icon" onClick={(event) => { event.stopPropagation(); onDelete(note); }} aria-label={`刪除 ${note.title}`}><Trash size={15} /></button>
            </div>
          </article>
        )) : <div className="view-empty"><NotePencil size={34} /><strong>還沒有筆記</strong><span>按右上角的＋新增，或從任務結果的「提取」按鈕加入。</span></div>}
      </div>
      {editorOpen ? <div className="modal-backdrop" role="presentation" onMouseDown={clearEditor}>
        <section className="note-modal" role="dialog" aria-modal="true" aria-labelledby="note-editor-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-head"><div><h2 id="note-editor-title">{editingId ? "編輯筆記" : "新增筆記"}</h2></div><button className="icon-button" onClick={clearEditor} aria-label="關閉"><X size={20} /></button></div>
          <form className="note-modal-editor" onSubmit={submit}>
            <label>標題<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：Crawl4AI 整合重點" /></label>
            <label>內容<textarea rows="10" value={content} onChange={(event) => setContent(event.target.value)} placeholder="寫下要保存的內容……" required /></label>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={clearEditor}>取消</button><button className="primary-button" type="submit"><NotePencil size={17} />{editingId ? "更新筆記" : "儲存筆記"}</button></div>
          </form>
        </section>
      </div> : null}
      {expandedNote ? <div className="modal-backdrop" role="presentation" onMouseDown={() => setExpandedId("")}>
        <section className="note-modal note-preview-modal" role="dialog" aria-modal="true" aria-labelledby="note-preview-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-head"><div><h2 id="note-preview-title">{expandedNote.title}</h2><p>{expandedNote.sourceTaskTitle ? `提取自：${expandedNote.sourceTaskTitle}` : "手動筆記"} · {displayDateTime(expandedNote.updatedAt || expandedNote.createdAt)}</p></div><button className="icon-button" onClick={() => setExpandedId("")} aria-label="關閉"><X size={20} /></button></div>
          <div className="note-preview-content">{expandedNote.content}</div>
          <div className="note-preview-actions"><button className="primary-button" onClick={() => edit(expandedNote)}><PencilSimple size={16} />編輯筆記</button></div>
        </section>
      </div> : null}
    </section>
  );
}

export function AgentPromptLibrary({ prompts, agents, onSave }) {
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [instruction, setInstruction] = useState("");
  const selectedAgent = agents.find((agent) => agent.id === selectedAgentId);

  const openPrompt = (agent) => {
    setSelectedAgentId(agent.id);
    setInstruction(prompts.find((prompt) => prompt.agentId === agent.id)?.instruction || "");
  };
  const closePrompt = () => { setSelectedAgentId(""); setInstruction(""); };

  const submit = (event) => {
    event.preventDefault();
    if (!selectedAgent || !instruction.trim()) return;
    onSave({ agentId: selectedAgent.id, instruction: instruction.trim() });
    closePrompt();
  };

  return (
    <section className="workspace-view agent-prompts-view" aria-labelledby="agent-prompts-title">
      <header className="agent-prompts-head"><h1 id="agent-prompts-title">員工指令模板</h1></header>
      <div className="agent-prompt-grid">
        {agents.map((agent) => {
          const prompt = prompts.find((item) => item.agentId === agent.id);
          return <article className="agent-prompt-card" key={agent.id} role="button" tabIndex="0" onClick={() => openPrompt(agent)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); openPrompt(agent); } }}>
            <span><UserFocus size={22} /></span>
            <div><strong>{agent.name}</strong><small>{agent.role}</small></div>
            <p>{prompt?.instruction || "尚未設定指令（使用預設人設）"}</p>
          </article>;
        })}
      </div>
      {selectedAgent ? <div className="modal-backdrop" role="presentation" onMouseDown={closePrompt}>
        <section className="agent-prompt-modal" role="dialog" aria-modal="true" aria-labelledby="agent-prompt-editor-title" onMouseDown={(event) => event.stopPropagation()}>
          <div className="modal-head"><div><h2 id="agent-prompt-editor-title">{selectedAgent.name} · {selectedAgent.role}</h2><p>此指令會套用到這位員工之後執行的任務及對話。</p></div><button className="icon-button" onClick={closePrompt} aria-label="關閉"><X size={20} /></button></div>
          <form className="agent-prompt-editor" onSubmit={submit}>
            <label>員工指令<textarea rows="13" value={instruction} onChange={(event) => setInstruction(event.target.value)} required /></label>
            <div className="modal-actions"><button type="button" className="secondary-button" onClick={closePrompt}>取消</button><button className="primary-button" type="submit"><PencilSimple size={17} />儲存指令</button></div>
          </form>
        </section>
      </div> : null}
    </section>
  );
}

// 文件中心——只支援純文字格式（.txt/.md/.csv/.json），瀏覽器直接讀檔案內容
// 存進 Firestore，不用另外架伺服器端解析／上傳到雲端儲存。PDF/Word 需要
// 額外的解析套件（mammoth/pdf-parse），這次先不加這兩個新依賴，之後有需要
// 再說。
export function DocumentCenter({ documents, onUpload, onDelete, uploading }) {
  return (
    <section className="workspace-view archive-view" aria-labelledby="document-title">
      <header className="workspace-view-head">
        <div><span className="eyebrow">DOCUMENT CENTER</span><h1 id="document-title">文件中心</h1><p>支援 .txt / .md / .csv / .json 純文字檔，上傳後可以在新增任務時附加當作參考資料。</p></div>
        <label className="template-add-button" style={{ cursor: "pointer" }} aria-label="上傳文件">
          {uploading ? <span style={{ fontSize: 11 }}>上傳中…</span> : <UploadSimple size={20} weight="bold" />}
          <input type="file" multiple accept=".txt,.md,.csv,.json" style={{ display: "none" }}
            onChange={(event) => { if (event.target.files?.length) onUpload(event.target.files); event.target.value = ""; }} />
        </label>
      </header>
      <div className="archive-list">
        {documents.length ? documents.map((document) => (
          <article className="archive-card completed" key={document.id}>
            <div className="archive-open" style={{ cursor: "default" }}>
              <span className="archive-file-icon"><FileText size={22} weight="fill" /></span>
              <span><strong>{document.name}</strong><small>{formatBytes(document.size || 0)} · {displayDateTime(document.createdAt)}</small></span>
            </div>
            <div className="archive-card-actions">
              <button className="archive-delete" onClick={() => onDelete(document)} aria-label={`刪除 ${document.name}`}><Trash size={18} /></button>
            </div>
          </article>
        )) : <div className="view-empty"><FileText size={34} /><strong>還沒有上傳文件</strong><span>按右上角上傳 .txt / .md / .csv / .json 檔案。</span></div>}
      </div>
    </section>
  );
}

function monthCells(monthDate) {
  const first = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay());
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

function nextHourValue() {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(0, 0, 0);
  return `${localDateKey(date)}T${String(date.getHours()).padStart(2, "0")}:00`;
}

function localDateTimeValue(date = new Date()) {
  return `${localDateKey(date)}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// 排定的任務不用開著網站也會執行——由 Vercel Cron（見
// pages/api/cron/office-schedules.js）每 10 分鐘檢查一次到期任務，跟原本
// 桌面版「App 要開著」的排程方式不同。
export function ScheduleCalendar({ schedules, templates, agents, getAgent, onCreate, onCancel }) {
  const [monthDate, setMonthDate] = useState(() => new Date());
  const [templateId, setTemplateId] = useState("");
  const [title, setTitle] = useState("");
  const [brief, setBrief] = useState("");
  const [assigneeId, setAssigneeId] = useState(agents[0]?.id || "");
  const [kind, setKind] = useState("standard");
  const [targetDate, setTargetDate] = useState("");
  const [scheduledFor, setScheduledFor] = useState(nextHourValue);
  const [selectionStart, setSelectionStart] = useState("");
  const [selectionEnd, setSelectionEnd] = useState("");
  const [selecting, setSelecting] = useState(false);
  const cells = useMemo(() => monthCells(monthDate), [monthDate]);
  const grouped = useMemo(() => schedules.reduce((map, schedule) => {
    const key = localDateKey(schedule.scheduledFor);
    if (!map[key]) map[key] = [];
    map[key].push(schedule);
    return map;
  }, {}), [schedules]);
  const cellKeys = useMemo(() => cells.map(localDateKey), [cells]);
  const todayKey = localDateKey(new Date());
  const selectedDateKeys = useMemo(() => {
    if (!selectionStart || !selectionEnd) return [];
    const startIndex = cellKeys.indexOf(selectionStart);
    const endIndex = cellKeys.indexOf(selectionEnd);
    if (startIndex < 0 || endIndex < 0) return [];
    return cellKeys.slice(Math.min(startIndex, endIndex), Math.max(startIndex, endIndex) + 1).filter((key) => key >= todayKey);
  }, [cellKeys, selectionEnd, selectionStart, todayKey]);

  useEffect(() => {
    const stopSelecting = () => setSelecting(false);
    window.addEventListener("mouseup", stopSelecting);
    return () => window.removeEventListener("mouseup", stopSelecting);
  }, []);

  useEffect(() => {
    if (!selectedDateKeys.length) return;
    setScheduledFor((current) => `${selectedDateKeys[0]}T${current.split("T")[1] || "09:00"}`);
  }, [selectedDateKeys]);

  const chooseTemplate = (id) => {
    setTemplateId(id);
    const template = templates.find((item) => item.id === id);
    if (!template) { setTitle(""); setBrief(""); setKind("standard"); setTargetDate(""); return; }
    setTitle(template.title); setBrief(template.brief); setAssigneeId(template.assigneeId); setKind(template.kind); setTargetDate(template.targetDate || "");
  };

  const submit = (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const submittedDate = formData.get("scheduledFor")?.toString() || scheduledFor;
    const submittedTargetDate = formData.get("targetDate")?.toString() || targetDate;
    const effectiveTitle = kind === "github" ? "GitHub 新開源專案整理" : title.trim();
    if (!effectiveTitle || !submittedDate) return;
    const time = submittedDate.split("T")[1] || "09:00";
    const dates = selectedDateKeys.length ? selectedDateKeys : [submittedDate.split("T")[0]];
    dates.forEach((date) => onCreate({ title: effectiveTitle, brief: brief.trim(), assigneeId, kind, targetDate: submittedTargetDate, scheduledFor: new Date(`${date}T${time}`).toISOString() }));
    setTitle(""); setBrief(""); setTemplateId(""); setTargetDate(""); setSelectionStart(""); setSelectionEnd(""); setScheduledFor(nextHourValue());
  };

  const monthLabel = new Intl.DateTimeFormat("zh-HK", { year: "numeric", month: "long" }).format(monthDate);
  const pendingCount = schedules.filter((item) => item.status === "scheduled").length;
  return (
    <section className="workspace-view calendar-view" aria-label="日程日曆">
      <div className="calendar-layout">
        <div className="calendar-board">
          <div className="calendar-toolbar"><button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}><CaretLeft size={18} /></button><div className="calendar-month-heading"><h2>{monthLabel}</h2><span>{pendingCount} 個待執行</span>{selectedDateKeys.length ? <em>已選 {selectedDateKeys.length} 天</em> : null}</div><button onClick={() => setMonthDate(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}><CaretRight size={18} /></button></div>
          <div className="calendar-weekdays">{["日", "一", "二", "三", "四", "五", "六"].map((day) => <span key={day}>{day}</span>)}</div>
          <div className="calendar-grid">
            {cells.map((date) => {
              const key = localDateKey(date);
              const daySchedules = grouped[key] || [];
              const outside = date.getMonth() !== monthDate.getMonth();
              const selected = selectedDateKeys.includes(key);
              const past = key < todayKey;
              return <div className={`calendar-cell ${outside ? "outside" : ""} ${key === todayKey ? "today" : ""} ${selected ? "selected" : ""} ${past ? "past" : ""}`} key={key}
                onMouseDown={(event) => { if (event.button !== 0 || past) return; event.preventDefault(); setSelectionStart(key); setSelectionEnd(key); setSelecting(true); }}
                onMouseEnter={() => { if (selecting && !past) setSelectionEnd(key); }}
                onMouseUp={() => setSelecting(false)}>
                <b>{date.getDate()}</b>{daySchedules.slice(0, 3).map((schedule) => <span className={`calendar-chip ${schedule.status}`} key={schedule.id}>{getAgent(schedule.assigneeId)?.name} · {schedule.title}</span>)}{daySchedules.length > 3 ? <small>另有 {daySchedules.length - 3} 項</small> : null}
              </div>;
            })}
          </div>
        </div>
        <form className="schedule-form" onSubmit={submit}>
          <label>套用儲存任務<select value={templateId} onChange={(event) => chooseTemplate(event.target.value)}><option value="">自訂任務</option>{templates.map((template) => <option value={template.id} key={template.id}>{template.name}</option>)}</select></label>
          <label>執行時間<input name="scheduledFor" type="datetime-local" value={scheduledFor} min={localDateTimeValue()} onChange={(event) => { const nextValue = event.target.value; if (selectedDateKeys.length && nextValue.split("T")[0] !== selectedDateKeys[0]) { setSelectionStart(""); setSelectionEnd(""); } setScheduledFor(nextValue); }} onClick={(event) => event.currentTarget.showPicker?.()} required /><small>{selectedDateKeys.length > 1 ? `將在選取的 ${selectedDateKeys.length} 天以相同時間執行` : "點擊輸入方塊任一位置即可選擇日期與時間"}</small></label>
          <label>資料日期（可選）<input name="targetDate" type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} onClick={(event) => event.currentTarget.showPicker?.()} /><small>可指定過往日期；留空時 GitHub 排程會使用執行當日。</small></label>
          <label>任務類型<select value={kind} onChange={(event) => setKind(event.target.value)}><option value="standard">一般 DeepSeek 任務</option><option value="github">GitHub 指定日期整理</option></select></label>
          {kind !== "github" ? <label>任務名稱<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：整理下週行銷計劃" required /></label> : <div className="github-date-note"><GithubLogo size={18} weight="fill" />GitHub 會自動整理排程當日的新專案</div>}
          <label>指派員工<select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} · {agent.role}</option>)}</select></label>
          <label>任務說明<textarea rows="3" value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="可留空，或加入固定要求" /></label>
          <button className="view-primary" type="submit"><Plus size={17} weight="bold" />加入日程</button>
          <div className="upcoming-list">
            {schedules.slice().sort((a, b) => Date.parse(a.scheduledFor) - Date.parse(b.scheduledFor)).slice(0, 6).map((schedule) => <article key={schedule.id}><Clock size={16} /><span><strong>{schedule.title}</strong><small>{getAgent(schedule.assigneeId)?.name} · {displayDateTime(schedule.scheduledFor)}</small></span><em>{schedule.status === "scheduled" ? "待執行" : schedule.status === "completed" ? "已完成" : schedule.status === "failed" ? "失敗" : schedule.status === "cancelled" ? "已取消" : "執行中"}</em>{schedule.status === "scheduled" ? <button type="button" onClick={() => onCancel(schedule)} aria-label={`取消 ${schedule.title}`}><Trash size={15} /></button> : null}</article>)}
          </div>
        </form>
      </div>
    </section>
  );
}
