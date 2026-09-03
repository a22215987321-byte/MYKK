import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import dynamic from "next/dynamic";
import { marked } from "marked";
import DOMPurify from "dompurify";

// 所見即所得編輯器體積不小（ProseMirror），而且只有真的切到「編輯」才需要，
// 所以延遲載入，不讓它拖慢面板本身打開的速度。
const RichTextEditor = dynamic(() => import("./RichTextEditor"), {
  ssr: false,
  loading: () => <div className="pf-blank" style={{ padding: 24 }}>載入編輯器…</div>,
});
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import useIsMobile from "../lib/useIsMobile";
import { toast } from "../lib/toast";
import {
  Folder, FolderOpen, FileText, ChevronRight, ChevronDown, ChevronLeft,
  Search, X, Trash2, Eye, Pencil, Info, FolderPlus,
} from "lucide-react";

// 「專案檔案庫」——參考 Claude 專案裡 Files 的 UI/UX。這是給「人」讀的，
// 不是餵給 AI 的 context：右上角只有閱讀／編輯切換跟關閉，左欄負責新增和
// 刪除文件。
//
// 資料模型從第一天就帶 projectId，雖然 EvonChat 現在還沒有「專案」這個
// 概念（全站搜過 project／專案／workspace，命中的都是 GitHub 熱門的「新
// 專案」跟 office 模式的 class 名，沒有真的專案系統）。先固定寫 "default"，
// 等之後真的做專案管理時不用搬資料。
export const DEFAULT_PROJECT_ID = "default";

// 專案容量。文字內容直接存在 Firestore 文件裡（單一文件上限 1MB），所以
// 單檔壓在 512KB、整個專案 5MB，離 Firestore 的硬限制有安全距離。
export const PROJECT_CAPACITY_BYTES = 5 * 1024 * 1024;
const FILE_MAX_BYTES = 512 * 1024;
const TEXT_EXT = /\.(md|markdown|txt|json|csv|log|ya?ml)$/i;

const LEFT_W = "37%";
// 每個使用者最多 5 個資料夾。資料夾跟檔案存在同一個 projectFiles collection，
// 用 kind:"folder" 區分——這樣不用為它另開一個 collection、也就不用再改一次
// Firestore 規則。folder 文件一樣帶 size:0，才會通過規則裡的 size 檢查。
const MAX_FOLDERS = 5;

// 手動拖曳排序後的順序存在 order 欄位。還沒被手動排過的沿用「建立時間新到舊」，
// 兩者混在一起時有 order 的排前面（使用者明確表達過的意圖優先）。
function sortRows(rows) {
  return rows.slice().sort((a, b) => {
    const ao = typeof a.order === "number" ? a.order : null;
    const bo = typeof b.order === "number" ? b.order : null;
    if (ao !== null && bo !== null) return ao - bo;
    if (ao !== null) return -1;
    if (bo !== null) return 1;
    return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  });
}

function fmtSize(n) {
  if (!n) return "0 KB";
  if (n < 1024) return n + " B";
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + " KB";
  return (n / 1024 / 1024).toFixed(1) + " MB";
}

function fmtRelative(ts) {
  if (!ts) return "剛剛";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "剛剛";
  if (s < 3600) return Math.floor(s / 60) + " 分鐘前";
  if (s < 86400) return Math.floor(s / 3600) + " 小時前";
  if (s < 86400 * 30) return Math.floor(s / 86400) + " 天前";
  if (s < 86400 * 365) return Math.floor(s / 86400 / 30) + " 個月前";
  return Math.floor(s / 86400 / 365) + " 年前";
}

function extOf(name) {
  const i = name.lastIndexOf(".");
  return i > 0 ? name.slice(i + 1).toUpperCase() : "TXT";
}

// metadata 永遠是「副檔名大寫 · 檔案大小 · 相對時間」串成一行，不換行、
// 太長就用 … 截斷——三段各自一列會讓列表變成一片資訊牆。
function metaOf(f) {
  return [extOf(f.name), fmtSize(f.size), fmtRelative(f.updatedAt || f.createdAt)].join(" · ");
}

// 文件格式：新檔一律存 HTML（format:"html"）。沒有 format 欄位的是換成富文本
// 編輯器之前存的 Markdown，打開時用 marked 轉成 HTML 就地升級，存檔時補上
// format:"html"，所以不需要另外跑一次資料轉檔。
function isHtmlDoc(f) {
  return f?.format === "html";
}

// 讀出來要餵進編輯器／預覽的 HTML。舊的 Markdown 檔在這裡轉。
function toHtml(f) {
  const raw = f?.content || "";
  if (!raw.trim()) return "";
  if (isHtmlDoc(f)) return raw;
  try { return marked.parse(raw, { async: false, breaks: true }); }
  catch { return raw; }
}

// 內容是編輯器自己產生的，但仍然過一次消毒——萬一有人手動改資料庫、或未來
// 開放匯入 HTML，這裡是最後一道防線。SSR 時 DOMPurify 沒有 window 可用，
// 直接回傳原字串（伺服器端不會渲染這個面板，見上面的 ssr:false）。
function cleanHtml(html) {
  if (typeof window === "undefined") return html;
  try { return DOMPurify.sanitize(html, { USE_PROFILES: { html: true } }); }
  catch { return html; }
}

function byteLen(text) {
  try { return new Blob([text]).size; } catch { return text.length; }
}

// 檔名允許寫成「資料夾/檔名.md」，斜線前面那段就是資料夾。這樣不用另外做
// 一整套建立資料夾／搬移檔案的 UI，資料夾就是「有檔案在裡面」才存在。
function splitPath(raw) {
  const s = raw.trim().replace(/^\/+/, "").replace(/\/+$/, "");
  const i = s.lastIndexOf("/");
  if (i < 0) return { folder: "", name: s };
  return { folder: s.slice(0, i).trim(), name: s.slice(i + 1).trim() };
}

// 就地改名用的輸入框。抽出來共用，檔案列和資料夾列的改名長得一樣。
function RenameInput({ value, onCommit, onCancel }) {
  const [v, setV] = useState(value);
  return (
    <input className="pf-rename" autoFocus value={v}
      onChange={(e) => setV(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") onCommit(v);
        if (e.key === "Escape") onCancel();
      }}
      onBlur={() => onCommit(v)} />
  );
}

function FileRow({
  file, indent, selected, onOpen, onDelete, onContextMenu,
  renaming, onCommitRename, onCancelRename,
  dragging, dropEdge, onDragStart, onDragEnd, onDragOverRow, onDropRow,
}) {
  return (
    <div
      className={"pf-row pf-file"
        + (selected ? " sel" : "")
        + (dragging ? " dragging" : "")
        + (dropEdge === "top" ? " drop-top" : dropEdge === "bottom" ? " drop-bottom" : "")}
      style={{ paddingLeft: indent }}
      draggable={!renaming}
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; onDragStart(file); }}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOverRow(e, file)}
      onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onDropRow(file); }}
      onContextMenu={(e) => onContextMenu(e, file)}
      onClick={() => { if (!renaming) onOpen(file); }}>
      <FileText size={17} strokeWidth={1.6} className="pf-ic" />
      <div className="pf-rowtext">
        {renaming ? (
          <RenameInput value={file.name} onCommit={onCommitRename} onCancel={onCancelRename} />
        ) : (
          <>
            <span className="pf-name">{file.name}</span>
            <span className="pf-meta">{metaOf(file)}</span>
          </>
        )}
      </div>
      {!renaming && (
        <button className="pf-del" title="刪除"
          onClick={(e) => { e.stopPropagation(); onDelete(file); }}>
          <Trash2 size={15} strokeWidth={1.6} />
        </button>
      )}
    </div>
  );
}

export default function ProjectFilesPanel({ user, projectId = DEFAULT_PROJECT_ID, onClose }) {
  const isMobile = useIsMobile();
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [mode, setMode] = useState("read");
  const [draft, setDraft] = useState("");
  const [saveState, setSaveState] = useState("idle");
  const [expanded, setExpanded] = useState(() => new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [folderDocs, setFolderDocs] = useState([]);
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [renamingId, setRenamingId] = useState(null);
  // 右鍵選單。item 可能是檔案也可能是資料夾，靠 kind 分辨。
  const [ctxMenu, setCtxMenu] = useState(null);
  // 拖曳中的檔案，以及目前游標落在哪一列的哪一半（決定插在前面還後面）。
  const [dragItem, setDragItem] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { id, edge } | { folder }

  const pickerRef = useRef(null);
  const timerRef = useRef(null);
  const pendingRef = useRef(null);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    // 兩個 equality filter 不用建複合索引（Firestore 會合併單欄位索引），
    // 但只要再加 orderBy 就需要——所以排序放在 client 端做，功能不會卡在
    // 「索引還在建」的狀態。
    const qy = query(
      collection(db, "projectFiles"),
      where("uid", "==", user.uid),
      where("projectId", "==", projectId),
    );
    return onSnapshot(qy, (snap) => {
      const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // 資料夾跟檔案存在同一個 collection，這裡拆開。排序統一走 sortRows
      // （手動 order 優先，其餘照建立時間新到舊）。
      setFolderDocs(sortRows(rows.filter((r) => r.kind === "folder")));
      setFiles(sortRows(rows.filter((r) => r.kind !== "folder")));
      setLoading(false);
    }, () => { setLoading(false); toast("檔案載入失敗"); });
  }, [user?.uid, projectId]);

  const selected = useMemo(() => files.find((f) => f.id === selectedId) || null, [files, selectedId]);
  const wide = !!selected;

  // 把還沒寫進去的編輯內容立刻送出。切換檔案跟關閉面板都要先叫這個，不然
  // debounce 還沒到期的那一版就這樣沒了。
  const flushSave = useCallback(async () => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
    const p = pendingRef.current;
    pendingRef.current = null;
    if (!p) return;
    try {
      await updateDoc(doc(db, "projectFiles", p.id), {
        content: p.text, size: byteLen(p.text),
        // 一存檔就標記成 HTML——舊的 Markdown 檔被編輯過一次之後就完成升級。
        format: "html",
        updatedAt: serverTimestamp(),
      });
      setSaveState("saved");
    } catch { setSaveState("idle"); toast("儲存失敗"); }
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  function onDraftChange(text) {
    setDraft(text);
    if (!selectedId) return;
    pendingRef.current = { id: selectedId, text };
    setSaveState("saving");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(flushSave, 700);
  }

  async function openFile(f) {
    await flushSave();
    setSelectedId(f.id);
    // 舊的 Markdown 檔在這裡轉成 HTML；已經是 HTML 的原樣帶入。
    setDraft(toHtml(f));
    setMode("read");
    setSaveState("idle");
  }

  async function handleClose() {
    await flushSave();
    onClose?.();
  }

  function toggleFolder(name) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return files;
    return files.filter((f) =>
      f.name.toLowerCase().includes(needle) || (f.folder || "").toLowerCase().includes(needle));
  }, [files, q]);

  const tree = useMemo(() => {
    const byName = new Map();
    // 先放進「真的被建立出來的」資料夾，這樣空資料夾也會顯示。
    for (const d of folderDocs) byName.set(d.name, { doc: d, items: [] });
    const root = [];
    for (const f of filtered) {
      if (f.folder) {
        // 舊資料可能有「資料夾/檔名」推導出來、但沒有對應 folder 文件的情況，
        // 這種補一個沒有 doc 的項目進去，不會平白消失。
        if (!byName.has(f.folder)) byName.set(f.folder, { doc: null, items: [] });
        byName.get(f.folder).items.push(f);
      } else root.push(f);
    }
    const needle = q.trim();
    const entries = [...byName.entries()]
      // 搜尋時把完全沒有命中檔案的資料夾收起來，不要留一排空殼干擾結果
      .filter(([name, v]) => !needle || v.items.length > 0 || name.toLowerCase().includes(needle.toLowerCase()));
    return { folders: entries, root };
  }, [filtered, folderDocs, q]);

  const usedBytes = files.reduce((n, f) => n + (f.size || 0), 0);
  const pct = Math.min(100, (usedBytes / PROJECT_CAPACITY_BYTES) * 100);
  const pctLabel = pct > 0 && pct < 1 ? "<1" : String(Math.round(pct));

  // ── 資料夾 ──
  async function createFolder(raw) {
    const name = raw.trim().replace(/\//g, "");
    setCreatingFolder(false);
    setNewFolderName("");
    if (!name) return;
    if (folderDocs.length >= MAX_FOLDERS) { toast("資料夾最多 " + MAX_FOLDERS + " 個"); return; }
    if (folderDocs.some((d) => d.name === name)) { toast("已經有同名資料夾"); return; }
    try {
      await addDoc(collection(db, "projectFiles"), {
        uid: user.uid, projectId, kind: "folder", name,
        // size:0 是必要的——Firestore 規則會檢查 size 是 int，資料夾也要有
        size: 0,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      setExpanded((prev) => new Set(prev).add(name));
    } catch { toast("建立資料夾失敗"); }
  }

  async function removeFolder(folder) {
    const inside = files.filter((f) => f.folder === folder.name);
    const msg = inside.length
      ? "刪除資料夾「" + folder.name + "」？裡面的 " + inside.length + " 個檔案會移回最外層，不會被刪除。"
      : "刪除資料夾「" + folder.name + "」？";
    if (!window.confirm(msg)) return;
    try {
      // 先把檔案搬出來再刪資料夾，順序反過來的話中途失敗會留下孤兒檔案
      await Promise.all(inside.map((f) =>
        updateDoc(doc(db, "projectFiles", f.id), { folder: "", updatedAt: serverTimestamp() })));
      await deleteDoc(doc(db, "projectFiles", folder.id));
    } catch { toast("刪除資料夾失敗"); }
  }

  // ── 重新命名（檔案與資料夾共用）──
  async function commitRename(item, raw) {
    const next = raw.trim();
    setRenamingId(null);
    if (!next || next === item.name) return;
    try {
      if (item.kind === "folder") {
        if (folderDocs.some((d) => d.name === next && d.id !== item.id)) { toast("已經有同名資料夾"); return; }
        await updateDoc(doc(db, "projectFiles", item.id), { name: next, updatedAt: serverTimestamp() });
        // 資料夾改名之後，裡面每個檔案的 folder 欄位要跟著改，否則它們會變孤兒
        await Promise.all(files.filter((f) => f.folder === item.name).map((f) =>
          updateDoc(doc(db, "projectFiles", f.id), { folder: next, updatedAt: serverTimestamp() })));
        setExpanded((prev) => {
          const nx = new Set(prev);
          if (nx.delete(item.name)) nx.add(next);
          return nx;
        });
      } else {
        await updateDoc(doc(db, "projectFiles", item.id), { name: next.replace(/\//g, ""), updatedAt: serverTimestamp() });
      }
    } catch { toast("重新命名失敗"); }
  }

  // ── 拖曳：搬進資料夾 ／ 調整順序 ──
  async function moveToFolder(file, folderName) {
    if ((file.folder || "") === folderName) return;
    try {
      await updateDoc(doc(db, "projectFiles", file.id), {
        folder: folderName, updatedAt: serverTimestamp(),
      });
      if (folderName) setExpanded((prev) => new Set(prev).add(folderName));
    } catch { toast("移動失敗"); }
  }

  // 把 list 重新排好之後，整串重寫 order（0,1,2…）。清單都很短，一次寫完
  // 比只改被拖動的那一個穩——不用擔心 order 值互相打架或出現小數。
  async function persistOrder(list) {
    try {
      await Promise.all(list.map((f, i) =>
        updateDoc(doc(db, "projectFiles", f.id), { order: i, updatedAt: serverTimestamp() })));
    } catch { toast("排序儲存失敗"); }
  }

  async function reorderWithin(list, moving, targetId, edge) {
    const from = list.findIndex((f) => f.id === moving.id);
    let to = list.findIndex((f) => f.id === targetId);
    if (from < 0 || to < 0 || moving.id === targetId) return;
    const next = list.slice();
    next.splice(from, 1);
    if (from < to) to -= 1;
    if (edge === "bottom") to += 1;
    next.splice(to, 0, moving);
    await persistOrder(next);
  }

  function onDragOverRow(e, row) {
    if (!dragItem || dragItem.id === row.id) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const r = e.currentTarget.getBoundingClientRect();
    const edge = (e.clientY - r.top) < r.height / 2 ? "top" : "bottom";
    setDropTarget((prev) => (prev && prev.id === row.id && prev.edge === edge)
      ? prev : { id: row.id, edge });
  }

  async function onDropRow(row) {
    const moving = dragItem;
    const target = dropTarget;
    setDragItem(null);
    setDropTarget(null);
    if (!moving || !target || moving.id === row.id) return;
    // 跨資料夾拖曳：先歸位到目標所在的資料夾，再照落點排序
    if ((moving.folder || "") !== (row.folder || "")) {
      await moveToFolder(moving, row.folder || "");
    }
    const siblings = (row.folder ? tree.folders.find(([n]) => n === row.folder)?.[1].items : tree.root) || [];
    // 跨資料夾拖進來時 moving 還不在這串 siblings 裡，先補進去再排
    const list = siblings.some((f) => f.id === moving.id) ? siblings : [moving, ...siblings];
    await reorderWithin(list, moving, row.id, target.edge);
  }

  async function createDoc(rawPath, content) {
    const { folder, name } = splitPath(rawPath);
    if (!name) { toast("請輸入檔名"); return null; }
    const size = byteLen(content);
    if (usedBytes + size > PROJECT_CAPACITY_BYTES) { toast("已達專案容量上限"); return null; }
    try {
      const ref = await addDoc(collection(db, "projectFiles"), {
        // 面板裡新建的檔案一律是 HTML 格式（編輯器產出的就是 HTML）。
        uid: user.uid, projectId, name, folder, content, size, format: "html",
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      if (folder) setExpanded((prev) => new Set(prev).add(folder));
      return ref.id;
    } catch { toast("新增失敗"); return null; }
  }

  async function submitNew() {
    const raw = newName.trim();
    setCreating(false);
    setNewName("");
    if (!raw) return;
    const path = /\.[a-z0-9]+$/i.test(raw) ? raw : raw + ".md";
    const id = await createDoc(path, "");
    if (id) { setSelectedId(id); setDraft(""); setMode("edit"); }
  }

  async function onPick(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    let running = usedBytes;
    for (const file of picked) {
      if (!TEXT_EXT.test(file.name)) { toast(file.name + "：只支援文字檔"); continue; }
      if (file.size > FILE_MAX_BYTES) { toast(file.name + "：單檔上限 512KB"); continue; }
      if (running + file.size > PROJECT_CAPACITY_BYTES) { toast("已達專案容量上限"); break; }
      const content = await file.text();
      const size = byteLen(content);
      try {
        await addDoc(collection(db, "projectFiles"), {
          // 上傳進來的是 .md/.txt/.json 這類純文字，刻意不標 format——
          // 打開時 toHtml 會用 marked 轉換，第一次編輯存檔才升級成 html。
          uid: user.uid, projectId, name: file.name, folder: "", content, size,
          createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
        });
        running += size;
      } catch { toast(file.name + "：新增失敗"); }
    }
  }

  async function removeFile(f) {
    if (!window.confirm("刪除「" + f.name + "」？此動作無法復原。")) return;
    if (pendingRef.current?.id === f.id) {
      if (timerRef.current) clearTimeout(timerRef.current);
      pendingRef.current = null;
    }
    try {
      await deleteDoc(doc(db, "projectFiles", f.id));
      if (selectedId === f.id) setSelectedId(null);
    } catch { toast("刪除失敗"); }
  }

  const isEmpty = !loading && filtered.length === 0 && !creating;

  return (
    <div className="pf-overlay"
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}>
      <div className={"pf-panel" + (isMobile && wide ? " pf-m-preview" : "")}
        style={{ width: wide ? "min(90vw, 1180px)" : "min(92vw, 640px)" }}>

        <div className="pf-titlebar">
          <div className="pf-tb-left"
            style={{ width: wide ? LEFT_W : "100%", borderRight: wide ? "1px solid var(--border-soft)" : "none" }}>
            <div className="pf-title">Files</div>
            <div className="pf-spacer" />
            <button className="pf-iconbtn" title="搜尋"
              onClick={() => { setSearchOpen((v) => !v); if (searchOpen) setQ(""); }}>
              <Search size={18} strokeWidth={1.6} />
            </button>
            <button className="pf-textbtn" onClick={() => { setCreating(true); setNewName(""); }}>Add</button>
            <button className="pf-iconbtn" title={folderDocs.length >= MAX_FOLDERS ? ("資料夾已達上限 " + MAX_FOLDERS + " 個") : "新增資料夾"}
              disabled={folderDocs.length >= MAX_FOLDERS}
              onClick={() => { setCreatingFolder(true); setNewFolderName(""); }}>
              <FolderPlus size={18} strokeWidth={1.6} />
            </button>
            <button className="pf-textbtn pf-upload" onClick={() => pickerRef.current?.click()}>上傳</button>
            {!wide && (
              <button className="pf-iconbtn" title="關閉" onClick={handleClose}>
                <X size={18} strokeWidth={1.6} />
              </button>
            )}
          </div>

          {wide && (
            <div className="pf-tb-right">
              {/* 手機版一次只放得下一欄，選了檔案就把列表換成預覽，所以需要一顆
                  返回鍵回到列表。桌面版兩欄同時在，不需要，故只在手機版渲染。 */}
              {isMobile && (
                <button className="pf-iconbtn" title="返回列表"
                  onClick={async () => { await flushSave(); setSelectedId(null); }}>
                  <ChevronLeft size={20} strokeWidth={1.8} />
                </button>
              )}
              <div className="pf-tb-file">
                <div className="pf-tb-name">{selected.name}</div>
                <div className="pf-meta">{metaOf(selected)}</div>
              </div>
              <div className="pf-spacer" />
              {saveState !== "idle" && (
                <span className="pf-savestate">{saveState === "saving" ? "儲存中…" : "已儲存"}</span>
              )}
              <div className="pf-seg">
                <button className={mode === "read" ? "on" : ""}
                  onClick={() => { setMode("read"); flushSave(); }}>
                  <Eye size={15} strokeWidth={1.7} />閱讀
                </button>
                <button className={mode === "edit" ? "on" : ""} onClick={() => setMode("edit")}>
                  <Pencil size={15} strokeWidth={1.7} />編輯
                </button>
              </div>
              <button className="pf-iconbtn" title="關閉" onClick={handleClose}>
                <X size={18} strokeWidth={1.6} />
              </button>
            </div>
          )}
        </div>

        <div className="pf-body">
          <div className="pf-left"
            style={{ width: wide ? LEFT_W : "100%", borderRight: wide ? "1px solid var(--border-soft)" : "none" }}>
            {searchOpen && (
              <div className="pf-searchrow">
                <Search size={15} strokeWidth={1.6} />
                <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜尋檔案" />
              </div>
            )}

            <div className="pf-list">
              {creating && (
                <div className="pf-row pf-file pf-newrow">
                  <FileText size={17} strokeWidth={1.6} className="pf-ic" />
                  <input autoFocus value={newName} placeholder="檔名，或「資料夾/檔名.md」"
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") submitNew();
                      if (e.key === "Escape") { setCreating(false); setNewName(""); }
                    }}
                    onBlur={submitNew} />
                </div>
              )}

              {creatingFolder && (
                <div className="pf-row pf-folder pf-newrow">
                  <Folder size={17} strokeWidth={1.6} className="pf-ic" />
                  <input autoFocus value={newFolderName} placeholder="資料夾名稱"
                    onChange={(e) => setNewFolderName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createFolder(newFolderName);
                      if (e.key === "Escape") { setCreatingFolder(false); setNewFolderName(""); }
                    }}
                    onBlur={() => createFolder(newFolderName)} />
                </div>
              )}

              {tree.folders.map(([name, entry]) => {
                const open = expanded.has(name);
                const items = entry.items;
                const fdoc = entry.doc;
                const isDropTarget = dropTarget?.folder === name;
                return (
                  <div key={"d:" + name}>
                    <div
                      className={"pf-row pf-folder" + (isDropTarget ? " drop-in" : "")}
                      onClick={() => { if (renamingId !== fdoc?.id) toggleFolder(name); }}
                      onContextMenu={(e) => {
                        if (!fdoc) return;
                        e.preventDefault();
                        setCtxMenu({ x: e.clientX, y: e.clientY, item: fdoc });
                      }}
                      onDragOver={(e) => {
                        if (!dragItem) return;
                        e.preventDefault();
                        e.dataTransfer.dropEffect = "move";
                        setDropTarget((prev) => (prev && prev.folder === name) ? prev : { folder: name });
                      }}
                      onDragLeave={() => setDropTarget((prev) => (prev?.folder === name ? null : prev))}
                      onDrop={async (e) => {
                        e.preventDefault(); e.stopPropagation();
                        const moving = dragItem;
                        setDragItem(null); setDropTarget(null);
                        if (moving) await moveToFolder(moving, name);
                      }}>
                      {open
                        ? <FolderOpen size={17} strokeWidth={1.6} className="pf-ic" />
                        : <Folder size={17} strokeWidth={1.6} className="pf-ic" />}
                      <div className="pf-rowtext">
                        {renamingId === fdoc?.id ? (
                          <RenameInput value={name}
                            onCommit={(v) => commitRename(fdoc, v)}
                            onCancel={() => setRenamingId(null)} />
                        ) : (
                          <>
                            <span className="pf-name">{name}</span>
                            <span className="pf-meta">{items.length} 個項目</span>
                          </>
                        )}
                      </div>
                      {renamingId !== fdoc?.id && (open
                        ? <ChevronDown size={16} strokeWidth={1.6} className="pf-chev" />
                        : <ChevronRight size={16} strokeWidth={1.6} className="pf-chev" />)}
                    </div>
                    {open && items.map((f, i) => {
                      const prev = items[i - 1];
                      const sep = i > 0 && f.id !== selectedId && prev.id !== selectedId;
                      return (
                        <div key={f.id}>
                          {sep && <div className="pf-sep" />}
                          <FileRow file={f} indent={36} selected={f.id === selectedId}
                            onOpen={openFile} onDelete={removeFile}
                            onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, item: f }); }}
                            renaming={renamingId === f.id}
                            onCommitRename={(v) => commitRename(f, v)}
                            onCancelRename={() => setRenamingId(null)}
                            dragging={dragItem?.id === f.id}
                            dropEdge={dropTarget?.id === f.id ? dropTarget.edge : null}
                            onDragStart={setDragItem}
                            onDragEnd={() => { setDragItem(null); setDropTarget(null); }}
                            onDragOverRow={onDragOverRow}
                            onDropRow={onDropRow} />
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              {tree.root.map((f, i) => {
                const prev = tree.root[i - 1];
                const sep = i > 0 && f.id !== selectedId && prev.id !== selectedId;
                return (
                  <div key={f.id}>
                    {sep && <div className="pf-sep" />}
                    <FileRow file={f} indent={12} selected={f.id === selectedId}
                      onOpen={openFile} onDelete={removeFile}
                      onContextMenu={(e) => { e.preventDefault(); setCtxMenu({ x: e.clientX, y: e.clientY, item: f }); }}
                      renaming={renamingId === f.id}
                      onCommitRename={(v) => commitRename(f, v)}
                      onCancelRename={() => setRenamingId(null)}
                      dragging={dragItem?.id === f.id}
                      dropEdge={dropTarget?.id === f.id ? dropTarget.edge : null}
                      onDragStart={setDragItem}
                      onDragEnd={() => { setDragItem(null); setDropTarget(null); }}
                      onDragOverRow={onDragOverRow}
                      onDropRow={onDropRow} />
                  </div>
                );
              })}

              {loading && <div className="pf-empty">載入中…</div>}
              {isEmpty && (
                <div className="pf-empty">
                  {q.trim() ? "找不到符合的檔案" : "還沒有文件——按右上角 Add 新增，或「上傳」帶入文字檔"}
                </div>
              )}
            </div>

            <div className="pf-footer">
              <div className="pf-bar"><div className="pf-bar-fill" style={{ width: pct + "%" }} /></div>
              <div className="pf-cap">
                {files.length} 個檔案 · 已使用專案容量 {pctLabel}%
                <Info size={13} strokeWidth={1.7} />
              </div>
            </div>
          </div>

          {wide && (
            <div className="pf-right">
              {mode === "read" ? (
                <div className="pf-doc">
                  {(() => {
                    // 編輯中的內容以 draft 為準，這樣切回閱讀模式立刻看到剛打的字，
                    // 不用等 Firestore 那一趟回來。
                    const body = (selectedId === selected.id && draft) ? draft : toHtml(selected);
                    if (!body.trim()) {
                      return <p className="pf-blank">這份文件還是空的——切到「編輯」開始寫。</p>;
                    }
                    // 新格式是 HTML，直接渲染；還沒被編輯過的舊 Markdown 檔
                    // toHtml 已經轉好了，所以這裡一律走 HTML 這條路。
                    return <div dangerouslySetInnerHTML={{ __html: cleanHtml(body) }} />;
                  })()}
                </div>
              ) : (
                <RichTextEditor value={draft}
                  onChange={onDraftChange}
                  onBlur={flushSave} />
              )}
            </div>
          )}
        </div>
      </div>

      {ctxMenu && (
        <>
          {/* 透明遮罩：點任何地方（包含右鍵）都關掉選單，不用另外掛
              document 層級的事件監聽 */}
          <div className="pf-ctx-mask"
            onMouseDown={() => setCtxMenu(null)}
            onContextMenu={(e) => { e.preventDefault(); setCtxMenu(null); }} />
          <div className="pf-ctx" style={{ left: ctxMenu.x, top: ctxMenu.y }}>
            <button onClick={() => { setRenamingId(ctxMenu.item.id); setCtxMenu(null); }}>
              <Pencil size={14} strokeWidth={1.7} />重新命名
            </button>
            {ctxMenu.item.kind !== "folder" && ctxMenu.item.folder && (
              <button onClick={() => { const it = ctxMenu.item; setCtxMenu(null); moveToFolder(it, ""); }}>
                <Folder size={14} strokeWidth={1.7} />移出資料夾
              </button>
            )}
            <button className="danger"
              onClick={() => {
                const it = ctxMenu.item;
                setCtxMenu(null);
                if (it.kind === "folder") removeFolder(it); else removeFile(it);
              }}>
              <Trash2 size={14} strokeWidth={1.7} />刪除
            </button>
          </div>
        </>
      )}

      <input ref={pickerRef} type="file" multiple hidden
        accept=".md,.markdown,.txt,.json,.csv,.log,.yml,.yaml" onChange={onPick} />

      <style>{`
        .pf-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex;
          align-items: center; justify-content: center; z-index: 620; padding: 20px; }
        .pf-panel { background: var(--panel); border: 1px solid var(--border);
          border-radius: var(--radius-lg); box-shadow: 0 24px 60px rgba(0,0,0,0.28);
          display: flex; flex-direction: column; overflow: hidden;
          height: min(86vh, 820px); transition: width 0.22s ease; }

        .pf-titlebar { display: flex; align-items: stretch; height: 66px; flex-shrink: 0;
          border-bottom: 1px solid var(--border-soft); }
        .pf-tb-left { display: flex; align-items: center; gap: 4px; padding: 0 12px 0 20px;
          box-sizing: border-box; flex-shrink: 0; }
        .pf-tb-right { flex: 1; min-width: 0; display: flex; align-items: center; gap: 10px;
          padding: 0 16px 0 22px; }
        .pf-spacer { flex: 1; min-width: 8px; }
        .pf-title { font-size: 30px; font-weight: 700; letter-spacing: -0.01em; color: var(--text); }
        .pf-tb-file { min-width: 0; display: flex; flex-direction: column; gap: 2px; }
        .pf-tb-name { font-weight: 700; font-size: 15px; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

        .pf-iconbtn { background: none; border: none; color: var(--text-muted); cursor: pointer;
          padding: 7px; border-radius: 9px; display: flex; align-items: center; flex-shrink: 0; }
        .pf-iconbtn:hover { background: var(--panel-hover); color: var(--text); }
        .pf-textbtn { background: none; border: none; color: var(--text); cursor: pointer;
          font-size: 14px; font-weight: 600; padding: 7px 10px; border-radius: 9px; flex-shrink: 0; }
        .pf-textbtn:hover { background: var(--panel-hover); }
        .pf-upload { color: var(--text-muted); font-weight: 500; }

        .pf-savestate { font-size: 12px; color: var(--text-faint); flex-shrink: 0; }
        .pf-seg { display: flex; gap: 2px; background: var(--panel-alt); padding: 3px;
          border-radius: 10px; flex-shrink: 0; }
        .pf-seg button { display: flex; align-items: center; gap: 5px; border: none;
          background: none; color: var(--text-muted); font-size: 13px; font-weight: 600;
          padding: 5px 11px; border-radius: 8px; cursor: pointer; }
        .pf-seg button.on { background: var(--panel); color: var(--text);
          box-shadow: 0 1px 3px rgba(0,0,0,0.12); }

        .pf-body { flex: 1; min-height: 0; display: flex; }
        .pf-left { display: flex; flex-direction: column; min-width: 0; box-sizing: border-box;
          flex-shrink: 0; }
        .pf-searchrow { display: flex; align-items: center; gap: 8px; padding: 8px 14px;
          color: var(--text-faint); border-bottom: 1px solid var(--border-soft); }
        .pf-searchrow input { flex: 1; background: none; border: none; outline: none;
          color: var(--text); font-size: 14px; }

        .pf-list { flex: 1; overflow-y: auto; overflow-x: hidden; padding: 8px; }

        .pf-row { display: flex; align-items: center; gap: 10px; height: 44px; padding-right: 8px;
          border-radius: 12px; cursor: pointer; box-sizing: border-box; }
        .pf-row:hover { background: var(--panel-hover); }
        .pf-row.sel { background: var(--panel-hover); }
        .pf-folder { padding-left: 12px; }
        .pf-ic { color: var(--text-muted); flex-shrink: 0; }
        .pf-chev { color: var(--text-faint); flex-shrink: 0; margin-left: auto; }
        .pf-rowtext { min-width: 0; display: flex; align-items: baseline; gap: 8px; flex: 1;
          overflow: hidden; white-space: nowrap; }
        /* 左欄清單是介面不是內文，維持黑體（--font-body），只加大加粗。 */
        .pf-name { font-weight: 700; font-size: 15px; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; flex-shrink: 1; }
        .pf-meta { font-size: 13px; font-weight: 500; color: var(--text-faint); flex-shrink: 0;
          overflow: hidden; text-overflow: ellipsis; }
        /* theme.css 有一條全域規則讓所有 input/textarea 套毛筆手寫體
           （MoyuBrushTC）。那在訊息輸入框是刻意的，但這個面板的搜尋框、
           重新命名框、新增檔案框是檔案管理介面，毛筆字既突兀又難讀。
           只在這個面板作用域內退回一般介面字體，不動全域規則。 */
        .pf-panel input { font-family: var(--font-body); }

        .pf-del { background: none; border: none; color: var(--text-faint); cursor: pointer;
          padding: 5px; border-radius: 7px; display: flex; opacity: 0; flex-shrink: 0; }
        .pf-row:hover .pf-del { opacity: 1; }
        .pf-del:hover { background: var(--panel); color: #e11d48; }

        .pf-sep { height: 1px; background: var(--border-soft); margin: 0 8px 0 46px; }

        /* ── 拖曳與排序 ──
           動畫刻意放慢到 200ms 的 ease，不要用彈跳或快閃：這個面板是拿來
           安靜閱讀文件的，列表如果在指標下面抖來抖去會很吵。列本身只做
           透明度和位移，沒有縮放，避免相鄰的列被推擠變形。 */
        .pf-row { transition: background 0.2s ease, opacity 0.2s ease,
          transform 0.2s ease, box-shadow 0.2s ease; }
        .pf-row.dragging { opacity: 0.4; transform: scale(0.995); }
        /* 放置位置用一條 2px 的指示線，不要整列反白——反白會讓人以為是
           「放進這一列」而不是「插在這一列前/後」。 */
        .pf-row.drop-top { box-shadow: inset 0 2px 0 0 var(--accent); }
        .pf-row.drop-bottom { box-shadow: inset 0 -2px 0 0 var(--accent); }
        /* 拖到資料夾上：這個才是真的「放進去」，所以用整塊底色 + 外框 */
        .pf-row.pf-folder.drop-in {
          background: color-mix(in srgb, var(--accent) 14%, transparent);
          box-shadow: inset 0 0 0 1.5px var(--accent);
        }

        /* 就地改名的輸入框 */
        .pf-rename {
          flex: 1; min-width: 0; height: 28px; box-sizing: border-box;
          background: var(--panel); border: 1.5px solid var(--accent);
          border-radius: 7px; padding: 0 8px; color: var(--text);
          font-size: 14px; font-weight: 600; outline: none;
        }

        /* 右鍵選單 */
        .pf-ctx-mask { position: fixed; inset: 0; z-index: 40; }
        .pf-ctx {
          position: fixed; z-index: 41; min-width: 152px;
          background: var(--panel); border: 1px solid var(--border);
          border-radius: 11px; padding: 5px;
          box-shadow: 0 12px 32px rgba(0,0,0,0.22);
          animation: pf-ctx-in 0.14s ease;
        }
        @keyframes pf-ctx-in { from { opacity: 0; transform: translateY(-4px); } }
        .pf-ctx button {
          display: flex; align-items: center; gap: 9px; width: 100%;
          border: none; background: none; border-radius: 7px;
          padding: 8px 10px; color: var(--text); font-size: 13.5px;
          cursor: pointer; text-align: left;
        }
        .pf-ctx button:hover { background: var(--panel-hover); }
        .pf-ctx button.danger { color: #dc2626; }
        .pf-ctx button.danger:hover { background: color-mix(in srgb, #dc2626 12%, transparent); }

        .pf-iconbtn:disabled { opacity: 0.35; cursor: default; }
        .pf-iconbtn:disabled:hover { background: none; }
        .pf-newrow { padding-left: 12px; background: var(--panel-hover); }
        .pf-newrow input { flex: 1; background: none; border: none; outline: none;
          color: var(--text); font-size: 14px; font-weight: 600; min-width: 0; }
        .pf-empty { padding: 26px 16px; text-align: center; font-size: 13px;
          color: var(--text-faint); line-height: 1.7; }

        .pf-footer { flex-shrink: 0; padding: 12px 16px 14px; border-top: 1px solid var(--border-soft); }
        .pf-bar { height: 4px; border-radius: 999px; background: var(--border-soft); overflow: hidden; }
        .pf-bar-fill { height: 100%; background: var(--accent); border-radius: 999px;
          transition: width 0.25s ease; }
        .pf-cap { margin-top: 8px; display: flex; align-items: center; gap: 5px;
          font-size: 12px; color: var(--text-faint); }

        .pf-right { flex: 1; min-width: 0; overflow-y: auto; padding: 30px 40px 48px; }
        /* 內文字體。中文由 _document.js 載入的 Noto Serif TC 負責（英文仍是
           本機 Georgia）。刻意不再指名 Songti TC（macOS 專有）與 PMingLiU
           （新細明體，筆畫細到讀不舒服）——真正的修正是把網頁字體載進來，
           不要靠使用者本機裝了什麼。
           weight 500 是 Noto Serif TC 實際有載入的字重，不是瀏覽器合成的假粗；
           Georgia 沒有 500，CSS 比對規則會讓它退回真實的 400，也不會假粗。 */
        .pf-doc { font-family: Georgia, "Times New Roman", "Noto Serif TC", serif;
          font-size: 18px; font-weight: 500; line-height: 1.85; color: var(--text); max-width: 74ch; }
        .pf-doc > *:first-child { margin-top: 0; }
        .pf-doc p { margin: 0 0 1.05em; }
        .pf-doc strong { font-weight: 800; }
        .pf-doc h1 { font-size: 1.85em; font-weight: 800; margin: 1.4em 0 0.5em; line-height: 1.3; }
        .pf-doc h2 { font-size: 1.5em; font-weight: 800; margin: 1.35em 0 0.45em; line-height: 1.35; }
        .pf-doc h3 { font-size: 1.22em; font-weight: 800; margin: 1.3em 0 0.4em; }
        .pf-doc ul { list-style: disc; padding-left: 1.5em; margin: 0 0 1.05em; }
        .pf-doc ol { padding-left: 1.5em; margin: 0 0 1.05em; }
        .pf-doc li { margin-bottom: 0.4em; }
        .pf-doc a { color: inherit; text-decoration: underline; text-underline-offset: 2px; }
        .pf-doc blockquote { margin: 0 0 1.05em; padding-left: 1em;
          border-left: 2px solid var(--border); color: var(--text-muted); }
        .pf-doc hr { border: none; border-top: 1px solid var(--border); margin: 1.8em 0; }
        .pf-doc code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
          font-size: 0.86em; background: var(--panel-alt); padding: 2px 5px; border-radius: 5px; }
        .pf-doc pre { background: var(--panel-alt); padding: 14px 16px; border-radius: 10px;
          overflow-x: auto; margin: 0 0 1.05em; }
        .pf-doc pre code { background: none; padding: 0; }
        .pf-doc table { border-collapse: collapse; margin: 0 0 1.05em; font-size: 0.92em; }
        .pf-doc th, .pf-doc td { border: 1px solid var(--border); padding: 6px 10px; }
        .pf-blank { color: var(--text-faint); }


        .pf-list::-webkit-scrollbar, .pf-right::-webkit-scrollbar { width: 6px; }
        .pf-list::-webkit-scrollbar-track, .pf-right::-webkit-scrollbar-track { background: transparent; }
        .pf-list::-webkit-scrollbar-thumb, .pf-right::-webkit-scrollbar-thumb {
          background: rgba(120,120,130,0.42); border-radius: 999px; }

        @media (max-width: 720px) {
          /* 手機版滿版，而且一次只顯示一欄——螢幕寬度放不下 37% 列表 + 預覽。
             沒選檔案時顯示列表，選了就整個換成預覽（靠 .pf-m-preview 切換），
             回列表用標題列左邊那顆返回鍵。 */
          .pf-panel { width: 100% !important; height: 100dvh; max-height: 100dvh;
            border-radius: 0; border: none; }
          .pf-titlebar { height: 56px; }
          .pf-title { font-size: 22px; }
          .pf-tb-left { width: 100% !important; border-right: none !important; padding: 0 12px; }
          .pf-tb-right { display: none; }
          .pf-body { flex-direction: column; }
          .pf-left { width: 100% !important; border-right: none !important; }
          .pf-right { display: none; }
          .pf-list { padding: 6px 8px; }
          /* 觸控目標放大：桌面 44px 在手機上偏小 */
          .pf-row { height: 56px; }
          .pf-name { font-size: 16px; }
          .pf-meta { font-size: 13px; }
          .pf-del { opacity: 1; }
          .pf-footer { padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); }

          .pf-panel.pf-m-preview .pf-tb-left { display: none; }
          .pf-panel.pf-m-preview .pf-tb-right { display: flex; width: 100%; padding: 0 8px 0 4px; }
          .pf-panel.pf-m-preview .pf-left { display: none; }
          .pf-panel.pf-m-preview .pf-right { display: block; padding: 18px 16px 40px; }
          .pf-panel.pf-m-preview .pf-tb-name { font-size: 15px; }
          /* 檔名長時不要把切換鈕和 × 擠出畫面 */
          .pf-panel.pf-m-preview .pf-tb-file { min-width: 0; overflow: hidden; }
          .pf-panel.pf-m-preview .pf-tb-name,
          .pf-panel.pf-m-preview .pf-tb-file .pf-meta {
            overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .pf-panel.pf-m-preview .pf-seg button span { display: none; }
        }
      `}</style>
    </div>
  );
}
