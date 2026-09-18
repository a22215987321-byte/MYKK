# Login redesign and guest sign-in follow-up

## Scope

The login/registration presentation uses a scoped CSS module. Email/password,
Google OAuth, registration validation, API handlers and navigation destinations
are unchanged. Guest-only changes improve error reporting and keep the loading
state active until its Firestore profile is ready. A failed guest profile clears
the anonymous session and returns to login.

The floating theme component is no longer rendered on `/`. The authenticated
ChatRoom retains its own inline theme component; other routes retain the global
theme component. No saved theme preferences are overwritten.

## Guest provider status (2026-09-18)

The initial `signInAnonymously()` check returned
`auth/admin-restricted-operation`. After the Firebase provider configuration was
updated, the production-build browser check restored an authenticated anonymous
visitor, loaded that visitor's own `guest_users/{uid}` workspace, and created a
message through the existing Firestore handler successfully.

Firebase Authentication and Firestore rules are external configuration and are
not changed by this Git deployment. Keep **Anonymous** enabled in Firebase
Authentication and keep the `guest_users` owner rules from
`GUEST_AUTH_FIRESTORE_RULES.md` merged into the deployed rules. A final security
audit should still use two independent browser profiles to prove that neither
anonymous UID can read or write the other's paths or member-only data.

The frontend now distinguishes provider restrictions, disabled anonymous auth,
unauthorized domains, rate limits, connection failures, and Firestore denial.
Only a safe error code is logged; raw provider messages are not displayed.

## Verification

- `npm exec tsc -- --noEmit`: passed (existing project TypeScript configuration).
- `npm run lint`: passed, with existing repository warnings; no lint configuration
  or rule suppressions changed in this redesign.
- Focused lint of the redesigned component, app wrapper, error helper and new
  tests: passed with no warnings or errors.
- `npm run build`: passed, all 17 static pages generated. Two existing external
  Google Fonts stylesheets could not be downloaded for font optimization;
  the login UI uses the system font stack and does not depend on those downloads.
- `npm test -- --runInBand`: 6 suites, 61 tests passed, including login markup,
  disabled controls, preserved registration options and guest error mapping.
- Browser: available Codex in-app Chromium engine, not a separately connected
  Google Chrome installation. Real browser screenshots and DOM measurements used.
- 1366×768, 1920×1080, 1440×900, 390×844: document width equals viewport width;
  no horizontal overflow. The desktop main container caps at 1440px and the
  card at 500px. All four login screens fit vertically without forced clipping.
- 768×1024: 48/52 columns fit without horizontal overflow; the card contracts
  to the available 379px at this narrow tablet breakpoint rather than forcing
  a 400px minimum that would overflow.
- 390×560 and mobile registration: natural document scrolling reaches the
  footer; content is not constrained to a fixed height.
- Keyboard: all seven login controls are reachable in order, each with a visible
  2px focus outline. No browser console errors during these visual checks.

Guest chat creation and message writes were verified in an authenticated
anonymous session. Independent-profile negative-access testing remains an
administrator security check; unit tests do not substitute for deployed-rule
verification.
