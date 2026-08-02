import { useState, useRef, useEffect, useCallback } from "react";

function formatTime(sec) {
  if (!isFinite(sec) || sec < 0) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

// 自訂影片播放器（取代原生 <video controls>）：一般模式下滑鼠離開播放器範圍，
// 控制列跟中間播放鈕就會消失；進到全螢幕後，滑鼠 3 秒沒有動作也會自動收起，
// 跟一般影音平台的播放器行為一致。
export default function VideoPlayer({ src, poster, autoPlay = false, subtitles }) {
  const containerRef = useRef(null);
  const videoRef = useRef(null);
  const hideTimerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [muted, setMuted] = useState(false);

  const togglePlay = useCallback((e) => {
    e?.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrent(v.currentTime);
    const onLoaded = () => setDuration(v.duration || 0);
    const onEnded = () => setPlaying(false);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // 全螢幕模式才會有「幾秒沒動作自動收起」這件事；一般模式單純由 onMouseLeave 收起。
  const scheduleAutoHide = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    if (isFullscreen) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isFullscreen]);

  useEffect(() => {
    setShowControls(true);
    scheduleAutoHide();
    return () => clearTimeout(hideTimerRef.current);
  }, [isFullscreen, scheduleAutoHide]);

  const onMouseMove = () => {
    setShowControls(true);
    scheduleAutoHide();
  };
  const onMouseLeave = () => {
    if (!isFullscreen) setShowControls(false);
  };

  const toggleFullscreen = (e) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    if (document.fullscreenElement) document.exitFullscreen();
    else containerRef.current.requestFullscreen?.();
  };

  const seekTo = (ratio) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const t = Math.min(duration, Math.max(0, ratio * duration));
    v.currentTime = t;
    setCurrent(t);
  };

  const onBarClick = (e) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    seekTo((e.clientX - rect.left) / rect.width);
  };

  const toggleMute = (e) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const progress = duration ? (current / duration) * 100 : 0;
  // AI 自動生成的字幕（見 lib/generateSubtitles.js）——純燒錄式疊字，沒有
  // CC 開關，跟著 current 播放時間找目前該顯示哪一段。
  const activeCaption = subtitles?.length
    ? subtitles.find(s => current >= s.start && current < s.end)?.text || ""
    : "";

  return (
    <div ref={containerRef} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
      style={{
        position: "relative", width: "100%", background: "#000",
        // 非全螢幕時強制 16:9，不管影片本身實際比例是多少——直向手機錄影塞進
        // 版面常常會被拉伸/裁得很怪，統一成 16:9 版面才不會每支影片高度都不
        // 一樣。進全螢幕後改用 height:100%（撐滿整個全螢幕視窗），裡面
        // <video> 的 objectFit:contain 自然會照它自己真正的比例做信箱黑邊，
        // 這就是「點擊全螢幕才回復自身影片比例」。
        aspectRatio: isFullscreen ? undefined : "16 / 9",
        height: isFullscreen ? "100%" : undefined,
        maxHeight: "100%",
        display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
        cursor: showControls ? "default" : "none",
      }}>
      <video ref={videoRef} src={src} poster={poster} autoPlay={autoPlay} playsInline
        onClick={togglePlay}
        style={{ maxWidth: "100%", maxHeight: "100%", width: "100%", height: "100%", objectFit: "contain", display: "block", cursor: "pointer" }} />

      {activeCaption && (
        <div style={{
          position: "absolute", left: "50%", bottom: showControls ? 78 : 20, transform: "translateX(-50%)",
          maxWidth: "88%", textAlign: "center", background: "rgba(0,0,0,0.65)", color: "#fff",
          fontSize: 15, fontWeight: 600, padding: "4px 12px", borderRadius: 6, lineHeight: 1.4,
          transition: "bottom 0.25s", pointerEvents: "none", zIndex: 3,
        }}>
          {activeCaption}
        </div>
      )}

      {/* 中間大播放鈕：暫停時、且控制列可見時才顯示 */}
      {!playing && (
        <button onClick={togglePlay} aria-label="播放"
          style={{
            position: "absolute", inset: 0, margin: "auto", width: 64, height: 64, borderRadius: "50%",
            background: "rgba(0,0,0,0.55)", border: "none", color: "#fff", fontSize: 26, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none",
            transition: "opacity 0.2s",
          }}>
          ▶
        </button>
      )}

      {/* 底部控制列：進度條 + 播放/靜音/時間/全螢幕 */}
      <div
        style={{
          position: "absolute", left: 0, right: 0, bottom: 0, padding: "22px 14px 10px",
          background: "linear-gradient(to top, rgba(0,0,0,0.75), transparent)",
          opacity: showControls ? 1 : 0, pointerEvents: showControls ? "auto" : "none",
          transition: "opacity 0.25s",
        }}>
        <div onClick={onBarClick}
          style={{ width: "100%", height: 4, background: "rgba(255,255,255,0.3)", borderRadius: 2, cursor: "pointer", marginBottom: 10, position: "relative" }}>
          <div style={{ width: `${progress}%`, height: "100%", background: "var(--accent, #7C5CFF)", borderRadius: 2 }} />
          <div style={{ position: "absolute", left: `${progress}%`, top: "50%", transform: "translate(-50%,-50%)", width: 12, height: 12, borderRadius: "50%", background: "var(--accent, #7C5CFF)" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={togglePlay} aria-label={playing ? "暫停" : "播放"} style={{ background: "none", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", padding: 0 }}>
            {playing ? "⏸" : "▶"}
          </button>
          <button onClick={toggleMute} aria-label={muted ? "取消靜音" : "靜音"} style={{ background: "none", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", padding: 0 }}>
            {muted ? "🔇" : "🔊"}
          </button>
          <span style={{ color: "#fff", fontSize: 12, fontVariantNumeric: "tabular-nums" }}>
            {formatTime(current)} / {formatTime(duration)}
          </span>
          <div style={{ flex: 1 }} />
          <button onClick={toggleFullscreen} aria-label={isFullscreen ? "退出全螢幕" : "全螢幕"} style={{ background: "none", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", padding: 0 }}>
            {isFullscreen ? "⤢" : "⛶"}
          </button>
        </div>
      </div>
    </div>
  );
}
