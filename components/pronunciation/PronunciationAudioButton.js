import { useRef, useState } from "react";
import { playUrl, playSpeech, stopPronunciationAudio, useGlobalStop, isIpaText } from "../PronunciationAudio";

const VARIANTS = {
  slow: { icon: "🐢", rate: 0.55, bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.3)" },
  normal: { icon: "🔊", rate: 0.95, bg: "rgba(220,38,38,0.1)", border: "rgba(220,38,38,0.25)" },
};

export default function PronunciationAudioButton({
  url,
  fallbackText,
  lang = "fr-FR",
  variant = "normal",
  accentBg,
  accentBorder,
  title,
  unavailableLabel = "音檔製作中",
}) {
  const [playing, setPlaying] = useState(false);
  const id = useRef(`pron-audio-${Math.random()}`);
  useGlobalStop(id, setPlaying);
  const v = VARIANTS[variant] || VARIANTS.normal;

  const canUseSpeech = Boolean(fallbackText) && !isIpaText(fallbackText);
  const canPlay = Boolean(url || canUseSpeech);

  async function handleClick(event) {
    event?.stopPropagation();
    if (!canPlay) return;
    const token = stopPronunciationAudio(id.current);
    setPlaying(true);
    try {
      if (url) await playUrl(url, token);
      else await playSpeech({ text: fallbackText, language: lang, rate: v.rate, type: "word", token });
    } catch (_) {
      // errors are surfaced by the underlying speech/audio guard; button just resets
    } finally {
      setPlaying(false);
    }
  }

  if (!canPlay) {
    return (
      <button disabled title={unavailableLabel}
        style={{ width: 28, height: 28, borderRadius: 8, background: "var(--panel-alt)", border: "1px solid var(--border)", cursor: "not-allowed", fontSize: 12, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.45 }}>
        {v.icon}
      </button>
    );
  }

  return (
    <button onClick={handleClick} title={title || (variant === "slow" ? "慢速" : "正常速度")}
      style={{
        width: 28, height: 28, borderRadius: 8,
        background: playing ? (accentBg || v.bg) : (accentBg || v.bg),
        border: `1px solid ${accentBorder || v.border}`,
        cursor: "pointer", fontSize: 13, flexShrink: 0,
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: playing ? "scale(0.92)" : "scale(1)", transition: "transform 0.1s",
      }}>
      {v.icon}
    </button>
  );
}
