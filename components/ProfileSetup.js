import { useEffect, useRef, useState } from "react";
import { Camera, ArrowRight } from "lucide-react";
import { validatePhotoFile } from "./media-editor/mediaValidation";
import styles from "./ProfileSetup.module.css";

const AVATARS = ["😊", "👨‍💻", "📚", "🏃", "🎮", "🎨", "🍜", "🌸", "🦊", "🐼", "🎧", "⚡"];
const COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444", "#06b6d4", "#84cc16"];

export default function ProfileSetup({ nickname, setNickname, avatar, setAvatar, color, setColor, initialPhoto, busy, error, onSubmit }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [fileError, setFileError] = useState("");
  const [usePhoto, setUsePhoto] = useState(true);
  const fileRef = useRef(null);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const photo = usePhoto ? preview || initialPhoto : "";
  return <main className={styles.root}>
    <section className={styles.card} aria-labelledby="setup-title" aria-busy={busy}>
      <div className={styles.brand}><img src="/logo.png?v=3" alt="" width="28" height="28" />EVONCHAT</div>
      <h1 id="setup-title">讓朋友認識你</h1>
      <p className={styles.subtitle}>選一張頭像，取個喜歡的名字，就可以開始聊天。</p>
      <form onSubmit={event => { event.preventDefault(); if (!busy && nickname.trim()) onSubmit(usePhoto ? file : null, usePhoto); }}>
        <div className={styles.avatarArea}>
          <button type="button" className={styles.avatar} disabled={busy} onClick={() => fileRef.current?.click()} aria-label="上傳頭像" style={{ backgroundColor: photo ? undefined : color }}>
            {photo ? <img src={photo} alt="頭像預覽" /> : <span>{avatar}</span>}
            <span className={styles.camera}><Camera size={18} /></span>
          </button>
          <button type="button" className={styles.upload} disabled={busy} onClick={() => fileRef.current?.click()}>上傳照片</button>
          <span className={styles.hint}>JPG、PNG、WebP 或 GIF，最大 20MB</span>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden disabled={busy} aria-label="選擇頭像照片"
            onChange={event => {
              const next = event.target.files?.[0]; event.target.value = "";
              if (!next) return;
              const reason = validatePhotoFile(next);
              setFileError(reason || "");
              if (!reason) { setFile(next); setUsePhoto(true); }
            }} />
        </div>
        <details className={styles.options}>
          <summary>或使用預設頭像</summary>
          <div className={styles.choices} role="group" aria-label="預設頭像">
            {AVATARS.map(item => <button type="button" disabled={busy} key={item} aria-label={`頭像 ${item}`} aria-pressed={!usePhoto && avatar === item} onClick={() => { setAvatar(item); setUsePhoto(false); }}>{item}</button>)}
          </div>
          <div className={styles.colors} role="group" aria-label="頭像底色">
            {COLORS.map(item => <button type="button" disabled={busy} key={item} style={{ background: item }} aria-label={`底色 ${item}`} aria-pressed={color === item} onClick={() => setColor(item)} />)}
          </div>
        </details>
        <label className={styles.label} htmlFor="setup-nickname">你的暱稱</label>
        <input id="setup-nickname" autoComplete="nickname" value={nickname} onChange={event => setNickname(event.target.value)} placeholder="朋友會看到這個名字" disabled={busy} required />
        {(fileError || error) && <p role="alert" className={styles.error}>{fileError || error}</p>}
        <button className={styles.submit} type="submit" disabled={busy || !nickname.trim()}>{busy ? "儲存中…" : "進入聊天室"}<ArrowRight size={18} /></button>
      </form>
    </section>
  </main>;
}
