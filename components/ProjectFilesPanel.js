import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, where, serverTimestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "../lib/toast";
import {
  Folder, FolderOpen, FileText, ChevronRight, ChevronDown,
  Search, X, Trash2, Eye, Pencil, Info,
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

function FileRow({ file, indent, selected, onOpen, onDelete }) {
  return (
    <div className={"pf-row pf-file" + (selected ? " sel" : "")} style={{ paddingLeft: indent }}
      onClick={() => onOpen(file)}>
      <FileText size={17} strokeWidth={1.6} className="pf-ic" />
      <div className="pf-rowtext">
        <span className="pf-name">{file.name}</span>
        <span className="pf-meta">{metaOf(file)}</span>
      </div>
      <button className="pf-del" title="刪除"
        onClick={(e) => { e.stopPropagation(); onDelete(file); }}>
        <Trash2 size={15} strokeWidth={1.6} />
      </button>
    </div>
  );
}

export default function ProjectFilesPanel({ user, projectId = DEFAULT_PROJECT_ID, onClose }) {
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
      rows.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setFiles(rows);
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
        content: p.text, size: byteLen(p.text), updatedAt: serverTimestamp(),
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
    setDraft(f.content || "");
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
    const folders = new Map();
    const root = [];
    for (const f of filtered) {
      if (f.folder) {
        if (!folders.has(f.folder)) folders.set(f.folder, []);
        folders.get(f.folder).push(f);
      } else root.push(f);
    }
    return { folders: [...folders.entries()], root };
  }, [filtered]);

  const usedBytes = files.reduce((n, f) => n + (f.size || 0), 0);
  const pct = Math.min(100, (usedBytes / PROJECT_CAPACITY_BYTES) * 100);
  const pctLabel = pct > 0 && pct < 1 ? "<1" : String(Math.round(pct));

  async function createDoc(rawPath, content) {
    const { folder, name } = splitPath(rawPath);
    if (!name) { toast("請輸入檔名"); return null; }
    const size = byteLen(content);
    if (usedBytes + size > PROJECT_CAPACITY_BYTES) { toast("已達專案容量上限"); return null; }
    try {
      const ref = await addDoc(collection(db, "projectFiles"), {
        uid: user.uid, projectId, name, folder, content, size,
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
      <div className="pf-panel" style={{ width: wide ? "min(90vw, 1180px)" : "min(92vw, 640px)" }}>

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
            <button className="pf-textbtn pf-upload" onClick={() => pickerRef.current?.click()}>上傳</button>
            {!wide && (
              <button className="pf-iconbtn" title="關閉" onClick={handleClose}>
                <X size={18} strokeWidth={1.6} />
              </button>
            )}
          </div>

          {wide && (
            <div className="pf-tb-right">
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

              {tree.folders.map(([name, items]) => {
                const open = expanded.has(name);
                return (
                  <div key={"d:" + name}>
                    <div className="pf-row pf-folder" onClick={() => toggleFolder(name)}>
                      {open
                        ? <FolderOpen size={17} strokeWidth={1.6} className="pf-ic" />
                        : <Folder size={17} strokeWidth={1.6} className="pf-ic" />}
                      <div className="pf-rowtext">
                        <span className="pf-name">{name}</span>
                        <span className="pf-meta">{items.length} 個項目</span>
                      </div>
                      {open
                        ? <ChevronDown size={16} strokeWidth={1.6} className="pf-chev" />
                        : <ChevronRight size={16} strokeWidth={1.6} className="pf-chev" />}
                    </div>
                    {open && items.map((f, i) => {
                      const prev = items[i - 1];
                      const sep = i > 0 && f.id !== selectedId && prev.id !== selectedId;
                      return (
                        <div key={f.id}>
                          {sep && <div className="pf-sep" />}
                          <FileRow file={f} indent={36} selected={f.id === selectedId}
                            onOpen={openFile} onDelete={removeFile} />
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
                      onOpen={openFile} onDelete={removeFile} />
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
                  {selected.content?.trim()
                    ? <ReactMarkdown remarkPlugins={[remarkGfm]}>{selected.content}</ReactMarkdown>
                    : <p className="pf-blank">這份文件還是空的——切到「編輯」開始寫。</p>}
                </div>
              ) : (
                <textarea className="pf-editor" value={draft} spellCheck={false}
                  onChange={(e) => onDraftChange(e.target.value)}
                  onBlur={flushSave} />
              )}
            </div>
          )}
        </div>
      </div>

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
        .pf-name { font-weight: 600; font-size: 14px; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; flex-shrink: 1; }
        .pf-meta { font-size: 12.5px; color: var(--text-faint); flex-shrink: 0;
          overflow: hidden; text-overflow: ellipsis; }

        .pf-del { background: none; border: none; color: var(--text-faint); cursor: pointer;
          padding: 5px; border-radius: 7px; display: flex; opacity: 0; flex-shrink: 0; }
        .pf-row:hover .pf-del { opacity: 1; }
        .pf-del:hover { background: var(--panel); color: #e11d48; }

        .pf-sep { height: 1px; background: var(--border-soft); margin: 0 8px 0 46px; }
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
        .pf-doc { font-family: Georgia, "Times New Roman", "Noto Serif TC", "Songti TC", "PMingLiU", serif;
          font-size: 16.5px; line-height: 1.78; color: var(--text); max-width: 74ch; }
        .pf-doc > *:first-child { margin-top: 0; }
        .pf-doc p { margin: 0 0 1.05em; }
        .pf-doc h1 { font-size: 1.7em; font-weight: 700; margin: 1.4em 0 0.5em; line-height: 1.3; }
        .pf-doc h2 { font-size: 1.38em; font-weight: 700; margin: 1.35em 0 0.45em; line-height: 1.35; }
        .pf-doc h3 { font-size: 1.15em; font-weight: 700; margin: 1.3em 0 0.4em; }
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

        .pf-editor { width: 100%; height: 100%; min-height: 300px; box-sizing: border-box;
          background: none; border: none; outline: none; resize: none; color: var(--text);
          font-family: Georgia, "Times New Roman", "Noto Serif TC", "Songti TC", "PMingLiU", serif;
          font-size: 16.5px; line-height: 1.78; }

        .pf-list::-webkit-scrollbar, .pf-right::-webkit-scrollbar { width: 6px; }
        .pf-list::-webkit-scrollbar-track, .pf-right::-webkit-scrollbar-track { background: transparent; }
        .pf-list::-webkit-scrollbar-thumb, .pf-right::-webkit-scrollbar-thumb {
          background: rgba(120,120,130,0.42); border-radius: 999px; }

        @media (max-width: 720px) {
          .pf-panel { width: 100% !important; height: 92vh; }
          .pf-titlebar { height: 58px; }
          .pf-title { font-size: 22px; }
          .pf-tb-left { width: 100% !important; border-right: none !important; }
          .pf-tb-right { display: none; }
          .pf-body { flex-direction: column; }
          .pf-left { width: 100% !important; border-right: none !important; }
          .pf-right { display: none; }
        }
      `}</style>
    </div>
  );
}
