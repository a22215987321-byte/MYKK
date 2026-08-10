import { useState, useRef, useEffect } from "react";

const EDGE_MARGIN = 16;
const WIN_WIDTH = 340;
const MINI_WIDTH = 220;
const MINI_HEIGHT = 44;
const VOLUME_KEY = "cr-audio-player-volume";

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// 跟 FloatingAiChat 同一種「掛在 ChatRoom 最外層、不管切到哪個功能頁都還在」
// 的浮動小工具，預設貼左邊（跟 AI 對話小工具同一側）——音頻收藏（或其他任何
// 呼叫 onPlayAudioQueue 的地方）點了某首歌之後開出來，高度從頂部拉滿到底部，
// 播放/暫停/切歌/調音量都在這裡做，切去別的功能頁（GitHub熱門、字典…）
// 播放不會中斷。tracks/startIndex 由 ChatRoom.js 的 audioQueue 狀態控制，
// 這個元件本身只認眼前這份 tracks，不自己去 Firestore 查。
//
// 展開跟縮小狀態都能按住頂部那條橫條左右拖曳換位置（縮小時橫條本身就是
// 整個小方塊，一樣拖得動）；縮小時方塊寬度改用比較窄的 MINI_WIDTH，不是
// 展開時的 WIN_WIDTH，而且會多顯示一條播放進度條。
export default function FloatingAudioPlayer({ tracks, startIndex, onClose }) {
  const audioRef = useRef(null);
  const winRef = useRef(null);
  const dragRef = useRef({ dragging: false });
  const [left, setLeft] = useState(EDGE_MARGIN);
  // 縮小成底部一個小方塊——<audio> 元素照樣掛著、照樣播，只是清單跟控制列
  // 不畫出來，縮小/還原不會打斷正在播的音樂。
  const [minimized, setMinimized] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(startIndex || 0);
  const [playing, setPlaying] = useState(false);
  const [repeatOne, setRepeatOne] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const width = minimized ? MINI_WIDTH : WIN_WIDTH;

  useEffect(() => {
    const saved = typeof window !== "undefined" ? Number(localStorage.getItem(VOLUME_KEY)) : NaN;
    if (!isNaN(saved) && saved >= 0 && saved <= 1) setVolume(saved);
  }, []);

  // 縮小/展開切換寬度不同，原本的 left 可能會讓視窗跑出畫面右邊——切換
  // 當下重新夾一次範圍。
  useEffect(() => {
    if (typeof window === "undefined") return;
    setLeft(l => Math.max(EDGE_MARGIN, Math.min(l, window.innerWidth - width - EDGE_MARGIN)));
  }, [minimized, width]);

  // 每次外面重新丟一份新的 queue 進來（例如又點了收藏清單另一首），從那個
  // startIndex 開始播——不是只在第一次掛載時生效。
  useEffect(() => {
    setCurrentIndex(startIndex || 0);
  }, [tracks, startIndex]);

  const currentTrack = tracks[currentIndex] || null;

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !currentTrack) return;
    // 影片來源的音頻收藏沒有 audioUrl，直接把 videoUrl 餵給 <audio> 元素——
    // 瀏覽器本來就支援用 <audio> 播放影片檔案，只拿聲音軌、不理會畫面。
    a.src = currentTrack.audioUrl || currentTrack.videoUrl;
    a.volume = volume;
    a.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, tracks]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = volume;
    if (typeof window !== "undefined") localStorage.setItem(VOLUME_KEY, String(volume));
  }, [volume]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrent(a.currentTime);
    const onLoaded = () => setDuration(a.duration || 0);
    const onEnded = () => {
      if (repeatOne) {
        a.currentTime = 0;
        a.play().catch(() => {});
        return;
      }
      setCurrentIndex(idx => (idx + 1 < tracks.length ? idx + 1 : idx));
    };
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnded);
    };
  }, [repeatOne, tracks]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a || !currentTrack) return;
    if (a.paused) a.play().catch(() => {}); else a.pause();
  };
  const playPrev = () => setCurrentIndex(idx => Math.max(idx - 1, 0));
  const playNext = () => setCurrentIndex(idx => Math.min(idx + 1, tracks.length - 1));
  const seekTo = (e) => {
    const a = audioRef.current;
    if (!a || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    a.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  };

  const onHeaderPointerDown = (e) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    const el = winRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragRef.current = { dragging: true, pointerId: e.pointerId, grabX: e.clientX - rect.left };
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch (_) {}
  };
  const onHeaderPointerMove = (e) => {
    const st = dragRef.current;
    if (!st.dragging || e.pointerId !== st.pointerId) return;
    e.preventDefault();
    const el = winRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const x = Math.max(4, Math.min(e.clientX - st.grabX, window.innerWidth - w - 4));
    el.style.left = `${x}px`;
  };
  const endDrag = () => {
    const st = dragRef.current;
    if (!st.dragging) return;
    dragRef.current = { dragging: false };
    const el = winRef.current;
    if (!el) return;
    setLeft(el.getBoundingClientRect().left);
  };

  if (!tracks || tracks.length === 0) return null;

  const progressPct = duration ? (current / duration) * 100 : 0;

  return (
    <div ref={winRef} style={{
      position: "fixed", left, width,
      ...(minimized
        ? { top: "auto", bottom: EDGE_MARGIN, height: MINI_HEIGHT }
        : {
            top: "calc(var(--shell-margin, 0px) + env(safe-area-inset-top))",
            height: "calc(var(--viewport-h, 100vh) - var(--shell-margin, 0px) * 2 - env(safe-area-inset-top) - env(safe-area-inset-bottom))",
          }),
      maxWidth: `calc(100vw - ${EDGE_MARGIN * 2}px)`,
      zIndex: 2500, display: "flex", flexDirection: "column",
      background: "var(--panel)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg, 18px)",
      boxShadow: "0 16px 48px rgba(0,0,0,0.4)", overflow: "hidden",
    }}>
      <style>{"@keyframes audioSpin { to { transform: rotate(360deg); } }"}</style>
      <audio ref={audioRef} style={{ display: "none" }} />

      <div
        onPointerDown={onHeaderPointerDown}
        onPointerMove={onHeaderPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        style={{
          height: 44, flexShrink: 0, display: "flex", flexDirection: "column", justifyContent: "center",
          background: "var(--panel-alt)", borderBottom: "1px solid var(--border)",
          cursor: "grab", touchAction: "none", userSelect: "none",
        }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "0 10px 0 14px", minWidth: 0 }}>
          <span style={{ fontSize: 14, flexShrink: 0 }}>🎵</span>
          <div style={{ flex: 1, fontWeight: 700, fontSize: 13, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>
            {minimized ? (currentTrack?.text?.trim() || "音頻播放") : "音頻播放"}
          </div>
          <button onClick={() => setMinimized(v => !v)} onPointerDown={e => e.stopPropagation()} aria-label={minimized ? "還原視窗" : "縮小視窗"}
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, padding: 6, lineHeight: 1, flexShrink: 0 }}>
            {minimized ? "⤢" : "─"}
          </button>
          <button onClick={onClose} onPointerDown={e => e.stopPropagation()} aria-label="關閉"
            style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 15, padding: 6, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>
        {/* 縮小狀態下額外顯示的播放進度條——貼在小方塊底部一條細線，不用點的
            （太窄不好精準拖曳），純顯示目前播到哪。 */}
        {minimized && (
          <div style={{ height: 2, background: "var(--border)", marginTop: 4 }}>
            <div style={{ width: `${progressPct}%`, height: "100%", background: "var(--accent)" }} />
          </div>
        )}
      </div>

      {!minimized && (
      <>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: 10, display: "flex", flexDirection: "column", gap: 8 }}>
        {tracks.map((t, i) => {
          const isCurrent = currentIndex === i;
          const isPlayingThis = isCurrent && playing;
          return (
            <button key={t.id} onClick={() => (isCurrent ? togglePlay() : setCurrentIndex(i))}
              style={{ display: "flex", alignItems: "center", gap: 10, background: isCurrent ? "var(--panel-hover)" : "var(--panel)", border: "1px solid var(--border)", borderRadius: 12, padding: "8px 10px", cursor: "pointer", textAlign: "left", flexShrink: 0 }}>
              {t.userAvatarImage
                ? <img src={t.userAvatarImage} alt={t.userNickname} style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
                : <div style={{ width: 32, height: 32, borderRadius: "50%", background: t.userColor || "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "#fff", flexShrink: 0 }}>{t.userAvatar || "🎵"}</div>
              }
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: isCurrent ? "var(--accent)" : "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.text?.trim() || "（未命名音樂）"}
                </div>
                <div style={{ fontSize: 10, color: "var(--text-faint)" }}>{t.userNickname}</div>
              </div>
              <div style={{
                width: 30, height: 30, borderRadius: "50%", flexShrink: 0,
                background: isCurrent ? "var(--accent)" : "var(--panel-alt)",
                border: isCurrent ? "none" : "1px solid var(--border)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, color: isCurrent ? "var(--accent-text)" : "var(--text-muted)",
                animation: isPlayingThis ? "audioSpin 3s linear infinite" : "none",
              }}>
                {isPlayingThis ? "⏸" : "▶"}
              </div>
            </button>
          );
        })}
      </div>

      {currentTrack && (
        <div style={{ flexShrink: 0, borderTop: "1px solid var(--border)", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {currentTrack.text?.trim() || "（未命名音樂）"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 10, color: "var(--text-faint)", width: 30, flexShrink: 0 }}>{formatTime(current)}</span>
            <div onClick={seekTo} style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 2, cursor: "pointer" }}>
              <div style={{ width: duration ? `${progressPct}%` : "0%", height: "100%", background: "var(--accent)", borderRadius: 2 }} />
            </div>
            <span style={{ fontSize: 10, color: "var(--text-faint)", width: 30, flexShrink: 0, textAlign: "right" }}>{formatTime(duration)}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={playPrev} disabled={currentIndex === 0} aria-label="上一首" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, opacity: currentIndex === 0 ? 0.4 : 1 }}>⏮</button>
            <button onClick={togglePlay} aria-label={playing ? "暫停" : "播放"} style={{ background: "var(--accent)", border: "none", borderRadius: "50%", width: 32, height: 32, color: "var(--accent-text)", cursor: "pointer", fontSize: 15, flexShrink: 0 }}>{playing ? "⏸" : "▶"}</button>
            <button onClick={playNext} disabled={currentIndex === tracks.length - 1} aria-label="下一首" style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: 16, opacity: currentIndex === tracks.length - 1 ? 0.4 : 1 }}>⏭</button>
            <button onClick={() => setRepeatOne(v => !v)} title="單曲循環" aria-pressed={repeatOne}
              style={{ background: repeatOne ? "var(--accent-active)" : "none", border: "1px solid var(--border)", borderRadius: "50%", width: 26, height: 26, color: repeatOne ? "var(--accent)" : "var(--text-faint)", cursor: "pointer", fontSize: 12, flexShrink: 0 }}>
              🔁
            </button>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 13 }}>{volume === 0 ? "🔇" : volume < 0.5 ? "🔉" : "🔊"}</span>
            <input type="range" min={0} max={1} step={0.01} value={volume}
              onChange={e => setVolume(Number(e.target.value))}
              style={{ width: 70, accentColor: "var(--accent)", flexShrink: 0 }} />
          </div>
        </div>
      )}
      </>
      )}
    </div>
  );
}
