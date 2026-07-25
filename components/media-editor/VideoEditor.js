import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import EditorShell, { DrawerSlider, DrawerChipRow } from "./EditorShell";
import { probeClip, disposeClipCache } from "./video/videoDecode";
import { buildTimeline, drawFrame, getActiveFrames } from "./video/composeFrame";
import { exportVideoTimeline, exportCoverFrame, isWebCodecsSupported } from "./video/exportVideo";
import { validateVideoFile } from "./mediaValidation";
import { saveDraft } from "./editorDb";
import { toast } from "../../lib/toast";

const MAX_CLIPS = 10;
const MAX_OVERLAYS = 2;
const TRANSITIONS = [
  { id: "none", label: "無" },
  { id: "fade", label: "淡入淡出" },
  { id: "fadeblack", label: "黑場" },
  { id: "slideleft", label: "左滑" },
  { id: "slideright", label: "右滑" },
];
const RESOLUTIONS = [
  { id: "720p", label: "720p", w: 720, h: 1280 },
  { id: "1080p", label: "1080p", w: 1080, h: 1920 },
];
const STICKER_EMOJIS = ["❤️", "🔥", "😂", "😍", "🎉", "✨", "👍", "🥳"];

let clipIdSeq = 0;
const nextId = () => `c${Date.now()}_${clipIdSeq++}`;

const TOOLS = [
  { id: "clips", icon: "🎬", label: "片段" },
  { id: "trim", icon: "✂", label: "剪裁" },
  { id: "speed", icon: "»", label: "速度" },
  { id: "volume", icon: "🔊", label: "音量" },
  { id: "music", icon: "🎵", label: "音樂" },
  { id: "text", icon: "T", label: "文字" },
  { id: "sticker", icon: "😊", label: "貼圖" },
  { id: "transition", icon: "◐", label: "轉場" },
  { id: "cover", icon: "🖼", label: "封面" },
];

export default function VideoEditor({ files, draftId, onCancel, onExport }) {
  const [clips, setClips] = useState([]);
  const [music, setMusic] = useState(null);
  const [overlays, setOverlays] = useState([]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [selectedOverlayId, setSelectedOverlayId] = useState(null);
  const [activeTool, setActiveTool] = useState(null);
  const [ready, setReady] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [coverTime, setCoverTime] = useState(0);
  const [resolution, setResolution] = useState("720p");
  const [exportState, setExportState] = useState(null); // { progress } | null
  const [unsupported, setUnsupported] = useState(false);

  const canvasRef = useRef(null);
  const videoElsRef = useRef({}); // clipId -> <video>
  const musicElRef = useRef(null);
  const rafRef = useRef(null);
  const lastTsRef = useRef(0);
  const cancelRef = useRef(false);

  useEffect(() => {
    if (!isWebCodecsSupported()) setUnsupported(true);
  }, []);

  // ---- load initial files as clips ----
  useEffect(() => {
    let cancelled = false;
    async function load() {
      const loaded = [];
      for (const file of files.slice(0, MAX_CLIPS)) {
        const err = validateVideoFile(file);
        if (err) { toast(err); continue; }
        // eslint-disable-next-line no-await-in-loop
        const meta = await probeClip(file);
        loaded.push({
          id: nextId(), file, name: file.name,
          sourceDuration: meta.duration, hasAudio: meta.hasAudio,
          trimStart: 0, trimEnd: meta.duration,
          speed: 1, volume: 1, transitionIn: "none",
        });
      }
      if (!cancelled) {
        setClips(loaded);
        setReady(true);
      }
    }
    load();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files]);

  useEffect(() => () => {
    clips.forEach(c => disposeClipCache(c.file));
    Object.values(videoElsRef.current).forEach(v => v?.remove?.());
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const timeline = useMemo(() => buildTimeline(clips), [clips]);

  // Undo/redo isn't part of the video editor's required feature set (only
  // the photo editor needs it) — keep the shell's buttons present but
  // permanently disabled rather than half-wiring a history stack that
  // can't safely serialize File references for clips added mid-session.
  const canUndo = false;
  const canRedo = false;
  const undo = () => {};
  const redo = () => {};

  // ---- clip ops ----
  const updateClip = (id, patch) => {
    setClips(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };
  const removeClip = (id) => {
    setClips(prev => prev.filter(c => c.id !== id));
    if (selectedClipId === id) setSelectedClipId(null);
  };
  const moveClip = (id, dir) => {
    setClips(prev => {
      const i = prev.findIndex(c => c.id === id);
      const j = i + dir;
      if (j < 0 || j >= prev.length) return prev;
      const next = prev.slice();
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };
  const splitClipAtPlayhead = (id) => {
    const seg = timeline.segments.find(s => s.clip.id === id);
    if (!seg) return;
    const localT = playhead - seg.start;
    if (localT <= 0.05 || localT >= seg.duration - 0.05) { toast("請先把播放頭移到片段中間再分割"); return; }
    const splitSourceT = seg.clip.trimStart + localT * seg.clip.speed;
    setClips(prev => {
      const idx = prev.findIndex(c => c.id === id);
      if (idx === -1) return prev;
      const a = { ...prev[idx], id: nextId(), trimEnd: splitSourceT };
      const b = { ...prev[idx], id: nextId(), trimStart: splitSourceT };
      return [...prev.slice(0, idx), a, b, ...prev.slice(idx + 1)];
    });
  };

  const addMoreClips = async (fileList) => {
    const list = Array.from(fileList || []).slice(0, MAX_CLIPS - clips.length);
    const added = [];
    for (const file of list) {
      const err = validateVideoFile(file);
      if (err) { toast(err); continue; }
      // eslint-disable-next-line no-await-in-loop
      const meta = await probeClip(file);
      added.push({ id: nextId(), file, name: file.name, sourceDuration: meta.duration, hasAudio: meta.hasAudio, trimStart: 0, trimEnd: meta.duration, speed: 1, volume: 1, transitionIn: "none" });
    }
    setClips(prev => [...prev, ...added]);
  };

  // ---- music ----
  const onMusicFile = async (fileList) => {
    const file = fileList?.[0];
    if (!file) return;
    const meta = await probeClip(file).catch(() => ({ duration: 0 }));
    let duration = meta.duration;
    if (!duration) {
      // audio-only files have no video track for probeClip to read — fall back to an <audio> element.
      duration = await new Promise(resolve => {
        const a = document.createElement("audio");
        a.src = URL.createObjectURL(file);
        a.onloadedmetadata = () => resolve(a.duration);
      });
    }
    setMusic({ file, name: file.name, trimStart: 0, trimEnd: duration, volume: 0.8, duration });
  };

  // ---- overlays ----
  const addTextOverlay = () => {
    if (overlays.length >= MAX_OVERLAYS) { toast(`最多 ${MAX_OVERLAYS} 個文字/貼圖疊加`); return; }
    const ov = { id: nextId(), kind: "text", text: "雙擊編輯", startTime: playhead, endTime: Math.min(timeline.totalDuration, playhead + 3), x: 0.5, y: 0.5, color: "#ffffff", fontSize: 36 };
    setOverlays(prev => [...prev, ov]);
    setSelectedOverlayId(ov.id);
  };
  const addStickerOverlay = (emoji) => {
    if (overlays.length >= MAX_OVERLAYS) { toast(`最多 ${MAX_OVERLAYS} 個文字/貼圖疊加`); return; }
    const ov = { id: nextId(), kind: "sticker", emoji, startTime: playhead, endTime: Math.min(timeline.totalDuration, playhead + 3), x: 0.5, y: 0.5, fontSize: 64 };
    setOverlays(prev => [...prev, ov]);
    setSelectedOverlayId(ov.id);
  };
  const updateOverlay = (id, patch) => {
    setOverlays(prev => prev.map(o => o.id === id ? { ...o, ...patch } : o));
  };
  const removeOverlay = (id) => {
    setOverlays(prev => prev.filter(o => o.id !== id));
    if (selectedOverlayId === id) setSelectedOverlayId(null);
  };

  // ---- preview playback (native <video> elements; muted — see note) ----
  const getOrCreateVideoEl = useCallback((clip) => {
    let v = videoElsRef.current[clip.id];
    if (!v) {
      v = document.createElement("video");
      v.src = URL.createObjectURL(clip.file);
      v.muted = true;
      v.playsInline = true;
      v.preload = "auto";
      videoElsRef.current[clip.id] = v;
    }
    return v;
  }, []);

  const previewGetFrame = useCallback((clip, sourceTime) => {
    const v = getOrCreateVideoEl(clip);
    if (Math.abs(v.currentTime - sourceTime) > 0.12) {
      try { v.currentTime = Math.max(0, sourceTime); } catch { /* seek may throw before metadata loads */ }
    }
    return v.readyState >= 2 ? v : null;
  }, [getOrCreateVideoEl]);

  const renderPreviewFrame = useCallback(async (t) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    await drawFrame({ ctx, width: canvas.width, height: canvas.height, timeline, overlays, t, getFrameImage: previewGetFrame });
  }, [timeline, overlays, previewGetFrame]);

  useEffect(() => { renderPreviewFrame(playhead); }, [playhead, renderPreviewFrame]);

  useEffect(() => {
    if (!isPlaying) { cancelAnimationFrame(rafRef.current); return; }
    lastTsRef.current = performance.now();
    const tick = (ts) => {
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setPlayhead(prev => {
        const next = prev + dt;
        if (next >= timeline.totalDuration) { setIsPlaying(false); return 0; }
        return next;
      });
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [isPlaying, timeline.totalDuration]);

  // ---- export ----
  const doExport = async () => {
    if (clips.length === 0) { toast("請先加入至少一段影片"); return; }
    if (unsupported) { toast("這個瀏覽器不支援影片匯出所需的功能（WebCodecs），請改用最新版 Chrome/Edge/Safari"); return; }
    setIsPlaying(false);
    const res = RESOLUTIONS.find(r => r.id === resolution);
    cancelRef.current = false;
    setExportState({ progress: 0 });
    try {
      const [videoBlob, coverBlob] = await Promise.all([
        exportVideoTimeline({
          clips, music, overlays, width: res.w, height: res.h, fps: 30, format: "mp4", quality: "medium",
          onProgress: (p) => setExportState({ progress: p }),
          isCancelled: () => cancelRef.current,
        }),
        exportCoverFrame({ clips, overlays, coverTime, width: res.w, height: res.h }),
      ]);
      if (!videoBlob) { setExportState(null); return; } // cancelled
      if (draftId) {
        await saveDraft({
          id: draftId, type: "video", updatedAt: Date.now(),
          json: { clips: clips.map(c => ({ ...c, file: undefined })), music: music ? { ...music, file: undefined } : null, overlays, coverTime, resolution },
        });
      }
      onExport(videoBlob, coverBlob, { clips, music, overlays, resolution });
    } catch (e) {
      console.error("[VideoEditor] export failed", e);
      toast("影片匯出失敗，請重試");
    } finally {
      setExportState(null);
    }
  };

  const cancelExport = () => { cancelRef.current = true; };

  const selectedClip = clips.find(c => c.id === selectedClipId);
  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId);

  const drawer = renderDrawer({
    activeTool, clips, selectedClipId, setSelectedClipId, selectedClip,
    updateClip, removeClip, moveClip, splitClipAtPlayhead, addMoreClips,
    music, onMusicFile, setMusic,
    overlays, selectedOverlayId, setSelectedOverlayId, selectedOverlay,
    addTextOverlay, addStickerOverlay, updateOverlay, removeOverlay,
    coverTime, setCoverTime, playhead, resolution, setResolution,
    timeline,
  });

  if (unsupported) {
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 2000, background: "#000", color: "#fff", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, padding: 24, textAlign: "center" }}>
        <div style={{ fontSize: 40 }}>🎬</div>
        <div>這個瀏覽器不支援影片編輯所需的功能（WebCodecs API）。<br />請改用最新版 Chrome、Edge 或 Safari。</div>
        <button onClick={onCancel} style={{ minHeight: 44, padding: "0 20px", borderRadius: 22, border: "1px solid #444", background: "none", color: "#fff", fontSize: 14 }}>返回</button>
      </div>
    );
  }

  return (
    <EditorShell
      onBack={onCancel}
      onUndo={undo} onRedo={redo} canUndo={canUndo} canRedo={canRedo}
      onNext={doExport} nextLabel="發布" nextDisabled={!ready || clips.length === 0} busy={!!exportState}
      tools={TOOLS} activeTool={activeTool}
      onSelectTool={(id) => setActiveTool(prev => prev === id ? null : id)}
      drawer={drawer}
      preview={
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <div style={{ position: "relative", maxWidth: "100%", maxHeight: "calc(100% - 40px)" }}>
            <canvas ref={canvasRef} width={RESOLUTIONS.find(r => r.id === resolution).w} height={RESOLUTIONS.find(r => r.id === resolution).h}
              style={{ maxWidth: "100%", maxHeight: "100%", height: "auto", width: "auto", background: "#000", display: "block" }} />
            {!ready && <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#888" }}>載入中...</div>}
            {exportState && (
              <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#fff" }}>
                <div style={{ fontSize: 13 }}>匯出中... {Math.round(exportState.progress * 100)}%</div>
                <div style={{ width: "70%", height: 6, background: "#333", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ width: `${exportState.progress * 100}%`, height: "100%", background: "var(--accent)", transition: "width 0.15s linear" }} />
                </div>
                <button onClick={cancelExport} style={{ marginTop: 8, minHeight: 40, padding: "0 16px", borderRadius: 20, border: "1px solid #555", background: "none", color: "#fff", fontSize: 12 }}>取消</button>
              </div>
            )}
          </div>
          {ready && (
            <div style={{ width: "100%", padding: "0 12px", display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setIsPlaying(p => !p)} aria-label={isPlaying ? "暫停" : "播放"}
                style={{ width: 36, height: 36, borderRadius: "50%", border: "none", background: "#fff", color: "#000", fontSize: 14, flexShrink: 0 }}>
                {isPlaying ? "❚❚" : "▶"}
              </button>
              <input type="range" min={0} max={Math.max(0.01, timeline.totalDuration)} step={0.01} value={Math.min(playhead, timeline.totalDuration)}
                onChange={e => { setIsPlaying(false); setPlayhead(Number(e.target.value)); }}
                style={{ flex: 1, height: 32 }} />
              <span style={{ color: "#aaa", fontSize: 11, flexShrink: 0, minWidth: 68, textAlign: "right" }}>
                {formatTime(playhead)} / {formatTime(timeline.totalDuration)}
              </span>
            </div>
          )}
        </div>
      }
    />
  );
}

function formatTime(s) {
  if (!Number.isFinite(s)) return "0:00";
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function renderDrawer(p) {
  switch (p.activeTool) {
    case "clips":
      return (
        <div>
          {p.clips.length === 0 && <div style={{ color: "#777", fontSize: 12, marginBottom: 8 }}>還沒有片段</div>}
          {p.clips.map((c, i) => (
            <div key={c.id} onClick={() => p.setSelectedClipId(c.id)}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 6, borderRadius: 10, background: p.selectedClipId === c.id ? "#2a2a2a" : "#181818", cursor: "pointer" }}>
              <span style={{ color: "#fff", fontSize: 12, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{i + 1}. {c.name}</span>
              <span style={{ color: "#888", fontSize: 11 }}>{formatTime((c.trimEnd - c.trimStart) / c.speed)}</span>
              <button onClick={(e) => { e.stopPropagation(); p.moveClip(c.id, -1); }} style={miniBtnStyle} aria-label="上移">↑</button>
              <button onClick={(e) => { e.stopPropagation(); p.moveClip(c.id, 1); }} style={miniBtnStyle} aria-label="下移">↓</button>
              <button onClick={(e) => { e.stopPropagation(); p.removeClip(c.id); }} style={{ ...miniBtnStyle, color: "#ef4444" }} aria-label="刪除">✕</button>
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <label style={{ ...toolBtnStyle, display: "inline-flex", alignItems: "center", cursor: p.clips.length >= MAX_CLIPS ? "default" : "pointer", opacity: p.clips.length >= MAX_CLIPS ? 0.5 : 1 }}>
              + 加入片段
              <input type="file" accept="video/*" multiple disabled={p.clips.length >= MAX_CLIPS} style={{ display: "none" }} onChange={e => p.addMoreClips(e.target.files)} />
            </label>
            {p.selectedClipId && <button onClick={() => p.splitClipAtPlayhead(p.selectedClipId)} style={toolBtnStyle}>✂ 在播放頭分割</button>}
          </div>
        </div>
      );
    case "trim":
      if (!p.selectedClip) return <div style={{ color: "#777", fontSize: 12 }}>請先在「片段」選一段影片</div>;
      return (
        <div>
          <DrawerSlider label="開始 (秒)" value={round2(p.selectedClip.trimStart)} min={0} max={round2(p.selectedClip.trimEnd - 0.1)} step={0.1}
            onChange={v => p.updateClip(p.selectedClip.id, { trimStart: v })} />
          <DrawerSlider label="結束 (秒)" value={round2(p.selectedClip.trimEnd)} min={round2(p.selectedClip.trimStart + 0.1)} max={round2(p.selectedClip.sourceDuration)} step={0.1}
            onChange={v => p.updateClip(p.selectedClip.id, { trimEnd: v })} />
        </div>
      );
    case "speed":
      if (!p.selectedClip) return <div style={{ color: "#777", fontSize: 12 }}>請先在「片段」選一段影片</div>;
      return <DrawerSlider label="速度" value={p.selectedClip.speed} min={0.5} max={2} step={0.1} onChange={v => p.updateClip(p.selectedClip.id, { speed: v })} />;
    case "volume":
      if (!p.selectedClip) return <div style={{ color: "#777", fontSize: 12 }}>請先在「片段」選一段影片</div>;
      return <DrawerSlider label="片段音量" value={p.selectedClip.volume} min={0} max={1} step={0.05} onChange={v => p.updateClip(p.selectedClip.id, { volume: v })} />;
    case "music":
      return (
        <div>
          {!p.music ? (
            <label style={{ ...toolBtnStyle, display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
              + 加入背景音樂
              <input type="file" accept="audio/*" style={{ display: "none" }} onChange={e => p.onMusicFile(e.target.files)} />
            </label>
          ) : (
            <div>
              <div style={{ color: "#fff", fontSize: 12, marginBottom: 8 }}>{p.music.name}</div>
              <DrawerSlider label="開始 (秒)" value={round2(p.music.trimStart)} min={0} max={round2(p.music.trimEnd - 0.1)} step={0.1}
                onChange={v => p.setMusic(m => ({ ...m, trimStart: v }))} />
              <DrawerSlider label="結束 (秒)" value={round2(p.music.trimEnd)} min={round2(p.music.trimStart + 0.1)} max={round2(p.music.duration)} step={0.1}
                onChange={v => p.setMusic(m => ({ ...m, trimEnd: v }))} />
              <DrawerSlider label="音樂音量" value={p.music.volume} min={0} max={1} step={0.05} onChange={v => p.setMusic(m => ({ ...m, volume: v }))} />
              <button onClick={() => p.setMusic(null)} style={{ ...toolBtnStyle, color: "#ef4444" }}>移除音樂</button>
            </div>
          )}
        </div>
      );
    case "text":
      return (
        <div>
          <button onClick={p.addTextOverlay} style={toolBtnStyle}>+ 新增文字（{p.overlays.length}/{MAX_OVERLAYS}）</button>
          {p.selectedOverlay?.kind === "text" && (
            <div style={{ marginTop: 10 }}>
              <input value={p.selectedOverlay.text} onChange={e => p.updateOverlay(p.selectedOverlay.id, { text: e.target.value })}
                style={{ width: "100%", minHeight: 44, background: "#222", border: "1px solid #333", borderRadius: 8, color: "#fff", padding: "0 10px", marginBottom: 10, boxSizing: "border-box" }} />
              <DrawerSlider label="出現時間 (秒)" value={round2(p.selectedOverlay.startTime)} min={0} max={round2(p.timeline.totalDuration)} step={0.1}
                onChange={v => p.updateOverlay(p.selectedOverlay.id, { startTime: v })} />
              <DrawerSlider label="結束時間 (秒)" value={round2(p.selectedOverlay.endTime)} min={round2(p.selectedOverlay.startTime)} max={round2(p.timeline.totalDuration)} step={0.1}
                onChange={v => p.updateOverlay(p.selectedOverlay.id, { endTime: v })} />
              <button onClick={() => p.removeOverlay(p.selectedOverlay.id)} style={{ ...toolBtnStyle, color: "#ef4444" }}>刪除這個文字</button>
            </div>
          )}
        </div>
      );
    case "sticker":
      return (
        <div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
            {STICKER_EMOJIS.map(e => (
              <button key={e} onClick={() => p.addStickerOverlay(e)} style={{ ...toolBtnStyle, fontSize: 22, width: 44, padding: 0 }} disabled={p.overlays.length >= MAX_OVERLAYS}>{e}</button>
            ))}
          </div>
          {p.selectedOverlay?.kind === "sticker" && (
            <div>
              <DrawerSlider label="出現時間 (秒)" value={round2(p.selectedOverlay.startTime)} min={0} max={round2(p.timeline.totalDuration)} step={0.1}
                onChange={v => p.updateOverlay(p.selectedOverlay.id, { startTime: v })} />
              <DrawerSlider label="結束時間 (秒)" value={round2(p.selectedOverlay.endTime)} min={round2(p.selectedOverlay.startTime)} max={round2(p.timeline.totalDuration)} step={0.1}
                onChange={v => p.updateOverlay(p.selectedOverlay.id, { endTime: v })} />
              <button onClick={() => p.removeOverlay(p.selectedOverlay.id)} style={{ ...toolBtnStyle, color: "#ef4444" }}>刪除這個貼圖</button>
            </div>
          )}
        </div>
      );
    case "transition":
      if (!p.selectedClip) return <div style={{ color: "#777", fontSize: 12 }}>請先在「片段」選一段影片（轉場套用在該片段與前一段之間）</div>;
      return <DrawerChipRow items={TRANSITIONS} activeId={p.selectedClip.transitionIn} onSelect={id => p.updateClip(p.selectedClip.id, { transitionIn: id })} />;
    case "cover":
      return (
        <div>
          <div style={{ color: "#aaa", fontSize: 12, marginBottom: 10 }}>拖曳下方播放進度到想要的畫面，再按「設為封面」</div>
          <button onClick={() => p.setCoverTime(p.playhead)} style={applyBtnStyle}>設為封面（目前：{formatTime(p.coverTime)}）</button>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, color: "#aaa", marginBottom: 6 }}>輸出解析度</div>
            <DrawerChipRow items={RESOLUTIONS} activeId={p.resolution} onSelect={p.setResolution} />
          </div>
        </div>
      );
    default:
      return null;
  }
}

function round2(n) { return Math.round(n * 100) / 100; }

const toolBtnStyle = {
  minHeight: 44, padding: "0 14px", borderRadius: 10, border: "1px solid #333",
  background: "#222", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer",
};
const applyBtnStyle = { ...toolBtnStyle, width: "100%", background: "var(--accent)", border: "none" };
const miniBtnStyle = { width: 28, height: 28, borderRadius: 6, border: "none", background: "#333", color: "#fff", fontSize: 12, cursor: "pointer", flexShrink: 0 };
