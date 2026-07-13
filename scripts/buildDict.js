// One-time build script: downloads the full ECDICT CSV (MIT licensed open dictionary)
// and converts it into per-letter JSON shards under public/dict/.
// Run with: node scripts/buildDict.js

const fs = require("fs");
const path = require("path");
const OpenCC = require("opencc-js");

const s2t = OpenCC.Converter({ from: "cn", to: "tw" });

const CSV_URL = "https://raw.githubusercontent.com/skywind3000/ECDICT/master/ecdict.csv";
const OUT_DIR = path.join(__dirname, "..", "public", "dict");

// Minimal RFC4180-ish CSV line parser (handles quoted fields with embedded commas/quotes).
function parseCsvLine(line) {
  const fields = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') { cur += '"'; i++; }
        else inQuotes = false;
      } else cur += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { fields.push(cur); cur = ""; }
      else cur += ch;
    }
  }
  fields.push(cur);
  return fields;
}

async function main() {
  console.log("Downloading ECDICT mini CSV...");
  const res = await fetch(CSV_URL);
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  const text = await res.text();

  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));

  const shards = {}; // letter -> { word: {p,t,s,g} }
  let kept = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCsvLine(lines[i]);
    const word = (fields[idx.word] || "").trim();
    const phonetic = (fields[idx.phonetic] || "").trim();
    const translation = (fields[idx.translation] || "").trim();
    const pos = (fields[idx.pos] || "").trim();
    const tag = (fields[idx.tag] || "").trim();

    if (!word || !translation) continue;
    if (!/^[a-zA-Z][a-zA-Z\-']*$/.test(word)) continue; // single words only, skip phrases/odd entries

    const letter = word[0].toLowerCase();
    if (!shards[letter]) shards[letter] = {};

    shards[letter][word.toLowerCase()] = {
      p: phonetic,
      t: s2t(translation.split(/\\n|\n/)[0].slice(0, 80)),
      s: pos.split(/\//)[0] || "",
      g: tag.split(" ")[0] || "",
    };
    kept++;
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  for (const letter of Object.keys(shards)) {
    fs.writeFileSync(path.join(OUT_DIR, `${letter}.json`), JSON.stringify(shards[letter]));
  }

  console.log(`Done. Kept ${kept} entries across ${Object.keys(shards).length} shard files in ${OUT_DIR}`);
}

main().catch(err => { console.error(err); process.exit(1); });
