# TypeWords library repair — 2026-11-12

## Repository and live deployment

- Host repository: `a22215987321-byte/MYKK`; existing remote `main` at `6e64307905a96b27f260b58c15de703ca656daed` when work began.
- Embedded upstream: `zyronon/TypeWords`, pinned commit `1bcc2a2c0a169b37bea26b73f5a46a91d803558f`, GPL-3.0.
- Host: Next.js 14.2.5. Embedded app: independent Nuxt static SPA at `/apps/typewords/`; the verified lockfile resolves Nuxt 4.5.2 and Vue 3.5.41.
- Vercel project: `my-food-site-v2-main`, project ID `prj_OSQVzUZ6ixkMwJMQaabRv91rJ40w`, Node.js 24.
- Git integration is connected to `MYKK/main`, but the actual live site was deployed separately using the existing Vercel CLI release-snapshot process. Baseline live deployment: `dpl_9x3ihU9h8tcoD5KrdvrH3n8UhCKX`, Next build `Y0j88q1PFFFYMp4f82QO8`.
- That live snapshot contains many newer features absent from GitHub `main`. Do not deploy the old main branch wholesale over it. This change is published in a scoped PR; the production rollout uses the latest verified live snapshot with only `public/apps/typewords/**` replaced and hashes checked for all other source files.
- Production URL: <https://www.evonchat.com/apps/typewords/words>.

## Confirmed root cause

The complete library screens (`app/pages/(words)/dict-list.vue` and `app/pages/(articles)/book-list.vue`) read the complete local catalog. They do not limit it to one result. This is distinct from the user's joined books or currently selected study book.

All four original JSON catalogs (`word.json`, `article.json`, `recommend_word.json`, `recommend_article.json`) contained only one item. The checked-in upstream content contains one word resource and one article resource:

- `public/dicts/en/word/CET4_T.json`: 2,607 real words.
- `public/dicts/en/article/NCE_1.json`: **5** real lessons, although the old catalog advertised 72.

Production returned those exact content files with HTTP 200. The nonexistent NCE-2 JSON returned HTTP 200 **HTML** from the SPA fallback, not a book. NCE-2–4 cover images or landing pages did not establish that their actual lesson data existed. The upstream README explicitly describes its larger selection as official-website-only. Neither submodules, Git LFS, Git ignore rules, nor a one-result UI filter caused this shortage.

## Changes

- Add seven real ECDICT tag-based word dictionaries, giving **8 word books**. Keep the existing **1 article book**, honestly labelled as a five-lesson sample; do not fabricate or copy additional NCE lessons.
- New books: 中考 1,603; 高考 3,677; CET-6 5,407; 考研 4,801; IELTS 5,040; TOEFL 6,974; GRE 7,504. Counts are calculated from actual JSON arrays. These are ECDICT source tags, not a claim of complete official exam syllabi.
- Keep the original CET-4 ID, content bytes and progress namespace. New dictionary IDs are stable `evon-ecdict-<tag>-v1` IDs. Rebuilding does not append duplicates.
- Catalogs and book contents reject HTTP errors, empty or malformed data and HTML fallback responses; loading is bounded and failed screens offer retry.
- Reopening an already joined dictionary from the complete catalog uses its saved record rather than replacing its study progress. Numeric/string forms of existing IDs compare consistently.
- Finishing a word flushes the existing practice save immediately; typing within a word retains the existing debounce. Cached article counts use real loaded content and refreshed catalog metadata without resetting progress.
- No reset or migration of IndexedDB `evonchat-typewords-v1`, localStorage `evonchat:typewords:v1:`, settings, custom dictionaries, favorites, mistakes or learning history.
- Remove unsupported NCE-2–4 promotional prerender routes; retain honest NCE-1 sample access and custom imports.

## Source and licensing

ECDICT is pinned to `skywind3000/ECDICT@39cfb9672c0906b63569e0453c2e6abfb9ab182a`. Its source CSV SHA-256 is `d1ecbdf9ee2b920afb6f430ca6b6bb9f559588cf0dff86e04bd255f9390843cc`. The original MIT notice is preserved in `LICENSE-ECDICT.txt`. Input/output hashes and transformation details are published at:

- `/apps/typewords/ECDICT-SOURCE.md`
- `/apps/typewords/ecdict-sources.json`
- `/apps/typewords/LICENSE-ECDICT.txt`

All seven source word sets and content hashes are distinct; exam lists naturally overlap. Spelling, available IPA and source Chinese translations are retained. No generated translations/examples or external audio files are added. Existing article contents are unchanged, and availability is limited to the original five lessons.

The modified TypeWords corresponding source, lockfile and GPL license are committed under `vendor/typewords/` and distributed publicly in `/apps/typewords/typewords-source.zip` with `/apps/typewords/LICENSE.txt`. The independent host wrapper is in `components/TypeWordsRoom.js`; its existing same-origin activity protocol remains unchanged.

## Build and verify

Use Node.js 24, pnpm 11.22.0 and Python 3. The existing Next.js production build serves committed static assets; it does not need an additional content service or any TypeWords API secret.

```sh
cd vendor/typewords
pnpm install --frozen-lockfile
python scripts/build-ecdict-library.py
node scripts/check-library-resources.mjs
node scripts/check-html-highlighting.cjs
node scripts/check-word-import.cjs
cd ../..
node scripts/build-typewords.cjs
npm test -- --runInBand --runTestsByPath __tests__/TypeWordsRoom.test.js
npm run build
```

The data rebuild fetches pinned public input files and verifies their hashes. To rebuild offline, pass `--source-dir` with the original CSV, LICENSE and README to the Python script. To preserve the already verified static build, do not run a Nuxt build as an automatic side effect of the host deployment.

Regression acceptance covers all nine catalog entries and their content/hash/count correspondence, three distinct new word books (CET-6, IELTS and TOEFL), joining/switching/typing/reloading, preservation of a real old-version CET-4 session plus synthetic personal records, catalog/content failure and retry, and desktop/390px/360px layouts. See the release verification record for observed results and deployment identifiers.

## Deployment safety

Use the existing Vercel production project. Stage with `vercel deploy --prod --skip-domain`, verify the generated deployment, then promote it and verify `www.evonchat.com` separately. Check that the production alias still points to the expected baseline before staging and before promotion. A GitHub push and a successful site deployment are distinct checks.

This repair requires no new environment variables. Existing unrelated server credentials are neither read into browser assets nor logged. Do not commit `.env` files or Vercel authentication files. The source ZIP exception in `.vercelignore` is required to retain the GPL corresponding source in deployment.
