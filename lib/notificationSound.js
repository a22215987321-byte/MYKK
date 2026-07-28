// Shared "new message" notification sound + its volume setting. Synthesized
// with Web Audio instead of shipping/hosting an audio asset — a short
// two-tone "ding" is enough for a UI cue, and it lets volume=0 skip playback
// entirely rather than playing silently.
const VOLUME_KEY = "evon_notif_sound_volume";
const DEFAULT_VOLUME = 70;

export function getNotificationVolume() {
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  const raw = Number(localStorage.getItem(VOLUME_KEY));
  return Number.isFinite(raw) && raw >= 0 && raw <= 100 ? raw : DEFAULT_VOLUME;
}

export function setNotificationVolume(v) {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOLUME_KEY, String(Math.max(0, Math.min(100, Math.round(v)))));
}

let sharedCtx = null;

export function playNotificationSound() {
  if (typeof window === "undefined") return;
  const volume = getNotificationVolume();
  if (volume <= 0) return;
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    if (!sharedCtx) sharedCtx = new Ctx();
    const ctx = sharedCtx;
    const gain = (volume / 100) * 0.25; // headroom — this is a UI cue, not music
    const now = ctx.currentTime;
    [[880, now, 0.12], [1320, now + 0.09, 0.14]].forEach(([freq, start, dur]) => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, start);
      g.gain.linearRampToValueAtTime(gain, start + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
      osc.connect(g).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + dur + 0.02);
    });
  } catch {
    // Browser autoplay policy (no user gesture yet) or unsupported API —
    // this is a nice-to-have cue, nothing downstream depends on it firing.
  }
}
