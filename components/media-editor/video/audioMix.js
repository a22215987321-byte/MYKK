// Pre-mixes every clip's own audio (at its per-clip volume) plus an optional
// music track (at its own volume) into a single AudioBuffer spanning the
// whole export duration, using OfflineAudioContext — this renders faster
// than realtime and keeps mixing entirely off the export's per-frame loop.
const decodeCache = new Map(); // File -> Promise<AudioBuffer>

function decodeFileAudio(file, ctx) {
  if (!decodeCache.has(file)) {
    decodeCache.set(file, file.arrayBuffer().then(buf => ctx.decodeAudioData(buf)));
  }
  return decodeCache.get(file);
}

export async function mixTimelineAudio({ clips, music, totalDuration, sampleRate = 44100 }) {
  if (totalDuration <= 0) return null;
  const ctx = new OfflineAudioContext(2, Math.ceil(totalDuration * sampleRate), sampleRate);
  let cursor = 0;
  let hasAnySource = false;

  for (const clip of clips) {
    const clipDur = (clip.trimEnd - clip.trimStart) / clip.speed;
    if (clip.volume > 0 && clip.hasAudio) {
      try {
        const buffer = await decodeFileAudio(clip.file, ctx);
        const src = ctx.createBufferSource();
        src.buffer = buffer;
        const gain = ctx.createGain();
        gain.gain.value = clip.volume;
        src.connect(gain).connect(ctx.destination);
        const safeEnd = Math.min(clip.trimEnd, buffer.duration);
        const safeStart = Math.min(clip.trimStart, safeEnd);
        if (safeEnd > safeStart) {
          src.start(cursor, safeStart, safeEnd - safeStart);
          hasAnySource = true;
        }
      } catch (e) {
        console.error("[VideoEditor.audioMix] failed to decode clip audio", clip.id, e);
      }
    }
    cursor += clipDur;
  }

  if (music?.file && music.volume > 0) {
    try {
      const buffer = await decodeFileAudio(music.file, ctx);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      const gain = ctx.createGain();
      gain.gain.value = music.volume;
      src.connect(gain).connect(ctx.destination);
      const safeEnd = Math.min(music.trimEnd, buffer.duration);
      const safeStart = Math.min(music.trimStart, safeEnd);
      const playDur = Math.min(safeEnd - safeStart, totalDuration);
      if (playDur > 0) {
        src.start(0, safeStart, playDur);
        hasAnySource = true;
      }
    } catch (e) {
      console.error("[VideoEditor.audioMix] failed to decode music", e);
    }
  }

  if (!hasAnySource) return null;
  return ctx.startRendering();
}
