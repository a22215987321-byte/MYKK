import { useState, useEffect } from "react";
import GrammarLearningCard from "./GrammarLearningCard";
import { SPANISH_WORD_RE, SPANISH_WORD_START_RE } from "../lib/spanishGrammarEngine";
import { loadAllEdits } from "../lib/dictEdits";

// 共用的「西語文字可點擊」包裝元件。任何頁面顯示西語句子/單字時都用這個包起來，
// 每個詞點下去都會開啟同一套 GrammarLearningCard，取代過去 ClickableSentence /
// SpanishCourseRoom / DictionaryRoom 各自寫一套 popup 的做法。
export default function ClickableSpanishText({ text, style, onAddVocab }) {
  const [activeWord, setActiveWord] = useState(null);

  useEffect(() => { loadAllEdits(); }, []);

  const tokens = (text || "").split(SPANISH_WORD_RE);

  return (
    <span style={style}>
      {tokens.map((tok, i) =>
        SPANISH_WORD_START_RE.test(tok) ? (
          <span key={i} onClick={(e) => { e.stopPropagation(); setActiveWord(tok); }}
            style={{ cursor: "pointer", borderBottom: "1.5px dashed rgba(99,102,241,0.5)", borderRadius: 2 }}>
            {tok}
          </span>
        ) : (
          <span key={i}>{tok}</span>
        )
      )}
      {activeWord && (
        <GrammarLearningCard word={activeWord} onClose={() => setActiveWord(null)} onAddVocab={onAddVocab} />
      )}
    </span>
  );
}
