# EVONCHAT UI revision QA — 2026-09-29

## Release refinements

- Login logo is now centered above the wordmark; the subtitle was removed.
  Email/guest actions use solid white/pale-blue fills rather than transparent blue.
- Both desktop invitation entries and their mobile equivalents now share sage
  background #e5f2e9, ink #365e46 and border #cce1d3. The banner is left-aligned.
  Both entries still open the request dialog; no invitation data flow changed.
- Latest checks: 23 suites / 203 tests passed; TypeScript passed; changed-file
  lint passed with existing Hook warnings only. The previous full production build
  passed. Per repository guidance, no extra local build for these small refinements.
- Desktop/mobile DOM tests verify shared colors, left alignment and both click
  targets. Browser control timed out on the follow-up preview, so existing PNGs
  predate these final styling changes; do not treat them as final release screenshots.
- Publication uses the existing GitHub main -> Vercel production integration.

This pass supersedes the historical notes below only for the requested login,
onboarding, account switcher and member/guest conversation surfaces.

## Reference and scope

- User screenshots 1–5: simplify profile setup; support photo upload; remove the
  premature install prompt and duplicate conversation-intro avatar; flatten file
  cards; translucent top/bottom chat chrome; blue, vertically stacked login
  inspired by screenshot 3; green centered invitation banner; center the enlarged
  conversation column; preserve custom status text while keeping presence on avatars.
- The image-to-code workflow guided visual comparison. This is an adaptation of
  the reference layout with EVONCHAT assets, not an Interpals/Apple sign-in clone.
- Existing Google, email/password, registration and anonymous entry points remain.
  No message API, Firestore permissions or message schema was changed.

## Rendered comparisons and fixes

- Login: inspected at 390px, including expanded email form and saved-account
  controls. Blue canvas, native readable typography, centered EVONCHAT logo and
  stacked controls replace the split hero. No horizontal overflow (390/390px).
- Profile setup: one compact card, photo preview and collapsed emoji/color choices.
  Selected the existing local EVON avatar through the browser file chooser and
  verified the circular preview and enabled submit after entering a nickname.
  No installation banner. Tests cover wrong format, >20MiB, emoji fallback and
  object URL cleanup. Real R2 transfer was not performed in the mock preview.
- Member chat: inspected mobile 390×844 geometry and full short-screen 390×760
  screenshot, desktop 1366×768 screenshot and 1920×900 geometry. Transparent file
  cards have one border and no outer bubble. The introductory 56px avatar is gone;
  message authors' avatars and the header avatar remain.
- In the enlarged desktop panel at 1920px, the panel was 1376px wide; message and
  composer columns both measured 458.667px and x=722.667px. A stable two-sided
  scrollbar gutter keeps their centers aligned. Narrower panels use a 320px floor.
- The green invitation banner contains only the centered invitation summary.
  Custom status text appeared in the sidebar, header and settings friend list;
  presence remained on the avatar dot (with an accessible label).
- Glass chrome: member header/composer use 65% panel tint + 18px blur; guest uses
  68% neutral tint + 18px blur. Message viewports continue behind these layers.
  Measured padding keeps first/last messages readable and the composer above the
  mobile bottom navigation. Existing AI glass styling remains intact.
- Guest 390px: no horizontal overflow; a five-line draft expanded the textarea to
  132px without moving the footer beyond the viewport or hiding send. No messages
  or uploads were sent to production.
- Fixed a newly caught guest SSR style-escaping mismatch (static raw CSS) and a
  responsive drawer offset: closed drawers now use -100%, and desktop clears the
  mobile transform. Rechecked drawer right edge at 0px on mobile.
- Hover/focus-visible and disabled states remain in the affected auth/setup/chat
  controls. The user's screenshots are the before/reference evidence; local PNGs
  are in `.tmp/ui-review/` (ignored, test data only).

## Authentication validation and limits

- Firebase named Auth instances retain each member session; updateCurrentUser
  switches only after a fresh ID token succeeds. No passwords or SDK tokens are
  added to the app's saved-account metadata list.
- Explicit logout/forget clears the retained session; account-list eviction also
  clears its SDK session. Tests cover two UIDs, expiration, network failure,
  anonymous exclusion and in-flight remember/logout ordering.
- Old metadata-only accounts require one real sign-in. Revoked/expired sessions
  still require verification. Actual Google account switching, browser persistence
  across restarts and R2 upload need an authenticated deployment smoke test;
  mocked tests do not substitute for that.

## Checks

- Jest: 23 suites / 200 tests passed. Fixed the manually-created JSDOM focus-event
  fallback in the Skills harness; no Skills application logic changed.
- TypeScript standalone check: passed. Next build is configured by the existing
  project to skip types/lint internally, so both were run separately.
- ESLint: exit 0; existing hooks/export warnings remain, no new lint errors.
- Final production build after the drawer fix completed successfully (17 static pages). Google Fonts download/optimization warnings were non-fatal.
- No production deployment was requested in this turn or performed.

Visual result: passed for the inspected local/mock surfaces. Live authentication,
storage transfer and real iOS Safari testing remain unverified.

---

# EVON minimal document-style chat QA — 2026-09-19 (historical)

Preview: `http://127.0.0.1:3002/` (local production build, not deployed).

## Latest centred-third/sidebar refinement

- Desktop sidebar is exactly 280px at 1440 × 900. The 1160px main workspace is split into three equal 386.67px tracks; the message and composer columns both measured 386.66px in the centre track.
- Tablet sidebar measured 252px at both 1024px and 768px viewports. Their message/composer columns measured the exact middle third of the remaining workspace: 257.33px and 171.99px respectively.
- Reply mode uses a fitted native select plus a separate chevron: 96.67px total width, 45px height, 14px horizontal padding and a measured 10px text-to-chevron gap. No auto-pushed arrow or fixed 120px width remains.
- Sidebar uses a neutral `#fafafa` background, one subtle right border, a left-aligned 44px 新聊天 button and a compact 對話 section. The selected conversation uses a low-alpha theme tint without a border.
- Conversation actions are hidden behind `···`; opening the real item exposed 重新命名 and 刪除聊天 while retaining the original handlers.
- 外觀 is collapsed initially. Expanding it exposed all four existing themes, preserved the active check, kept 467px available to the scrollable list and left the account row pinned to the 900px viewport bottom.
- At 390 × 844 the 320px sidebar rested fully off-canvas at x=-326.4px. Opening it produced an overlay, x=0 and a visible close control; selecting the active chat automatically returned it off-canvas. The account row remained pinned at y=844px.
- The mobile message/composer width remained 358px and the page had no horizontal overflow. Desktop and tablet likewise reported no horizontal overflow.
- Empty initial render remains valid; the list owns `flex: 1`, `min-height: 0`, and `overflow-y: auto`, so 10/50 conversation growth is isolated to the list while the appearance and account sections stay fixed. No fake conversations were written to Firestore for this stress check.
- Automated checks: 7 suites / 65 tests passed; TypeScript and lint completed (only pre-existing warnings); the production build generated all 17 pages. Browser console contained no errors during the final interaction checks.

## Latest UI-only changes

- Main reading surface is `#fafafa`, independent of the sidebar's selected theme. All four sidebar theme controls still work; each was tested while confirming white message and composer backgrounds.
- The toolbar is 64px on desktop/tablet and 60px on mobile. It shares the page background, has no shadow or rounded card frame, and only a `1px solid #ececec` bottom border. The circular avatar is 32px.
- Message and composer containers are centered at a maximum 800px. Messages start 28px below the toolbar on desktop and 24px below it on mobile; message spacing is 24px.
- User messages use white backgrounds, `#202020` text, a `1px solid #e7e7e7` border and uniform 16px rounded corners. There is no gradient, tail or shadow; maximum outer width is 680px.
- The companion greeting remains unboxed, with a small icon/name and 1.7 line height. Scoped paragraph/list/code styles were added without introducing a Markdown parser or changing message data/rendering logic.
- Composer is white, 58px initially, with a 20px radius, no shadow and a gray focus border. The transparent neutral send control stays 42px wide.
- The viewport grid and scrollable message region keep the toolbar and composer in place. Sidebar controls, conversation actions, state/hooks and all Firestore operations remain unchanged.

## Browser measurements

| Viewport | Message/composer width | Toolbar height | Horizontal overflow |
| --- | ---: | ---: | --- |
| 1920 × 1080 | 800px / 800px | 64px | None |
| 1440 × 900 | 800px / 800px | 64px | None |
| 1366 × 768 | 800px / 800px | 64px | None |
| 768 × 1024 | 411.94px / 411.94px | 64px | None |
| 390 × 844 | 358px / 358px | 60px | None |

- At 390px, a 20-line draft capped the textarea at 176px with internal vertical scrolling; composer bottom stayed at 832px and the send button remained 42px wide.
- Shift+Enter produced a newline without increasing the stored message count. Test drafts were cleared without sending, restoring the 58px composer and disabled send button.
- Keyboard focus on Send displayed a solid gray outline. Composer focus border settled at `rgb(163, 163, 163)` with no glow. Browser console reported no errors.
- `npm test -- --runInBand`: 7 suites / 64 tests passed, including a new neutral-workspace style regression test.
- Typecheck, lint and production build passed. Existing repository lint warnings remain; external Google Fonts optimization was skipped after download failure. All 17 pages generated.

## Earlier identity/theme iteration (historical)

The following notes describe the preceding design. Its full-chat theme colors, 38px header avatar and earlier layout measurements are superseded by the neutral workspace above.

Latest preview: `http://127.0.0.1:3002/`, served from a successful production build.

## Current changes verified

- The guest header shows the supplied 200 × 200 pixel-art asset at 38 × 38px with `border-radius: 50%`; the image loaded successfully.
- The header, conversation list and greeting author display EVON instead of the owner email. The header subtitle has been removed from the JSX, not hidden with CSS.
- Four named controls replace the earlier accent swatches: 淺色預設, 柔和珠光, 幽影深窗, 簡約四卡.
- Theme switching reuses the existing `styles/theme.css` tokens on a local `data-guest-theme` scope. It does not modify the document theme or the member/login theme preference.
- All four themes were clicked in the browser. Observed backgrounds: default `rgb(244, 243, 249)`, pearl `color(srgb 0.959412 0.954706 0.946863)`, dark `rgb(13, 14, 18)`, cards `rgb(174, 183, 194)`. Text, inputs and placeholders change with the theme.
- Reloading after selecting 簡約四卡 retained that selection. The final preview was returned to 幽影深窗.
- At 1440 × 900 and 390 × 844, document width matched viewport width: no horizontal overflow. On mobile the four controls use a two-column grid, each 177px wide.
- Keyboard Tab reached the theme controls with a visible solid focus outline. No browser console errors were reported.
- Authentication, email identity metadata, message sending and the existing greeting text were not changed in this visual refinement.

## Current automated checks

- `npm test -- --runInBand`: 7 suites and 63 tests passed.
- `npx tsc --noEmit`: exit 0 (the existing TypeScript configuration covers TS/TSX files).
- `npm run lint`: exit 0; pre-existing repository warnings remain.
- `npm run build`: exit 0; all 17 pages generated. Google Fonts optimization was skipped because its external stylesheets could not be downloaded.

## Previous composer implementation verification (historical)

The notes below describe the preceding iteration; its email labels and four accent swatches are superseded by the changes above.

- Implementation: `components/GuestChatRoom.js`, rendered from the production build at `http://127.0.0.1:3002/`.
- Desktop viewport: 1440 × 900 CSS pixels, device pixel ratio 1.
- Mobile viewport: 390 × 844 CSS pixels, device pixel ratio 1.
- State: authenticated anonymous visitor with the fixed companion, automatic greeting, existing messages, EXTRA mode and the blue style selected.

## Visual verification

- The top-left brand now contains only the EVONCHAT logo and wordmark; the former visitor-mode badge is absent and both items share the same visual height.
- The header identifies `a22215987321@gmail.com`, shows the conversation subtitle and exposes a native HIGH/EXTRA selector.
- Four accessible color controls appear above the bottom-left guest account. Selecting blue updated the live accent token to `#4f8cff`.
- Every conversation row identifies the fixed companion email while preserving its editable chat title as secondary text.
- The first visible message is the unboxed companion greeting: “你好，我是 GPT5.6 SOL，有甚麼能幫你的嗎？”
- Desktop message and composer columns both measured 376.656px inside the 1130px post-sidebar main region, matching the requested central one-third track.
- The send control remains 42 × 42px and uses a transparent background with the selected brand color on its icon, border and hover state.

## Composer interaction checks

| State | Textarea height | Composer height | Result |
| --- | ---: | ---: | --- |
| Empty | 40px | 59.33px | Send disabled |
| One line | 40px | 59.33px | Send enabled |
| Five lines | 136px | 153.33px | Expanded upward, no inner scroll |
| Twenty lines | 176px | 193.33px | Height capped; textarea `overflow-y: auto`, scrollHeight 976px |

- Enter: a real “Enter 發送測試” message was written through the unchanged Firestore send handler. The textarea cleared and returned to 40px; send returned to disabled.
- Shift+Enter: produced `第一行\n第二行`; message count did not change and textarea grew to 64px.
- IME: the key decision helper rejects Enter while either React's composition ref or `nativeEvent.isComposing` is true. Unit coverage verifies plain Enter, Shift+Enter and composition Enter independently.
- Placeholder: “輸入訊息…” remains visible at higher contrast than before.
- Focus: `:focus-within` changes the border to the active brand color and adds a light three-pixel soft ring.

## Responsive verification

- At 390 × 844, the composer column measured 366px with 12px side margins.
- The message column measured 362px with 14px side margins.
- The send button stayed 42px wide and was not compressed by the textarea.
- Document `clientWidth` and `scrollWidth` both measured 390px; no horizontal overflow.
- Long content grows the composer upward because it remains in the bottom flex region.

## Data and security notes

- Guest profiles record the fixed companion in `friendEmails` and `defaultFriendEmail`.
- New chat documents record `counterpartyEmail`.
- Anonymous chats remain under `guest_users/{uid}`; no guest is inserted into the member `users` collection and no shared guest account is introduced.
- The automatic greeting is trusted application copy and does not forge a member-authored Firestore message.

## Automated checks

- TypeScript: passed.
- Jest: 7 suites, 63 tests passed.
- ESLint: passed with only pre-existing repository warnings.
- Production build: passed; all 17 pages generated.
- Browser console: no errors in the final preview.

final result: passed
