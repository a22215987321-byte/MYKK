const LANG_NAMES = {
  la: "Latin", ar: "Arabic", fr: "French", pt: "Portuguese",
  es: "Spanish", it: "Italian", grc: "Ancient Greek",
  osp: "Old Spanish", "VL.": "Vulgar Latin", VL: "Vulgar Latin",
  en: "English", de: "German", nl: "Dutch", fro: "Old French",
  pro: "Old Occitan", oc: "Occitan", ang: "Old English", non: "Old Norse",
  got: "Gothic", ber: "Berber", cel: "Celtic", gem: "Germanic",
  gmh: "Middle High German", goh: "Old High German", ML: "Medieval Latin",
  "ML.": "Medieval Latin", LL: "Late Latin", "LL.": "Late Latin",
  xlg: "Ligurian", xib: "Iberian", ave: "Avestan", sa: "Sanskrit",
};

function langName(code) {
  return LANG_NAMES[code] || code;
}

function cleanWikitext(raw) {
  let t = raw;

  // {{der|es|la|word|gloss}} / {{bor|...}} / {{inh|...}} with 4 parts
  t = t.replace(/\{\{(?:der|bor|inh|cog|noncog|unadapted bor)\|[^|{}]+\|([^|{}]+)\|([^|{}]+)\|([^|{}]+)\}\}/g,
    (_, lc, word, gloss) => `${langName(lc)} ${word} (${gloss})`);

  // {{der|es|la|word}} with 3 parts
  t = t.replace(/\{\{(?:der|bor|inh|cog|noncog|unadapted bor)\|[^|{}]+\|([^|{}]+)\|([^|{}]+)\}\}/g,
    (_, lc, word) => `${langName(lc)} ${word}`);

  // {{der|es|la}} with 2 parts
  t = t.replace(/\{\{(?:der|bor|inh)\|[^|{}]+\|([^|{}]+)\}\}/g,
    (_, lc) => langName(lc));

  // {{m|la|word|gloss}} or {{l|la|word|gloss}}
  t = t.replace(/\{\{[ml]\|[^|{}]+\|([^|{}]+)\|([^|{}]+)\}\}/g, (_, word, gloss) => `${word} (${gloss})`);

  // {{m|la|word}} or {{l|la|word}}
  t = t.replace(/\{\{[ml]\|[^|{}]+\|([^|{}]+)\}\}/g, (_, word) => word);

  // {{gloss|text}} / {{sense|text}}
  t = t.replace(/\{\{(?:gloss|sense)\|([^|{}]+)\}\}/g, "($1)");

  // {{af|es|root|-suffix|...}} → root + -suffix + ...
  t = t.replace(/\{\{af\|[^|{}]+(\|[^|{}]+)+\}\}/g, (m) => {
    const parts = m.slice(2, -2).split("|").slice(2);
    return parts.join(" + ");
  });

  // {{compound|es|a|b}} → a + b
  t = t.replace(/\{\{compound\|[^|{}]+(\|[^|{}]+)+\}\}/g, (m) => {
    const parts = m.slice(2, -2).split("|").slice(2);
    return parts.join(" + ");
  });

  // Remove all remaining {{...}} templates
  // Handle nested templates by running twice
  t = t.replace(/\{\{[^{}]*\}\}/g, "");
  t = t.replace(/\{\{[^{}]*\}\}/g, "");

  // [[link|text]] → text, [[link]] → link
  t = t.replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2");
  t = t.replace(/\[\[([^\]]*)\]\]/g, "$1");

  // Remove bold/italic
  t = t.replace(/'{2,3}/g, "");

  // Remove list markers
  t = t.replace(/^[*#:;]+\s*/gm, "");

  // Remove HTML tags
  t = t.replace(/<[^>]+>/g, "");

  // Collapse whitespace
  t = t.replace(/\s*\n\s*/g, " ").replace(/\s{2,}/g, " ").trim();

  // Remove trailing/leading punctuation artifacts
  t = t.replace(/\s+([,.])/g, "$1");

  return t;
}

function extractEtymology(wikitext, langSection) {
  // Find the language section, e.g. ==Spanish==
  const langRe = new RegExp(`==${langSection}==\\n([\\s\\S]*?)(?:\\n==[A-Z]|$)`);
  const langMatch = wikitext.match(langRe);
  if (!langMatch) return null;

  const section = langMatch[1];

  // Find ===Etymology=== or ===Etymology 1===, ===Etymology 2===, etc.
  const etymRe = /===Etymology(?:\s*\d+)?===\n([\s\S]*?)(?:\n===|\n==|$)/g;
  const parts = [];
  let m;
  while ((m = etymRe.exec(section)) !== null) {
    const cleaned = cleanWikitext(m[1].trim());
    if (cleaned.length > 8) parts.push(cleaned);
  }

  return parts.length > 0 ? parts.join("\n\n") : null;
}

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();

  const { word, lang = "es" } = req.query;
  if (!word || typeof word !== "string" || word.length > 60) {
    return res.status(400).json({ error: "invalid" });
  }

  const langSection = lang === "en" ? "English" : "Spanish";

  try {
    const apiUrl = `https://en.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(word)}&prop=revisions&rvprop=content&rvslots=main&format=json`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);

    const r = await fetch(apiUrl, {
      headers: { "User-Agent": "evonchat.com/1.0 etymology-lookup" },
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!r.ok) return res.status(502).json({ error: "upstream error" });

    const data = await r.json();
    const pages = data.query?.pages || {};
    const page = Object.values(pages)[0];

    if (!page || page.missing) {
      return res.status(404).json({ error: "not found" });
    }

    const wikitext =
      page.revisions?.[0]?.slots?.main?.["*"] ||
      page.revisions?.[0]?.["*"] ||
      "";

    if (!wikitext) return res.status(404).json({ error: "no content" });

    const etymology = extractEtymology(wikitext, langSection);

    if (!etymology) {
      return res.status(404).json({ error: "no etymology" });
    }

    res.setHeader("Cache-Control", "s-maxage=604800, stale-while-revalidate");
    return res.json({ word, etymology });
  } catch (e) {
    if (e.name === "AbortError") {
      return res.status(504).json({ error: "timeout" });
    }
    console.error("etymology error:", e);
    return res.status(500).json({ error: "server error" });
  }
}
