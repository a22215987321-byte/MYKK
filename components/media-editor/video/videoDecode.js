import { Input, BlobSource, ALL_FORMATS, CanvasSink } from "mediabunny";

// One mediabunny Input + CanvasSink per source file, cached and reused —
// re-opening/re-probing the same clip on every export frame would be very
// slow. This is export-only: live preview uses native <video> elements
// instead (see VideoEditor.js) because seeking a real <video> element is
// far cheaper for realtime scrubbing than decoding via WebCodecs per frame;
// mediabunny is reserved for the deterministic, non-realtime export pass.
const cache = new Map(); // File -> { input, videoTrack, audioTrack, duration, sink }

export async function probeClip(file) {
  const entry = await getEntry(file);
  return { duration: entry.duration, hasAudio: !!entry.audioTrack, width: entry.videoTrack?.displayWidth, height: entry.videoTrack?.displayHeight };
}

async function getEntry(file) {
  if (cache.has(file)) return cache.get(file);
  const input = new Input({ formats: ALL_FORMATS, source: new BlobSource(file) });
  const videoTrack = await input.getPrimaryVideoTrack();
  const audioTrack = (await input.getAudioTracks())[0] || null;
  const duration = await input.computeDuration();
  const sink = videoTrack ? new CanvasSink(videoTrack, { width: videoTrack.displayWidth, height: videoTrack.displayHeight }) : null;
  const entry = { input, videoTrack, audioTrack, duration, sink };
  cache.set(file, entry);
  return entry;
}

// Frame-accurate canvas for a given source-relative timestamp (seconds).
export async function getFrameAt(file, sourceTime) {
  const entry = await getEntry(file);
  if (!entry.sink) return null;
  const wrapped = await entry.sink.getCanvas(Math.max(0, sourceTime));
  return wrapped?.canvas || null;
}

export async function getAudioArrayBuffer(file) {
  return file.arrayBuffer();
}

export function disposeClipCache(file) {
  const entry = cache.get(file);
  if (entry) {
    entry.input.dispose?.();
    cache.delete(file);
  }
}
