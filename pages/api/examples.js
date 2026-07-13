// ── Wiktionary ───────────────────────────────────────────────────────────────

function cleanWiki(s) {
  return (s || "")
    .replace(/\{\{[^{}]*\}\}/g, "")
    .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2")
    .replace(/\[\[([^\]]*)\]\]/g, "$1")
    .replace(/'{2,3}/g, "")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractExamples(wikitext, langSection) {
  const langRe = new RegExp(`==${langSection}==\\n([\\s\\S]*?)(?:\\n==[A-Za-z]|$)`);
  const langMatch = wikitext.match(langRe);
  if (!langMatch) return [];
  const section = langMatch[1];
  const examples = [];
  const seen = new Set();
  let m;

  const uxFull = /\{\{ux\|[a-z-]+\|([^|{}]+)\|([^|{}]+)\}\}/g;
  const uxOnly = /\{\{ux\|[a-z-]+\|([^|{}]+)\}\}/g;

  while ((m = uxFull.exec(section)) !== null) {
    const s = cleanWiki(m[1]), t = cleanWiki(m[2]);
    if (s.length < 4 || seen.has(s)) continue;
    seen.add(s);
    examples.push({ sentence: s, translation: t === "-" || t.length < 2 ? "" : t });
  }
  while ((m = uxOnly.exec(section)) !== null) {
    const s = cleanWiki(m[1]);
    if (s.length < 4 || seen.has(s)) continue;
    seen.add(s);
    examples.push({ sentence: s, translation: "" });
  }
  if (examples.length < 3) {
    const lineRe = /^#:\s*['*]*\s*''(.+?)''\s*(?:\n#::\s*''(.+?)'')?/gm;
    while ((m = lineRe.exec(section)) !== null) {
      const s = cleanWiki(m[1]), t = m[2] ? cleanWiki(m[2]) : "";
      if (s.length < 4 || seen.has(s)) continue;
      seen.add(s);
      examples.push({ sentence: s, translation: t });
    }
  }
  if (examples.length < 3) {
    const quotRe = /^#\*:\s*(.+)$/gm;
    while ((m = quotRe.exec(section)) !== null) {
      const s = cleanWiki(m[1]);
      if (s.length < 10 || seen.has(s)) continue;
      seen.add(s);
      examples.push({ sentence: s, translation: "" });
    }
  }
  return examples.slice(0, 10);
}

async function fetchWiktionary(word, langSection) {
  const url = `https://en.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(word)}&prop=revisions&rvprop=content&rvslots=main&format=json`;
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(url, { headers: { "User-Agent": "evonchat.com/1.0" }, signal: ctrl.signal });
    clearTimeout(t);
    if (!r.ok) return [];
    const data = await r.json();
    const page = Object.values(data.query?.pages || {})[0];
    if (!page || page.missing) return [];
    const wikitext = page.revisions?.[0]?.slots?.main?.["*"] || page.revisions?.[0]?.["*"] || "";
    return extractExamples(wikitext, langSection);
  } catch { clearTimeout(t); return []; }
}

// ── Tatoeba ──────────────────────────────────────────────────────────────────
// Free API, no key needed. Millions of CC-licensed sentences.

async function fetchTatoeba(word, lang) {
  // Try Chinese translations first, then English
  const from = lang === "es" ? "spa" : "eng";
  const transLangs = lang === "es" ? ["cmn", "eng"] : ["cmn"];

  for (const to of transLangs) {
    const url = `https://tatoeba.org/en/api_v0/search?from=${from}&query=${encodeURIComponent(word)}&orphans=no&unapproved=no&trans_filter=limit&trans_to=${to}&limit=8`;
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const r = await fetch(url, { headers: { "User-Agent": "evonchat.com/1.0" }, signal: ctrl.signal });
      clearTimeout(t);
      if (!r.ok) continue;
      const data = await r.json();
      const results = data.results || [];
      const seen = new Set();
      const examples = [];
      for (const item of results) {
        const sentence = (item.text || "").trim();
        if (!sentence || seen.has(sentence)) continue;
        // Check word boundary match
        const re = new RegExp(`\\b${word}\\b`, "i");
        if (!re.test(sentence)) continue;
        seen.add(sentence);
        const trans = item.translations?.[0]?.[0]?.text || "";
        examples.push({ sentence, translation: trans, src: "tatoeba" });
        if (examples.length >= 6) break;
      }
      if (examples.length > 0) return examples;
    } catch { clearTimeout(t); }
  }
  return [];
}

// ── Claude AI fallback ───────────────────────────────────────────────────────

async function generateWithAI(word, lang) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return [];

  const isES = lang === "es";
  const prompt = isES
    ? `為西班牙語單字「${word}」生成5個自然的例句，每句都用「${word}」。提供繁體中文翻譯。只回傳JSON陣列：
[{"sentence":"西語例句","translation":"繁體中文翻譯"}]`
    : `Generate 5 natural English sentences for the word "${word}". Each must use "${word}". Provide Traditional Chinese translations. Return ONLY a JSON array:
[{"sentence":"English sentence","translation":"繁體中文翻譯"}]`;

  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 800, messages: [{ role: "user", content: prompt }] }),
      signal: ctrl.signal,
    });
    clearTimeout(t);
    if (!res.ok) return [];
    const data = await res.json();
    const text = data.content?.[0]?.text || "";
    const match = text.match(/\[[\s\S]*\]/);
    if (!match) return [];
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed)
      ? parsed.filter(e => e.sentence).map(e => ({ sentence: e.sentence, translation: e.translation || "", ai: true }))
      : [];
  } catch { clearTimeout(t); return []; }
}

// ── Handler ──────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "GET") return res.status(405).end();
  const { word, lang = "es" } = req.query;
  if (!word || typeof word !== "string" || word.length > 80)
    return res.status(400).json({ error: "invalid" });

  const langSection = lang === "en" ? "English" : "Spanish";

  // 1. Wiktionary
  let examples = await fetchWiktionary(word, langSection);

  // 2. Tatoeba (free, no key needed)
  if (examples.length === 0) {
    examples = await fetchTatoeba(word, lang);
  }

  // 3. Claude AI (needs ANTHROPIC_API_KEY in Vercel env vars)
  if (examples.length === 0) {
    examples = await generateWithAI(word, lang);
  }

  const hasAI = examples.some(e => e.ai);
  res.setHeader("Cache-Control", hasAI
    ? "s-maxage=86400, stale-while-revalidate"
    : "s-maxage=604800, stale-while-revalidate");
  return res.json({ word, examples });
}
