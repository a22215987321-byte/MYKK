// 動詞原形解析：判斷輸入是否為反身動詞（xxxse，例如 llamarse），拆出
// baseInfinitive / ending / stem。反身動詞不能直接對整個字串套用規則變位
// 引擎（llamarse 不是以 ar/er/ir 結尾）——要先拆掉字尾的 se，用 baseInfinitive
// （llamar）查詢/變位，變位完成後再依人稱把反身代詞加回去（見 verbEngine.js
// 的 attachReflexive）。

// -ír（帶重音，oír/reír/freír 這類詞幹以母音結尾的動詞）跟 -ir 是同一類字尾，
// 差別只在書寫重音（hiato 規則），變位規則相同——見 conjugationEngine.js 的 getEnding()。
const VERB_ENDING_RE = /(ar|er|ir|ír)$/;

// parseInfinitive() 對外一律回報 "ir"（不含重音），呼叫端不需要另外處理 "ír" 這個變體。
function normalizeEnding(ending) {
  return ending === "ír" ? "ir" : ending;
}

export function normalizeSpanishText(input) {
  return (input || "").trim().toLowerCase();
}

/**
 * @param {string} input 使用者輸入的原形，例如 "llamarse"、"despertar"
 * @returns {{
 *   original: string, baseInfinitive: string, ending: ("ar"|"er"|"ir"|null),
 *   stem: (string|null), isReflexive: boolean, valid: boolean,
 * }}
 */
export function parseInfinitive(input) {
  const original = normalizeSpanishText(input);

  // 反身動詞＝「以 se 結尾」且「拿掉 se 之後仍然是合法的 ar/er/ir 原形」。
  // 這個雙重條件避免把剛好以 se 結尾、但拿掉後不成一個動詞原形的字串誤判為反身動詞。
  const strippedOfSe = original.endsWith("se") ? original.slice(0, -2) : null;
  const isReflexive = strippedOfSe !== null && VERB_ENDING_RE.test(strippedOfSe);
  const baseInfinitive = isReflexive ? strippedOfSe : original;

  const endingMatch = baseInfinitive.match(VERB_ENDING_RE);
  const ending = endingMatch ? normalizeEnding(endingMatch[1]) : null;

  if (!ending) {
    return { original, baseInfinitive, ending: null, stem: null, isReflexive, valid: false };
  }

  return {
    original,
    baseInfinitive,
    ending,
    stem: baseInfinitive.slice(0, -2),
    isReflexive,
    valid: true,
  };
}

// 六人稱對應的反身代詞（跟 conjugationEngine.js 的 PERSONS 順序一致）。
export const REFLEXIVE_PRONOUNS = {
  yo: "me",
  tu: "te",
  elEllaUsted: "se",
  nosotros: "nos",
  vosotros: "os",
  ellosEllasUstedes: "se",
};
