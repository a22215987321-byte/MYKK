// Shared frame-compositing logic used by BOTH the live preview loop (fed
// native <video> elements) and the export loop (fed mediabunny-decoded
// canvases) — same function, same math, so what you see while editing is
// what actually gets exported. `getFrameImage(clip, sourceTime)` is the only
// part that differs between the two callers.

const TRANSITION_DURATION = 0.5; // seconds — fixed, not user-tunable (MVP)

export function buildTimeline(clips) {
  const segments = [];
  let cursor = 0;
  clips.forEach((clip, i) => {
    const duration = Math.max(0, (clip.trimEnd - clip.trimStart) / clip.speed);
    const hasTransitionIn = i > 0 && clip.transitionIn && clip.transitionIn !== "none";
    const t = hasTransitionIn ? Math.min(TRANSITION_DURATION, duration * 0.4, segments[i - 1]?.duration * 0.4 || TRANSITION_DURATION) : 0;
    // This segment's own transition-in window pulls its start backward so it
    // overlaps the tail of the previous segment (that's what a crossfade
    // needs) — using the un-shifted cursor here was the original bug: it
    // made the *next* clip start early but never actually moved *this*
    // segment's start, so the overlap window never existed.
    const start = cursor - t;
    segments.push({ clip, index: i, duration, start, end: start + duration, transitionInDuration: t, transitionType: clip.transitionIn });
    cursor = start + duration;
  });
  return { segments, totalDuration: Math.max(0, cursor) };
}

// Adjacent segments deliberately overlap during a transition window (see
// buildTimeline: segment i+1's `start` is pulled backward by its own
// transitionInDuration). A naive single linear-scan-and-return-first-match
// would let segment i's un-shortened `end` win that overlap and hide the
// transition entirely, so this checks every segment's transition-in zone
// first (highest priority), then falls back to plain single-clip zones
// clipped to *not* include the next segment's transition zone.
export function getActiveFrames(timeline, t) {
  const { segments } = timeline;

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    const T = seg.transitionInDuration;
    if (T > 0 && t >= seg.start && t < seg.start + T) {
      const prevSeg = segments[i - 1];
      const alpha = (t - seg.start) / T;
      const incomingSourceTime = seg.clip.trimStart + (t - seg.start) * seg.clip.speed;
      const outgoingLocalT = (prevSeg.duration - T) + (t - seg.start);
      const outgoingSourceTime = prevSeg.clip.trimStart + outgoingLocalT * prevSeg.clip.speed;
      return {
        type: "transition", transitionType: seg.transitionType, alpha,
        outgoing: { clip: prevSeg.clip, sourceTime: outgoingSourceTime },
        incoming: { clip: seg.clip, sourceTime: incomingSourceTime },
      };
    }
  }

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const nextSeg = segments[i + 1];
    const plainEnd = nextSeg ? nextSeg.start : seg.end;
    const isLast = !nextSeg;
    if (t >= seg.start && (t < plainEnd || (isLast && t <= plainEnd))) {
      return { type: "single", clip: seg.clip, sourceTime: seg.clip.trimStart + (t - seg.start) * seg.clip.speed };
    }
  }
  return null;
}

function drawCover(ctx, source, w, h, offsetX = 0, offsetY = 0) {
  const sw = source.videoWidth || source.width;
  const sh = source.videoHeight || source.height;
  if (!sw || !sh) return;
  const scale = Math.max(w / sw, h / sh);
  const dw = sw * scale, dh = sh * scale;
  const dx = (w - dw) / 2 + offsetX, dy = (h - dh) / 2 + offsetY;
  ctx.drawImage(source, dx, dy, dw, dh);
}

function drawOverlay(ctx, ov, w, h) {
  const x = ov.x * w, y = ov.y * h;
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (ov.kind === "sticker") {
    ctx.font = `${ov.fontSize || 64}px sans-serif`;
    ctx.fillText(ov.emoji, x, y);
  } else {
    ctx.font = `700 ${ov.fontSize || 36}px sans-serif`;
    ctx.lineWidth = 3;
    ctx.strokeStyle = "rgba(0,0,0,0.7)";
    ctx.fillStyle = ov.color || "#ffffff";
    ctx.strokeText(ov.text, x, y);
    ctx.fillText(ov.text, x, y);
  }
  ctx.restore();
}

export async function drawFrame({ ctx, width, height, timeline, overlays, t, getFrameImage }) {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, width, height);

  const active = getActiveFrames(timeline, t);
  if (active?.type === "single") {
    const img = await getFrameImage(active.clip, active.sourceTime);
    if (img) drawCover(ctx, img, width, height);
  } else if (active?.type === "transition") {
    const [imgOut, imgIn] = await Promise.all([
      getFrameImage(active.outgoing.clip, active.outgoing.sourceTime),
      getFrameImage(active.incoming.clip, active.incoming.sourceTime),
    ]);
    const alpha = active.alpha;
    if (active.transitionType === "fadeblack") {
      if (alpha < 0.5 && imgOut) { ctx.globalAlpha = 1 - alpha / 0.5; drawCover(ctx, imgOut, width, height); ctx.globalAlpha = 1; }
      else if (imgIn) { ctx.globalAlpha = (alpha - 0.5) / 0.5; drawCover(ctx, imgIn, width, height); ctx.globalAlpha = 1; }
    } else if (active.transitionType === "slideleft" || active.transitionType === "slideright") {
      const dir = active.transitionType === "slideleft" ? -1 : 1;
      if (imgOut) drawCover(ctx, imgOut, width, height, dir * alpha * width, 0);
      if (imgIn) drawCover(ctx, imgIn, width, height, dir * alpha * width - dir * width, 0);
    } else {
      // "fade" (default crossfade)
      if (imgOut) drawCover(ctx, imgOut, width, height);
      if (imgIn) { ctx.globalAlpha = alpha; drawCover(ctx, imgIn, width, height); ctx.globalAlpha = 1; }
    }
  }

  for (const ov of overlays) {
    if (t >= ov.startTime && t <= ov.endTime) drawOverlay(ctx, ov, width, height);
  }
}

export { TRANSITION_DURATION };
