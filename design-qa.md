# EVON minimal document-style chat QA — 2026-09-19

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
