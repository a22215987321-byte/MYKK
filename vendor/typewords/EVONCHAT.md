# TypeWords for EVONCHAT

This is a modified standalone distribution of [zyronon/TypeWords](https://github.com/zyronon/TypeWords), upstream commit `1bcc2a2c0a169b37bea26b73f5a46a91d803558f`. Modifications dated 2026-11-03 and 2026-11-12 are distributed under the same GPL-3.0 license. See `LICENSE`.

## Build

Install Node.js 24 and pnpm 11.22.0. In this source directory run:

```sh
pnpm install --frozen-lockfile
pnpm run generate
```

The output is `.output/public`. Serve these files at `/apps/typewords/`, preserving the subdirectories. After exact static-file resolution, return `index.html` for client routes beneath `/apps/typewords/`. The entry is `/apps/typewords/words`. No backend is needed for the included vocabulary, article practice, imports, exports, or settings.

The source is already adapted. The normal build is `pnpm run generate`.

## Library update (2026-11-12)

The original open-source snapshot includes one 2,607-word CET-4 dictionary and five NCE-1 sample articles, not the complete official-site library. The sample article metadata now reports five articles; the original dictionary and article IDs are unchanged. No NCE-2/3/4 content is bundled or advertised as a local book.

Seven additional dictionaries retain complete original exam-tag sets from ECDICT, pinned to `39cfb9672c0906b63569e0453c2e6abfb9ab182a`. Their MIT notices, source URLs, precise selection rules, hashes and measured counts are in `public/LICENSE-ECDICT.txt`, `public/ECDICT-SOURCE.md`, and `public/ecdict-sources.json`. Rebuild using `scripts/build-ecdict-library.py`; no generated translations or invented book contents are used. Source labels describe ECDICT tags, not an official syllabus or CEFR guarantee.

All catalogs and contents use validated JSON with HTTP/parse/empty-data failures and a retry action. Existing browser storage namespaces, user dictionaries, progress, favorites, wrong words and settings remain unchanged. Selecting a previously added resource uses its saved progress rather than initializing a second copy. Deferred content loading updates the matching book, even if the selected book changes during the request.

Verification commands (Node.js 24):

```sh
node scripts/check-library-resources.mjs
node scripts/check-html-highlighting.cjs
```

## Modifications

- Static SPA deployment under `/apps/typewords/`, Traditional Chinese by default, responsive iframe and phone widths.
- Self-hosted resources and local lookup in the bundled CET-4 dictionary. The upstream repository includes CET-4 and New Concept English 1; custom dictionaries and articles can be imported.
- Dedicated `evonchat-typewords-v1` IndexedDB and `evonchat:typewords:v1:` local-storage namespace. Data stays in this browser; it is separate from EVONCHAT login and cloud data. Optional upstream Supabase configuration remains user-controlled.
- Removed third-party analytics script injection and service-worker registration; no missing service worker or root-scope interception.
- Same-origin parent activity messages pause practice/audio and ignore keyboard events when the pane is inactive. The parent sends `{ type: 'evonchat:typewords-active', active: true/false }`; the child verifies parent window and origin.
- Mobile practice input focuses synchronously after a tap and uses 16px text to avoid automatic input zoom.
- Long vocabulary scales to the actual pane width, capped at the user's font-size setting. Practice panels start closed and open above the mobile navigation.
- Custom word lists have a local JSON/TXT import control with validation and deduplication, replacing the missing upstream import route.
- Escaped imported sentence text before highlighted HTML rendering. Focused tests: `node scripts/check-html-highlighting.cjs`.
- Plain static image URLs instead of a required image-optimization server; license and corresponding source links in Settings → About.

Pronunciation can use the upstream external Youdao endpoint and the browser speech fallback. Optional translation services and user-configured cloud services require the user's own configuration; they are not EVONCHAT cloud integrations.

## Corresponding source

The deployed application includes `LICENSE.txt` and `typewords-source.zip` alongside the application. The archive contains this modified source, lockfile, and instructions. EVONCHAT's separate host app is not included in this TypeWords source distribution.

