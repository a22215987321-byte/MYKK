import { useRef, useState } from "react";
import { playUrl, playSpeech, stopPronunciationAudio, useGlobalStop } from "./PronunciationAudio";

const CARD_BG = "#003F3D";
const CARD_BORDER = "#075F5A";
const IPA_COLOR = "#35D6D3";
const WORD_COLOR = "#F3FBFB";
const ZH_COLOR = "#AFC5C8";
const BTN_BG = "#4338CA";
const BTN_BG_HOVER = "#4F46E5";
const TEACHER_COLOR = "#9AB9C6";
const TEACHER_HOVER = "#35D6D3";

function WordAudioButton({ label, url, text, rate, onPlayed }) {
  const [playing, setPlaying] = useState(false);
  const [hover, setHover] = useState(false);
  const id = useRef(`en-word-audio-${Math.random()}`);
  useGlobalStop(id, setPlaying);

  async function handleClick() {
    const token = stopPronunciationAudio(id.current);
    setPlaying(true);
    onPlayed?.();
    try {
      if (url) await playUrl(url, token);
      else await playSpeech({ text, language: "en-GB", rate, type: "word", token });
    } catch (_) {
      // TTS/audio failures fail silently here — the button always attempts playback
    } finally {
      setPlaying(false);
    }
  }

  return (
    <button onClick={handleClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, minWidth: 120, height: 42, borderRadius: 9,
        border: `1px solid ${hover || playing ? "#6D5AE6" : "#5546CE"}`,
        background: hover || playing ? BTN_BG_HOVER : BTN_BG,
        color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
        transition: "background .12s, border-color .12s",
      }}>
      <span>{playing ? "■" : "▶"}</span>
      <span>{label}</span>
    </button>
  );
}

export default function EnglishPhonemeCard({
  phoneme, word, audioWord, translation, normalAudioUrl, slowAudioUrl, teacherExplanation, completed, onEngage, accentColor = IPA_COLOR,
}) {
  const ttsText = audioWord || word;
  const [teacherOpen, setTeacherOpen] = useState(false);
  const [teacherHover, setTeacherHover] = useState(false);
  const [cardHover, setCardHover] = useState(false);

  const hasTeacherContent = teacherExplanation && (teacherExplanation.mouth || teacherExplanation.tongue || teacherExplanation.tip || teacherExplanation.mistake);

  return (
    <div onMouseEnter={() => setCardHover(true)} onMouseLeave={() => setCardHover(false)}
      style={{
        position: "relative", background: cardHover ? "#0A4A47" : CARD_BG, border: `1px solid ${CARD_BORDER}`,
        borderRadius: 18, padding: "28px 24px 20px", minHeight: 360,
        display: "flex", flexDirection: "column", transition: "background .15s",
      }}>
      {completed && (
        <span style={{
          position: "absolute", top: 14, right: 16, width: 22, height: 22, borderRadius: "50%",
          background: "rgba(53,214,211,0.18)", color: IPA_COLOR, fontSize: 12, fontWeight: 800,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>✓</span>
      )}

      <div style={{ textAlign: "center", paddingTop: 8, marginBottom: 18 }}>
        <div style={{ fontSize: 72, fontWeight: 700, color: accentColor, lineHeight: 1.1, fontFamily: "'Doulos SIL','Charis SIL','Segoe UI','Noto Sans',sans-serif" }}>
          {phoneme}
        </div>
      </div>

      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <span style={{ fontSize: 21, fontWeight: 700, color: WORD_COLOR }}>{word}</span>
        <span style={{ fontSize: 17, color: ZH_COLOR }}> — {translation}</span>
      </div>

      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <WordAudioButton label="正常速度" url={normalAudioUrl} text={ttsText} rate={0.9} onPlayed={onEngage} />
        <WordAudioButton label="慢速" url={slowAudioUrl} text={ttsText} rate={0.5} onPlayed={onEngage} />
      </div>

      {hasTeacherContent && (
        <div style={{ marginTop: "auto", textAlign: "right" }}>
          <span onClick={() => setTeacherOpen(o => !o)} onMouseEnter={() => setTeacherHover(true)} onMouseLeave={() => setTeacherHover(false)}
            style={{ fontSize: 17, cursor: "pointer", color: teacherHover ? TEACHER_HOVER : TEACHER_COLOR, transition: "color .12s", userSelect: "none" }}>
            ▶ 老師講解
          </span>
        </div>
      )}

      {teacherOpen && hasTeacherContent && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${CARD_BORDER}`, fontSize: 14, color: "#D6E7E8", lineHeight: 1.8, textAlign: "left" }}>
          {teacherExplanation.mouth && <div>{teacherExplanation.mouth}</div>}
          {teacherExplanation.tongue && <div>{teacherExplanation.tongue}</div>}
          {teacherExplanation.tip && <div>{teacherExplanation.tip}</div>}
          {teacherExplanation.mistake && <div style={{ color: "#FCA5A5", marginTop: 4 }}>{teacherExplanation.mistake}</div>}
        </div>
      )}
    </div>
  );
}
