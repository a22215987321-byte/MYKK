// 西班牙語規則變位引擎：只處理 -ar / -er / -ir 三類規則動詞的完整變位。
// 不規則動詞的例外資料放在 irregularVerbs.js，由 verbEngine.js 合併使用。

export const PERSONS = ["yo", "tu", "elEllaUsted", "nosotros", "vosotros", "ellosEllasUstedes"];

export const PERSON_LABELS = {
  yo: "yo",
  tu: "tú",
  elEllaUsted: "él / ella / usted",
  nosotros: "nosotros / nosotras",
  vosotros: "vosotros / vosotras",
  ellosEllasUstedes: "ellos / ellas / ustedes",
};

function six(a, b, c, d, e, f) {
  return { yo: a, tu: b, elEllaUsted: c, nosotros: d, vosotros: e, ellosEllasUstedes: f };
}

function getEnding(infinitive) {
  if (infinitive.endsWith("ar")) return "ar";
  if (infinitive.endsWith("er")) return "er";
  // -ír（帶重音）跟 -ir 是同一類動詞字尾，差別只在詞幹以母音結尾時（oír、reír、freír）
  // 因為 hiato（母音相鄰不同音節）規則需要書寫重音——字尾本身仍然是 -ir 這一組變位規則。
  if (infinitive.endsWith("ir") || infinitive.endsWith("ír")) return "ir";
  return null;
}

function getStem(infinitive) {
  return infinitive.slice(0, -2);
}

// -car/-gar/-zar 拼寫變化：只影響簡單過去式 yo 人稱，以及整個現在虛擬式（六個人稱都要變）。
function spellingAdjustedStem(infinitive, stem) {
  if (infinitive.endsWith("car")) return stem.slice(0, -1) + "qu";
  if (infinitive.endsWith("gar")) return stem.slice(0, -1) + "gu";
  if (infinitive.endsWith("zar")) return stem.slice(0, -1) + "c";
  return stem;
}

// 詞幹以母音結尾時（如 leer, creer, oír），過去式第三人稱與現在分詞的 i 要變成 y：
// le + ió → leyó；le + ieron → leyeron；le + iendo → leyendo。
function vowelStemFix(stem, suffix) {
  if (/[aeiouáéíóú]$/i.test(stem) && suffix.startsWith("i")) {
    return "y" + suffix.slice(1);
  }
  return suffix;
}

const ACCENT_MAP = { a: "á", e: "é", i: "í", o: "ó", u: "ú" };
function accentLastVowel(text) {
  const last = text.slice(-1).toLowerCase();
  if (ACCENT_MAP[last]) return text.slice(0, -1) + ACCENT_MAP[last];
  return text;
}

function buildPresente(stem, ending) {
  if (ending === "ar") return six(stem + "o", stem + "as", stem + "a", stem + "amos", stem + "áis", stem + "an");
  if (ending === "er") return six(stem + "o", stem + "es", stem + "e", stem + "emos", stem + "éis", stem + "en");
  return six(stem + "o", stem + "es", stem + "e", stem + "imos", stem + "ís", stem + "en"); // -ir
}

function buildPreteritoIndefinido(infinitive, stem, ending) {
  const yoStem = spellingAdjustedStem(infinitive, stem);
  if (ending === "ar") {
    const suffixEl = vowelStemFix(stem, "ó");
    return six(yoStem + "é", stem + "aste", stem + suffixEl, stem + "amos", stem + "asteis", stem + "aron");
  }
  const suffixEl = vowelStemFix(stem, "ió");
  const suffixEllos = vowelStemFix(stem, "ieron");
  return six(stem + "í", stem + "iste", stem + suffixEl, stem + "imos", stem + "isteis", stem + suffixEllos);
}

function buildPreteritoImperfecto(stem, ending) {
  if (ending === "ar") return six(stem + "aba", stem + "abas", stem + "aba", stem + "ábamos", stem + "abais", stem + "aban");
  return six(stem + "ía", stem + "ías", stem + "ía", stem + "íamos", stem + "íais", stem + "ían");
}

export function buildFuturoSimple(base) {
  return six(base + "é", base + "ás", base + "á", base + "emos", base + "éis", base + "án");
}

export function buildCondicionalSimple(base) {
  return six(base + "ía", base + "ías", base + "ía", base + "íamos", base + "íais", base + "ían");
}

function buildSubjuntivoPresente(infinitive, stem, ending) {
  const adjStem = spellingAdjustedStem(infinitive, stem);
  if (ending === "ar") return six(adjStem + "e", adjStem + "es", adjStem + "e", adjStem + "emos", adjStem + "éis", adjStem + "en");
  return six(adjStem + "a", adjStem + "as", adjStem + "a", adjStem + "amos", adjStem + "áis", adjStem + "an");
}

export function buildSubjuntivoImperfecto(preteritoEllos) {
  if (!preteritoEllos) return null;
  const root = preteritoEllos.slice(0, -3); // strip final "ron"
  const nosotros = accentLastVowel(root) + "ramos";
  return six(root + "ra", root + "ras", root + "ra", nosotros, root + "rais", root + "ran");
}

function buildGerundio(stem, ending) {
  if (ending === "ar") return stem + "ando";
  return stem + vowelStemFix(stem, "iendo");
}

function buildParticipio(stem, ending) {
  if (ending === "ar") return stem + "ado";
  return stem + "ido";
}

export const HABER_AUX = {
  presente: six("he", "has", "ha", "hemos", "habéis", "han"),
  preteritoImperfecto: six("había", "habías", "había", "habíamos", "habíais", "habían"),
  subjuntivoPresente: six("haya", "hayas", "haya", "hayamos", "hayáis", "hayan"),
};

export function buildCompound(haberForms, participio) {
  if (!haberForms || !participio) return null;
  return six(
    `${haberForms.yo} ${participio}`,
    `${haberForms.tu} ${participio}`,
    `${haberForms.elEllaUsted} ${participio}`,
    `${haberForms.nosotros} ${participio}`,
    `${haberForms.vosotros} ${participio}`,
    `${haberForms.ellosEllasUstedes} ${participio}`,
  );
}

export function buildImperativo(presente, subjuntivoPresente, infinitive) {
  const vosotrosAfirmativo = infinitive.slice(0, -1) + "d";
  return {
    afirmativo: {
      tu: presente.elEllaUsted,
      usted: subjuntivoPresente.elEllaUsted,
      nosotros: subjuntivoPresente.nosotros,
      vosotros: vosotrosAfirmativo,
      ustedes: subjuntivoPresente.ellosEllasUstedes,
    },
    negativo: {
      tu: "no " + subjuntivoPresente.tu,
      usted: "no " + subjuntivoPresente.elEllaUsted,
      nosotros: "no " + subjuntivoPresente.nosotros,
      vosotros: "no " + subjuntivoPresente.vosotros,
      ustedes: "no " + subjuntivoPresente.ellosEllasUstedes,
    },
  };
}

// 產生某個規則動詞（-ar/-er/-ir）的完整變位表。irregularStem/futureStem 等覆寫欄位
// 由 verbEngine.js 的 mergeConjugation() 處理，這裡只負責「純規則」的部分。
export function conjugateRegular(infinitive) {
  const ending = getEnding(infinitive);
  if (!ending) return null;
  const stem = getStem(infinitive);

  const presente = buildPresente(stem, ending);
  const preteritoIndefinido = buildPreteritoIndefinido(infinitive, stem, ending);
  const preteritoImperfecto = buildPreteritoImperfecto(stem, ending);
  const futuroSimple = buildFuturoSimple(infinitive);
  const condicionalSimple = buildCondicionalSimple(infinitive);
  const subjuntivoPresente = buildSubjuntivoPresente(infinitive, stem, ending);
  const subjuntivoImperfecto = buildSubjuntivoImperfecto(preteritoIndefinido.ellosEllasUstedes);
  const gerundio = buildGerundio(stem, ending);
  const participio = buildParticipio(stem, ending);
  const imperativo = buildImperativo(presente, subjuntivoPresente, infinitive);

  return {
    infinitivo: infinitive,
    ending,
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
