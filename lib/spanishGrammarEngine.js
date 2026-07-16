// lib/spanishGrammarEngine.js
// 統一詞性分類引擎：任何西語詞丟進來，判斷它是動詞變位／代名詞／冠詞／
// 介系詞／連接詞／疑問詞／形容詞／名詞，並回傳 GrammarLearningCard 能直接
// 渲染的統一資料格式。這是「EVONCHAT 不只是翻譯單字」的核心：把三套各自
// 為政的查詢邏輯（ClickableSentence / SpanishCourseRoom / DictionaryRoom）
// 合併成一套共用來源。
//
// 查詢順序（由快到慢、由精確到廣泛）：
//   1. 封閉詞類字典（代名詞/冠詞/介系詞/連接詞/疑問詞）— 同步、最準確
//   2. 動詞變位反查索引（lib/spanishVerbs）— 涵蓋 46 個動詞、9+ 個時態
//   3. 深度詞條資料庫（lib/spanishDeepDict）— 少量但內容豐富的手寫詞條
//   4. 一般西語字典（lib/dictionary，93000+ 詞）— 廣度優先的最後防線
//   5. 都查不到 → unknown

import { lookupClosedClass, POS_LABELS as CLOSED_POS_LABELS } from "./spanishClosedClass";
import { reverseLookup } from "./spanishVerbs/verbEngine";
import { VERB_INDEX } from "./spanishVerbs/verbIndex";
import deepEntries, { lookupDeep } from "./spanishDeepDict";
import { lookupWord as lookupDictWord } from "./dictionary";

// lib/dictionary.js (public/dict-es/*.json) 的詞性縮寫 → 友善中文標籤
const DICT_POS_LABELS = {
  n: "名詞", adj: "形容詞", v: "動詞", adv: "副詞", prop: "專有名詞",
  pron: "代名詞", interj: "感嘆詞", num: "數詞", part: "分詞",
  determiner: "限定詞", phrase: "片語", contraction: "縮寫詞",
  prep: "介系詞", letter: "字母", conj: "連接詞", art: "冠詞", particle: "小品詞",
};

export const POS_COLORS = {
  verb: "#3b82f6",
  "pronoun-subject": "#8b5cf6",
  "pronoun-object": "#8b5cf6",
  "pronoun-reflexive": "#8b5cf6",
  "article-def": "#64748b",
  "article-indef": "#64748b",
  preposition: "#14b8a6",
  conjunction: "#f59e0b",
  question: "#ec4899",
  affirmative: "#ec4899",
  adj: "#22c55e",
  n: "#6b7280",
  other: "#6b7280",
  unknown: "#6b7280",
};

function cleanWord(raw) {
  return (raw || "")
    .toLowerCase()
    .trim()
    .replace(/^[¿¡«"'(]+|[.,;:!?»"')]+$/g, "");
}

function conjugationLinkFor(lemma) {
  return `/spanish/verbs?verb=${encodeURIComponent(lemma)}`;
}

// entry 來自 lib/spanishDeepDict.js；把它轉成統一卡片格式的共用欄位
function fromDeepEntry(entry, overrides = {}) {
  return {
    zh: entry.meaningZh,
    en: overrides.en ?? null,
    coreConcept: entry.coreImage || null,
    tip: entry.grammarNote || null,
    examples: entry.examples || [],
    wordFamily: entry.wordFamily || [],
    shortSummary: entry.shortSummary || null,
    etymology: entry.etymology || null,
    evolution: entry.evolution || null,
    level: entry.level || null,
  };
}

/**
 * 判斷一個西語詞的詞性並回傳統一的 Learning Card 資料格式。
 * @param {string} rawWord 使用者點擊的原始文字（可能帶標點）
 * @returns {Promise<object|null>}
 */
export async function classifySpanishWord(rawWord) {
  const clean = cleanWord(rawWord);
  if (!clean) return null;

  // 1. 封閉詞類（代名詞/冠詞/介系詞/連接詞/疑問詞）
  const closed = lookupClosedClass(clean);
  if (closed) {
    return {
      type: "closed-class",
      subtype: closed.type || null, // 例如 "possessive-determiner"，跟外層 type 分開避免混淆
      word: closed.word,
      lemma: closed.word,
      pos: closed.pos,
      posLabel: CLOSED_POS_LABELS[closed.pos] || closed.pos,
      color: POS_COLORS[closed.pos] || POS_COLORS.other,
      zh: closed.zh,
      en: closed.en,
      coreConcept: closed.coreConcept,
      tip: closed.tip,
      examples: closed.examples || [],
      related: closed.related || [],
      // su/suyo 這類「單看字面無法判斷擁有者」的詞才會有這些欄位；
      // ambiguous:true 時 GrammarLearningCard 會顯示明確的「多義」標籤與消歧選項，
      // 而不是假裝能百分之百判斷唯一意思。
      ambiguous: closed.ambiguous || false,
      requiresContext: closed.requiresContext || false,
      possibleOwners: closed.possibleOwners || null,
      meaningsZh: closed.meaningsZh || null,
      agreesWith: closed.agreesWith || null,
      disambiguation: closed.disambiguation || null,
    };
  }

  // 2. 動詞變位反查（例：tienen → tener, presente, ellos/ellas/ustedes）
  const verbMatches = reverseLookup(clean);
  if (verbMatches && verbMatches.length) {
    const primary = verbMatches[0];
    const indexEntry = VERB_INDEX.find(v => v.infinitive === primary.infinitive);
    const deep = lookupDeep(primary.infinitive);
    const deepFields = deep ? fromDeepEntry(deep, { en: indexEntry?.en }) : null;
    return {
      type: "verb",
      word: clean,
      lemma: primary.infinitive,
      pos: "verb",
      posLabel: "動詞",
      color: POS_COLORS.verb,
      tenseLabel: primary.tenseLabel,
      personLabel: primary.personLabel,
      alternates: verbMatches.slice(1),
      zh: deepFields?.zh || indexEntry?.zh || "",
      en: indexEntry?.en || null,
      coreConcept: deepFields?.coreConcept || null,
      tip: deepFields?.tip
        || (indexEntry
          ? `${primary.infinitive} 是${indexEntry.type === "irregular" ? "不規則" : `規則${indexEntry.ending}`}動詞，這個形式是「${primary.tenseLabel}」的「${primary.personLabel}」變位。`
          : null),
      examples: deepFields?.examples || [],
      wordFamily: deepFields?.wordFamily || [],
      shortSummary: deepFields?.shortSummary || null,
      etymology: deepFields?.etymology || null,
      evolution: deepFields?.evolution || null,
      conjugationLink: conjugationLinkFor(primary.infinitive),
      level: indexEntry?.level || deepFields?.level || null,
    };
  }

  // 3. 深度詞條（涵蓋 spanishDeepDict 裡沒有進 VERB_INDEX 的詞，例如 gustar/llamarse，
  //    以及非動詞的手寫深度詞條，如 hola/casa/tiempo/año）
  const deepOnly = lookupDeep(clean);
  if (deepOnly) {
    const isVerb = /^v[.\s]|verbo|verb\b/i.test(deepOnly.partOfSpeech || "");
    const deepFields = fromDeepEntry(deepOnly);
    return {
      type: isVerb ? "verb" : "deep",
      word: clean,
      lemma: deepOnly.lemma || clean,
      pos: isVerb ? "verb" : "other",
      posLabel: deepOnly.partOfSpeech || (isVerb ? "動詞" : ""),
      color: isVerb ? POS_COLORS.verb : POS_COLORS.other,
      zh: deepFields.zh,
      en: null,
      coreConcept: deepFields.coreConcept,
      tip: deepFields.tip,
      examples: deepFields.examples,
      wordFamily: deepFields.wordFamily,
      shortSummary: deepFields.shortSummary,
      etymology: deepFields.etymology,
      evolution: deepFields.evolution,
      conjugationLink: isVerb ? conjugationLinkFor(deepOnly.lemma || clean) : null,
      level: deepFields.level,
    };
  }

  // 4. 一般西語字典（廣度優先，93000+ 詞，但只有原形/未變位形式）
  const dictData = await lookupDictWord(clean, "es");
  if (dictData) {
    const pos = dictData.s || "other";
    return {
      type: "dict",
      word: clean,
      lemma: clean,
      pos,
      posLabel: DICT_POS_LABELS[pos] || pos,
      color: pos === "adj" ? POS_COLORS.adj : pos === "n" ? POS_COLORS.n : (POS_COLORS[pos] || POS_COLORS.other),
      zh: dictData.t,
      en: dictData.en,
      gender: dictData.g || null,
      coreConcept: null,
      tip: pos === "adj" ? "形容詞要跟著它修飾的名詞變化陰陽性、單複數。" : null,
      examples: dictData.ex ? dictData.ex.split("\n").filter(Boolean).map(es => ({ es })) : [],
    };
  }

  // 5. 查無此字
  return { type: "unknown", word: clean, lemma: clean, pos: "unknown", posLabel: "", color: POS_COLORS.unknown };
}

// 供 ClickableSpanishText 斷詞使用的共用規則（取代原本三套各自的正則）
export const SPANISH_WORD_RE = /([a-zA-Záéíóúüñ][a-zA-Záéíóúüñ'-]*)/gi;
export const SPANISH_WORD_START_RE = /^[a-zA-Záéíóúüñ]/i;

export function isSpanishWordToken(token) {
  return SPANISH_WORD_START_RE.test(token);
}
