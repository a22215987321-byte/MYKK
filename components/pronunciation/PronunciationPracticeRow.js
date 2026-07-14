import { useRef, useState } from "react";
import { playSpeech, stopPronunciationAudio, wait, isIpaText } from "../PronunciationAudio";
import PronunciationAudioButton from "./PronunciationAudioButton";

const STEPS = ["聽一次", "慢速聽一次", "自己讀一次", "再聽正確版本", "連續跟讀三次"];

export default function PronunciationPracticeRow({ words = [], lang = "fr-FR", showSteps = false, title = "跟讀練習（點擊播放）", wordColor = "var(--text)" }) {
  const [repeating, setRepeating] = useState(false);
  const id = useRef(`practice-${Math.random()}`);
  const demoWord = words[0];
  const canRepeat = Boolean(demoWord) && !isIpaText(demoWord);

  async function runTripleRepeat(event) {
    event?.stopPropagation();
    if (!canRepeat || repeating) return;
    const token = stopPronunciationAudio(id.current);
    setRepeating(true);
    try {
      for (let i = 0; i < 3; i++) {
        await playSpeech({ text: demoWord, language: lang, rate: 0.75, type: "word", token });
        await wait(400, token);
      }
    } catch (_) {
      // cancelled or unavailable — silently reset
    } finally {
      setRepeating(false);
    }
  }

  if (!words.length) return null;

  return (
    <>
      {showSteps && (
        <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 10 }}>
          {STEPS.map((step, i) => (
            <div key={step} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, color: "var(--text-muted)" }}>
              <span style={{ width: 18, height: 18, borderRadius: "50%", background: "var(--panel-alt)", border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, flexShrink: 0 }}>{i + 1}</span>
              <span>步驟 {i + 1}：{step}</span>
              {i === 4 && demoWord && (
                <button onClick={runTripleRepeat} disabled={!canRepeat || repeating}
                  style={{ marginLeft: 4, padding: "3px 9px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel-alt)", color: "var(--text-muted)", cursor: canRepeat ? "pointer" : "not-allowed", fontSize: 11, opacity: repeating ? 0.6 : 1 }}>
                  {repeating ? "播放中…" : "▶ 開始"}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{title}</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {words.map(w => (
          <div key={w} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px", borderRadius: 10, background: "var(--panel-alt)", border: "1px solid var(--border)" }}>
            <PronunciationAudioButton variant="slow" fallbackText={w} lang={lang} />
            <PronunciationAudioButton variant="normal" fallbackText={w} lang={lang} />
            <span style={{ fontSize: 13, fontWeight: 600, color: wordColor }}>{w}</span>
          </div>
        ))}
      </div>
    </>
  );
}
