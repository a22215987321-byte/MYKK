// One-time build script: downloads a Spanish-English Wiktionary extract (CC-BY-SA,
// from github.com/doozan/spanish_data) and converts it into per-letter JSON shards
// under public/dict-es/. Chinese translations are bridged through the English
// dictionary already built by buildDict.js (public/dict/*.json), since there is no
// good open-source Spanish->Chinese dataset. Entries without a bridgeable Chinese
// translation fall back to showing the English gloss.
// Run with: node scripts/buildDictEs.js (after running buildDict.js first)

const fs = require("fs");
const path = require("path");

const DATA_URL = "https://raw.githubusercontent.com/doozan/spanish_data/master/es-en.data";
const EN_DICT_DIR = path.join(__dirname, "..", "public", "dict");
const OUT_DIR = path.join(__dirname, "..", "public", "dict-es");

const STOPWORDS = new Set(["a", "an", "the", "of", "to", "in", "on", "at", "for", "with", "and", "or", "as", "by"]);

function loadEnZhMap() {
  const map = {};
  for (const file of fs.readdirSync(EN_DICT_DIR)) {
    if (!file.endsWith(".json")) continue;
    const shard = JSON.parse(fs.readFileSync(path.join(EN_DICT_DIR, file), "utf8"));
    for (const word of Object.keys(shard)) {
      if (!(word in map)) map[word] = shard[word].t;
    }
  }
  return map;
}

function cleanGloss(raw) {
  let g = raw.split(/[,;]/)[0].split(/\s\(/)[0].trim();
  return g.slice(0, 80);
}

function bridgeToZh(gloss, enZhMap) {
  const w = gloss.toLowerCase().replace(/^to\s+/, "").trim();
  if (/^[a-z][a-z'-]*$/.test(w) && enZhMap[w]) return enZhMap[w];
  const words = w.split(/\s+/).map(x => x.replace(/[^a-z'-]/g, "")).filter(x => x && !STOPWORDS.has(x));
  for (const ww of words) {
    if (enZhMap[ww]) return enZhMap[ww];
  }
  return null;
}

function parseEntry(block) {
  const lines = block.split("\n");
  const word = (lines[0] || "").trim();
  let pos = "", gender = "", gloss = "";
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!pos) {
      const m = line.match(/^pos:\s*(.+)$/);
      if (m) { pos = m[1].trim(); continue; }
    }
    if (!gender) {
      const m = line.match(/^\s{2}g:\s*(.+)$/);
      if (m) { gender = m[1].trim(); continue; }
    }
    const m = line.match(/^\s{2}gloss:\s*(.+)$/);
    if (m) { gloss = m[1].trim(); break; }
  }
  return { word, pos, gender, gloss };
}

async function main() {
  console.log("Loading English dictionary for EN->ZH bridge...");
  const enZhMap = loadEnZhMap();
  console.log(`Loaded ${Object.keys(enZhMap).length} English entries.`);

  console.log("Downloading Spanish-English Wiktionary data...");
  const res = await fetch(DATA_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const text = await res.text();

  const blocks = text.split("_____\n");
  const shards = {}; // letter -> { word: {s,g,en,t} }
  let kept = 0, bridged = 0;

  for (const block of blocks) {
    const { word, pos, gender, gloss } = parseEntry(block);
    if (!word || !gloss) continue;
    if (!/^[a-záéíóúüñ][a-záéíóúüñ'-]*$/i.test(word)) continue;
    if (pos === "suffix" || pos === "prefix" || pos === "symbol") continue;

    const en = cleanGloss(gloss);
    if (!en) continue;
    const zh = bridgeToZh(en, enZhMap);
    if (zh) bridged++;

    const letter = word[0].toLowerCase();
    if (!shards[letter]) shards[letter] = {};

    const key = word.toLowerCase();
    if (shards[letter][key]) continue; // keep first (most common) sense only
    shards[letter][key] = { s: pos, g: gender, en, t: zh };
    kept++;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const letter of Object.keys(shards)) {
    fs.writeFileSync(path.join(OUT_DIR, `${letter}.json`), JSON.stringify(shards[letter]));
  }

  console.log(`Done. Kept ${kept} entries (${bridged} with Chinese bridge) across ${Object.keys(shards).length} shard files in ${OUT_DIR}`);
}

main().catch(err => { console.error(err); process.exit(1); });
