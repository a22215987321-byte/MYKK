import PronunciationAudioButton from "./PronunciationAudioButton";

function HighlightedWord({ word, highlight }) {
  if (!highlight) return <span>{word}</span>;
  const idx = word.toLowerCase().indexOf(highlight.toLowerCase());
  if (idx === -1) return <span>{word}</span>;
  return (
    <span>
      {word.slice(0, idx)}
      <span style={{ color: "#2563eb", textDecoration: "underline", textDecorationColor: "rgba(37,99,235,0.5)", textUnderlineOffset: 3 }}>
        {word.slice(idx, idx + highlight.length)}
      </span>
      {word.slice(idx + highlight.length)}
    </span>
  );
}

export default function PronunciationWordExample({
  word,
  ipa,
  meaningZh,
  highlight,
  audioNormalUrl,
  audioSlowUrl,
  lang = "fr-FR",
  wordColor = "#60a5fa",
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--panel-alt)", borderRadius: 10, border: "1px solid var(--border)" }}>
      <PronunciationAudioButton variant="slow" url={audioSlowUrl} fallbackText={word} lang={lang} />
      <PronunciationAudioButton variant="normal" url={audioNormalUrl} fallbackText={word} lang={lang} />
      <span style={{ fontWeight: 700, fontSize: 14, color: wordColor }}>
        <HighlightedWord word={word} highlight={highlight} />
      </span>
      {ipa && <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{ipa}</span>}
      {meaningZh && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{meaningZh}</span>}
    </div>
  );
}
