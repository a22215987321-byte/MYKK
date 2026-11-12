# ECDICT dictionaries for EVONCHAT TypeWords

These seven dictionaries are derived from the original `tag` field in
[skywind3000/ECDICT](https://github.com/skywind3000/ECDICT), pinned to commit
`39cfb9672c0906b63569e0453c2e6abfb9ab182a`.

The source repository publishes its CSV database under its root MIT license.
The complete, unchanged notice is distributed as [LICENSE-ECDICT.txt](LICENSE-ECDICT.txt).
Keep that notice with every redistribution. No official TypeWords website-only
dictionary, restricted API, subscription content or external audio was copied.

| Source tag | Dictionary | Actual entries |
| --- | --- | ---: |
| zk | 中考 · ECDICT | 1,603 |
| gk | 高考 · ECDICT | 3,677 |
| cet6 | CET-6 · ECDICT | 5,407 |
| ky | 考研 · ECDICT | 4,801 |
| ielts | IELTS · ECDICT | 5,040 |
| toefl | TOEFL · ECDICT | 6,974 |
| gre | GRE · ECDICT | 7,504 |

These names describe ECDICT's original source tags. They do not claim an official
or complete exam syllabus, official exam endorsement, or CEFR grading. Each
dictionary contains its complete original tag set. Exam lists naturally overlap,
but the seven word sets and seven content hashes are all distinct. The original
TypeWords CET-4 resource keeps its original ID, URL and 2,607 entries; it is not
replaced by ECDICT's separate CET-4 tag set.

## Transformation

- Input: the 770,611 data rows in the pinned `ecdict.csv`.
- Exact whitespace-delimited tag matching; no substring guessing or synthetic entries.
- Original word spelling, available IPA and Chinese translations are preserved.
- Chinese translations remain in the source's Simplified Chinese; no generated
  translation, invented examples or invented US phonetic transcription is added.
- Words have deterministic IDs. Duplicate entries inside a source tag fail the build.
- TypeWords-required array/object fields are present; absent examples remain empty.
- Source `definition`, `collins`, `oxford`, corpus-frequency, audio and other
  unneeded metadata are not redistributed in these converted dictionaries.
- Counts are calculated from JSON contents, and checked against the pinned source.

The source author's README describes the origins and contributions of ECDICT;
this conversion retains the source project's declared MIT licensing rather than
asserting that EVONCHAT authored the underlying dictionary.

## Reproduce

From the modified TypeWords source directory, using Python 3 standard library:

```
python scripts/build-ecdict-library.py
```

An optional `--source-dir` accepts a directory containing `ecdict.csv`, `LICENSE`
and `README.md` for offline rebuilding. All three files are checked against
SHA-256 digests pinned in the script. The complete source URLs, input/output
hashes, dictionary IDs and counts are in [ecdict-sources.json](ecdict-sources.json).

The script only updates static catalog/content resources. It does not open,
replace or migrate any learner's IndexedDB, localStorage, progress, favorite list,
mistake list, settings or custom books. Repeating it replaces these seven stable
catalog entries without duplicating them.

## Existing article sample correction

The upstream TypeWords NCE-1 index says 72 lessons, but its bundled JSON contains
only five. Its existing ID 246 and lesson contents are retained, while the catalog
now honestly labels it as a five-lesson sample. No additional NCE textbook lessons
are claimed or downloaded.
