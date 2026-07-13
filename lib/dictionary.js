import { getEdit } from "./dictEdits";
import { lookupFrenchWord } from "./frenchDictionary";

const cache = { en: {}, es: {}, fr: {} };

export async function lookupWord(rawWord, lang = "en") {
  if (lang === "fr") {
    const word = (rawWord || "").trim();
    const fallback = lookupFrenchWord(word);
    const letter = word
      .toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").charAt(0);
    let base = fallback;
    if (!base && /^[a-z]$/.test(letter)) {
      const shard = await fetch(`/dict-fr/${letter}.json`).then(r => r.ok ? r.json() : {}).catch(() => ({}));
      const normalized = word.toLowerCase().replace(/[’‘`]/g, "'").replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const match = Object.entries(shard).find(([candidate]) => candidate.toLowerCase().replace(/[’‘`]/g, "'").replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD").replace(/[\u0300-\u036f]/g, "") === normalized);
      base = match?.[1] || null;
    }
    const edit = getEdit("fr", word.toLowerCase());
    return edit ? { ...(base || {}), ...edit } : base;
  }
  const dir = lang === "es" ? "dict-es" : "dict";
  const wordRe = lang === "es" ? /^[a-záéíóúüñ][a-záéíóúüñ'-]*$/i : /^[a-z][a-z\-']*$/;
  const trimRe = lang === "es" ? /^[^a-záéíóúüñ]+|[^a-záéíóúüñ]+$/gi : /^[^a-z]+|[^a-z]+$/g;

  const word = (rawWord || "").toLowerCase().replace(trimRe, "");
  if (!wordRe.test(word)) return null;

  const letter = word[0];
  const langCache = cache[lang];
  if (!langCache[letter]) {
    langCache[letter] = fetch(`/${dir}/${letter}.json`)
      .then(r => (r.ok ? r.json() : {}))
      .catch(() => ({}));
  }
  const shard = await langCache[letter];
  const base = shard[word] || null;
  const edit = getEdit(lang, word);
  return edit ? { ...(base || {}), ...edit } : base;
}
