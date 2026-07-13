import { useState, useRef, useCallback, useEffect } from "react";
import { loadAllEdits, getEdit, saveEdit } from "../lib/dictEdits";
import { db, auth } from "../lib/firebase";
import { collection, query, where, getDocs, doc, getDoc, updateDoc } from "firebase/firestore";
import { lookupDeep } from "../lib/spanishDeepDict";
import { getFrenchShard, normalizeFrench } from "../lib/frenchDictionary";

const EN_LETTERS = "abcdefghijklmnopqrstuvwxyz".split("");
const ES_LETTERS = [...EN_LETTERS, "ñ"];
const DICTIONARY_META = {
  en: { label: "🇬🇧 GB 英語", subtitle: "英語 400,000+ 字 · 中文翻譯", placeholder: "直接輸入英文單字搜尋...", locale: "en" },
  es: { label: "🇪🇸 ES 西語", subtitle: "西語 93,000+ 字 · 中文翻譯", placeholder: "直接輸入西語單字搜尋...", locale: "es" },
  fr: { label: "🇫🇷 FR 法語", subtitle: "法語 78,000+ 字 · 中文翻譯", placeholder: "直接輸入法語單字搜尋...", locale: "fr" },
};
const PAGE_SIZE = 50;
const TAG_LABELS = { zk: "中考", gk: "高考", ky: "考研", cet4: "CET4", cet6: "CET6", ielts: "IELTS", toefl: "TOEFL", gre: "GRE" };

function ExpandIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="7.5,1 11,1 11,4.5" />
      <polyline points="4.5,11 1,11 1,7.5" />
      <line x1="11" y1="1" x2="6.5" y2="5.5" />
      <line x1="1" y1="11" x2="5.5" y2="6.5" />
    </svg>
  );
}

function ExpandedCard({ word, data, lang, onClose, onSpeak, onAddToVocab }) {
  return (
    <div style={{
      background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "12px 14px", display: "flex", flexDirection: "column", gap: 5,
      maxHeight: 260, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.25)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: 15, color: "#a78bfa", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{word}</span>
        <button onClick={onSpeak} title="發音"
          style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", fontSize: 15, padding: "2px 3px", flexShrink: 0, lineHeight: 1 }}>🔊</button>
        <button onClick={onClose} title="關閉"
          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 13, padding: "2px 3px", flexShrink: 0, lineHeight: 1 }}>✕</button>
      </div>
      {/* Badges */}
      <div style={{ display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap", flexShrink: 0 }}>
        {lang === "en" && data?.p && <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{data.p}</span>}
        {data?.s && (
          <span style={{ fontSize: 11, padding: "1px 5px", background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 4 }}>{data.s}.</span>
        )}
        {lang === "en" && data?.g && (
          <span style={{ fontSize: 10, padding: "1px 6px", background: "var(--accent-hover)", color: "#93c5fd", borderRadius: 10 }}>{TAG_LABELS[data.g] || data.g.toUpperCase()}</span>
        )}
        {lang === "es" && data?.g && (
          <span style={{ fontSize: 11, padding: "1px 6px", fontWeight: 700, borderRadius: 4,
            background: data.g === "f" ? "#4c1d1d" : "var(--accent-hover)",
            color: data.g === "f" ? "#f87171" : "#60a5fa" }}>
            {data.g === "f" ? "f." : data.g === "m" ? "m." : data.g}
          </span>
        )}
      </div>
      {/* Meaning */}
      <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.55, flexShrink: 0 }}>
        {data?.t || data?.en || <span style={{ color: "var(--text-faint)" }}>查無此字</span>}
      </div>
      {lang !== "en" && data?.t && data?.en && (
        <div style={{ fontSize: 11, color: "var(--text-faint)", lineHeight: 1.4, flexShrink: 0 }}>{data.en}</div>
      )}
      {/* Example (first line only) */}
      {data?.ex && (
        <div style={{ fontSize: 11, color: "#c4b5fd", lineHeight: 1.65,
          borderTop: "1px solid var(--border)", paddingTop: 6, marginTop: 2, flexShrink: 0,
          overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
          {data.ex.split("\n").filter(Boolean)[0]}
        </div>
      )}
      {/* Add to vocab */}
      <button onClick={onAddToVocab} title="加入詞彙表"
        style={{ alignSelf: "flex-start", marginTop: "auto", paddingTop: 6,
          background: "#0a1e14", border: "1px solid #166534", borderRadius: 6,
          color: "#4ade80", cursor: "pointer", fontSize: 12, padding: "3px 12px",
          fontWeight: 700, letterSpacing: 1, flexShrink: 0 }}>
        ＋ 加入單字本
      </button>
    </div>
  );
}

function ExpandedDictionaryPanel({ cards, lang, onClose, onSpeak, onAddToVocab }) {
  if (cards.length === 0) return null;
  return (
    <div style={{ flexShrink: 0, borderBottom: "1px solid var(--border)", background: "var(--panel-alt)", padding: "10px 16px 12px" }}>
      <style>{`
        .expanded-dict-grid {
          display: grid;
          gap: 12px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
        @media (max-width: 900px) {
          .expanded-dict-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
        }
        @media (max-width: 600px) {
          .expanded-dict-grid { grid-template-columns: 1fr; }
        }
      `}</style>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", letterSpacing: 0.5 }}>📌 比較檢視</span>
        <span style={{ fontSize: 11, color: "var(--text-faint)" }}>{cards.length} / 3</span>
      </div>
      <div className="expanded-dict-grid">
        {cards.map(({ word, data }) => (
          <ExpandedCard key={word} word={word} data={data} lang={lang}
            onClose={() => onClose(word)}
            onSpeak={() => onSpeak(word, lang, data?.audioUrl)}
            onAddToVocab={() => onAddToVocab(word, data)} />
        ))}
      </div>
    </div>
  );
}

function DeepSection({ icon, title, color, children }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
        <span style={{ fontSize: 14 }}>{icon}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: color || "#6366f1", textTransform: "uppercase", letterSpacing: 0.8 }}>{title}</span>
      </div>
      {children}
    </div>
  );
}

function DeepExplanationPanel({ entry, basicData, word, lang, onClose, onOpenVocab }) {
  return (
    <>
      <style>{`
        .deep-panel-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.65); z-index: 800; }
        .deep-panel {
          position: fixed; top: 0; right: 0; bottom: 0;
          width: min(520px, 46vw); min-width: 360px;
          border-radius: 16px 0 0 16px;
          z-index: 801;
          background: var(--panel-alt);
          border: 1px solid var(--border);
          display: flex; flex-direction: column; overflow: hidden;
          box-shadow: 0 0 60px rgba(0,0,0,0.6);
        }
        @media (max-width: 767px) {
          .deep-panel {
            top: auto; left: 0; right: 0; bottom: 0;
            width: 100%; min-width: unset;
            height: 87vh;
            border-radius: 20px 20px 0 0;
          }
        }
      `}</style>
      <div className="deep-panel-overlay" onClick={onClose} />
      <div className="deep-panel">
        {/* Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "flex-start", gap: 12, flexShrink: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
              <span style={{ fontSize: 22, fontWeight: 800, color: "#a78bfa" }}>{entry?.word || word}</span>
              {entry?.lemma && entry.lemma !== (entry?.word || word) && (
                <span style={{ fontSize: 13, color: "var(--text-faint)" }}>← {entry.lemma}</span>
              )}
              <button onClick={() => speak(entry?.word || word, lang, basicData?.audioUrl)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", fontSize: 16, padding: 0, lineHeight: 1 }}>🔊</button>
            </div>
            <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
              {entry?.level && <span style={{ fontSize: 11, padding: "1px 7px", background: "rgba(16,185,129,0.15)", color: "#10b981", borderRadius: 6, fontWeight: 700 }}>{entry.level}</span>}
              {entry?.partOfSpeech && <span style={{ fontSize: 11, padding: "1px 7px", background: "rgba(99,102,241,0.15)", color: "#a78bfa", borderRadius: 6, fontWeight: 700 }}>{entry.partOfSpeech}</span>}
              {basicData?.g && (
                <span style={{ fontSize: 11, padding: "1px 7px", fontWeight: 700, borderRadius: 6,
                  background: basicData.g === "f" ? "#4c1d1d" : "rgba(96,165,250,0.12)",
                  color: basicData.g === "f" ? "#f87171" : "#60a5fa" }}>
                  {basicData.g === "f" ? "f." : "m."}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)", fontSize: 22, lineHeight: 1, padding: "2px 0", flexShrink: 0 }}>✕</button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 20px 48px" }}>
          {entry ? (
            <>
              <DeepSection icon="📖" title="中文意思" color="#a78bfa">
                <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.9 }}>{entry.meaningZh}</div>
              </DeepSection>

              {entry.coreImage && (
                <DeepSection icon="💡" title="核心意象" color="#f59e0b">
                  <div style={{ fontSize: 14, color: "#fcd34d", lineHeight: 1.7, fontStyle: "italic", padding: "10px 14px", background: "rgba(245,158,11,0.08)", borderRadius: 10, borderLeft: "3px solid #f59e0b" }}>
                    「{entry.coreImage}」
                  </div>
                </DeepSection>
              )}

              {entry.etymology && (
                <DeepSection icon="🌱" title="詞源拆解" color="#10b981">
                  {entry.etymology.note ? (
                    <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.85, padding: "10px 14px", background: "rgba(16,185,129,0.06)", borderRadius: 10 }}>
                      {entry.etymology.note}
                    </div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {Object.entries(entry.etymology).filter(([k]) => k !== "note").map(([k, v]) => (
                        <div key={k} style={{ display: "flex", gap: 10, padding: "7px 12px", background: "rgba(16,185,129,0.06)", borderRadius: 8 }}>
                          <span style={{ fontSize: 11, color: "#10b981", fontWeight: 800, minWidth: 56, flexShrink: 0 }}>{k}</span>
                          <span style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.7 }}>{v}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </DeepSection>
              )}

              {entry.evolution && (
                <DeepSection icon="🔄" title="意思演變" color="#06b6d4">
                  <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.85 }}>{entry.evolution}</div>
                </DeepSection>
              )}

              {entry.grammarNote && (
                <DeepSection icon="📐" title="文法提醒" color="#8b5cf6">
                  <div style={{ fontSize: 13, color: "var(--text-dim)", lineHeight: 1.9, whiteSpace: "pre-line", padding: "10px 14px", background: "rgba(139,92,246,0.06)", borderRadius: 10 }}>
                    {entry.grammarNote}
                  </div>
                </DeepSection>
              )}

              {entry.examples?.length > 0 && (
                <DeepSection icon="📝" title="例句" color="#ec4899">
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {entry.examples.map((ex, i) => (
                      <div key={i} style={{ padding: "10px 14px", borderRadius: 10, background: "rgba(236,72,153,0.06)", border: "1px solid rgba(236,72,153,0.18)" }}>
                        <div style={{ fontSize: 14, color: "#c4b5fd", fontStyle: "italic", lineHeight: 1.65, marginBottom: 4 }}>{ex.es}</div>
                        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.6, marginBottom: ex.note ? 4 : 0 }}>{ex.zh}</div>
                        {ex.note && <div style={{ fontSize: 11, color: "var(--text-faint)", lineHeight: 1.5 }}>💡 {ex.note}</div>}
                      </div>
                    ))}
                  </div>
                </DeepSection>
              )}

              {entry.wordFamily?.length > 0 && (
                <DeepSection icon="🔗" title="同源詞" color="#f97316">
                  <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                    {entry.wordFamily.map((wf, i) => (
                      <div key={i} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                        <span style={{ fontWeight: 700, color: "#a78bfa", fontSize: 14, minWidth: 110, flexShrink: 0 }}>{wf.word}</span>
                        <span style={{ fontSize: 13, color: "var(--text-dim)" }}>{wf.zh}</span>
                      </div>
                    ))}
                  </div>
                </DeepSection>
              )}

              {entry.shortSummary && (
                <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.3)" }}>
                  <div style={{ fontSize: 12, color: "#6366f1", fontWeight: 800, marginBottom: 5, letterSpacing: 0.5 }}>⚡ 記憶法</div>
                  <div style={{ fontSize: 13, color: "#c4b5fd", lineHeight: 1.78 }}>{entry.shortSummary}</div>
                </div>
              )}

              <button onClick={() => onOpenVocab(entry.word || word, basicData)}
                style={{ marginTop: 20, width: "100%", padding: "12px 0", borderRadius: 12, border: "1px solid #166534", background: "#0a1e14", color: "#4ade80", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
                ＋ 加入單字本
              </button>
            </>
          ) : (
            <div>
              <div style={{ fontSize: 15, color: "var(--text)", lineHeight: 1.7, marginBottom: 8 }}>{basicData?.t || basicData?.en || "查無此字"}</div>
              {basicData?.t && basicData?.en && <div style={{ fontSize: 13, color: "var(--text-faint)" }}>{basicData.en}</div>}
              <div style={{ fontSize: 12, color: "var(--text-faint)", fontStyle: "italic", marginTop: 12 }}>暫無深度解釋，正在逐步擴充中。</div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function speak(word, lang, audioUrl = "") {
  if (typeof window === "undefined") return;
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  if (audioUrl) {
    const audio = new Audio(audioUrl);
    audio.play().catch(() => {});
    return;
  }
  if (!window.speechSynthesis) return;
  const utter = new SpeechSynthesisUtterance(word);
  utter.lang = lang === "fr" ? "fr-FR" : lang === "es" ? "es-ES" : "en-US";
  utter.rate = 0.85;
  window.speechSynthesis.speak(utter);
}

function WordCard({ word, data, lang, onWordClick, onEdit, onAddToVocab }) {
  const translation = data.t || data.en;
  return (
    <div style={{ background: "var(--panel)", border: "1px solid var(--border)", borderRadius: 10,
      padding: "12px 14px", marginBottom: 8, display: "flex", flexDirection: "column" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap", marginBottom: 4 }}>
          <span onClick={(e) => onWordClick(word, data, e)} title="點擊查看定義"
            style={{ fontWeight: 700, fontSize: 16, color: "#a78bfa", cursor: "pointer",
              textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: 3 }}>{word}</span>
          {lang === "en" && data.p && (
            <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{data.p}</span>
          )}
          {data.s && (
            <span style={{ fontSize: 11, padding: "1px 5px", background: "var(--panel-alt)", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 4 }}>
              {data.s}.
            </span>
          )}
          {lang === "en" && data.g && (
            <span style={{ fontSize: 10, padding: "1px 6px", background: "var(--accent-hover)", color: "#93c5fd", borderRadius: 10 }}>
              {TAG_LABELS[data.g] || data.g.toUpperCase()}
            </span>
          )}
          {lang === "es" && data.g && (
            <span style={{ fontSize: 11, padding: "1px 6px", fontWeight: 700, borderRadius: 4,
              background: data.g === "f" ? "#4c1d1d" : "var(--accent-hover)",
              color: data.g === "f" ? "#f87171" : "#60a5fa" }}>
              {data.g === "f" ? "f." : data.g === "m" ? "m." : data.g}
            </span>
          )}
        </div>
        {translation && (
          <div style={{ fontSize: 14, color: "var(--text)", lineHeight: 1.5 }}>{translation}</div>
        )}
        {lang !== "en" && data.t && data.en && (
          <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>{data.en}</div>
        )}
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5, flexShrink: 0, marginLeft: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
          <button onClick={() => onEdit(word, data)} title="編輯"
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-faint)",
              fontSize: 14, padding: "2px 4px", borderRadius: 4 }}>✏️</button>
          <button onClick={() => speak(word, lang, data.audioUrl)} title="發音"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa",
              fontSize: 18, padding: "2px 4px", borderRadius: 6 }}>🔊</button>
        </div>
        <button onClick={() => onAddToVocab(word, data)} title="加入詞彙表"
          style={{ background: "#0a1e14", border: "1px solid #166534", borderRadius: 6,
            color: "#4ade80", cursor: "pointer", fontSize: 15, padding: "0px 10px",
            fontWeight: 700, lineHeight: 1.6, letterSpacing: 1 }}>＋</button>
      </div>
      </div>
    </div>
  );
}

export default function DictionaryRoom() {
  const [lang, setLang] = useState(() => {
    if (typeof window === "undefined") return "en";
    const saved = localStorage.getItem("dictLang");
    return DICTIONARY_META[saved] ? saved : "en";
  });
  const [activeLetter, setActiveLetter] = useState(null);
  const [search, setSearch] = useState("");
  const [shardData, setShardData] = useState({});
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const shardCache = useRef({});

  const [popup, setPopup] = useState(null); // { word, data, deepData, x, y }
  const [deepModal, setDeepModal] = useState(null); // { entry, basicData, word }
  const [expandedCards, setExpandedCards] = useState([]); // max 3 { word, data }
  const [editModal, setEditModal] = useState(null); // { word, lang }
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [srcModal, setSrcModal] = useState(null); // { word, src }
  const [expandField, setExpandField] = useState(null); // { key, label } for fullscreen textarea edit
  const [myLists, setMyLists] = useState([]);
  const [vocabModal, setVocabModal] = useState(null); // { word, data }
  const [addingList, setAddingList] = useState(null);
  const [addSuccess, setAddSuccess] = useState(null);

  useEffect(() => { loadAllEdits(); }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDocs(query(collection(db, "vocabLists"), where("uid", "==", uid)))
      .then(snap => setMyLists(
        snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
      ))
      .catch(() => {});
  }, []);

  const loadShard = useCallback(async (langKey, letter) => {
    const key = `${langKey}:${letter}`;
    if (shardCache.current[key]) return shardCache.current[key];
    if (langKey === "fr") {
      const res = await fetch(`/dict-fr/${letter}.json`);
      const raw = res.ok ? await res.json() : {};
      const data = Object.fromEntries(Object.entries(raw).map(([word, entry]) => [word, {
        ...entry,
        s: entry.partOfSpeech || "",
        t: entry.chinese || "待補中文翻譯",
        en: entry.english || "",
        ex: [entry.example, entry.exampleChinese].filter(Boolean).join("\n"),
      }]));
      const merged = { ...data, ...getFrenchShard(letter) };
      shardCache.current[key] = merged;
      return merged;
    }
    const dir = langKey === "es" ? "dict-es" : "dict";
    const res = await fetch(`/${dir}/${letter}.json`);
    const data = res.ok ? await res.json() : {};
    shardCache.current[key] = data;
    return data;
  }, []);

  const selectLetter = useCallback(async (letter) => {
    setSearch("");
    setActiveLetter(letter);
    setPage(1);
    setLoading(true);
    const data = await loadShard(lang, letter);
    setShardData(data);
    setLoading(false);
  }, [lang, loadShard]);

  const handleSearch = useCallback(async (val) => {
    setSearch(val);
    setPage(1);
    if (!val) return;
    const rawFirst = val[0].toLowerCase();
    if (!/[a-zàâæçéèêëîïôœùûüÿáíóúñ]/i.test(rawFirst)) return;
    const first = lang === "es" && /^ñ/i.test(rawFirst) ? "ñ"
      : lang === "fr" ? normalizeFrench(rawFirst).charAt(0)
      : rawFirst.normalize("NFD").replace(/[̀-ͯ]/g, "");
    setLoading(true);
    const data = await loadShard(lang, first);
    setShardData(data);
    setActiveLetter(first);
    setLoading(false);
  }, [lang, loadShard]);

  const switchLang = useCallback((newLang) => {
    setLang(newLang);
    if (typeof window !== "undefined") localStorage.setItem("dictLang", newLang);
    setActiveLetter(null);
    setSearch("");
    setShardData({});
    setPage(1);
    setPopup(null);
  }, []);

  const addExpandedCard = useCallback((word, data) => {
    setExpandedCards(prev => {
      const filtered = prev.filter(c => c.word !== word); // remove duplicate / re-insert as newest
      return [...filtered, { word, data }].slice(-3);     // max 3, oldest dropped automatically
    });
    setPopup(null);
  }, []);

  const removeExpandedCard = useCallback((word) => {
    setExpandedCards(prev => prev.filter(c => c.word !== word));
  }, []);

  const handleWordClick = useCallback((word, wordData, e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x = rect.left;
    let y = rect.bottom + 6;
    const edit = getEdit(lang, word);
    const mergedData = edit ? { ...wordData, ...edit } : wordData;
    const deepData = lang === "es" ? lookupDeep(word) : null;
    const pw = deepData ? 340 : (mergedData?.src || mergedData?.etymologyText || mergedData?.coreImage) ? 392 : 320;
    if (x + pw > window.innerWidth) x = Math.max(8, window.innerWidth - pw - 8);
    if (y + 380 > window.innerHeight) y = Math.max(8, rect.top - 386);
    setPopup({ word, data: mergedData, deepData, x, y });
  }, [lang]);

  const openEdit = (word, data) => {
    setPopup(null);
    setEditModal({ word, lang });
    const cached = getEdit(lang, word);
    const merged = cached ? { ...(data || {}), ...cached } : (data || {});
    setEditForm({ t: merged.t || "", s: merged.s || "", g: merged.g || "", p: merged.p || "", ex: merged.ex || "", src: merged.src || "", coreImage: merged.coreImage || "", etymologyText: merged.etymologyText || "", memoryHint: merged.memoryHint || "" });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const saved = await saveEdit(editModal.lang, editModal.word, editForm);
      setShardData(prev => ({ ...prev, [editModal.word]: { ...(prev[editModal.word] || {}), ...saved } }));
      setEditModal(null);
    } catch {
      alert("儲存失敗。請到 Firebase Console → Firestore → 規則，確認 dictEdits 集合允許寫入。");
    }
    setSaving(false);
  };

  const handleAddToVocab = async (listId) => {
    if (!vocabModal || addingList) return;
    const { word, data } = vocabModal;
    setAddingList(listId);
    try {
      const docRef = doc(db, "vocabLists", listId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) throw new Error("not found");
      const existing = snap.data().words || [];
      if (existing.some(w => w.word === word)) {
        setAddSuccess(`dup:${listId}`);
        setTimeout(() => setAddSuccess(null), 1500);
      } else {
        const newWord = {
          word,
          cn: data?.t || data?.en || "",
          phonetic: data?.p || "",
          pos: data?.s || "",
          example: "", exampleCn: "", category: "",
        };
        await updateDoc(docRef, { words: [...existing, newWord] });
        setAddSuccess(listId);
        setTimeout(() => { setAddSuccess(null); setVocabModal(null); }, 1200);
      }
    } catch {
      alert("加入失敗，請稍後重試");
    }
    setAddingList(null);
  };

  const letters = lang === "es" ? ES_LETTERS : EN_LETTERS;

  const stripAccents = s => lang === "fr"
    ? normalizeFrench(s)
    : s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const filtered = (() => {
    const entries = Object.entries(shardData);
    if (!entries.length) return [];
    const q = search.toLowerCase();
    const qStripped = stripAccents(q);
    const matched = q ? entries.filter(([w]) => {
      return w.toLowerCase().includes(q) || stripAccents(w).includes(qStripped);
    }) : entries;
    return matched.sort(([a], [b]) => a.localeCompare(b, DICTIONARY_META[lang].locale));
  })();

  const visible = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < filtered.length;

  return (
    <div style={{ flex: 1, background: "var(--bg)", display: "flex", flexDirection: "column", height: "100%", overflow: "hidden", color: "var(--text)" }}>

      {/* Header */}
      <div style={{ padding: "16px 20px 0", background: "var(--panel-alt)", borderBottom: "1px solid var(--panel)", flexShrink: 0 }}>

        {/* Title row + lang toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>📖</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>字典查詢</div>
              <div style={{ fontSize: 12, color: "var(--text-faint)" }}>
                {DICTIONARY_META[lang].subtitle}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 4, background: "var(--panel)", borderRadius: 8, padding: 3 }}>
            {Object.entries(DICTIONARY_META).map(([k, meta]) => (
              <button key={k} onClick={() => switchLang(k)}
                style={{ padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700,
                  background: lang === k ? "var(--accent-active)" : "transparent",
                  color: lang === k ? "#fff" : "var(--text-faint)", transition: "all 0.15s" }}>
                {meta.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search bar */}
        <div style={{ marginBottom: 12, position: "relative" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)", fontSize: 14, pointerEvents: "none" }}>🔍</span>
          <input
            value={search}
            onChange={e => handleSearch(e.target.value)}
            placeholder={DICTIONARY_META[lang].placeholder}
            style={{ width: "100%", boxSizing: "border-box", paddingLeft: 34, paddingRight: 12, paddingTop: 8, paddingBottom: 8,
              borderRadius: 8, border: "1px solid var(--border)", background: "var(--panel)", color: "var(--text)",
              fontSize: 14, outline: "none" }}
          />
        </div>

        {/* A-Z letter buttons */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, paddingBottom: 12, alignItems: "center" }}>
          {letters.map(l => (
            <button key={l} onClick={() => selectLetter(l)}
              style={{ minWidth: 30, height: 30, borderRadius: 6, border: "1px solid",
                borderColor: activeLetter === l && !search ? "var(--accent)" : "var(--border)",
                background: activeLetter === l && !search ? "var(--accent-active)" : "var(--panel)",
                color: activeLetter === l && !search ? "#fff" : "var(--text-muted)",
                cursor: "pointer", fontSize: 13, fontWeight: 700, transition: "all 0.15s",
                textTransform: "uppercase" }}>
              {l}
            </button>
          ))}
        </div>

      </div>

      {/* Expanded comparison panel — sits between A-Z and word list */}
      <ExpandedDictionaryPanel
        cards={expandedCards}
        lang={lang}
        onClose={removeExpandedCard}
        onSpeak={speak}
        onAddToVocab={(w, d) => setVocabModal({ word: w, data: d })}
      />

      {/* Word list */}
      <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>

        {!activeLetter && !search && (
          <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 60 }}>
            <div style={{ fontSize: 48, marginBottom: 14 }}>📖</div>
            <div style={{ fontSize: 15, marginBottom: 6 }}>選擇字母或輸入單字開始搜尋</div>
            <div style={{ fontSize: 13 }}>英語 40 萬字 · 西語 9.3 萬字 · 法語 7.8 萬字 · 全部免費內建</div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 40, fontSize: 14 }}>載入中...</div>
        )}

        {!loading && activeLetter && filtered.length === 0 && (
          <div style={{ textAlign: "center", color: "var(--text-faint)", padding: 40 }}>找不到符合的單字</div>
        )}

        {!loading && visible.map(([word, data]) => (
          <WordCard key={word} word={word} data={data} lang={lang}
            onWordClick={handleWordClick}
            onEdit={(w, d) => openEdit(w, d)}
            onAddToVocab={(w, d) => setVocabModal({ word: w, data: d })} />
        ))}

        {!loading && hasMore && (
          <div style={{ textAlign: "center", padding: "12px 0 24px" }}>
            <button onClick={() => setPage(p => p + 1)}
              style={{ padding: "10px 28px", borderRadius: 10, border: "1px solid var(--border)",
                background: "var(--panel)", color: "var(--text-muted)", cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
              載入更多（還有 {filtered.length - visible.length} 字）
            </button>
          </div>
        )}

      </div>

      {/* Small popup */}
      {popup && (
        <>
          <div onClick={() => setPopup(null)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />
          <div onClick={e => e.stopPropagation()}
            style={{ position: "fixed", left: popup.x, top: popup.y, zIndex: 300,
              background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 12,
              padding: "12px 14px", minWidth: 220, maxWidth: popup.deepData ? 340 : 360,
              maxHeight: "70vh", overflowY: "auto",
              boxShadow: "0 12px 32px rgba(0,0,0,0.55)" }}>
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: "#a78bfa", flex: 1 }}>{popup.word}</span>
              <button
                onClick={() => addExpandedCard(popup.word, popup.data)}
                title="展開到比較面板"
                style={{ background: "none", border: "none", cursor: "pointer", padding: "3px 4px", borderRadius: 4, color: "var(--text-faint)", lineHeight: 1, display: "flex", alignItems: "center" }}>
                <ExpandIcon />
              </button>
              <button onClick={() => setPopup(null)}
                style={{ background: "none", border: "none", cursor: "pointer", fontSize: 14, color: "var(--text-faint)", lineHeight: 1 }}>✕</button>
            </div>

            {/* === Spanish compact popup (has deep data) === */}
            {lang === "es" && popup.deepData ? (
              <>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center", marginBottom: 8 }}>
                  {popup.deepData.level && <span style={{ fontSize: 10, padding: "1px 7px", background: "rgba(16,185,129,0.15)", color: "#10b981", borderRadius: 6, fontWeight: 700 }}>{popup.deepData.level}</span>}
                  {popup.deepData.partOfSpeech && <span style={{ fontSize: 10, padding: "1px 7px", background: "rgba(139,92,246,0.15)", color: "#a78bfa", borderRadius: 6, fontWeight: 700 }}>{popup.deepData.partOfSpeech}</span>}
                  {popup.data?.g && (
                    <span style={{ fontSize: 10, padding: "1px 6px", fontWeight: 700, borderRadius: 4,
                      background: popup.data.g === "f" ? "#4c1d1d" : "var(--accent-hover)",
                      color: popup.data.g === "f" ? "#f87171" : "#60a5fa" }}>
                      {popup.data.g === "f" ? "f." : "m."}
                    </span>
                  )}
                  <button onClick={() => speak(popup.word, lang, popup.data?.audioUrl)} title="發音"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", fontSize: 14, lineHeight: 1, padding: 0 }}>🔊</button>
                </div>
                <div style={{ fontSize: 12, color: "#fcd34d", fontStyle: "italic", marginBottom: 6, lineHeight: 1.65 }}>
                  「{popup.deepData.coreImage}」
                </div>
                <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.7, marginBottom: 8 }}>
                  {popup.deepData.meaningZh}
                </div>
                {popup.deepData.examples?.[0] && (
                  <div style={{ padding: "7px 10px", borderRadius: 8, background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.18)", marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: "#c4b5fd", fontStyle: "italic", lineHeight: 1.6 }}>{popup.deepData.examples[0].es}</div>
                    <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{popup.deepData.examples[0].zh}</div>
                  </div>
                )}
                <button onClick={() => { setDeepModal({ entry: popup.deepData, basicData: popup.data, word: popup.word }); setPopup(null); }}
                  style={{ width: "100%", padding: "9px 0", borderRadius: 10, border: "1px solid rgba(99,102,241,0.4)", background: "rgba(99,102,241,0.1)", color: "#a78bfa", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
                  查看完整解釋 →
                </button>
              </>
            ) : (
              /* === Standard popup (English or Spanish without deep data) === */
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginBottom: 6 }}>
                  {lang === "en" && popup.data?.p && <span style={{ fontSize: 12, color: "var(--text-faint)" }}>{popup.data.p}</span>}
                  <button onClick={() => speak(popup.word, lang, popup.data?.audioUrl)} title="發音"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#60a5fa", fontSize: 13, lineHeight: 1, padding: 0 }}>🔊</button>
                  {popup.data?.s && (
                    <span style={{ fontSize: 11, padding: "1px 5px", background: "var(--panel)", border: "1px solid var(--border)", color: "var(--text-muted)", borderRadius: 4 }}>
                      {popup.data.s}.
                    </span>
                  )}
                  {lang === "en" && popup.data?.g && (
                    <span style={{ fontSize: 10, padding: "1px 6px", background: "var(--accent-hover)", color: "#93c5fd", borderRadius: 10 }}>
                      {TAG_LABELS[popup.data.g] || popup.data.g.toUpperCase()}
                    </span>
                  )}
                  {lang !== "en" && popup.data?.g && (
                    <span style={{ fontSize: 10, padding: "1px 6px", fontWeight: 700, borderRadius: 4,
                      background: popup.data.g === "f" ? "#4c1d1d" : "var(--accent-hover)",
                      color: popup.data.g === "f" ? "#f87171" : "#60a5fa" }}>
                      {popup.data.g === "f" ? "f." : popup.data.g === "m" ? "m." : popup.data.g}
                    </span>
                  )}
                </div>
                {popup.data ? (
                  <>
                    <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5 }}>{popup.data.t || popup.data.en}</div>
                    {lang !== "en" && popup.data.t && popup.data.en && (
                      <div style={{ fontSize: 11, color: "var(--text-faint)", marginTop: 2 }}>{popup.data.en}</div>
                    )}
                    {popup.data.ex && (
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--panel)" }}>
                        <div style={{ fontSize: 11, color: "#22c55e", marginBottom: 5, fontWeight: 700 }}>📝 例句</div>
                        {popup.data.ex.split("\n").filter(Boolean).map((line, i) => (
                          <div key={i} style={{ fontSize: 12, color: "#c4b5fd", lineHeight: 1.65, marginBottom: 4 }}>{line}</div>
                        ))}
                      </div>
                    )}
                    {popup.data.src && (
                      <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--panel)" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 5 }}>
                          <div style={{ fontSize: 11, color: "#7c3aed", fontWeight: 700 }}>📖 來源</div>
                          <button onClick={() => setSrcModal({ word: popup.word, src: popup.data.src })}
                            title="展開完整來源"
                            style={{ background: "none", border: "1px solid var(--border)", cursor: "pointer",
                              color: "var(--text-faint)", fontSize: 10, padding: "1px 8px", borderRadius: 4, lineHeight: 1.6 }}>
                            展開
                          </button>
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-subtle)", lineHeight: 1.8, whiteSpace: "pre-wrap",
                          maxHeight: 80, overflow: "hidden" }}>
                          {popup.data.src}
                        </div>
                      </div>
                    )}
                    <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--panel)" }}>
                      <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginBottom: 6 }}>🌱 詞源記憶</div>
                      {(popup.data.coreImage || popup.data.etymologyText || popup.data.memoryHint) ? (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {popup.data.coreImage && (
                            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                              <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, whiteSpace: "nowrap", paddingTop: 1 }}>核心意象</span>
                              <span style={{ fontSize: 12, color: "#fcd34d", lineHeight: 1.6 }}>{popup.data.coreImage}</span>
                            </div>
                          )}
                          {popup.data.etymologyText && (
                            <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                              <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 700, whiteSpace: "nowrap", paddingTop: 1 }}>詞源拆解</span>
                              <span style={{ fontSize: 12, color: "var(--text-dim)", lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{popup.data.etymologyText}</span>
                            </div>
                          )}
                          {popup.data.memoryHint && (
                            <div style={{ padding: "6px 10px", borderRadius: 7, background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
                              <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700 }}>💡 </span>
                              <span style={{ fontSize: 12, color: "#fcd34d", lineHeight: 1.65 }}>{popup.data.memoryHint}</span>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: 12, color: "var(--text-faint)", lineHeight: 1.6, fontStyle: "italic" }}>
                          這個詞暫時沒有可靠詞源拆解，先用例句記憶。
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div style={{ fontSize: 13, color: "var(--text-faint)" }}>查無此字</div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {/* Deep explanation panel */}
      {deepModal && (
        <DeepExplanationPanel
          entry={deepModal.entry}
          basicData={deepModal.basicData}
          word={deepModal.word}
          lang={lang}
          onClose={() => setDeepModal(null)}
          onOpenVocab={(w, d) => { setDeepModal(null); setVocabModal({ word: w, data: d }); }}
        />
      )}

      {/* Src full-content modal */}
      {srcModal && (
        <div onClick={() => setSrcModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 500,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 16,
              width: 560, maxWidth: "92vw", maxHeight: "80vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}>
            <div style={{ padding: "16px 20px 12px", borderBottom: "1px solid var(--panel)",
              display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 14, color: "#7c3aed", fontWeight: 700 }}>📖 來源</span>
              <span style={{ fontSize: 16, color: "#a78bfa", fontWeight: 700, flex: 1 }}>{srcModal.word}</span>
              <button onClick={() => setSrcModal(null)}
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px 20px" }}>
              <div style={{ fontSize: 14, color: "var(--text-subtle)", lineHeight: 2, whiteSpace: "pre-wrap" }}>{srcModal.src}</div>
            </div>
          </div>
        </div>
      )}

      {/* Vocab picker modal */}
      {vocabModal && (
        <div onClick={() => setVocabModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--panel-alt)", border: "1px solid var(--border)", borderRadius: 16, padding: "20px 24px",
              width: 340, maxWidth: "92vw", maxHeight: "80vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: "var(--text)", marginBottom: 4 }}>加入詞彙表</div>
            <div style={{ fontSize: 13, color: "var(--text-faint)", marginBottom: 14 }}>將「<span style={{ color: "#a78bfa" }}>{vocabModal.word}</span>」加入哪個詞彙表？</div>
            {myLists.length === 0 ? (
              <div style={{ textAlign: "center", color: "var(--text-faint)", padding: "24px 0", fontSize: 13 }}>
                你還沒有詞彙表，<br/>請先到「自建詞彙」頁面新建
              </div>
            ) : (
              <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
                {myLists.map(list => {
                  const isSuccess = addSuccess === list.id;
                  const isDup = addSuccess === `dup:${list.id}`;
                  const isAdding = addingList === list.id;
                  return (
                    <button key={list.id} onClick={() => handleAddToVocab(list.id)} disabled={!!addingList}
                      style={{ background: isSuccess ? "#0a1e14" : "var(--panel)",
                        border: `1px solid ${isSuccess ? "#166534" : "var(--border)"}`,
                        borderRadius: 10, padding: "10px 14px", cursor: addingList ? "default" : "pointer",
                        display: "flex", alignItems: "center", gap: 10, textAlign: "left",
                        opacity: addingList && !isAdding ? 0.5 : 1, transition: "all 0.2s" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: isSuccess ? "#4ade80" : isDup ? "var(--text-faint)" : "var(--text)" }}>
                          {isSuccess ? "✓ 已加入！" : isDup ? "✗ 已在此表中" : list.title}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--text-faint)", marginTop: 2 }}>
                          {list.language} · {(list.words || []).length} 個單字
                        </div>
                      </div>
                      {isAdding && <span style={{ color: "var(--text-faint)", fontSize: 12 }}>加入中...</span>}
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={() => setVocabModal(null)}
              style={{ marginTop: 14, padding: "8px 0", borderRadius: 10, border: "1px solid var(--border)",
                cursor: "pointer", background: "none", color: "var(--text-muted)", fontSize: 13 }}>
              關閉
            </button>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editModal && (
        <div onClick={() => setEditModal(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 400, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--panel-alt)", border: "1px solid #4c1d95", borderRadius: 16, padding: "22px 24px",
              width: 360, maxWidth: "92vw", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#a78bfa", marginBottom: 18 }}>✏️ 編輯「{editModal.word}」</div>

            {[
              { key: "t", label: "中文翻譯", placeholder: "輸入中文翻譯..." },
              { key: "s", label: "詞性 (n. / v. / adj. 等)", placeholder: "n. / v. / adj." },
              ...(editModal.lang !== "en"
                ? [{ key: "g", label: "陰陽性 (m / f / m-f)", placeholder: "m / f / m-f" }]
                : [{ key: "p", label: "音標", placeholder: "/fəˈnɛtɪk/" }]
              ),
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, color: "var(--text-faint)", display: "block", marginBottom: 4 }}>{label}</label>
                <input value={editForm[key] || ""} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  style={{ width: "100%", boxSizing: "border-box", background: "var(--panel-alt)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "8px 10px", color: "var(--text)", fontSize: 14, outline: "none" }} />
              </div>
            ))}

            {/* Etymology fields */}
            <div style={{ marginBottom: 14, paddingBottom: 12, borderBottom: "1px solid var(--border)" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#f59e0b", marginBottom: 10 }}>🌱 詞源記憶</div>
              {[
                { key: "coreImage", label: "核心意象", placeholder: "例：inter = 之間，看見 → 中途出現" },
                { key: "memoryHint", label: "一句話記憶法", placeholder: "例：面試就是讓別人「看見你站在中間」" },
              ].map(({ key, label, placeholder }) => (
                <div key={key} style={{ marginBottom: 10 }}>
                  <label style={{ fontSize: 12, color: "var(--text-faint)", display: "block", marginBottom: 4 }}>{label}</label>
                  <input value={editForm[key] || ""} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={{ width: "100%", boxSizing: "border-box", background: "var(--panel-alt)", border: "1px solid var(--border)",
                      borderRadius: 8, padding: "8px 10px", color: "var(--text)", fontSize: 13, outline: "none" }} />
                </div>
              ))}
              <div style={{ marginBottom: 2 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ fontSize: 12, color: "var(--text-faint)" }}>詞源拆解</label>
                  <button onClick={() => setExpandField({ key: "etymologyText", label: "🌱 詞源拆解" })}
                    title="展開大視窗編輯"
                    style={{ background: "none", border: "1px solid var(--border)", cursor: "pointer",
                      color: "var(--text-faint)", fontSize: 11, padding: "1px 8px", borderRadius: 4,
                      lineHeight: 1.6, flexShrink: 0 }}>
                    ⛶ 展開
                  </button>
                </div>
                <textarea value={editForm.etymologyText || ""} onChange={e => setEditForm(f => ({ ...f, etymologyText: e.target.value }))}
                  placeholder={"例：inter（之間）+ view（看）→ 彼此對看\n源自拉丁語 inter = between，videre = see"}
                  rows={3}
                  style={{ width: "100%", boxSizing: "border-box", background: "var(--panel-alt)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "8px 10px", color: "var(--text)", fontSize: 13, outline: "none",
                    resize: "vertical", lineHeight: 1.7, fontFamily: "inherit" }} />
              </div>
            </div>

            {[
              { key: "ex", label: "📝 例句（每行一句）", placeholder: "輸入例句，每行一句...\n例：Él perdió su prestigio.（他失去了威望。）" },
              { key: "src", label: "📖 來源（點擊單詞後顯示）", placeholder: "輸入詞源說明，支援換行...\n例：源自拉丁語 inter（之間）+ videre（看）" },
            ].map(({ key, label, placeholder }) => (
              <div key={key} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ fontSize: 12, color: "var(--text-faint)" }}>{label}</label>
                  <button onClick={() => setExpandField({ key, label })}
                    title="展開大視窗編輯"
                    style={{ background: "none", border: "1px solid var(--border)", cursor: "pointer",
                      color: "var(--text-faint)", fontSize: 11, padding: "1px 8px", borderRadius: 4,
                      lineHeight: 1.6, flexShrink: 0 }}>
                    ⛶ 展開
                  </button>
                </div>
                <textarea value={editForm[key] || ""} onChange={e => setEditForm(f => ({ ...f, [key]: e.target.value }))}
                  placeholder={placeholder}
                  rows={4}
                  style={{ width: "100%", boxSizing: "border-box", background: "var(--panel-alt)", border: "1px solid var(--border)",
                    borderRadius: 8, padding: "8px 10px", color: "var(--text)", fontSize: 13, outline: "none",
                    resize: "vertical", lineHeight: 1.7, fontFamily: "inherit" }} />
              </div>
            ))}

            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
              <button onClick={handleSaveEdit} disabled={saving}
                style={{ flex: 1, padding: 10, borderRadius: 10, border: "none", cursor: saving ? "default" : "pointer",
                  background: "linear-gradient(135deg,#4c1d95,#7c3aed)", color: "#fff", fontWeight: 700, fontSize: 14,
                  opacity: saving ? 0.6 : 1 }}>
                {saving ? "儲存中..." : "儲存"}
              </button>
              <button onClick={() => setEditModal(null)}
                style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid var(--border)",
                  cursor: "pointer", background: "none", color: "var(--text-muted)", fontSize: 14 }}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expand textarea modal */}
      {expandField && (
        <div onClick={() => setExpandField(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.88)", zIndex: 600,
            display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: "var(--panel-alt)", border: "1px solid #4c1d95", borderRadius: 16,
              width: 680, maxWidth: "96vw", height: "80vh",
              display: "flex", flexDirection: "column", overflow: "hidden",
              boxShadow: "0 24px 60px rgba(0,0,0,0.8)" }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--panel)",
              display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <span style={{ fontSize: 14, color: "#a78bfa", fontWeight: 700, flex: 1 }}>{expandField.label} — {editModal?.word}</span>
              <button onClick={() => setExpandField(null)}
                style={{ background: "none", border: "none", color: "var(--text-faint)", cursor: "pointer", fontSize: 20, lineHeight: 1 }}>✕</button>
            </div>
            <textarea
              autoFocus
              value={editForm[expandField.key] || ""}
              onChange={e => setEditForm(f => ({ ...f, [expandField.key]: e.target.value }))}
              style={{ flex: 1, width: "100%", boxSizing: "border-box", background: "var(--bg)",
                border: "none", outline: "none", padding: "18px 20px",
                color: "var(--text)", fontSize: 15, lineHeight: 2, resize: "none",
                fontFamily: "inherit" }}
            />
            <div style={{ padding: "12px 18px", borderTop: "1px solid var(--panel)", display: "flex", justifyContent: "flex-end", flexShrink: 0 }}>
              <button onClick={() => setExpandField(null)}
                style={{ padding: "8px 24px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: "linear-gradient(135deg,#4c1d95,#7c3aed)", color: "#fff", fontWeight: 700, fontSize: 14 }}>
                完成
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
