import { useEffect, useRef, useState } from "react";
import { doc, addDoc, collection, getDocs, query, where, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { uploadToR2 } from "../lib/uploadToR2";
import { fileToImage, renderSticker, blobToFile, generateStickerId } from "../lib/stickerImage";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_STICKERS_PER_USER = 100;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const PREVIEW_SIZE = 260;

// 手機版全螢幕、桌面版置中彈窗，兩者共用同一套裁切/編輯/保存邏輯。
export default function StickerMaker({ uid, isMobile, onClose, onSaved }) {
  const [step, setStep] = useState("pick"); // pick | crop | saving
  const [img, setImg] = useState(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [whiteBorder, setWhiteBorder] = useState(false);
  const [rounded, setRounded] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => () => { if (img) URL.revokeObjectURL(img.src); }, [img]);

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError("");
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("只支援 PNG / JPG / WEBP 圖片");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setError("圖片太大，請選擇 5MB 以下的圖片");
      return;
    }
    try {
      const count = await countActiveStickers(uid);
      if (count >= MAX_STICKERS_PER_USER) {
        setError(`最多只能製作 ${MAX_STICKERS_PER_USER} 張自製貼圖`);
        return;
      }
    } catch (err) {
      console.error("[StickerMaker] countActiveStickers failed", err);
    }
    try {
      const loaded = await fileToImage(file);
      setImg(loaded);
      setPan({ x: 0, y: 0 });
      setZoom(1);
      setName(file.name.replace(/\.[^.]+$/, "").slice(0, 20) || "我的貼圖");
      setStep("crop");
    } catch (err) {
      setError("圖片讀取失敗，請換一張試試");
    }
  };

  function handlePointerDown(e) {
    dragRef.current = { startX: e.clientX, startY: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function handlePointerMove(e) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const maxPan = PREVIEW_SIZE * 0.5;
    setPan({
      x: Math.max(-maxPan, Math.min(maxPan, dragRef.current.panX + dx)),
      y: Math.max(-maxPan, Math.min(maxPan, dragRef.current.panY + dy)),
    });
  }
  function handlePointerUp() { dragRef.current = null; }

  const save = async () => {
    if (!img || saving) return;
    if (!name.trim()) { setError("請輸入貼圖名稱"); return; }

    // 保存前先確認登入狀態，且目前登入的 uid 要跟這個面板拿到的 uid 一致
    // （避免 token 過期或元件拿到舊的 uid prop 卻沒發現）。
    const currentUser = auth.currentUser;
    console.log("[StickerMaker] save() pre-check", {
      hasCurrentUser: !!currentUser, currentUserUid: currentUser?.uid, propUid: uid,
      stickerName: name.trim(), whiteBorder, rounded,
    });
    if (!currentUser || !uid || currentUser.uid !== uid) {
      setError("請先登入後再保存貼圖");
      return;
    }

    setSaving(true);
    setError("");

    const ratio = 512 / PREVIEW_SIZE;
    const { mainBlob, thumbBlob, mainType } = await renderSticker(img, {
      offsetX: pan.x * ratio, offsetY: pan.y * ratio, scale: zoom, whiteBorder, rounded,
    });
    const stickerId = generateStickerId();
    const mainFile = blobToFile(mainBlob, `${stickerId}`, mainType);
    const thumbFile = blobToFile(thumbBlob, `${stickerId}_thumb`, mainType);

    console.log("[StickerMaker] uploading to R2", {
      uid, stickerId, stickerName: name.trim(),
      mainFileName: mainFile.name, mainBytes: mainBlob.size,
      thumbFileName: thumbFile.name, thumbBytes: thumbBlob.size,
      uploadEndpoint: "/api/upload",
    });

    let src, thumbnailSrc;
    try {
      [src, thumbnailSrc] = await Promise.all([uploadToR2(mainFile), uploadToR2(thumbFile)]);
    } catch (err) {
      console.error("[StickerMaker] R2 upload failed", { message: err?.message, stickerId, uid });
      setError(`圖片上傳失敗：${err?.message || "請重試"}`);
      setSaving(false);
      return;
    }

    const docData = {
      id: stickerId, userId: uid, packId: "default", packName: "我的貼圖",
      name: name.trim(), type: "custom-sticker",
      src, thumbnailSrc, width: 512, height: 512,
      status: "active",
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    };
    console.log("[StickerMaker] writing sticker doc to Firestore", { collection: "stickers", docData });

    try {
      const ref = await addDoc(collection(db, "stickers"), docData);
      console.log("[StickerMaker] saved sticker doc", { id: ref.id });
      onSaved?.({ id: ref.id, ...docData });
      onClose();
    } catch (err) {
      console.error("[StickerMaker] Firestore write failed", {
        code: err?.code, message: err?.message, uid, stickerId,
      });
      if (err?.code === "permission-denied") {
        setError("貼圖資料寫入權限不足（資料庫規則尚未設定），請聯絡管理員");
      } else if (err?.code === "unavailable" || /network/i.test(err?.message || "")) {
        setError("網絡錯誤，請稍後再試");
      } else {
        setError(`貼圖資料儲存失敗${err?.code ? `（${err.code}）` : ""}，請重試`);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 700, display: "flex", alignItems: isMobile ? "flex-end" : "center", justifyContent: "center" }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: "var(--panel)", width: isMobile ? "100%" : 420, maxWidth: "94vw",
        maxHeight: isMobile ? "92vh" : "88vh", overflowY: "auto",
        borderRadius: isMobile ? "18px 18px 0 0" : 18, padding: "18px 20px 20px",
        boxSizing: "border-box",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text)" }}>製作貼圖</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 20, minWidth: 40, minHeight: 40 }}>✕</button>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", color: "#ef4444", borderRadius: 10, padding: "8px 12px", fontSize: 13, marginBottom: 12 }}>{error}</div>
        )}

        {step === "pick" && (
          <div style={{ textAlign: "center", padding: "30px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🖼️</div>
            <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 18 }}>選一張圖片來製作貼圖<br />支援 PNG / JPG / WEBP，最大 5MB</div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" data-testid="sticker-file-input" style={{ display: "none" }} onChange={pickFile} />
            <button onClick={() => fileRef.current?.click()}
              style={{ background: "linear-gradient(135deg,var(--accent),var(--accent-2))", border: "none", borderRadius: 12, padding: "12px 28px", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
              選擇圖片
            </button>
          </div>
        )}

        {step === "crop" && img && (
          <div>
            <div
              onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp}
              style={{
                width: PREVIEW_SIZE, height: PREVIEW_SIZE, margin: "0 auto 14px", borderRadius: rounded ? "50%" : 14,
                overflow: "hidden", position: "relative", background: whiteBorder ? "#fff" : "var(--panel-alt)",
                border: "1px solid var(--border)", cursor: "grab", touchAction: "none",
              }}>
              <img src={img.src} draggable={false} style={{
                position: "absolute", left: "50%", top: "50%", userSelect: "none", pointerEvents: "none",
                width: Math.max(PREVIEW_SIZE / img.width, PREVIEW_SIZE / img.height) * img.width * zoom,
                height: Math.max(PREVIEW_SIZE / img.width, PREVIEW_SIZE / img.height) * img.height * zoom,
                transform: `translate(calc(-50% + ${pan.x}px), calc(-50% + ${pan.y}px))`,
              }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <span style={{ fontSize: 16 }}>🔍</span>
              <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} style={{ flex: 1 }} />
            </div>

            <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
                <input type="checkbox" checked={whiteBorder} onChange={e => setWhiteBorder(e.target.checked)} /> 加白邊
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "var(--text-muted)", cursor: "pointer" }}>
                <input type="checkbox" checked={rounded} onChange={e => setRounded(e.target.checked)} /> 圓角（圓形）
              </label>
            </div>

            <label style={{ fontSize: 12, color: "var(--text-faint)", marginBottom: 4, display: "block" }}>貼圖名稱</label>
            <input value={name} onChange={e => setName(e.target.value.slice(0, 20))} placeholder="幫貼圖取個名字"
              style={{ width: "100%", background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 10, padding: "9px 12px", color: "var(--text)", fontSize: 14, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />

            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setStep("pick")} disabled={saving}
                style={{ flex: 1, background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 10, padding: "11px 0", color: "var(--text-muted)", fontSize: 14, cursor: saving ? "default" : "pointer" }}>
                重新選圖
              </button>
              <button onClick={save} disabled={saving}
                style={{ flex: 2, background: saving ? "var(--border)" : "linear-gradient(135deg,var(--accent),var(--accent-2))", border: "none", borderRadius: 10, padding: "11px 0", color: "#fff", fontSize: 14, fontWeight: 700, cursor: saving ? "default" : "pointer" }}>
                {saving ? "儲存中..." : "保存貼圖"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export async function countActiveStickers(uid) {
  const snap = await getDocs(query(collection(db, "stickers"), where("userId", "==", uid), where("status", "==", "active")));
  return snap.size;
}
