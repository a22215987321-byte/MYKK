#!/usr/bin/env python3
"""Build TypeWords dictionaries from pinned, MIT-licensed ECDICT source tags.

Usage: python scripts/build-ecdict-library.py [--source-dir /path/to/cache]
Existing learner databases are never read or written. IDs and source order stay stable.
"""
import argparse
import csv
import hashlib
import io
import json
import re
import urllib.request
from pathlib import Path

COMMIT = "39cfb9672c0906b63569e0453c2e6abfb9ab182a"
BASE = f"https://raw.githubusercontent.com/skywind3000/ECDICT/{COMMIT}/"
HASHES = {
    "ecdict.csv": "d1ecbdf9ee2b920afb6f430ca6b6bb9f559588cf0dff86e04bd255f9390843cc",
    "LICENSE": "f8552dd246f61a4e064569eae6194a01c6b3d63b03bf27c6ca863593c549ed0f",
    "README.md": "0c3f95fc7e15f7eccf65feedb58ba3ebace1fe7b7cbdd1af60c9ace4cef9094b",
}
# These are ECDICT source tags, not a claim of official syllabus completeness.
BOOKS = [
    ("zk", "中考 · ECDICT", 1603),
    ("gk", "高考 · ECDICT", 3677),
    ("cet6", "CET-6 · ECDICT", 5407),
    ("ky", "考研 · ECDICT", 4801),
    ("ielts", "IELTS · ECDICT", 5040),
    ("toefl", "TOEFL · ECDICT", 6974),
    ("gre", "GRE · ECDICT", 7504),
]
ROOT = Path(__file__).resolve().parents[1]
PUBLIC = ROOT / "public"


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def source_file(name, cache):
    cached = cache / name if cache else None
    data = cached.read_bytes() if cached and cached.is_file() else urllib.request.urlopen(BASE + name, timeout=90).read()
    if sha256(data) != HASHES[name]:
        raise ValueError(f"Pinned source checksum mismatch: {name}")
    return data


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    encoded = (json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n").encode("utf-8")
    path.write_bytes(encoded)
    return sha256(encoded)


def translation_lines(text):
    text = text.replace("\\r\\n", "\n").replace("\\n", "\n").replace("\\r", "\n")
    result = []
    for line in text.splitlines():
        line = line.strip()
        if not line:
            continue
        match = re.match(r"^((?:[a-z]+\.)+(?:\s*&\s*(?:[a-z]+\.)+)?)\s+(.*)$", line)
        result.append({"pos": match[1] if match else "", "cn": match[2] if match else line})
    return result


def convert(row):
    word = row["word"].strip()
    if not word or not row["translation"].strip():
        raise ValueError(f"Source-tagged entry lacks word or translation: {word!r}")
    return {
        "id": "ecdict:" + hashlib.sha256(word.casefold().encode("utf-8")).hexdigest()[:20],
        "custom": False,
        "word": word,
        # ECDICT documents this field as mainly British; do not invent US IPA.
        "phonetic0": row["phonetic"].strip(),
        "phonetic1": "",
        "trans": translation_lines(row["translation"]),
        "sentences": [], "phrases": [], "synos": [],
        "relWords": {"root": "", "rels": []}, "etymology": [],
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-dir", type=Path)
    args = parser.parse_args()
    sources = {name: source_file(name, args.source_dir) for name in HASHES}
    buckets = {tag: {} for tag, _, _ in BOOKS}
    source_rows = 0
    for row in csv.DictReader(io.StringIO(sources["ecdict.csv"].decode("utf-8-sig"), newline="")):
        source_rows += 1
        tags = set(row["tag"].split()).intersection(buckets)
        if not tags:
            continue
        word = convert(row)
        for tag in tags:
            key = word["word"].casefold()
            if key in buckets[tag]:
                raise ValueError(f"Duplicate source entry in {tag}: {key}")
            buckets[tag][key] = word
    if source_rows != 770611:
        raise ValueError(f"Unexpected pinned source row count: {source_rows}")

    indices = []
    manifest_books = []
    for tag, name, expected in BOOKS:
        words = sorted(buckets[tag].values(), key=lambda word: word["word"].casefold())
        if len(words) != expected:
            raise ValueError(f"{tag}: expected {expected}, found {len(words)}")
        filename = f"ECDICT_{tag.upper()}.json"
        digest = write_json(PUBLIC / "dicts/en/word" / filename, words)
        index = {
            "id": f"evon-ecdict-{tag}-v1", "enName": f"ecdict-{tag}",
            "name": name,
            "description": f"ECDICT 原始 {tag} 標記詞彙，含來源中文釋義及可用音標；非官方完整考綱。",
            "url": filename, "length": len(words), "language": "en",
            "translateLanguage": "zh_CN", "version": 1, "type": "word",
            "isDefault": False, "recommended": True, "hidden": False,
            "category": "ECDICT 開源詞書", "tags": ["ECDICT"],
            "sourceUrl": f"https://github.com/skywind3000/ECDICT/tree/{COMMIT}",
            "license": "MIT",
        }
        indices.append(index)
        manifest_books.append({"id": index["id"], "tag": tag, "name": name, "path": f"dicts/en/word/{filename}", "length": len(words), "sha256": digest})

    # Replace only our own catalog entries, preserving every other resource ID.
    for name in ["word.json", "recommend_word.json"]:
        path = PUBLIC / "list" / name
        current = json.loads(path.read_text(encoding="utf-8"))
        retained = [item for item in current if not str(item["id"]).startswith("evon-ecdict-")]
        write_json(path, retained + indices)

    # Upstream advertises 72 lessons but bundles five; preserve ID and content.
    for name in ["article.json", "recommend_article.json"]:
        path = PUBLIC / "list" / name
        current = json.loads(path.read_text(encoding="utf-8"))
        for book in current:
            if book.get("id") == 246:
                content = json.loads((PUBLIC / "dicts/en/article" / book["url"]).read_text(encoding="utf-8"))
                book["length"] = len(content)
                book["name"] = "新概念英語 1（試讀）"
                book["description"] = "上游開源專案附帶的 5 篇試讀內容。"
        write_json(path, current)

    (PUBLIC / "LICENSE-ECDICT.txt").write_bytes(sources["LICENSE"])
    manifest = {
        "source": "https://github.com/skywind3000/ECDICT", "commit": COMMIT,
        "sourceRows": source_rows, "sourceFiles": [{"name": name, "url": BASE + name, "sha256": digest} for name, digest in HASHES.items()],
        "license": "MIT", "licensePath": "LICENSE-ECDICT.txt",
        "selection": "Exact original source tags; no generated translations, examples or phonetics. Source tags are not CEFR levels or an official syllabus guarantee.",
        "books": manifest_books,
        "overlap": "Exam vocabulary naturally overlaps; each complete source-tag set is retained, not duplicated or split to inflate the book count.",
        "distinctContentHashes": len({book["sha256"] for book in manifest_books}),
        "distinctSourceSets": len({tuple(sorted(bucket)) for bucket in buckets.values()}),
    }
    write_json(PUBLIC / "ecdict-sources.json", manifest)
    print(json.dumps({"sourceRows": source_rows, "addedWordBooks": len(indices), "books": manifest_books, "distinctSourceSets": manifest["distinctSourceSets"]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
