import { useState, useMemo } from "react";
import { resolveVerb, searchVerbs, reverseLookup } from "../lib/spanishVerbs/verbEngine";
import { PERSON_LABELS } from "../lib/spanishVerbs/conjugationEngine";
import { VERB_NOTES } from "../lib/spanishVerbs/verbNotes";

const QUICK_VERBS = ["ser", "estar", "tener", "ir", "hacer", "poder", "querer", "decir", "ver", "dar", "saber", "venir", "poner", "salir", "hablar", "comer", "vivir"];

function speak(text, rate = 0.9) {
  if (typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "es-ES"; u.rate = rate;
  window.speechSynthesis.speak(u);
}

function PlayButton({ text, sm }) {
  const [active, setActive] = useState(false);
  function handle(e) {
    e?.stopPropagation();
    speak(text);
    setActive(true);
    setTimeout(() => setActive(false), 900);
  }
  return (
    <button onClick={handle} title="播放發音"
      style={{ width: sm ? 26 : 30, height: sm ? 26 : 30, borderRadius: 8, flexShrink: 0,
        border: `1px solid ${active ? "#dc2626" : "var(--border)"}`, background: active ? "rgba(220,38,38,0.12)" : "var(--panel-alt)",
        color: active ? "#ef4444" : "var(--text-faint)", cursor: "pointer", fontSize: sm ? 11 : 13,
        display: "flex", alignItems: "center", justifyContent: "center" }}>
      🔊
    </button>
  );
}

const INDICATIVO_TENSES = [
  { key: "presente", label: "Presente 現在時" },
  { key: "preteritoIndefinido", label: "Pretérito indefinido 簡單過去時" },
  { key: "preteritoImperfecto", label: "Pretérito imperfecto 未完成過去時" },
  { key: "futuroSimple", label: "Futuro simple 簡單將來時" },
  { key: "condicionalSimple", label: "Condicional simple 條件式" },
  { key: "preteritoPerfecto", label: "Pretérito perfecto 現在完成時" },
  { key: "pluscuamperfecto", label: "Pluscuamperfecto 過去完成時" },
];

const SUBJUNTIVO_TENSES = [
  { key: "subjuntivoPresente", label: "Presente 現在虛擬式" },
  { key: "subjuntivoImperfecto", label: "Imperfecto 未完成過去虛擬式" },
  { key: "subjuntivoPreteritoPerfecto", label: "Pretérito perfecto 現在完成虛擬式" },
];

function ConjugationTable({ table, incomplete }) {
  if (!table) return <div style={{ fontSize: 13, color: "var(--text-faint)" }}>此時態資料稍後加入。</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {Object.keys(PERSON_LABELS).map(key => {
        const form = table[key];
        const isPlaceholder = typeof form === "string" && form.includes("稍後加入");
        return (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--panel-alt)", borderRadius: 10, border: "1px solid var(--border)" }}>
            <span style={{ fontSize: 12, color: "var(--text-faint)", width: 170, flexShrink: 0 }}>{PERSON_LABELS[key]}</span>
            {isPlaceholder ? (
              <span style={{ fontSize: 13, color: "var(--text-faint)", fontStyle: "italic" }}>{form}</span>
            ) : (
              <>
                <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", flex: 1 }}>{form}</span>
                <PlayButton text={form} sm />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ImperativoTable({ afirmativo, negativo }) {
  const rows = [["tu", "tú"], ["usted", "usted"], ["nosotros", "nosotros / nosotras"], ["vosotros", "vosotros / vosotras"], ["ustedes", "ustedes"]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#10b981", marginBottom: 8 }}>肯定命令式 Afirmativo</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map(([key, label]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--panel-alt)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--text-faint)", width: 170, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", flex: 1 }}>{afirmativo?.[key]}</span>
              <PlayButton text={afirmativo?.[key]} sm />
            </div>
          ))}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", marginBottom: 8 }}>否定命令式 Negativo</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {rows.map(([key, label]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--panel-alt)", borderRadius: 10, border: "1px solid var(--border)" }}>
              <span style={{ fontSize: 12, color: "var(--text-faint)", width: 170, flexShrink: 0 }}>{label}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", flex: 1 }}>{negativo?.[key]}</span>
              <PlayButton text={negativo?.[key]} sm />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function NoPersonalesTable({ conjugation }) {
  const rows = [["Infinitivo 原形", conjugation.infinitivo], ["Gerundio 現在分詞", conjugation.gerundio], ["Participio 過去分詞", conjugation.participio]];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {rows.map(([label, val]) => (
        <div key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "var(--panel-alt)", borderRadius: 10, border: "1px solid var(--border)" }}>
          <span style={{ fontSize: 12, color: "var(--text-faint)", width: 170, flexShrink: 0 }}>{label}</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", flex: 1 }}>{val}</span>
          <PlayButton text={val} sm />
        </div>
      ))}
    </div>
  );
}

function VerbDetail({ result }) {
  const [mood, setMood] = useState("indicativo");
  const [tenseKey, setTenseKey] = useState("presente");
  if (!result || !result.conjugation) return null;
  const { entry, conjugation, autoGenerated } = result;
  const notes = VERB_NOTES[entry.infinitive];

  const tenseList = mood === "indicativo" ? INDICATIVO_TENSES : mood === "subjuntivo" ? SUBJUNTIVO_TENSES : null;
  const activeTense = tenseList?.find(t => t.key === tenseKey) || tenseList?.[0];

  function selectMood(m) {
    setMood(m);
    if (m === "indicativo") setTenseKey("presente");
    if (m === "subjuntivo") setTenseKey("subjuntivoPresente");
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <span style={{ fontSize: 26, fontWeight: 800, color: "var(--text)" }}>{entry.infinitive}</span>
        <PlayButton text={entry.infinitive} />
        <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 8, background: entry.type === "irregular" ? "rgba(220,38,38,0.14)" : "rgba(16,185,129,0.14)", color: entry.type === "irregular" ? "#ef4444" : "#10b981" }}>
          {entry.type === "irregular" ? "不規則動詞" : "規則動詞"}
        </span>
        {entry.level && <span style={{ fontSize: 12, fontWeight: 700, padding: "2px 9px", borderRadius: 8, background: "rgba(99,102,241,0.14)", color: "#6366f1" }}>{entry.level}</span>}
      </div>
      {entry.zh && <div style={{ fontSize: 16, color: "var(--text-muted)", marginBottom: 4 }}>{entry.zh}{entry.en && <span style={{ color: "var(--text-faint)" }}> · {entry.en}</span>}</div>}

      {autoGenerated && (
        <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 10, background: "rgba(245,158,11,0.1)", border: "1px solid rgba(245,158,11,0.25)", fontSize: 13, color: "#d97706" }}>
          ⚠️ 這個動詞不在完整資料庫中。以下是依照 -{entry.ending} 規則自動生成的變位，如果它其實是不規則動詞，請自行核對。
        </div>
      )}

      {notes && (
        <div style={{ marginTop: 14, padding: "14px 16px", borderRadius: 12, background: "var(--panel)", border: "1px solid var(--border)" }}>
          <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.8 }}>
            <div><b>核心意思：</b>{notes.coreMeaning}</div>
            <div><b>什麼時候用：</b>{notes.whenToUse}</div>
            {notes.collocations?.length > 0 && <div><b>常見搭配：</b>{notes.collocations.join("、")}</div>}
            {notes.commonMistakes?.length > 0 && <div style={{ color: "#ef4444" }}><b>常見錯誤：</b>{notes.commonMistakes.join(" ")}</div>}
            {notes.similarVerbDiff && <div><b>和相似動詞的分別：</b>{notes.similarVerbDiff}</div>}
          </div>
          {notes.examples?.length > 0 && (
            <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 6 }}>
              {notes.examples.map((ex, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 10px", background: "var(--panel-alt)", borderRadius: 8 }}>
                  <PlayButton text={ex.es} sm />
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{ex.es}</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{ex.zh} · {ex.en}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Mood tabs */}
      <div style={{ display: "flex", gap: 8, marginTop: 18, marginBottom: 12, overflowX: "auto" }}>
        {[["indicativo", "直陳式 Indicativo"], ["subjuntivo", "虛擬式 Subjuntivo"], ["imperativo", "命令式 Imperativo"], ["noPersonales", "非人稱形式"]].map(([m, label]) => (
          <button key={m} onClick={() => selectMood(m)}
            style={{ padding: "7px 14px", borderRadius: 20, border: `1px solid ${mood === m ? "#dc2626" : "var(--border)"}`,
              background: mood === m ? "rgba(220,38,38,0.12)" : "var(--panel)", color: mood === m ? "#ef4444" : "var(--text-muted)",
              cursor: "pointer", fontSize: 13, fontWeight: mood === m ? 700 : 400, whiteSpace: "nowrap", flexShrink: 0 }}>
            {label}
          </button>
        ))}
      </div>

      {tenseList && (
        <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", flexWrap: "wrap" }}>
          {tenseList.map(t => (
            <button key={t.key} onClick={() => setTenseKey(t.key)}
              style={{ padding: "5px 11px", borderRadius: 8, border: `1px solid ${tenseKey === t.key ? "#6366f1" : "var(--border)"}`,
                background: tenseKey === t.key ? "rgba(99,102,241,0.12)" : "var(--panel)", color: tenseKey === t.key ? "#6366f1" : "var(--text-muted)",
                cursor: "pointer", fontSize: 12, fontWeight: tenseKey === t.key ? 700 : 400, whiteSpace: "nowrap" }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      <div>
        {mood === "indicativo" || mood === "subjuntivo" ? (
          <ConjugationTable table={conjugation[activeTense.key]} />
        ) : mood === "imperativo" ? (
          <ImperativoTable afirmativo={conjugation.imperativoAfirmativo} negativo={conjugation.imperativoNegativo} />
        ) : (
          <NoPersonalesTable conjugation={conjugation} />
        )}
      </div>
    </div>
  );
}

export default function SpanishVerbConjugator({ initialVerb, onNav }) {
  const [query, setQuery] = useState(initialVerb || "");
  const [result, setResult] = useState(() => (initialVerb ? resolveVerb(initialVerb) : null));
  const [reverseHits, setReverseHits] = useState([]);
  const [suggestions, setSuggestions] = useState([]);

  function runSearch(raw) {
    const q = raw.trim();
    if (!q) { setResult(null); setReverseHits([]); setSuggestions([]); return; }
    const direct = resolveVerb(q);
    if (!direct.notFound && !direct.autoGenerated) {
      setResult(direct); setReverseHits([]); setSuggestions([]);
      return;
    }
    const reverse = reverseLookup(q);
    if (reverse.length > 0) {
      setReverseHits(reverse); setResult(null); setSuggestions([]);
      return;
    }
    const bySense = searchVerbs(q);
    if (bySense.length > 0) {
      setSuggestions(bySense); setResult(null); setReverseHits([]);
      return;
    }
    if (!direct.notFound) {
      setResult(direct); setReverseHits([]); setSuggestions([]);
    } else {
      setResult(null); setReverseHits([]); setSuggestions([]);
    }
  }

  function pickVerb(infinitive) {
    setQuery(infinitive);
    setResult(resolveVerb(infinitive));
    setReverseHits([]); setSuggestions([]);
  }

  return (
    <div style={{ minHeight: "100%", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "20px 24px 80px" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, fontSize: 13 }}>
          <button onClick={() => onNav && onNav("home")} style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", padding: 0 }}>← 西班牙語</button>
        </div>
        <h1 style={{ margin: "4px 0 4px", fontSize: 22, fontWeight: 800 }}>西語動詞變位表大全</h1>
        <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 16 }}>查詢西班牙語動詞的完整時態、人稱與例句。</div>

        <div style={{ position: "relative", marginBottom: 12 }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-faint)" }}>🔍</span>
          <input value={query} onChange={e => { setQuery(e.target.value); runSearch(e.target.value); }}
            onKeyDown={e => { if (e.key === "Enter") runSearch(query); }}
            placeholder="輸入動詞原形或變位，例如 hablar, tengo, fui, comiendo"
            style={{ width: "100%", boxSizing: "border-box", padding: "12px 14px 12px 36px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)", fontSize: 15 }} />
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 20 }}>
          {QUICK_VERBS.map(v => (
            <button key={v} onClick={() => pickVerb(v)}
              style={{ padding: "6px 13px", borderRadius: 20, border: `1px solid ${result?.entry?.infinitive === v ? "#dc2626" : "var(--border)"}`,
                background: result?.entry?.infinitive === v ? "rgba(220,38,38,0.12)" : "var(--panel)",
                color: result?.entry?.infinitive === v ? "#ef4444" : "var(--text-muted)",
                cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
              {v}
            </button>
          ))}
        </div>

        {reverseHits.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>
              「{query}」可能來自以下變位（點擊查看完整表）：
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {reverseHits.map((hit, i) => (
                <button key={i} onClick={() => pickVerb(hit.infinitive)}
                  style={{ textAlign: "left", padding: "12px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--panel)", cursor: "pointer" }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)" }}>{query} → <span style={{ color: "#dc2626" }}>{hit.infinitive}</span></div>
                  <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{hit.tenseLabel} · {hit.personLabel}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {suggestions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 10 }}>符合「{query}」的動詞：</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {suggestions.map(v => (
                <button key={v.infinitive} onClick={() => pickVerb(v.infinitive)}
                  style={{ padding: "8px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "var(--panel)", cursor: "pointer", textAlign: "left" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>{v.infinitive}</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{v.zh}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {!result && !reverseHits.length && !suggestions.length && query.trim() && (
          <div style={{ padding: 20, textAlign: "center", color: "var(--text-faint)", fontSize: 13 }}>找不到「{query}」，換個關鍵字試試。</div>
        )}

        {result && <VerbDetail result={result} />}
      </div>
    </div>
  );
}
