import {
  Output, Mp4OutputFormat, WebMOutputFormat, BufferTarget, CanvasSource, AudioBufferSource,
  QUALITY_LOW, QUALITY_MEDIUM, QUALITY_HIGH, QUALITY_VERY_HIGH,
} from "mediabunny";
import { buildTimeline, drawFrame } from "./composeFrame";
import { getFrameAt } from "./videoDecode";
import { mixTimelineAudio } from "./audioMix";

const QUALITY_MAP = { low: QUALITY_LOW, medium: QUALITY_MEDIUM, high: QUALITY_HIGH, very_high: QUALITY_VERY_HIGH };

// This is the deterministic, non-realtime pass: WebCodecs decodes each
// clip's exact frame for each output timestamp regardless of how fast that
// happens to run, so a slow device gets a slower export, never a wrong one.
export async function exportVideoTimeline({
  clips, music, overlays, width, height, fps = 30, format = "mp4", quality = "medium",
  onProgress, isCancelled,
}) {
  const timeline = buildTimeline(clips);
  const totalDuration = timeline.totalDuration;
  if (totalDuration <= 0) throw new Error("時間軸沒有內容可以匯出");
  const frameCount = Math.max(1, Math.ceil(totalDuration * fps));

  const outputFormat = format === "webm" ? new WebMOutputFormat() : new Mp4OutputFormat();
  const output = new Output({ format: outputFormat, target: new BufferTarget() });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");

  const videoSource = new CanvasSource(canvas, { codec: format === "webm" ? "vp9" : "avc", bitrate: QUALITY_MAP[quality] });
  output.addVideoTrack(videoSource, { frameRate: fps });

  const audioBuffer = await mixTimelineAudio({ clips, music, totalDuration });
  let audioSource = null;
  if (audioBuffer) {
    audioSource = new AudioBufferSource({ codec: format === "webm" ? "opus" : "aac", bitrate: QUALITY_MAP[quality] });
    output.addAudioTrack(audioSource);
  }

  await output.start();
  if (audioSource) {
    await audioSource.add(audioBuffer);
    audioSource.close();
  }

  const getFrameImage = (clip, sourceTime) => getFrameAt(clip.file, sourceTime);

  for (let i = 0; i < frameCount; i++) {
    if (isCancelled?.()) {
      await output.cancel();
      return null;
    }
    const t = i / fps;
    // eslint-disable-next-line no-await-in-loop
    await drawFrame({ ctx, width, height, timeline, overlays, t, getFrameImage });
    // eslint-disable-next-line no-await-in-loop
    await videoSource.add(t, 1 / fps);
    onProgress?.(i / frameCount);
  }

  if (isCancelled?.()) {
    await output.cancel();
    return null;
  }

  videoSource.close();
  await output.finalize();
  onProgress?.(1);

  const buffer = output.target.buffer;
  if (!buffer) return null;
  return new Blob([buffer], { type: format === "webm" ? "video/webm" : "video/mp4" });
}

export async function exportCoverFrame({ clips, overlays, coverTime, width, height }) {
  const timeline = buildTimeline(clips);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  await drawFrame({
    ctx, width, height, timeline, overlays,
    t: Math.min(coverTime, timeline.totalDuration),
    getFrameImage: (clip, sourceTime) => getFrameAt(clip.file, sourceTime),
  });
  return new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", 0.9));
}

export function isWebCodecsSupported() {
  return typeof window !== "undefined" && "VideoEncoder" in window && "VideoDecoder" in window;
}
