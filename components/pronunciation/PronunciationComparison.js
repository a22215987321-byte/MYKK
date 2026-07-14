import { useRef, useState } from "react";
import { playSpeech, stopPronunciationAudio, wait, isIpaText } from "../PronunciationAudio";
import PronunciationAudioButton from "./PronunciationAudioButton";

export default function PronunciationComparison({ comparison, lang = "fr-FR" }) {
  const { otherIpa, mouthDiff, tongueDiff, vocalDiff, wordA, wordB } = comparison;
  const [alternating, setAlternating] = useState(false);
  const id = useRef(`compare-${Math.random()}`);
  const canAlternate = Boolean(wordA?.word && wordB?.word) && !isIpaText(wordA.word) && !isIpaText(wordB.word);

  async function runAlternate(event) {
    event?.stopPropagation();
    if (!canAlternate || alternating) return;
    const token = stopPronunciationAudio(id.current);
    setAlternating(true);
    try {
      for (let i = 0; i < 2; i++) {
        await playSpeech({ text: wordA.word, language: lang, rate: 0.8, type: "word", token });
        await wait(300, token);
        await playSpeech({ text: wordB.word, language: lang, rate: 0.8, type: "word", token });
        await wait(300, token);
      }
    } catch (_) {
      // cancelled or unavailable
    } finally {
      setAlternating(false);
    }
  }

  return (
    <div style={{ padding: 12, borderRadius: 10, background: "var(--panel-alt)", border: "1px solid var(--border)", marginBottom: 10 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
        對比：{comparison.ipa} vs {otherIpa}
      </div>
      <div style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 8 }}>
        {mouthDiff && <div>👄 嘴形差異：{mouthDiff}</div>}
        {tongueDiff && <div>👅 舌頭差異：{tongueDiff}</div>}
        {vocalDiff && <div>🔊 聲帶差異：{vocalDiff}</div>}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
        {[wordA, wordB].map((w, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <PronunciationAudioButton variant="slow" fallbackText={w.word} lang={lang} />
            <PronunciationAudioButton variant="normal" fallbackText={w.word} lang={lang} />
            <span style={{ fontWeight: 700, fontSize: 14, color: "var(--text)" }}>{w.word}</span>
            <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{w.ipa}</span>
            {w.meaningZh && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{w.meaningZh}</span>}
          </div>
        ))}
      </div>
      <button onClick={runAlternate} disabled={!canAlternate || alternating}
        style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text-muted)", cursor: canAlternate ? "pointer" : "not-allowed", fontSize: 12, opacity: alternating ? 0.6 : 1 }}>
        {alternating ? "交替播放中…" : "🔁 交替播放"}
      </button>
    </div>
  );
}
