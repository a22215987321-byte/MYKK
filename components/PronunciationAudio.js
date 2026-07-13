import { useEffect, useRef, useState } from "react";

const STOP_EVENT = "evonchat:pronunciation-audio-stop";
let activeAudio = null;
let activeUtterance = null;
let generation = 0;

function emitStop(owner) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(STOP_EVENT, { detail: { owner } }));
  }
}

export function stopPronunciationAudio(owner = null) {
  generation += 1;
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    window.speechSynthesis.cancel();
  }
  activeUtterance = null;
  emitStop(owner);
}

function wait(ms, token) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => token === generation ? resolve() : reject(new Error("cancelled")), ms);
    if (token !== generation) {
      clearTimeout(timer);
      reject(new Error("cancelled"));
    }
  });
}

function playUrl(url, token) {
  return new Promise((resolve, reject) => {
    if (token !== generation) return reject(new Error("cancelled"));
    const audio = new Audio(url);
    activeAudio = audio;
    audio.onended = () => {
      if (activeAudio === audio) activeAudio = null;
      resolve();
    };
    audio.onerror = () => {
      if (activeAudio === audio) activeAudio = null;
      reject(new Error("音訊檔案載入或播放失敗，請檢查網路後再試。"));
    };
    audio.play().catch(() => {
      if (activeAudio === audio) activeAudio = null;
      reject(new Error("瀏覽器阻止音訊播放，請再點擊一次播放按鈕。"));
    });
  });
}

function selectVoice(lang) {
  const voices = window.speechSynthesis.getVoices();
  return voices.find(voice => voice.lang?.toLowerCase() === lang.toLowerCase()) || null;
}

export function playSpeech({ text, language, rate = 0.85, type = "word", token = generation }) {
  return new Promise((resolve, reject) => {
    if (token !== generation) return reject(new Error("cancelled"));
    if (type === "ipa" || isIpaText(text)) {
      return reject(new Error("IPA 禁止使用瀏覽器語音，必須使用已確認的獨立音標音訊。"));
    }
    if (!new Set(["fr-FR", "en-GB", "zh-HK", "zh-CN"]).has(language)) {
      return reject(new Error("播放語言未明確指定，已停止播放以避免使用錯誤語音。"));
    }
    if (typeof window === "undefined" || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      return reject(new Error("此瀏覽器不支援語音播放，請改用最新版 Chrome、Edge 或 Safari。"));
    }
    const cleanText = String(text || "").trim();
    if (!cleanText) return reject(new Error("沒有可播放的文字。"));

    const selectedVoice = selectVoice(language);
    if (!selectedVoice) {
      if (language === "zh-CN") {
        return reject(new Error("此裝置暫時沒有可用的普通話語音，請安裝中文語音，或使用 Chrome／Edge 瀏覽器。"));
      }
      return reject(new Error(`裝置沒有可用的 ${language} 語音，已停止播放以避免回退成英文 voice。`));
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = language;
    utterance.rate = rate;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.voice = selectedVoice;
    activeUtterance = utterance;
    utterance.onend = () => {
      if (activeUtterance === utterance) activeUtterance = null;
      token === generation ? resolve() : reject(new Error("cancelled"));
    };
    utterance.onerror = event => {
      if (activeUtterance === utterance) activeUtterance = null;
      if (event.error === "canceled" || event.error === "interrupted") return reject(new Error("cancelled"));
      reject(new Error(`語音播放失敗（${event.error || "瀏覽器語音錯誤"}），請確認裝置已安裝 ${language} 語音。`));
    };
    window.speechSynthesis.speak(utterance);
  });
}

function isIpaText(text) {
  const value = String(text || "").trim();
  return /^\s*[\/\[].+[\/\]]\s*$/u.test(value) || /[\u0250-\u02AF\u1D00-\u1DBF]/u.test(value);
}

function teacherTextWithoutIpa(text) {
  return String(text || "")
    .replace(/\/[^/\n]+\//gu, "。")
    .replace(/\[[^\]\n]+\]/gu, "。")
    .replace(/[\u0250-\u02AF\u1D00-\u1DBF][\u0300-\u036F]*/gu, "。")
    .replace(/。\s*。/gu, "。")
    .trim();
}

function splitTeacherSegments(text, contentLanguage, narratorLanguage = "zh-HK") {
  const cleanText = teacherTextWithoutIpa(text);
  const segments = [];
  const foreignText = /[\p{Script=Latin}][\p{Script=Latin}\p{M}’’.-]*(?:\s+[\p{Script=Latin}][\p{Script=Latin}\p{M}’’.-]*)*/gu;
  let cursor = 0;
  for (const match of cleanText.matchAll(foreignText)) {
    if (match.index > cursor) {
      const narratorText = cleanText.slice(cursor, match.index).trim();
      if (narratorText) segments.push({ text: narratorText, language: narratorLanguage, type: "teacher" });
    }
    segments.push({ text: match[0], language: contentLanguage, type: "word" });
    cursor = match.index + match[0].length;
  }
  if (cursor < cleanText.length) {
    const narratorText = cleanText.slice(cursor).trim();
    if (narratorText) segments.push({ text: narratorText, language: narratorLanguage, type: "teacher" });
  }
  return segments;
}

function useGlobalStop(id, setPlaying) {
  useEffect(() => {
    const stop = event => {
      if (event.detail?.owner !== id.current) setPlaying(false);
    };
    window.addEventListener(STOP_EVENT, stop);
    return () => window.removeEventListener(STOP_EVENT, stop);
  }, [id, setPlaying]);
}

export function AudioButton({ audioUrl, fallbackText, lang = "en-GB", ttsRate = 0.85, label, unavailableLabel = "音標音訊製作中", color = "#6366f1", sm = false, disabled = false }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const id = useRef(`audio-${Math.random()}`);
  useGlobalStop(id, setPlaying);

  const canUseSpeech = Boolean(fallbackText) && !isIpaText(fallbackText);
  const canPlay = !disabled && Boolean(audioUrl || canUseSpeech);

  async function handleClick(event) {
    event?.stopPropagation();
    if (!canPlay) return;
    if (playing) {
      stopPronunciationAudio(id.current);
      setPlaying(false);
      return;
    }
    stopPronunciationAudio(id.current);
    const token = generation;
    setPlaying(true);
    setError("");
    try {
      if (audioUrl) await playUrl(audioUrl, token);
      else await playSpeech({ text: fallbackText, language: lang, rate: ttsRate, type: "word", token });
    } catch (err) {
      if (err.message !== "cancelled") setError(err.message || "播放失敗，請再試一次。");
    } finally {
      if (token === generation) setPlaying(false);
    }
  }

  if (!canPlay) {
    return <button disabled title="目前沒有已確認正確的播放來源" style={buttonStyle(sm, false, color, true)}>{unavailableLabel}</button>;
  }
  return <span style={{ display: "inline-flex", flexDirection: "column" }}>
    <button onClick={handleClick} style={buttonStyle(sm, playing, color, false)}>
      {playing ? "■" : "▶"} {label}
    </button>
    {error && <small role="alert" style={{ color: "#dc2626", maxWidth: 220, lineHeight: 1.35 }}>{error}</small>}
  </span>;
}

export function TeacherButton({ lesson, contentLanguage, narratorLanguage = "zh-HK", label = "老師講解", color = "#0891b2", sm = false }) {
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState("");
  const id = useRef(`teacher-${Math.random()}`);
  useGlobalStop(id, setPlaying);
  const rawText = lesson?.teacherAudioText || lesson?.teacherScriptZh || lesson?.teachingScriptZh || "";
  const segments = splitTeacherSegments(rawText, contentLanguage, narratorLanguage);
  const available = Boolean(segments.length && contentLanguage);

  async function handleClick(event) {
    event?.stopPropagation();
    if (!available) return;
    if (playing) {
      stopPronunciationAudio(id.current);
      setPlaying(false);
      return;
    }
    stopPronunciationAudio(id.current);
    const token = generation;
    setPlaying(true);
    setError("");
    try {
      for (const segment of segments) {
        await playSpeech({
          text: segment.text,
          language: segment.language,
          rate: segment.type === "teacher" ? 0.82 : 0.78,
          type: segment.type,
          token,
        });
        await wait(100, token);
      }
    } catch (err) {
      if (err.message !== "cancelled") setError(err.message || "老師講解播放失敗，請再試一次。");
    } finally {
      if (token === generation) setPlaying(false);
    }
  }

  return <span style={{ display: "inline-flex", flexDirection: "column" }}>
    <button disabled={!available} onClick={handleClick} style={buttonStyle(sm, playing, color, !available)}>
      {playing ? "■" : "▶"} {label}
    </button>
    {error && <small role="alert" style={{ color: "#dc2626", maxWidth: 220, lineHeight: 1.35 }}>{error}</small>}
  </span>;
}

export function RepeatButton({ audioUrl, fallbackText, lang = "en-GB", color = "#10b981", sm = false }) {
  const [state, setState] = useState("idle");
  const [error, setError] = useState("");
  const id = useRef(`repeat-${Math.random()}`);
  useGlobalStop(id, () => setState("idle"));
  const available = Boolean(audioUrl || (fallbackText && !isIpaText(fallbackText)));

  async function run(event) {
    event?.stopPropagation();
    if (!available || state !== "idle") return;
    stopPronunciationAudio(id.current);
    const token = generation;
    setState("listen");
    setError("");
    try {
      if (audioUrl) await playUrl(audioUrl, token);
      else await playSpeech({ text: fallbackText, language: lang, rate: 0.72, type: "word", token });
      setState("repeat");
      await wait(2200, token);
    } catch (err) {
      if (err.message !== "cancelled") setError(err.message || "跟讀播放失敗，請再試一次。");
    } finally {
      if (token === generation) setState("idle");
    }
  }

  return <span style={{ display: "inline-flex", flexDirection: "column" }}>
    <button disabled={!available || state !== "idle"} onClick={run} style={buttonStyle(sm, state !== "idle", color, !available)}>
      {state === "listen" ? "▶ 聽一次" : state === "repeat" ? "🎙 現在跟讀" : "🎙 跟讀練習"}
    </button>
    {error && <small role="alert" style={{ color: "#dc2626", maxWidth: 220, lineHeight: 1.35 }}>{error}</small>}
  </span>;
}

function buttonStyle(sm, active, color, disabled) {
  return {
    display: "flex", alignItems: "center", gap: 4, padding: sm ? "4px 9px" : "7px 13px", borderRadius: 8,
    border: `1px solid ${active ? color : "var(--border)"}`, background: active ? color + "15" : "var(--panel-alt)",
    color: active ? color : "var(--text-faint)", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
    fontSize: sm ? 11 : 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0,
  };
}
