# EVONCHAT guest message column design QA

- Source visual truth: user-provided attachment `codex-clipboard-677709d4-27b9-478f-978f-3790149296b8.png`.
- Source pixels: 1570 × 826.
- Implementation: `components/GuestChatRoom.js`, rendered from the production build at `http://127.0.0.1:3002/`.
- Implementation screenshot: Codex in-app Browser tab 11 capture at 1570 × 826 CSS pixels, device pixel ratio 1.
- Responsive capture: Codex in-app Browser tab 11 capture at 390 × 844 CSS pixels, device pixel ratio 1.
- State: authenticated anonymous visitor, dark EVONCHAT theme, one representative `213` message.

## Full-view comparison evidence

The source showed the visitor message positioned from the entire main chat width, placing it too far toward the right edge. The requested refinement treats the main chat area after the 310px conversation sidebar as three equal tracks and confines message content to the middle track.

At the matched 1570 × 826 viewport, the implementation main chat region measured 1260px wide. The message column measured 419.99px (`0.333325` of the main region), its center differed from the main-region center by only `-0.005px`, and the user bubble ended at the middle column's right edge. The document `clientWidth` and `scrollWidth` both measured 1570px, confirming no horizontal overflow.

At 390 × 844, the responsive rule changed the message column to the full available width so readable mobile messages are not compressed into a 130px strip. The user message stayed right-aligned, the composer remained unchanged, and no content was clipped.

## Focused-region comparison evidence

- The left conversation/create-chat sidebar is excluded from the three-track calculation, as requested.
- Only the scrolling message content received the centered one-third wrapper.
- The header and composer retain their original widths and alignment.
- The compact user bubble remains content-sized and right-aligned, but now only within the middle third.
- Empty-state copy is also held in the message column so no conversation copy escapes the central reading track.

## Required fidelity surfaces

- Fonts and typography: existing EVONCHAT font, weight, size and line-height remain unchanged.
- Spacing and layout rhythm: desktop message content is exactly one third of the post-sidebar main region; mobile returns to one column.
- Colors and visual tokens: the existing dark background, purple visitor bubble, borders and shadows remain unchanged.
- Image quality and asset fidelity: existing EVONCHAT logo and Lucide icons remain unchanged; no new image assets were required.
- Copy and content: all live Firestore message copy and empty-state text remain unchanged.

## Comparison history

1. Initial source — P2: visitor message alignment used the whole main area, so the reading position sat in the right third instead of the central third.
2. Fix — added a centered `calc(100% / 3)` message column and moved the existing message rendering inside it; mobile receives a `width: 100%` override.
3. Final pass — measured desktop ratio is one third within rounding tolerance, center offset is effectively zero, mobile remains readable, and no P0/P1/P2 findings remain.

## Interaction and runtime checks

- Anonymous visitor state loaded from the existing authenticated browser session.
- A real test message was sent through the existing Firestore handler and rendered in the centered column.
- Header, conversation sidebar, composer and send behavior were unchanged.
- Browser console reported no errors during the final desktop check.
- TypeScript passed; all 61 tests passed; lint completed with only pre-existing warnings; production build generated all 17 pages.

## Follow-up polish

- No P3 follow-up is required for the requested layout change.

final result: passed
