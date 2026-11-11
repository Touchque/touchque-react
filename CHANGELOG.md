# Changelog

All notable changes to this project will be documented in this file. The
format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

## [2.0.0] — 2026-11-11

### Breaking
- **Every name is spelled Touchque instead of TouchQue.** The hooks: `useTouchQuePasskey` → `useTouchquePasskey`,
  `useTouchQueEnroll` → `useTouchqueEnroll`, `useTouchQueLogin` → `useTouchqueLogin`, `useTouchQueAction` →
  `useTouchqueAction`, `useTouchQueApproval` → `useTouchqueApproval`, and their types `UseTouchQue…` → `UseTouchque…`.
  The components: `<TouchQueApproval>` → `<TouchqueApproval>` and `<TouchQueLogin>` → `<TouchqueLogin>`, with
  `TouchQueApprovalProps` → `TouchqueApprovalProps`, `TouchQueLoginProps` → `TouchqueLoginProps` and
  `TouchQueLoginLabels` → `TouchqueLoginLabels`. The re-exported error: `TouchQueWebAPIError` → `TouchqueWebAPIError`.
  The peer dependency is `@touchque/web` `^2.0.0`, renamed the same way (`createTouchqueWeb`, `TouchqueWebConfig`,
  the `X-Touchque-*` headers; HTTP header names are case-insensitive, so servers are unaffected). The approval dialog's
  line reads "Secured by Touchque". Code that uses the old names must be updated; nothing else changes.

### Changed
- The README links work on npm (SECURITY.md, CONTRIBUTING.md, the Touchque Login guide).
- The README quick start passes `useTouchqueAction` its config (`baseUrl`, `credentials`), which it needs, and reads `step.state` for the waiting and enrollment views.

## [1.2.0] — 2026-11-10

### Changed
- Peer dependency `@touchque/web` `^1.6.0` (the Touchque Login and My Account clients and "Secured by Touchque" come from it).

### Added
- **`<TouchqueApproval>` ends with "Secured by Touchque"**, like `<touchque-approval>`: a small line in the theme's muted colour; `texts.securedBy` translates it but must keep the name.
- **`<TouchqueLogin>`:** the sign-in corner of a header: "Sign in" and "Create account" when signed out; the
  person's name with a menu (account settings, sign out) when signed in. Unstyled, with `labels`.
- `<UserProfile>` shows text-message codes (turn off here, set up on the account page).
- **`<UserProfile>` and `useMyAccount()`.** The signed-in customer's own settings inside your app (profile,
  passkeys, Touchque app, email codes, linked accounts, devices, apps with access) on the My Account API;
  unstyled, with `labels` for your own words and a "Confirm it is you" step-up that returns to the same page.
  Needs `@touchque/web` with `MyAccountClient`.
- **Touchque Login for React apps.** `<HostedLoginProvider domain clientId redirectUri>` finishes the sign-in on the
  callback page by itself and calls `onRedirectCallback(appState)`; `useHostedLogin()` gives `isLoading`,
  `isAuthenticated`, `user`, `loginWithRedirect`, `signUpWithRedirect`, `logout` and `getAccessToken`;
  `<RequireSignIn>` shows its children only to signed-in users. Needs `@touchque/web` with `HostedLoginClient`.

### Fixed
- `<PasskeyButton>` after server rendering (Next.js): it hydrated with the server's `disabled` and stayed disabled
  for good, and `hideWhenUnsupported` caused a hydration error. `useTouchquePasskey().isSupported` is now `false` on
  the server and while hydrating, then the browser's answer.
- The hooks build a new client when `headers` or `browserKey` change, so a CSRF token that arrives after the first
  render reaches the relay; every relay call kept the first (empty) token and the relay answered 403. `fetch` is read
  on each call, so an inline function is neither stuck at its first version nor rebuilds the client.
- `useTouchqueEnroll` / `<TwoFactorEnroll>`: Cancel before the QR arrived showed the QR afterwards with nothing
  polling, so scanning it never reached `linked`.
- `useTouchqueLogin().reset()` during a login: the aborted login no longer turns the state into `error`, and `login()`
  right after `reset()` starts instead of throwing "A login is already in progress." `<TwoFactorLoginButton>` no longer
  calls `onError` with an `AbortError` after it unmounts.
- `useTouchqueAction().run()` called again while one waits (a double click): the aborted first run no longer sets
  `status: 'error'` while the second waits on the phone.
- `<HostedLoginProvider>` renders on the server (Next.js); it threw `ReferenceError: window is not defined`.

## [1.1.1] — 2026-10-20

### Fixed
- The `@touchque/web` peer dependency is now `^1.5.0`. 1.1.0 uses the approval controller, passkey autofill and
  case codes from `@touchque/web` 1.5.0 but still accepted `^1.0.0`.

## [1.1.0] — 2026-10-20 — "Why?" case codes, drop-in approval dialog, passkey autofill

### Added
- **`<TouchqueApproval approval={useTouchqueApproval(config)} />`**: the drop-in approval dialog. Call
  `approval.fetch(url, init)` for a guarded route (or `approval.login()` for the push sign-in) and the dialog
  shows the number to pick, the first-time link QR, the offline QR and code, the passkey step and refusals with
  their case code. Same look, texts and `--tq-approval-*` variables as `@touchque/web`'s `<touchque-approval>`;
  `theme` (`light`, `dark`, `auto`), `className`, `style`. `useTouchqueApproval` also gives the state to render
  your own (needs `@touchque/web` 1.5.0).
- `usePasskeyAutofill(config, { onResult, onError, context, enabled })`: passkey autofill on your email field
  (`<input {...autofill.inputProps} />`); never a modal and never a request loop: one run per `enabled` period,
  the retries and back-off are `@touchque/web`'s.
- `usePasskeyUpgrade(config, user)`: the "Add a passkey" offer after a password or email-link sign-in
  (`status: 'offer'`, `upgrade()`, `dismiss()`, the phone step while a linked phone approves).
- Re-exported `PasskeyAlreadyRegisteredError` and the types `ApprovalState`, `ApprovalTexts`, `ApprovalOptions`.

### Fixed
- `useTouchquePasskey().register(extra, approval)` passes the phone-approval options (`onStep`, `signal`,
  `pollIntervalMs`) to `@touchque/web`. They were dropped, so a user with a linked phone never saw the number to
  pick while adding a passkey (PASSKEY_ENROLL is number matched).
- `useTouchqueLogin().caseCode`: the case code of the current step or of the refusal (`K7P-2QX`), or `null`.
  Show it next to the step or the error: "Tell your support team: K7P-2QX" (needs `@touchque/web` 1.5.0).

## [1.0.0] — 2026-09-28

### Added
- `useTouchqueAction` — step-up for any protected route/action, rendered in
  your own components: `run()` (a `fetch()`-shaped call), `step` (the
  current state to render), `useOffline()` / `submitCode()`.
- `useTouchqueLogin` exposes `step` and controls (`useOffline`, `submitCode`,
  `cancel`); `<TwoFactorLoginButton>` now shows the matching number on the
  button itself while waiting, instead of only after approval.
- `<TwoFactorEnroll>` shows the one-time recovery codes issued with the QR,
  and stops polling on unmount.
- Re-exported `PasskeyRequiredError`, `TouchqueWebAPIError`, `Step`, `StepState`, `StepControls`.

### Changed
- **Breaking:** peer dependency `@touchque/web` is now `^1.0.0`.

## [0.2.0] — 2026-09-16

### Added
- `useTouchqueEnroll` + `<TwoFactorEnroll>` — the classic push/number-match
  2FA counterpart to `useTouchquePasskey`/`<PasskeyButton>`. Handles the
  "Set up 2FA" button, QR rendering, polling until the device links, and
  cancellation — no more hand-rolled `fetch` + `<img>` + `setInterval`
  state machine.
- `useTouchqueLogin` + `<TwoFactorLoginButton>` — sends a push request and
  waits for approval.
- Requires `@touchque/web@^0.2.0` (bumped peer range — it now ships
  `classic2fa`).

## [0.1.0] — 2026-08-27

Initial release.

### Added
- `useTouchquePasskey(config)` — a hook over `@touchque/web` that memoizes one
  client and tracks `status` (`idle` | `pending` | `success` | `stepup` |
  `pending2fa` | `error`), `error` and `result`. Exposes `authenticate`,
  `register`, `list`, `remove`, `reset` and `isSupported`.
- `<PasskeyButton config email onSuccess onStepUp onPending2fa onError />` —
  a button that runs the passwordless-primary flow and routes the outcome to
  callbacks; `disabled` + `data-loading` while the ceremony runs;
  `hideWhenUnsupported` to render nothing when WebAuthn is unavailable.
- Re-exports `PasskeyDismissedError` / `PasskeyNotRegisteredError` /
  `PasskeyDisabledError` from `@touchque/web`.
