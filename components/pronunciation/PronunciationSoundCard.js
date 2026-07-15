import { useEffect, useState } from "react";
import PronunciationAudioButton from "./PronunciationAudioButton";
import PronunciationWordExample from "./PronunciationWordExample";
import PronunciationComparison from "./PronunciationComparison";
import PronunciationPracticeRow from "./PronunciationPracticeRow";

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-faint)", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8, marginTop: 14 }}>
      {children}
    </div>
  );
}

function useCompletion(id, enabled) {
  const key = `pron-done:${id}`;
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    setDone(window.localStorage.getItem(key) === "1");
  }, [enabled, key]);
  function toggle() {
    const next = !done;
    setDone(next);
    try {
      if (typeof window !== "undefined") window.localStorage.setItem(key, next ? "1" : "0");
    } catch (_) {}
  }
  return [done, toggle];
}

const DEFAULT_ACCENT = {
  grad: "linear-gradient(135deg,#1e3a8a,#2563eb)", zh: "#60a5fa", wordColor: "#60a5fa",
  tipText: "#f59e0b", tipBg: "rgba(245,158,11,0.08)", tipBorder: "rgba(245,158,11,0.2)",
  doneText: "#16a34a", doneBg: "rgba(22,163,74,0.1)", doneBorder: "rgba(22,163,74,0.3)",
};

export default function PronunciationSoundCard({ item, accent = DEFAULT_ACCENT, forceOpen = false, showCompletion = false }) {
  const [open, setOpen] = useState(forceOpen);
  const [done, toggleDone] = useCompletion(item.id, showCompletion);
  const lang = item.audio?.fallbackLang || item.lang || "fr-FR";
  const mouthPieces = [
    item.mouthPosition && `嘴巴：${item.mouthPosition}`,
    item.tonguePosition && `舌頭：${item.tonguePosition}`,
    item.airflow && `氣流：${item.airflow}`,
    item.vocalCord && `聲帶：${item.vocalCord}`,
  ].filter(Boolean);
  const firstWord = item.wordExamples?.[0];

  const mouthBox = mouthPieces.length > 0 && (
    <div style={{ padding: "8px 12px", borderRadius: 10, background: accent.tipBg, border: `1px solid ${accent.tipBorder}`, fontSize: 13, color: accent.tipText, marginTop: 12, marginBottom: 12, lineHeight: 1.7 }}>
      👄 {mouthPieces.map((p, i) => <div key={i}>{p}</div>)}
    </div>
  );

  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 14, marginBottom: 10, overflow: "hidden" }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <div style={{ width: 52, height: 52, borderRadius: 12, background: accent.grad, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "#fff", position: "relative" }}>
          <div style={{ fontSize: item.ipa && item.ipa.length > 5 ? 13 : 18, fontWeight: 800, lineHeight: 1.2 }}>{item.ipa}</div>
          {showCompletion && done && (
            <span style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: accent.doneText, color: "#fff", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text)" }}>{item.ipa}</span>
            {item.exampleWord && <span style={{ fontSize: 14, color: "var(--text)" }}>{item.exampleWord}</span>}
          </div>
          {item.shortDescription && (
            <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 3, lineHeight: 1.5 }}>{item.shortDescription}</div>
          )}
          {item.approxZh && (
            <div style={{ fontSize: 12, color: accent.zh, marginTop: 2 }}>中文近似：「{item.approxZh}」，只作參考</div>
          )}
        </div>
        <span style={{ color: "var(--text-faint)", fontSize: 14, flexShrink: 0 }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div style={{ padding: "0 16px 16px", borderTop: "1px solid var(--border)" }}>

          {/* 第一段：核心概念 */}
          <SectionLabel>這個音是什麼</SectionLabel>
          <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, marginBottom: 4 }}>
            {item.shortDescription}
            {item.approxZh && <div style={{ color: accent.zh, marginTop: 2 }}>中文近似：「{item.approxZh}」，只作參考，實際發音請以音檔為準</div>}
          </div>

          {/* 第二段：嘴型 */}
          {mouthBox}

          {/* 第三段：聽聲音（音標本身＋例字） */}
          <SectionLabel>聽聲音</SectionLabel>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 16, marginBottom: 12 }}>
            {item.audio && (
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <PronunciationAudioButton variant="slow" url={item.audio?.phonemeSlowUrl} title="慢速播放音標" />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>音標慢速</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <PronunciationAudioButton variant="normal" url={item.audio?.phonemeNormalUrl} title="正常速度播放音標" />
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>音標正常速度</span>
                </div>
              </div>
            )}
            {firstWord && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <PronunciationAudioButton variant="slow" url={firstWord.audioSlowUrl} fallbackText={firstWord.word} lang={lang} title="慢速播放例字" />
                <PronunciationAudioButton variant="normal" url={firstWord.audioNormalUrl} fallbackText={firstWord.word} lang={lang} title="正常速度播放例字" />
                <span style={{ fontSize: 13, fontWeight: 700, color: accent.wordColor }}>{firstWord.word}</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>例字</span>
              </div>
            )}
          </div>

          {/* 第四段：跟讀練習（含標記完成） */}
          {item.practiceWords?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <PronunciationPracticeRow words={item.practiceWords} lang={lang} showSteps={item.showPracticeSteps} wordColor={accent.wordColor} />
              {showCompletion && (
                <button onClick={toggleDone}
                  style={{
                    marginTop: 10, padding: "7px 14px", borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: "pointer",
                    border: `1px solid ${done ? accent.doneBorder : "var(--border)"}`,
                    background: done ? accent.doneBg : "var(--panel-alt)",
                    color: done ? accent.doneText : "var(--text-muted)",
                  }}>
                  {done ? "✓ 已標記完成" : "標記完成"}
                </button>
              )}
            </div>
          )}

          {/* 進階內容：發音步驟／常見拼法／單字示範／拼讀練習／對比練習 */}
          {item.pronunciationSteps?.length > 0 && (
            <>
              <SectionLabel>發音步驟</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {item.pronunciationSteps.map((step, i) => (
                  <div key={i} style={{ fontSize: 13, color: "var(--text)", display: "flex", gap: 8 }}>
                    <span style={{ color: "var(--text-faint)", fontWeight: 700 }}>步驟 {i + 1}</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {item.commonSpellings?.length > 0 && (
            <>
              <SectionLabel>常見拼法</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 4 }}>
                {item.commonSpellings.map((sp, i) => (
                  <div key={i}>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 3 }}>
                      <b style={{ color: "var(--text)" }}>{sp.spelling}</b>
                    </div>
                    {(sp.examples || (sp.example ? [sp.example] : [])).map((ex, j) => (
                      <PronunciationWordExample key={j} word={ex.word} ipa={ex.ipa} meaningZh={ex.meaningZh}
                        highlight={sp.spelling} audioNormalUrl={ex.audioNormalUrl} audioSlowUrl={ex.audioSlowUrl} lang={lang} wordColor={accent.wordColor} />
                    ))}
                  </div>
                ))}
              </div>
            </>
          )}

          {item.wordExamples?.length > 0 && (
            <>
              <SectionLabel>單字示範</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {item.wordExamples.map((ex, i) => (
                  <PronunciationWordExample key={i} word={ex.word} ipa={ex.ipa} meaningZh={ex.meaningZh}
                    highlight={ex.highlight} audioNormalUrl={ex.audioNormalUrl} audioSlowUrl={ex.audioSlowUrl} lang={lang} wordColor={accent.wordColor} />
                ))}
              </div>
            </>
          )}

          {item.combinations?.length > 0 && (
            <>
              <SectionLabel>拼讀練習</SectionLabel>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                {item.combinations.map((c, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 6px", borderRadius: 10, background: "var(--panel-alt)", border: "1px solid var(--border)" }}>
                    <PronunciationAudioButton variant="normal" url={c.audioUrl} title={c.combo} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{c.combo}</span>
                  </div>
                ))}
              </div>
            </>
          )}

          {item.comparisons?.length > 0 && (
            <>
              <SectionLabel>對比練習</SectionLabel>
              {item.comparisons.map((cmp, i) => (
                <PronunciationComparison key={i} comparison={{ ipa: item.ipa, ...cmp }} lang={lang} />
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
