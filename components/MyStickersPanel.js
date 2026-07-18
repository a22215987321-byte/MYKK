import { useEffect, useRef, useState } from "react";
import { collection, onSnapshot, query, where, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import StickerMaker from "./StickerMaker";

const LONG_PRESS_MS = 500;

function StickerTile({ sticker, onTap, onLongPress }) {
  const timerRef = useRef(null);
  const firedRef = useRef(false);
  const movedRef = useRef(false);

  function start() {
    if (!onLongPress) return;
    firedRef.current = false;
    movedRef.current = false;
    timerRef.current = setTimeout(() => { firedRef.current = true; onLongPress(sticker); }, LONG_PRESS_MS);
  }
  function cancelTimer() {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }
  function end() {
    cancelTimer();
    if (!firedRef.current && !movedRef.current) onTap(sticker);
  }

  return (
    <button
      onPointerDown={start} onPointerUp={end} onPointerLeave={cancelTimer} onPointerCancel={cancelTimer}
      onPointerMove={() => { movedRef.current = true; }}
      onContextMenu={e => e.preventDefault()}
      title={sticker.name} data-sticker-tile={sticker.id}
      style={{
        aspectRatio: "1/1", borderRadius: 10, background: "var(--panel-alt)", border: "1px solid var(--border)",
        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 6, touchAction: "manipulation",
      }}>
      <img src={sticker.thumbnailSrc || sticker.src} alt={sticker.name} style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} />
    </button>
  );
}

// 「我的貼圖」共用面板：聊天表情選單的「我的貼圖」分類、與個人頁的「我的貼圖包」入口都用這個。
// onSend 有給 → 點一下直接送出、長按才管理（聊天室情境）；onSend 沒給 → 點一下就直接管理（個人頁情境，沒有「送出」的概念）。
export default function MyStickersPanel({ uid, onSend, isMobile }) {
  const [stickers, setStickers] = useState([]);
  const [makerOpen, setMakerOpen] = useState(false);
  const [manageTarget, setManageTarget] = useState(null);
  const [manageMode, setManageMode] = useState("menu");
  const [renameValue, setRenameValue] = useState("");
  const [manageBusy, setManageBusy] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const q = query(collection(db, "stickers"), where("userId", "==", uid));
    const unsub = onSnapshot(q, snap => {
      const list = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(s => s.status !== "removed")
        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setStickers(list);
    }, err => console.error("[MyStickersPanel] stickers snapshot failed", err));
    return unsub;
  }, [uid]);

  function openManage(sticker) {
    setManageTarget(sticker);
    setManageMode("menu");
    setRenameValue(sticker.name || "");
  }
  function closeManage() {
    setManageTarget(null);
    setManageMode("menu");
    setManageBusy(false);
  }

  async function doRename() {
    if (!manageTarget || !renameValue.trim()) return;
    setManageBusy(true);
    try {
      await updateDoc(doc(db, "stickers", manageTarget.id), { name: renameValue.trim(), updatedAt: serverTimestamp() });
      closeManage();
    } catch (err) {
      console.error("[MyStickersPanel] rename sticker failed", err);
      setManageBusy(false);
    }
  }

  async function doDelete() {
    if (!manageTarget) return;
    setManageBusy(true);
    try {
      await updateDoc(doc(db, "stickers", manageTarget.id), { status: "removed", updatedAt: serverTimestamp() });
      closeManage();
    } catch (err) {
      console.error("[MyStickersPanel] delete sticker failed", err);
      setManageBusy(false);
    }
  }

  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(64px, 1fr))", gap: 8, marginBottom: 8 }}>
        <button onClick={() => setMakerOpen(true)} data-testid="add-sticker-tile"
          style={{
            aspectRatio: "1/1", borderRadius: 10, border: "1.5px dashed var(--border)", background: "var(--panel-alt)",
            color: "var(--accent)", cursor: "pointer", display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", fontSize: 22, gap: 2,
          }}>
          ＋<span style={{ fontSize: 11, fontWeight: 600 }}>製作貼圖</span>
        </button>
        {stickers.map(sticker => (
          <StickerTile key={sticker.id} sticker={sticker}
            onTap={onSend || openManage}
            onLongPress={onSend ? openManage : null} />
        ))}
      </div>
      {stickers.length === 0 && (
        <div style={{ textAlign: "center", padding: "16px 0", color: "var(--text-faint)", fontSize: 13, lineHeight: 1.6 }}>
          你還沒有自製貼圖<br />按「＋製作貼圖」新增第一張
        </div>
      )}

      {makerOpen && (
        <StickerMaker uid={uid} isMobile={isMobile} onClose={() => setMakerOpen(false)} onSaved={() => setMakerOpen(false)} />
      )}

      {manageTarget && (
        <div onClick={closeManage} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 720, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "var(--panel)", width: "100%", maxWidth: 420, borderRadius: "16px 16px 0 0",
            padding: "16px 18px calc(18px + env(safe-area-inset-bottom))", boxSizing: "border-box",
          }}>
            {manageMode === "menu" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                  <img src={manageTarget.thumbnailSrc || manageTarget.src} alt={manageTarget.name} style={{ width: 44, height: 44, objectFit: "contain" }} />
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{manageTarget.name}</div>
                </div>
                <button onClick={() => setManageMode("preview")} style={manageBtnStyle}>🔍 預覽</button>
                <button onClick={() => setManageMode("rename")} style={manageBtnStyle}>✏️ 重新命名</button>
                <button onClick={doDelete} disabled={manageBusy} style={{ ...manageBtnStyle, color: "#ef4444" }}>🗑️ 刪除</button>
                <button onClick={closeManage} style={{ ...manageBtnStyle, color: "var(--text-faint)" }}>取消</button>
              </>
            )}
            {manageMode === "rename" && (
              <>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 10 }}>重新命名</div>
                <input value={renameValue} onChange={e => setRenameValue(e.target.value.slice(0, 20))} autoFocus
                  style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => setManageMode("menu")} style={{ ...manageBtnStyle, flex: 1, margin: 0 }}>返回</button>
                  <button onClick={doRename} disabled={manageBusy || !renameValue.trim()} style={{ ...manageBtnStyle, flex: 1, margin: 0, background: "var(--accent-active)", color: "var(--accent)" }}>儲存</button>
                </div>
              </>
            )}
            {manageMode === "preview" && (
              <>
                <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 18px" }}>
                  <img src={manageTarget.src} alt={manageTarget.name} style={{ width: 180, height: 180, objectFit: "contain" }} />
                </div>
                <button onClick={() => setManageMode("menu")} style={manageBtnStyle}>返回</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const manageBtnStyle = {
  display: "block", width: "100%", textAlign: "center", background: "var(--panel-alt)",
  border: "none", borderRadius: 10, padding: "12px 0", fontSize: 14, color: "var(--text)",
  cursor: "pointer", marginBottom: 8,
};
