// 合併「規則變位引擎」與「不規則動詞資料表」，產生單一動詞的完整變位結果，
// 並提供動詞搜尋與「變位形式反查原形」的功能。

import {
  conjugateRegular, buildSubjuntivoImperfecto, buildCompound, buildImperativo,
  buildFuturoSimple, buildCondicionalSimple, HABER_AUX,
} from "./conjugationEngine";
import { IRREGULAR_VERBS } from "./irregularVerbs";
import { VERB_INDEX } from "./verbIndex";
import { parseInfinitive, REFLEXIVE_PRONOUNS } from "./infinitiveParser";

const INCOMPLETE = "（此時態資料稍後加入）";
const INCOMPLETE_SIX = { yo: INCOMPLETE, tu: INCOMPLETE, elEllaUsted: INCOMPLETE, nosotros: INCOMPLETE, vosotros: INCOMPLETE, ellosEllasUstedes: INCOMPLETE };

// 反身動詞需要重新附加反身代詞的六人稱時態表（命令式除外，見 markImperativoIncomplete）。
const PERSON_TENSE_KEYS = [
  "presente", "preteritoIndefinido", "preteritoImperfecto", "futuroSimple",
  "condicionalSimple", "preteritoPerfecto", "pluscuamperfecto",
  "subjuntivoPresente", "subjuntivoImperfecto", "subjuntivoPreteritoPerfecto",
];

function stripAccents(text) {
  return text.normalize("NFD").replace(new RegExp("[\\u0300-\\u036f]", "g"), "");
}

// 把六人稱表的每一格從單純字串，包成 { subject, reflexivePronoun, verbForm, fullForm }，
// 讓介面能把「me」（反身代詞）跟「llamo」（動詞變位）分開標示，同時仍能顯示完整句子。
// 反身代詞刻意不直接寫進動詞字尾——兩者是分開的資料欄位，fullForm 只是方便顯示的組合字串。
function attachReflexive(sixTable) {
  if (!sixTable) return sixTable;
  const result = {};
  for (const person of Object.keys(sixTable)) {
    const verbForm = sixTable[person];
    if (!verbForm || verbForm === INCOMPLETE) { result[person] = verbForm; continue; }
    const reflexivePronoun = REFLEXIVE_PRONOUNS[person];
    result[person] = { subject: person, reflexivePronoun, verbForm, fullForm: `${reflexivePronoun} ${verbForm}` };
  }
  return result;
}

// 命令式的反身代詞附著牽涉重音位移規則（llama→llámate、acueste→acuéstese），
// 目前尚未實作正確的重音規則，所以明確標示「稍後加入」，而不是輸出可能有誤的重音。
// TODO: 命令式反身代詞附著（tú/usted/nosotros/vosotros/ustedes 各自的重音位移規則）。
function markImperativoIncomplete(table) {
  if (!table) return table;
  const result = {};
  for (const key of Object.keys(table)) result[key] = INCOMPLETE;
  return result;
}

// 反身動詞的現在分詞要在附加 se 前把重音加回去：hablando→hablándose、
// comiendo→comiéndose、durmiendo→durmiéndose（-yendo 的動詞同理，如 yendo→yéndose）。
function attachReflexiveToGerundio(gerundio) {
  if (!gerundio || gerundio === INCOMPLETE) return gerundio;
  if (gerundio.endsWith("ando")) return gerundio.slice(0, -4) + "ándose";
  if (gerundio.endsWith("yendo")) return gerundio.slice(0, -5) + "yéndose";
  if (gerundio.endsWith("iendo")) return gerundio.slice(0, -5) + "iéndose";
  return gerundio + "se";
}

// 把「baseInfinitive 的完整變位表」轉成「反身動詞的變位表」：現在時/過去時/未來時/
// 虛擬式等一般人稱時態的每一格都變成 { reflexivePronoun, verbForm, fullForm }；
// 現在分詞附加 se；不定詞由呼叫端覆寫成原始的 -se 形式；命令式標示稍後加入。
function toReflexiveConjugation(baseConjugation) {
  if (!baseConjugation) return null;
  const result = { ...baseConjugation };
  for (const key of PERSON_TENSE_KEYS) {
    if (result[key]) result[key] = attachReflexive(result[key]);
  }
  result.gerundio = attachReflexiveToGerundio(baseConjugation.gerundio);
  result.imperativoAfirmativo = markImperativoIncomplete(baseConjugation.imperativoAfirmativo);
  result.imperativoNegativo = markImperativoIncomplete(baseConjugation.imperativoNegativo);
  return result;
}

function mergeIrregular(base, irr) {
  const presente = irr.presente || INCOMPLETE_SIX;
  const preteritoIndefinido = irr.preteritoIndefinido || INCOMPLETE_SIX;
  const preteritoImperfecto = irr.preteritoImperfecto || base.preteritoImperfecto;
  const subjuntivoPresente = irr.subjuntivoPresente || INCOMPLETE_SIX;
  const participio = irr.participio || base.participio;
  const gerundio = irr.gerundio || base.gerundio;
  const futuroBase = irr.futureStem || base.infinitivo;
  const futuroSimple = buildFuturoSimple(futuroBase);
  const condicionalSimple = buildCondicionalSimple(futuroBase);
  const subjuntivoImperfecto = preteritoIndefinido !== INCOMPLETE_SIX
    ? buildSubjuntivoImperfecto(preteritoIndefinido.ellosEllasUstedes)
    : INCOMPLETE_SIX;
  const imperativo = buildImperativo(presente, subjuntivoPresente, base.infinitivo);
  if (irr.tuAfirmativo) imperativo.afirmativo.tu = irr.tuAfirmativo;

  return {
    infinitivo: base.infinitivo,
    ending: base.ending,
    presente,
    preteritoIndefinido,
    preteritoImperfecto,
    futuroSimple,
    condicionalSimple,
    preteritoPerfecto: buildCompound(HABER_AUX.presente, participio),
    pluscuamperfecto: buildCompound(HABER_AUX.preteritoImperfecto, participio),
    subjuntivoPresente,
    subjuntivoImperfecto,
    subjuntivoPreteritoPerfecto: buildCompound(HABER_AUX.subjuntivoPresente, participio),
    imperativoAfirmativo: imperativo.afirmativo,
    imperativoNegativo: imperativo.negativo,
    gerundio,
    participio,
  };
}

function mergeRegularOverrides(base, overrides) {
  if (!overrides) return base;
  const participio = overrides.participio || base.participio;
  const gerundio = overrides.gerundio || base.gerundio;
  return {
    ...base,
    participio,
    gerundio,
    preteritoPerfecto: buildCompound(HABER_AUX.presente, participio),
    pluscuamperfecto: buildCompound(HABER_AUX.preteritoImperfecto, participio),
    subjuntivoPreteritoPerfecto: buildCompound(HABER_AUX.subjuntivoPresente, participio),
  };
}

// entry: 來自 VERB_INDEX 的一筆資料，或呼叫端自行組出的臨時 entry（用於自動生成規則動詞）。
export function getConjugation(entry) {
  const base = conjugateRegular(entry.infinitive);
  if (!base) return null;
  if (entry.type === "irregular") {
    const irr = IRREGULAR_VERBS[entry.infinitive];
    if (!irr) {
      return { ...base, presente: INCOMPLETE_SIX, preteritoIndefinido: INCOMPLETE_SIX, subjuntivoPresente: INCOMPLETE_SIX };
    }
    return mergeIrregular(base, irr);
  }
  return mergeRegularOverrides(base, entry.overrides);
}

// 解析並變位一個動詞原形，支援一般動詞與反身動詞（xxxse，例如 llamarse）。
//
// 查詢優先順序：
//   1. VERB_INDEX 裡跟輸入完全一樣的原形（保留給未來可能收錄的專屬反身詞條）
//   2. VERB_INDEX 裡的 baseInfinitive（例如 despertarse 拆出 despertar 後查到，
//      其 type/overrides 已經決定要走「不規則」或「規則」變位規則，等同前面規格
//      裡的「不規則規則」「詞幹變化規則」——這兩者本來就是 VERB_INDEX.entry.type
//      在 getConjugation() 內部的分派，不需要額外一層判斷）
//   3. 都查不到，但 baseInfinitive 看起來像規則動詞（-ar/-er/-ir 結尾）→ 自動生成規則變位
//
// 是反身動詞的話（parsed.isReflexive），變位完成後才把反身代詞依人稱加回去
// （見 toReflexiveConjugation），不會對 llamarse 直接套用舊版字尾判斷。
export function resolveVerb(rawInfinitive) {
  const parsed = parseInfinitive(rawInfinitive);
  if (!parsed.valid) {
    return { entry: null, conjugation: null, autoGenerated: false, notFound: true, isReflexive: parsed.isReflexive, parsed };
  }

  let entry = VERB_INDEX.find(v => v.infinitive === parsed.original);
  if (!entry) entry = VERB_INDEX.find(v => v.infinitive === parsed.baseInfinitive);

  let autoGenerated = false;
  if (!entry) {
    entry = { infinitive: parsed.baseInfinitive, zh: null, en: null, type: "regular", ending: parsed.ending, level: null };
    autoGenerated = true;
  }

  const baseConjugation = getConjugation(entry);

  if (!parsed.isReflexive) {
    return { entry, conjugation: baseConjugation, autoGenerated, notFound: false, isReflexive: false, parsed };
  }

  const conjugation = toReflexiveConjugation(baseConjugation);
  if (conjugation) conjugation.infinitivo = parsed.original;
  return {
    entry: { ...entry, infinitive: parsed.original, reflexiveBaseInfinitive: entry.infinitive },
    conjugation,
    autoGenerated,
    notFound: false,
    isReflexive: true,
    parsed,
  };
}

export function searchVerbs(query) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const qNoAccent = stripAccents(q);
  return VERB_INDEX.filter(v =>
    v.infinitive.includes(q) ||
    stripAccents(v.infinitive).includes(qNoAccent) ||
    (v.zh && v.zh.includes(query.trim())) ||
    (v.en && v.en.toLowerCase().includes(q))
  ).slice(0, 30);
}

// ─── 反查索引：把每個收錄動詞的完整變位表攤平成 { 變位形式 → [ {infinitive, tense, person} ] } ───

const TENSE_LABELS = {
  presente: "Presente 現在時",
  preteritoIndefinido: "Pretérito indefinido 簡單過去時",
  preteritoImperfecto: "Pretérito imperfecto 未完成過去時",
  futuroSimple: "Futuro simple 簡單將來時",
  condicionalSimple: "Condicional simple 條件式",
  subjuntivoPresente: "Presente de subjuntivo 現在虛擬式",
  subjuntivoImperfecto: "Imperfecto de subjuntivo 未完成過去虛擬式",
};

const PERSON_LABELS_SHORT = {
  yo: "yo（我）", tu: "tú（你）", elEllaUsted: "él / ella / usted（他／她／您）",
  nosotros: "nosotros（我們）", vosotros: "vosotros（你們）", ellosEllasUstedes: "ellos / ellas / ustedes（他們／您們）",
};

let reverseIndexCache = null;

function buildReverseIndex() {
  const index = new Map();
  function add(form, infinitive, tenseLabel, personLabel) {
    if (!form || form === INCOMPLETE) return;
    const key = form.toLowerCase();
    if (!index.has(key)) index.set(key, []);
    index.get(key).push({ infinitive, tenseLabel, personLabel });
  }

  for (const entry of VERB_INDEX) {
    const conj = getConjugation(entry);
    if (!conj) continue;
    for (const [tenseKey, label] of Object.entries(TENSE_LABELS)) {
      const table = conj[tenseKey];
      if (!table) continue;
      for (const personKey of Object.keys(PERSON_LABELS_SHORT)) {
        add(table[personKey], entry.infinitive, label, PERSON_LABELS_SHORT[personKey]);
      }
    }
    // 命令式（去掉否定式的 "no " 前綴後索引）
    if (conj.imperativoAfirmativo) {
      for (const [p, form] of Object.entries(conj.imperativoAfirmativo)) add(form, entry.infinitive, "Imperativo 肯定命令式", p);
    }
    if (conj.imperativoNegativo) {
      for (const [p, form] of Object.entries(conj.imperativoNegativo)) add(form.replace(/^no\s+/, ""), entry.infinitive, "Imperativo 否定命令式", p);
    }
    add(conj.gerundio, entry.infinitive, "Gerundio 現在分詞", "—");
    add(conj.participio, entry.infinitive, "Participio 過去分詞", "—");
  }
  return index;
}

export function reverseLookup(rawForm) {
  if (!reverseIndexCache) reverseIndexCache = buildReverseIndex();
  const form = rawForm.trim().toLowerCase();
  const direct = reverseIndexCache.get(form);
  if (direct && direct.length) return direct;
  // accent-insensitive fallback
  const noAccent = stripAccents(form);
  const hits = [];
  for (const [key, entries] of reverseIndexCache.entries()) {
    if (stripAccents(key) === noAccent) hits.push(...entries);
  }
  return hits;
}
