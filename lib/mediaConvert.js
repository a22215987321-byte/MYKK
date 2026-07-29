import {
  Input, Output, Conversion, ALL_FORMATS, BlobSource, BufferTarget,
  Mp4OutputFormat, WebMOutputFormat, MovOutputFormat, MkvOutputFormat,
  WavOutputFormat, OggOutputFormat,
} from "mediabunny";

// Client-side video/audio conversion via mediabunny (WebCodecs-based, no
// server involved at all). Candidate output containers to offer — deliberately
// NOT including Mp3OutputFormat: MP3 *encoding* isn't natively supported by
// browser WebCodecs, mediabunny only gets it via the separate
// @mediabunny/mp3-encoder plugin package, which isn't installed (and we're
// not adding it — see the approved plan). Trying to target MP3 without that
// plugin would just come back invalid on every browser anyway.
const VIDEO_FORMAT_DEFS = [
  { id: "mp4", label: "MP4", mime: "video/mp4", make: () => new Mp4OutputFormat() },
  { id: "webm", label: "WebM", mime: "video/webm", make: () => new WebMOutputFormat() },
  { id: "mov", label: "MOV", mime: "video/quicktime", make: () => new MovOutputFormat() },
  { id: "mkv", label: "MKV", mime: "video/x-matroska", make: () => new MkvOutputFormat() },
];
const AUDIO_FORMAT_DEFS = [
  { id: "wav", label: "WAV", mime: "audio/wav", make: () => new WavOutputFormat() },
  { id: "ogg", label: "OGG", mime: "audio/ogg", make: () => new OggOutputFormat() },
];

function makeInput(file) {
  return new Input({ source: new BlobSource(file), formats: ALL_FORMATS });
}

// Whether this specific def is actually usable for this specific file in
// this specific browser — probed by actually initializing a Conversion
// against it and checking `isValid`, rather than guessing from a hardcoded
// codec-support table. `Conversion.init` only negotiates codecs/tracks, it
// doesn't do the (expensive) decode/encode pass, so probing every candidate
// up front is cheap.
async function probeTarget(input, def) {
  try {
    const output = new Output({ format: def.make(), target: new BufferTarget() });
    const conversion = await Conversion.init({ input, output, showWarnings: false });
    return conversion.isValid;
  } catch {
    return false;
  }
}

// Returns the subset of VIDEO_FORMAT_DEFS/AUDIO_FORMAT_DEFS (whichever
// applies to this file) that this browser can actually produce right now —
// never advertises a target format that would fail on conversion.
export async function getSupportedMediaTargets(file) {
  const input = makeInput(file);
  const videoTrack = await input.getPrimaryVideoTrack();
  const defs = videoTrack ? VIDEO_FORMAT_DEFS : AUDIO_FORMAT_DEFS;
  const results = await Promise.all(defs.map(def => probeTarget(input, def)));
  return defs.filter((_, i) => results[i]).map(({ id, label }) => ({ id, label }));
}

// targetId: one of the ids returned by getSupportedMediaTargets for this
// same file. onProgress(pct 0-100) is optional.
export async function convertMediaFile(file, { targetId, onProgress } = {}) {
  const def = [...VIDEO_FORMAT_DEFS, ...AUDIO_FORMAT_DEFS].find(d => d.id === targetId);
  if (!def) throw new Error(`不支援的輸出格式：${targetId}`);

  const input = makeInput(file);
  const target = new BufferTarget();
  const output = new Output({ format: def.make(), target });
  const conversion = await Conversion.init({ input, output });
  if (!conversion.isValid) {
    throw new Error("此瀏覽器不支援轉成這個格式，請換一個目標格式試試");
  }
  if (onProgress) conversion.onProgress = (progress) => onProgress(Math.round(progress * 100));

  await conversion.execute();
  return new Blob([target.buffer], { type: def.mime });
}
