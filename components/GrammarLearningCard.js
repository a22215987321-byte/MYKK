import { useState, useEffect, useCallback } from "react";
import { classifySpanishWord, SPANISH_WORD_RE, SPANISH_WORD_START_RE, POS_COLORS } from "../lib/spanishGrammarEngine";

function speakEs(text) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-ES";
  u.rate = 0.85;
  window.speechSynthesis.speak(u);
}

function Section({ icon, title, color, children }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7 }}>
        <span style={{ fontSize: 13 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: color || "var(--accent)", textTransform: "uppercase", letterSpacing: 0.7 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

// 例句內的每個字也要能點——不引用 ClickableSpanishText（避免循環 import），
// 而是把「點字 → 換到這個字」直接接到同一張卡片自己的 stack 狀態上。
function InlineClickableText({ text, onWordClick, style }) {
  const tokens = (text || "").split(SPANISH_WORD_RE);
  return (
    <span style={style}>
      {tokens.map((tok, i) =>
        SPANISH_WORD_START_RE.test(tok) ? (
          <span key={i} onClick={(e) => { e.stopPropagation(); onWordClick(tok); }}
            style={{ cursor: "pointer", borderBottom: "1.5px dashed rgba(255,255,255,0.35)", borderRadius: 2 }}>
            {tok}
          </span>
        ) : (
          <span key={i}>{tok}</span>
        )
      )}
    </span>
  );
}

export default function GrammarLearningCard({ word, onClose, onAddVocab }) {
  const [stack, setStack] = useState([word]);
  const [cache, setCache] = useState({});
  const [loadingWord, setLoadingWord] = useState(null);

  const current = stack[stack.length - 1];

  useEffect(() => {
    let cancelled = false;
    if (cache[current] !== undefined) return;
    setLoadingWord(current);
    classifySpanishWord(current).then(result => {
      if (cancelled) return;
      setCache(c => ({ ...c, [current]: result }));
      setLoadingWord(null);
    });
    return () => { cancelled = true; };
  }, [current]); // eslint-disable-line react-hooks/exhaustive-deps

  const pushWord = useCallback((w) => setStack(s => [...s, w]), []);
  const popWord = useCallback(() => setStack(s => (s.length > 1 ? s.slice(0, -1) : s)), []);

  const card = cache[current];
  const loading = loadingWord === current && card === undefined;

  return (
    <>
      <style>{`
        .glc-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 850; }
        .glc-panel {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: min(440px, 92vw); min-width: 320px;
          border-radius: 16px 0 0 16px;
          z-index: 851;
          background: var(--panel-alt);
          border: 1px solid var(--border);
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 0 60px rgba(0,0,0,0.6);
        }
        @media (max-width: 767px) {
          .glc-panel {
            top: auto; left: 0; right: 0; bottom: 0;
            width: 100%; min-width: unset;
            height: 85vh;
            border-radius: 20px 20px 0 0;
          }
        }
      `}</style>
      <div className="glc-overlay" onClick={onClose} />
      <div className="glc-panel">
        {/* Header */}
        <div style={{ padding: "16px 18px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          {stack.length > 1 && (
            <button onClick={popWord} title="返回上一個詞"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 20, padding: 0, lineHeight: 1, flexShrink: 0 }}>
              ‹
            </button>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "var(--text)" }}>{current}</span>
              {card?.lemma && card.lemma !== current && (
                <span style={{ fontSize: 13, color: "var(--text-faint)" }}>← {card.lemma}</span>
              )}
              <button onClick={() => speakEs(card?.lemma || current)} title="發音"
                style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", fontSize: 16, padding: 0, lineHeight: 1 }}>🔊</button>
            </div>
            {card && !loading && (
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {card.posLabel && (
                  <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 700,
                    background: `${card.color || POS_COLORS.other}22`, color: card.color || "var(--text-muted)" }}>
                    {card.posLabel}
                  </span>
                )}
                {card.ambiguous && (
                  <span title="這個詞單看字面無法判斷唯一意思，需要靠上下文"
                    style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, fontWeight: 700,
                      background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>
                    ⚠️ 多義：需要上下文
                  </span>
                )}
                {card.tenseLabel && (
                  <span style={{ fontSize: 11, padding: "2px 8px", background: "rgba(59,130,246,0.12)", color: "#60a5fa", borderRadius: 6, fontWeight: 600 }}>
                    {card.tenseLabel}
                  </span>
                )}
                {card.personLabel && (
                  <span style={{ fontSize: 11, padding: "2px 8px", background: "rgba(59,130,246,0.12)", color: "#60a5fa", borderRadius: 6, fontWeight: 600 }}>
                    {card.personLabel}
                  </span>
                )}
                {card.level && (
                  <span style={{ fontSize: 11, padding: "2px 8px", background: "rgba(16,185,129,0.15)", color: "#10b981", borderRadius: 6, fontWeight: 700 }}>
                    {card.level}
                  </span>
                )}
                {card.gender && (
                  <span style={{ fontSize: 11, padding: "2px 8px", fontWeight: 700, borderRadius: 6,
                    background: card.gender === "f" ? "#4c1d1d" : "rgba(96,165,250,0.15)",
                    color: card.gender === "f" ? "#f87171" : "#60a5fa" }}>
                    {card.gender === "f" ? "陰性" : card.gender === "m" ? "陽性" : card.gender}
                  </span>
                )}
              </div>
            )}
          </div>
          <button onClick={onClose} title="關閉"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 22, lineHeight: 1, flexShrink: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "18px 18px 40px" }}>
          {loading && (
            <div style={{ color: "var(--text-faint)", fontSize: 13 }}>查詢中...</div>
          )}

          {!loading && card && card.type === "unknown" && (
            <div style={{ color: "var(--text-faint)", fontSize: 13, lineHeight: 1.8 }}>
              這個詞還沒有收錄完整解釋，我們正在持續擴充西語文法資料庫。
            </div>
          )}

          {!loading && card && card.type !== "unknown" && (
            <>
              {card.zh && (
                <Section icon="📖" title="中文意思" color="#a78bfa">
                  <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.85 }}>{card.zh}</div>
                </Section>
              )}

              {card.ambiguous && card.meaningsZh?.length > 0 && (
                <Section icon="⚠️" title="可能指涉（實際指誰要看上下文）" color="#ef4444">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                    {card.meaningsZh.map((m, i) => (
                      <span key={i} style={{ fontSize: 13, fontWeight: 600, color: "var(--text)",
                        padding: "5px 12px", borderRadius: 20, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)" }}>
                        {m}{card.possibleOwners?.[i] && <span style={{ color: "var(--text-faint)", fontWeight: 400 }}> ({card.possibleOwners[i]})</span>}
                      </span>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.75 }}>
                    這幾種都是 {card.word} 可能的意思，光看這個詞本身無法判斷是哪一個——一定要靠前後文（或更前面提到的主詞）才能確定實際指誰。
                  </div>
                </Section>
              )}

              {card.ambiguous && card.disambiguation?.length > 0 && (
                <Section icon="🔎" title="想講清楚是誰？可以這樣說" color="#22c55e">
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 8 }}>
                    {card.disambiguation.map((d, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "6px 12px", background: "rgba(34,197,94,0.06)", borderRadius: 8 }}>
                        <span style={{ fontWeight: 700, color: "#4ade80", fontSize: 13, minWidth: 130, flexShrink: 0 }}>{d.es}</span>
                        <span style={{ fontSize: 12, color: "var(--text)" }}>{d.zh}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text)", lineHeight: 1.7, fontStyle: "italic" }}>
                    西班牙語中的 {card.word} 很常見，但需要明確指出擁有者時，可以用「de + 人稱代詞或名字」取代，講得更清楚。
                  </div>
                </Section>
              )}

              {card.en && (
                <Section icon="🔤" title="英文意思" color="#38bdf8">
                  <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7 }}>{card.en}</div>
                </Section>
              )}

              {card.conjugationLink && (
                <a href={card.conjugationLink} target="_blank" rel="noreferrer"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 16, padding: "7px 14px", borderRadius: 10,
                    background: "rgba(220,38,38,0.12)", color: "#ef4444", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
                  🧩 查看完整變位表
                </a>
              )}

              {card.coreConcept && (
                <Section icon="💡" title="核心概念" color="#f59e0b">
                  <div style={{ fontSize: 13, color: "#fcd34d", lineHeight: 1.75, fontStyle: "italic",
                    padding: "10px 14px", background: "rgba(245,158,11,0.08)", borderRadius: 10, borderLeft: "3px solid #f59e0b" }}>
                    {card.coreConcept}
                  </div>
                </Section>
              )}

              {card.tip && (
                <Section icon="🎯" title="初學者提示" color="#8b5cf6">
                  <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.85, whiteSpace: "pre-line",
                    padding: "10px 14px", background: "rgba(139,92,246,0.06)", borderRadius: 10 }}>
                    {card.tip}
                  </div>
                </Section>
              )}

              {card.etymology && (
                <Section icon="🌱" title="詞源拆解" color="#10b981">
                  {card.etymology.note ? (
                    <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.8, padding: "10px 14px", background: "rgba(16,185,129,0.06)", borderRadius: 10 }}>
                      {card.etymology.note}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {Object.entries(card.etymology).filter(([k]) => k !== "note").map(([k, v]) => (
                        <div key={k} style={{ display: "flex", gap: 10, padding: "7px 12px", background: "rgba(16,185,129,0.06)", borderRadius: 8 }}>
                          <span style={{ fontSize: 11, color: "#10b981", fontWeight: 800, minWidth: 56, flexShrink: 0 }}>{k}</span>
                          <span style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Section>
              )}

              {card.examples?.length > 0 && (
                <Section icon="📝" title="例句" color="#ec4899">
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {card.examples.map((ex, i) => (
                      <div key={i} style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.18)" }}>
                        <InlineClickableText text={ex.es} onWordClick={pushWord}
                          style={{ fontSize: 14, color: "#c4b5fd", fontStyle: "italic", lineHeight: 1.65, marginBottom: ex.zh ? 4 : 0, display: "block" }} />
                        {ex.zh && <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, marginBottom: ex.note ? 4 : 0 }}>{ex.zh}</div>}
                        {ex.note && <div style={{ fontSize: 11, color: "var(--text-faint)", lineHeight: 1.5 }}>💡 {ex.note}</div>}
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {(card.related?.length > 0 || card.wordFamily?.length > 0) && (
                <Section icon="🔗" title="相關文法 / 同源詞" color="#f97316">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {card.related?.map((w) => (
                      <button key={w} onClick={() => pushWord(w)}
                        style={{ padding: "5px 12px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--panel)",
                          color: "var(--text)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        {w}
                      </button>
                    ))}
                    {card.wordFamily?.map((wf, i) => (
                      <div key={i} style={{ display: "flex", gap: 8, alignItems: "baseline", width: "100%" }}>
                        <span style={{ fontWeight: 700, color: "#a78bfa", fontSize: 13, minWidth: 90, flexShrink: 0 }}>{wf.word}</span>
                        <span style={{ fontSize: 12, color: "var(--text-dim)" }}>{wf.zh}</span>
                      </div>
                    ))}
                  </div>
                </Section>
              )}

              {card.shortSummary && (
                <div style={{ padding: "13px 15px", borderRadius: 12, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
                  <div style={{ fontSize: 11, color: "#6366f1", fontWeight: 800, marginBottom: 5, letterSpacing: 0.5 }}>⚡ 記憶法</div>
                  <div style={{ fontSize: 13, color: "#c4b5fd", lineHeight: 1.75 }}>{card.shortSummary}</div>
                </div>
              )}

              {onAddVocab && (
                <button onClick={() => onAddVocab(current, card)}
                  style={{ marginTop: 18, width: "100%", padding: "11px 0", borderRadius: 12, border: "1px solid #166534",
                    background: "#0a1e14", color: "#4ade80", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                  ＋ 加入單字本
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
