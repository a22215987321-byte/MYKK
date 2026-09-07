import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { Copy, Check, FolderPlus, X } from "lucide-react";
import { collection, addDoc, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import { toast } from "../lib/toast";
import { sharedDocUrl } from "../data/sharedDocs";
import DocStyles from "./DocStyles";
import {
  DEFAULT_PROJECT_ID, PROJECT_CAPACITY_BYTES, FILE_MAX_BYTES, byteLen,
} from "../lib/projectFilesShared";

// 分享文件的閱讀視窗。內文排版跟專案檔案共用 DocStyles（同一份 .pf-doc CSS），
// 兩邊看起來必須完全一樣。
//
// 跟專案檔案面板刻意不同的兩點，都是使用者指定的：
//   1. 沒有左側的檔案／資料夾欄——這裡一次只讀一份文件，列表沒有意義
//   2. 寬度固定，不會因為開了內容就變闊（專案檔案面板選了檔案會從 640 撐到
//      1180px）。這裡永遠是同一個寬度，開幾次都一樣。
export default function DocReaderModal({ doc: meta, myUid, onClose }) {
  const [raw, setRaw] = useState(null);   // null = 還在載入
  const [failed, setFailed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    setRaw(null); setFailed(false);
    fetch(sharedDocUrl(meta.id))
      .then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.text(); })
      .then((t) => { if (alive) setRaw(t); })
      .catch(() => { if (alive) setFailed(true); });
    return () => { alive = false; };
  }, [meta.id]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const copyAll = useCallback(async () => {
    if (!raw) return;
    try {
      await navigator.clipboard.writeText(raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast("複製失敗，請手動選取");
    }
  }, [raw]);

  // 存進「自己的」專案檔案。projectFiles 的規則只允許建立 uid 等於自己的檔案，
  // 所以這是收件人自己按下之後由他自己的瀏覽器寫入，不是站長替他寫。
  const saveToProject = useCallback(async () => {
    if (!raw || !myUid || saving) return;
    const size = byteLen(raw);
    if (size > FILE_MAX_BYTES) { toast("檔案超過單檔上限"); return; }
    setSaving(true);
    try {
      // 先檢查容量。規則沒有管總量，這個上限是前端自己的約定，所以要在這裡算。
      const snap = await getDocs(query(
        collection(db, "projectFiles"),
        where("uid", "==", myUid),
        where("projectId", "==", DEFAULT_PROJECT_ID),
      ));
      let used = 0;
      let dup = false;
      snap.forEach((d) => {
        const v = d.data();
        used += v.size || 0;
        if (v.kind !== "folder" && v.name === meta.name) dup = true;
      });
      if (dup) { toast("專案檔案裡已經有同名的檔案了"); setSaving(false); return; }
      if (used + size > PROJECT_CAPACITY_BYTES) { toast("已達專案容量上限"); setSaving(false); return; }

      await addDoc(collection(db, "projectFiles"), {
        uid: myUid, projectId: DEFAULT_PROJECT_ID,
        name: meta.name, folder: "", content: raw, size,
        // 刻意不標 format——這是 markdown，專案檔案打開時會用 marked 轉，
        // 第一次編輯存檔才升級成 html。跟上傳檔案那條路徑一致。
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      });
      toast("已儲存至專案檔案");
    } catch {
      toast("儲存失敗，請重試");
    } finally {
      setSaving(false);
    }
  }, [raw, myUid, saving, meta.name]);

  const html = raw == null ? "" : (() => {
    try {
      const out = marked.parse(raw, { async: false, breaks: true });
      return typeof window === "undefined" ? out : DOMPurify.sanitize(out, { USE_PROFILES: { html: true } });
    } catch { return ""; }
  })();

  const iconBtn = {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: 32, height: 32, borderRadius: 9,
    background: "none", border: "1px solid var(--border)",
    color: "var(--text-muted)", cursor: "pointer", flexShrink: 0, padding: 0,
  };

  // 一定要 portal 到 body。這個視窗是從訊息泡泡裡渲染出來的，而中間兩塊大方塊
  // 帶 backdrop-filter（--col-blur，柔和珠光跟玻璃兩個主題是真的模糊值）——只要
  // 祖先有非 none 的 backdrop-filter，position:fixed 的定位基準就會變成那個祖先
  // 而不是視窗，遮罩會縮在方塊裡、還被它的 overflow:hidden 裁掉。
  if (typeof document === "undefined") return null;

  return createPortal(
    <>
      <DocStyles />
      <div className="dr-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="dr-panel">
          <div className="dr-head">
            <div className="dr-title">
              <div className="dr-name">{meta.name}</div>
              {meta.note && <div className="dr-note">{meta.note}</div>}
            </div>
            {/* 儲存到自己的專案檔案。滑鼠移過去的提示用原生 title，跟這個
                專案其他按鈕一致，不另外做一套 tooltip 元件。 */}
            <button style={iconBtn} title="儲存至專案檔案" onClick={saveToProject} disabled={!raw || saving}>
              <FolderPlus size={16} strokeWidth={1.8} />
            </button>
            {/* 複製全文——複製的是原始 markdown，不是渲染後的 HTML：使用者要的
                是能貼進 Claude 的那段字。 */}
            <button style={iconBtn} title="複製全文" onClick={copyAll} disabled={!raw}>
              {copied
                ? <Check size={16} strokeWidth={2} color="#16a34a" />
                : <Copy size={16} strokeWidth={1.8} />}
            </button>
            <button style={iconBtn} title="關閉" onClick={onClose}>
              <X size={16} strokeWidth={1.8} />
            </button>
          </div>
          <div className="dr-body">
            {raw == null && !failed && <div className="dr-msg">載入中…</div>}
            {failed && <div className="dr-msg">文件載入失敗</div>}
            {raw != null && <div className="pf-doc" dangerouslySetInnerHTML={{ __html: html }} />}
          </div>
        </div>
      </div>

      <style>{`
        .dr-overlay {
          position: fixed; inset: 0; z-index: 640;
          background: rgba(0,0,0,0.42);
          display: flex; align-items: center; justify-content: center;
          padding: 20px;
        }
        /* 寬度固定。專案檔案面板會因為選了檔案從 640 撐到 1180px，這裡刻意
           不做那件事——使用者要的是每次打開都長得一樣。760px 扣掉左右各
           34px 的內距後約 692px，跟專案檔案右欄的實際內容寬度相當，所以
           同一份 .pf-doc 的 74ch 行寬在兩邊看起來一致。 */
        .dr-panel {
          width: min(92vw, 760px); height: min(86vh, 820px);
          display: flex; flex-direction: column; overflow: hidden;
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: var(--radius-lg);
          box-shadow: 0 24px 64px rgba(0,0,0,0.28);
        }
        .dr-head {
          display: flex; align-items: center; gap: 8px;
          padding: 12px 14px 12px 18px; flex-shrink: 0;
          border-bottom: 1px solid var(--border-soft, var(--border));
        }
        .dr-title { flex: 1; min-width: 0; }
        .dr-name {
          font-size: 14.5px; font-weight: 700; color: var(--text);
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .dr-note { font-size: 11.5px; color: var(--text-faint); margin-top: 2px; }
        .dr-body { flex: 1; min-height: 0; overflow-y: auto; padding: 30px 34px 48px; }
        .dr-msg { color: var(--text-faint); font-size: 13px; text-align: center; padding: 40px 0; }
        .dr-body::-webkit-scrollbar { width: 6px; }
        .dr-body::-webkit-scrollbar-track { background: transparent; }
        .dr-body::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

        @media (max-width: 720px) {
          .dr-overlay { padding: 0; }
          .dr-panel { width: 100vw; height: 100dvh; border-radius: 0; border: none; }
          .dr-body { padding: 22px 18px 40px; }
        }
      `}</style>
    </>,
    document.body,
  );
}
