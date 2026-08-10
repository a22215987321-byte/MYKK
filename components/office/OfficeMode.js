import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
  CalendarBlank, CheckCircle, ChatsCircle, ClipboardText, CloudCheck, CloudSlash,
  Copy, Cpu, FileText, FolderSimple, GithubLogo, HardDrives, House, ListChecks,
  MagnifyingGlass, NotePencil, Pause, Play, Plus, Sparkle, Star, Trash, UsersThree,
  WifiHigh, X,
} from "@phosphor-icons/react";
import LoadingState from "../LoadingState";
import { collection, addDoc, doc, updateDoc, deleteDoc, onSnapshot, query, orderBy, limit as fsLimit } from "firebase/firestore";
import { db } from "../../lib/firebase";
import { requestDeskVisit } from "./src/scene/officeSceneBridge";
// Pixi 官方的 CSP-safe 執行時，一定要在任何 pixi.js 場景程式碼執行之前跑過一次；
// 這個檔案在 ChatRoom.js 那邊本來就是整包用 dynamic(ssr:false) 載入，不會在
// 伺服器端被評估到，這裡才能放心在最上面 import。
import "pixi.js/unsafe-eval";

const SpineOfficeCanvas = dynamic(
  () => import("./src/components/SpineOfficeCanvas").then(m => m.SpineOfficeCanvas),
  { ssr: false, loading: () => <LoadingState label="載入 AI Office..." minHeight="100%" /> }
);
const AiChatPanel = dynamic(
  () => import("./src/components/AiChatPanel").then(m => m.AiChatPanel),
  { ssr: false }
);

// 6 位 AI 員工——id 跟 components/office/src/scene/layout/officeLayout.ts 的
// AGENT_ROSTER 保持一致（含 code-agent→intelligence-agent／engineering-agent→
// systems-agent 那次改名），場景那邊用 id 對應角色，這裡只是給面板文字用。
const AGENTS = [
  { id: "strategy-agent", name: "若晴", role: "策略協調師", specialty: "拆解目標、協調團隊與交付路線" },
  { id: "intelligence-agent", name: "澄音", role: "AI 情報整合師", specialty: "彙整市場、GitHub 與研究訊號" },
  { id: "brand-agent", name: "璃亞", role: "品牌敘事師", specialty: "品牌定位、內容企劃與產品敘事" },
  { id: "systems-agent", name: "景曜", role: "系統整合架構師", specialty: "工作流程、自動化與跨平台整合" },
  { id: "analytics-agent", name: "阿衡", role: "數據與品管分析師", specialty: "數據分析、異常檢查與品質把關" },
  { id: "creative-agent", name: "老墨", role: "創意總監", specialty: "創意方向、提案故事與視覺概念" },
];
const COLOR_CYCLE = ["blue", "gold", "purple", "green"];

const primaryNavItems = [
  ["首頁", House, "home"],
  ["AI 對話", ChatsCircle, "chat"],
];
// 這些是原本桌面版就有、但這次網頁搬遷 Phase 2 還沒接上的功能——維持在畫面上
// 讓使用者知道以後會有，點下去只顯示「尚未建立」提示，不裝死藏起來。
const upcomingNavItems = [
  ["執行檔案", FileText, "archive"],
  ["筆記中心", NotePencil, "notes"],
  ["員工指令", ClipboardText, "agent-prompts"],
  ["GitHub 功能庫", GithubLogo, "github-tools"],
  ["任務儲存", Star, "templates"],
  ["文件中心", FolderSimple, "files"],
  ["日程日曆", CalendarBlank, "calendar"],
];

function agentById(id) {
  return AGENTS.find((agent) => agent.id === id);
}

function statusLabel(status) {
  return { running: "AI 執行中", completed: "已完成", failed: "執行失敗" }[status] || status;
}

function dateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function apiRequest(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `服務錯誤（${response.status}）`);
  return data;
}

function StatCard({ label, value, helper, accent }) {
  return (
    <article className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className={accent ? `helper helper-${accent}` : "helper"}>{helper}</small>
    </article>
  );
}

function TaskCard({ task, onOpen, onDelete }) {
  const agent = agentById(task.assigneeId);
  const failed = task.status === "failed";
  return (
    <article className={`task-card task-${task.status}`} role="button" tabIndex="0"
      onClick={() => onOpen(task)}
      onKeyDown={(event) => { if (["Enter", " "].includes(event.key)) onOpen(task); }}>
      <div className="task-card-head">
        <div>
          <h3>{task.title}</h3>
          <p>{agent?.name} · {task.kind === "github" ? "GitHub + DeepSeek" : "DeepSeek"}</p>
        </div>
        <div className="task-card-controls">
          <span className={`status-pill ${task.status}`}>{statusLabel(task.status)}</span>
          <button onClick={(event) => { event.stopPropagation(); onDelete(task); }} aria-label={`刪除 ${task.title}`}><Trash size={14} /></button>
        </div>
      </div>
      <div className={`progress-row ${failed ? "failed" : ""}`}>
        <div className="progress-track" aria-label={failed ? `${task.title} 未完成` : `${task.title} ${task.progress}%`}>
          <span className={`progress-fill ${task.color}`} style={{ width: failed ? "0%" : `${task.progress}%` }} />
        </div>
        <span>{failed ? "未完成" : `${task.progress}%`}</span>
      </div>
    </article>
  );
}

function NewTaskModal({ open, onClose, onCreate, defaultAgent, connected }) {
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState(defaultAgent || "analytics-agent");
  const [brief, setBrief] = useState("");
  const [kind, setKind] = useState("standard");
  const [targetDate, setTargetDate] = useState("");

  useEffect(() => {
    if (open) {
      setTitle("");
      setBrief("");
      setAssigneeId(defaultAgent || "analytics-agent");
      setKind("standard");
      setTargetDate("");
    }
  }, [open, defaultAgent]);

  if (!open) return null;

  const submit = (event) => {
    event.preventDefault();
    const effectiveTitle = kind === "github" ? `GitHub ${targetDate} 新開源專案整理` : title.trim();
    if (!effectiveTitle || !connected || (kind === "github" && !targetDate)) return;
    onCreate({ title: effectiveTitle, assigneeId, brief: brief.trim(), kind, targetDate });
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="task-modal" role="dialog" aria-modal="true" aria-labelledby="new-task-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><span className="eyebrow">DEEPSEEK ASSIGNMENT</span><h2 id="new-task-title">新增真實 AI 任務</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="關閉新增任務"><X size={20} /></button>
        </div>
        <form onSubmit={submit}>
          {!connected ? <div className="form-warning"><CloudSlash size={18} />DeepSeek 尚未連線，請確認伺服器已設定金鑰。</div> : null}
          <label>
            任務類型
            <select value={kind} onChange={(event) => setKind(event.target.value)}>
              <option value="standard">一般 DeepSeek 任務</option>
              <option value="github">GitHub 新開源專案整理</option>
            </select>
          </label>
          {kind === "github" ? (
            <label className="github-date-field">
              GitHub 查詢日期
              <input autoFocus type="date" value={targetDate} max={dateInputValue()} onChange={(event) => setTargetDate(event.target.value)} required />
              <small>任務名稱會自動變成「GitHub {targetDate || "日期"} 新開源專案整理」</small>
            </label>
          ) : (
            <>
              <label>任務名稱<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="例如：整理這份合約的風險" /></label>
              <label className="reference-date-field">
                資料日期（可選）
                <input type="date" value={targetDate} onChange={(event) => setTargetDate(event.target.value)} />
                <small>可選過往或未來日期，DeepSeek 會按這個日期理解任務資料範圍。</small>
              </label>
            </>
          )}
          <label>
            指派 AI 員工
            <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}>
              {AGENTS.map((agent) => <option key={agent.id} value={agent.id}>{agent.name} · {agent.role}</option>)}
            </select>
          </label>
          <label>任務說明<textarea value={brief} onChange={(event) => setBrief(event.target.value)} placeholder="說明想要的格式、重點與用途…" rows="4" /></label>
          <div className="modal-actions">
            <button type="button" className="secondary-button" onClick={onClose}>取消</button>
            <button type="submit" className="primary-button" disabled={(kind === "github" ? !targetDate : !title.trim()) || !connected}>
              {kind === "github" ? <GithubLogo size={18} weight="fill" /> : <Sparkle size={18} weight="fill" />}
              {kind === "github" ? "抓取 GitHub 並整理" : "交給 DeepSeek"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

function ResultModal({ task, onClose, onCopy, onRetry }) {
  const scrollRef = useRef(null);
  useEffect(() => {
    if (!task) return undefined;
    const handleEscape = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose, task?.id]);

  if (!task || !["completed", "failed"].includes(task.status)) return null;
  const agent = agentById(task.assigneeId);
  const failed = task.status === "failed";
  return (
    <div className="modal-backdrop result-backdrop" role="presentation" onMouseDown={onClose}>
      <section className={`result-modal ${failed ? "is-error" : ""}`} role="dialog" aria-modal="true" aria-labelledby="result-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="modal-head">
          <div><span className="eyebrow">{failed ? "任務未完成" : task.model || "AI OFFICE RESULT"}</span><h2 id="result-title">{task.title}</h2><p>{agent?.name} · {agent?.role}</p></div>
          <button className="icon-button" onClick={onClose} aria-label="關閉結果"><X size={20} /></button>
        </div>
        <div ref={scrollRef} className="result-scroll" tabIndex="0" aria-label={failed ? "任務失敗原因" : "任務報告內容"}>
          {failed
            ? <div className="result-error" role="alert"><CloudSlash size={24} /><div><strong>這次沒有產生報告</strong><span>{task.error}</span></div></div>
            : <div className="result-content">{task.result}</div>}
        </div>
        {failed || task.result ? <div className="result-actions">
          {failed ? <button className="retry-result" onClick={() => onRetry(task)}><Play size={17} weight="fill" />重新執行</button> : null}
          {task.result ? <button className="copy-result" onClick={() => onCopy(task.result)}><Copy size={17} />複製結果</button> : null}
        </div> : null}
      </section>
    </div>
  );
}

export default function OfficeMode({ onClose, user }) {
  const [tasks, setTasks] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [activeNav, setActiveNav] = useState("home");
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [defaultAgent, setDefaultAgent] = useState("analytics-agent");
  const [toast, setToast] = useState("");
  const [paused, setPaused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [apiStatus, setApiStatus] = useState({ loading: true, configured: false, connected: false, model: "deepseek-v4-flash" });
  const motionSurfacePaused = paused || activeNav !== "home" || modalOpen || chatOpen || Boolean(selectedTask);

  useEffect(() => {
    apiRequest("/api/office/status").then((status) => setApiStatus({ ...status, loading: false }))
      .catch(() => setApiStatus((current) => ({ ...current, loading: false, connected: false })));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "officeTasks"), orderBy("createdAt", "desc"), fsLimit(100));
    return onSnapshot(q, (snap) => {
      setTasks(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => setToast("無法讀取任務紀錄"));
  }, []);

  useEffect(() => {
    const q = query(collection(db, "officeChatHistory"), orderBy("createdAt", "asc"), fsLimit(300));
    return onSnapshot(q, (snap) => {
      setChatMessages(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    }, () => {});
  }, []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  // 任務進度條的動態感覺——Firestore 只在任務建立(8%)跟完成(100%)各寫一次，
  // 中間這段本地每 1.8 秒自己往上跳，onSnapshot 不會因為這個而重新觸發
  // （沒有真的遠端變更），下一次遠端寫入（完成/失敗）到達時會直接覆蓋掉。
  useEffect(() => {
    if (paused) return undefined;
    const timer = window.setInterval(() => {
      setTasks((current) => current.map((task) => task.status === "running"
        ? { ...task, progress: Math.min(92, (task.progress || 8) + 3) }
        : task));
    }, 1800);
    return () => window.clearInterval(timer);
  }, [paused]);

  const selected = selectedAgent ? agentById(selectedAgent) : null;
  const todayKey = dateInputValue();
  const todayTasks = useMemo(() => tasks.filter((t) => String(t.createdAt || "").slice(0, 10) === todayKey), [tasks, todayKey]);
  const runningCount = tasks.filter((t) => t.status === "running").length;
  const completedTodayCount = todayTasks.filter((t) => t.status === "completed").length;

  const visibleTasks = useMemo(() => {
    const normalized = searchQuery.trim().toLowerCase();
    if (!normalized) return tasks.slice(0, 4);
    return tasks.filter((task) => {
      const agent = agentById(task.assigneeId);
      return task.title?.toLowerCase().includes(normalized) || agent?.name.toLowerCase().includes(normalized) || agent?.role.toLowerCase().includes(normalized);
    }).slice(0, 4);
  }, [tasks, searchQuery]);

  const openTaskModal = (agentId = "analytics-agent") => {
    setDefaultAgent(agentId);
    setModalOpen(true);
  };

  const enqueueSpineVisit = (visitorId, hostId, message) => {
    const visitor = AGENTS.findIndex((a) => a.id === visitorId) + 1;
    const host = AGENTS.findIndex((a) => a.id === hostId) + 1;
    if (visitor > 0 && host > 0 && visitor !== host) requestDeskVisit(visitor, host, message);
  };

  const createTask = async ({ title, assigneeId, brief, kind = "standard", targetDate = "", silent = false }) => {
    const name = agentById(assigneeId)?.name;
    const color = COLOR_CYCLE[tasks.length % COLOR_CYCLE.length];
    const docRef = await addDoc(collection(db, "officeTasks"), {
      title, assigneeId, brief: brief || "", kind, targetDate: targetDate || "",
      progress: 8, status: "running", color,
      createdAt: new Date().toISOString(), createdBy: user?.uid || null,
    });
    if (!silent) setModalOpen(false);
    setToast(kind === "github" ? `已交給 ${name}，正在抓取 GitHub 公開資料` : `已交給 ${name}，DeepSeek 執行中`);
    if (assigneeId !== "strategy-agent") enqueueSpineVisit(assigneeId, "strategy-agent", kind === "github" ? "我去整理 GitHub 新專案。" : `接收新任務：${title}`);
    try {
      const data = await apiRequest("/api/office/task", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, assigneeId, brief, kind, targetDate }),
      });
      await updateDoc(doc(db, "officeTasks", docRef.id), { progress: 100, status: "completed", result: data.result, model: data.model, completedAt: new Date().toISOString() });
      setToast(`${name} 已完成「${title}」`);
      if (assigneeId !== "strategy-agent") enqueueSpineVisit(assigneeId, "strategy-agent", `「${title}」已完成`);
      return { id: docRef.id, status: "completed", result: data.result };
    } catch (error) {
      await updateDoc(doc(db, "officeTasks", docRef.id), { progress: 0, status: "failed", error: error.message, completedAt: new Date().toISOString() });
      setToast(`任務失敗：${error.message}`);
      if (assigneeId !== "strategy-agent") enqueueSpineVisit(assigneeId, "strategy-agent", "任務需要重新處理");
      return { id: docRef.id, status: "failed", error: error.message };
    }
  };

  const sendChatMessage = async (content) => {
    const userMessage = { role: "user", content, createdAt: new Date().toISOString() };
    await addDoc(collection(db, "officeChatHistory"), userMessage);
    setChatSending(true);
    try {
      const recent = [...chatMessages, userMessage].slice(-24).map((m) => ({ role: m.role, content: m.content }));
      const data = await apiRequest("/api/office/chat", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: recent }),
      });
      const assistantRef = await addDoc(collection(db, "officeChatHistory"), {
        role: "assistant", content: data.reply, model: data.model || "", createdAt: new Date().toISOString(),
        ...(data.action ? { taskTitle: data.action.title, taskStatus: "running" } : {}),
      });
      setChatSending(false);
      if (data.action) {
        const task = await createTask({ ...data.action, silent: true });
        await updateDoc(doc(db, "officeChatHistory", assistantRef.id), { taskId: task.id, taskStatus: task.status });
      }
    } catch (error) {
      await addDoc(collection(db, "officeChatHistory"), { role: "assistant", content: `無法處理這則訊息：${error.message}`, createdAt: new Date().toISOString() });
      setChatSending(false);
    }
  };

  const openChatTask = (taskId) => {
    const task = tasks.find((item) => String(item.id) === String(taskId));
    if (task) setSelectedTask(task);
    else setToast("這個任務結果目前找不到");
  };

  const openTask = (task) => {
    if (["completed", "failed"].includes(task.status)) setSelectedTask(task);
    else setToast(`${task.title}：${statusLabel(task.status)}`);
  };

  const deleteFlowTask = async (task) => {
    if (!window.confirm(`確定刪除「${task.title}」？`)) return;
    await deleteDoc(doc(db, "officeTasks", task.id));
    setSelectedTask((current) => current?.id === task.id ? null : current);
    setToast(`已刪除「${task.title}」`);
  };

  const retryTask = (task) => {
    setSelectedTask(null);
    void createTask({ title: task.title, assigneeId: task.assigneeId, brief: task.brief || "", kind: task.kind, targetDate: task.targetDate || "" });
  };

  const copyResult = async (result) => {
    await navigator.clipboard.writeText(result);
    setToast("結果已複製");
  };

  return (
    <div className="ai-office-root" style={{ position: "relative", height: "100%", width: "100%", overflow: "hidden" }}>
      <main className="app-shell">
        <aside className="sidebar">
          <div className="brand"><span className="brand-mark">🏢</span><span>AI Office</span></div>
          <label className="search-box">
            <MagnifyingGlass size={18} />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="搜尋任務或 AI 員工…" />
          </label>
          <nav className="primary-nav" aria-label="主要導覽">
            {primaryNavItems.map(([label, Icon, id]) => {
              const active = id === "chat" ? chatOpen : activeNav === id;
              return (
                <button key={id} className={active ? "active" : ""} onClick={() => {
                  if (id === "chat") { setChatOpen((current) => !current); return; }
                  setActiveNav(id);
                }}>
                  <Icon size={20} weight={active ? "fill" : "regular"} />
                  <span>{label}</span>
                </button>
              );
            })}
          </nav>
          <nav className="primary-nav upcoming-nav" aria-label="尚未建立功能">
            <p>即將推出</p>
            {upcomingNavItems.map(([label, Icon, id]) => (
              <button key={id} className={activeNav === id ? "active" : ""} onClick={() => { setActiveNav(id); setToast(`${label}尚未建立`); }}>
                <Icon size={20} weight={activeNav === id ? "fill" : "regular"} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div style={{ flex: 1 }} />
          <button type="button" className={`local-status ${apiStatus.connected ? "connected" : "disconnected"}`}
            onClick={() => setToast(apiStatus.connected ? "DeepSeek 已連線" : "伺服器尚未設定 DEEPSEEK_API_KEY")}>
            <span><span className="status-dot" />{apiStatus.loading ? "檢查 DeepSeek…" : apiStatus.connected ? "DeepSeek 已連線" : "DeepSeek 未連線"}</span>
            {apiStatus.connected ? <CloudCheck size={17} /> : <CloudSlash size={17} />}
          </button>
        </aside>

        <section className="main-column">
          <header className="stats-grid">
            <StatCard label="今日任務" value={todayTasks.length} helper={`${runningCount} 進行中`} />
            <StatCard label="已完成" value={completedTodayCount} helper="今日完成" />
            <StatCard label="執行中" value={runningCount} helper="AI 執行中" />
            <StatCard label="AI 員工" value="6/6" helper={apiStatus.connected ? "六位員工執勤中" : "等待連線"} accent={apiStatus.connected ? "green" : undefined} />
            <article className="resource-card">
              <span>系統資源</span>
              <div><Cpu size={16} /><b>CPU</b><i><em style={{ width: "29%" }} /></i><small>29%</small></div>
              <div><HardDrives size={16} /><b>記憶體</b><i><em className="memory" style={{ width: "73%" }} /></i><small>73%</small></div>
              <div><WifiHigh size={16} /><b>模型</b><i><em className="network" style={{ width: apiStatus.connected ? "100%" : "8%" }} /></i><small>V4</small></div>
            </article>
          </header>

          {activeNav !== "home" ? (
            <section className="workspace-view" aria-label={activeNav}>
              <header className="workspace-view-head"><div><h1>即將推出</h1><p>這個功能還在搬遷計劃中，敬請期待。</p></div></header>
            </section>
          ) : (
            <section className="office-stage">
              <SpineOfficeCanvas tasks={tasks} paused={motionSurfacePaused} onAgentSelect={setSelectedAgent} />
              <div className="stage-heading"><span><UsersThree size={17} weight="fill" />我的 AI 團隊</span><small>{paused ? "全部已暫停" : apiStatus.connected ? "DeepSeek V4 執勤中" : "等待模型連線"}</small></div>

              {selected ? (
                <aside className="agent-popover" onClick={(event) => event.stopPropagation()}>
                  <button onClick={() => setSelectedAgent(null)} aria-label="關閉員工資料"><X size={16} /></button>
                  <span className="eyebrow">AI EMPLOYEE</span>
                  <h3>{selected.name} · {selected.role}</h3>
                  <p>{selected.specialty}</p>
                  <div><span className="status-dot" />{apiStatus.connected ? "DeepSeek V4 已連線" : "模型未連線"}</div>
                  <button className="assign-button" onClick={() => openTaskModal(selected.id)}><Plus size={16} />指派真實任務</button>
                </aside>
              ) : null}

              <div className="control-dock" aria-label="辦公室控制列">
                <button className={paused ? "active" : ""} onClick={(event) => { event.stopPropagation(); setPaused(true); setToast("動畫已暫停；正在執行的 AI 任務會完成本次請求"); }}><Pause size={18} weight="fill" /><span>全部暫停</span></button>
                <button className={!paused ? "active" : ""} onClick={(event) => { event.stopPropagation(); setPaused(false); setToast("已恢復"); }}><Play size={18} weight="fill" /><span>全部繼續</span></button>
                <button className="dock-primary" onClick={(event) => { event.stopPropagation(); openTaskModal(); }}><Plus size={19} weight="bold" /><span>新增任務</span></button>
              </div>
            </section>
          )}
          <AiChatPanel open={chatOpen} messages={chatMessages} sending={chatSending} connected={apiStatus.connected}
            onClose={() => setChatOpen(false)} onSend={sendChatMessage} onOpenTask={openChatTask} />
        </section>

        <aside className="right-rail">
          <div className="rail-title"><h2>目前任務流</h2><ListChecks size={22} /></div>
          <div className={`api-connection ${apiStatus.connected ? "online" : "offline"}`}>
            {apiStatus.connected ? <CloudCheck size={19} weight="fill" /> : <CloudSlash size={19} />}
            <div><strong>{apiStatus.connected ? "DeepSeek 已連線" : "DeepSeek 未連線"}</strong><small>{apiStatus.model}</small></div>
          </div>
          <div className="task-list">
            {visibleTasks.length ? visibleTasks.map((task) => <TaskCard key={task.id} task={task} onOpen={openTask} onDelete={deleteFlowTask} />)
              : <div className="empty-state"><CheckCircle size={28} /><p>還沒有任務，按下方新增第一個真實任務</p></div>}
          </div>
          <section className="quick-section">
            <h3>快捷工具</h3>
            <div className="quick-grid">
              <button onClick={() => openTaskModal()}><Plus size={22} /><span>新增任務</span></button>
              <button onClick={() => { setDefaultAgent("intelligence-agent"); setModalOpen(true); }}><GithubLogo size={22} weight="fill" /><span>GitHub 整理</span></button>
            </div>
          </section>
        </aside>

        <NewTaskModal open={modalOpen} onClose={() => setModalOpen(false)} onCreate={createTask} defaultAgent={defaultAgent} connected={apiStatus.connected} />
        <ResultModal task={selectedTask} onClose={() => setSelectedTask(null)} onCopy={copyResult} onRetry={retryTask} />
        {toast ? <div className="toast" role="status"><CheckCircle size={18} weight="fill" />{toast}</div> : null}
      </main>
      {onClose && (
        <button onClick={onClose} aria-label="離開 AI Office"
          style={{
            position: "absolute", top: 16, right: 16, zIndex: 500,
            width: 40, height: 40, borderRadius: "50%", border: "1px solid rgba(0,0,0,0.1)",
            background: "rgba(255,255,255,0.92)", color: "#333", fontSize: 18, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 4px 16px rgba(0,0,0,0.18)",
          }}>
          ✕
        </button>
      )}
    </div>
  );
}
