# Changelog

All notable changes to this project will be documented in this file. The
format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [1.0.0] — 2026-09-28

### Added
- `useTouchQueAction` — step-up for any protected route/action, rendered in
  your own components: `run()` (a `fetch()`-shaped call), `step` (the
  current state to render), `useOffline()` / `submitCode()`.
- `useTouchQueLogin` exposes `step` and controls (`useOffline`, `submitCode`,
  `cancel`); `<TwoFactorLoginButton>` now shows the matching number on the
  button itself while waiting, instead of only after approval.
- `<TwoFactorEnroll>` shows the one-time recovery codes issued with the QR,
  and stops polling on unmount.
- Re-exported `PasskeyRequiredError`, `TouchQueWebAPIError`, `Step`, `StepState`, `StepControls`.

### Changed
- **Breaking:** peer dependency `@touchque/web` is now `^1.0.0`.

## [0.2.0] — 2026-09-16

### Added
- `useTouchQueEnroll` + `<TwoFactorEnroll>` — the classic push/number-match
  2FA counterpart to `useTouchQuePasskey`/`<PasskeyButton>`. Handles the
  "Set up 2FA" button, QR rendering, polling until the device links, and
  cancellation — no more hand-rolled `fetch` + `<img>` + `setInterval`
  state machine.
- `useTouchQueLogin` + `<TwoFactorLoginButton>` — sends a push request and
  waits for approval.
- Requires `@touchque/web@^0.2.0` (bumped peer range — it now ships
  `classic2fa`).

## [0.1.0] — 2026-08-27

Initial release.

### Added
- `useTouchQuePasskey(config)` — a hook over `@touchque/web` that memoizes one
  client and tracks `status` (`idle` | `pending` | `success` | `stepup` |
  `pending2fa` | `error`), `error` and `result`. Exposes `authenticate`,
  `register`, `list`, `remove`, `reset` and `isSupported`.
- `<PasskeyButton config email onSuccess onStepUp onPending2fa onError />` —
  a button that runs the passwordless-primary flow and routes the outcome to
  callbacks; `disabled` + `data-loading` while the ceremony runs;
  `hideWhenUnsupported` to render nothing when WebAuthn is unavailable.
- Re-exports `PasskeyDismissedError` / `PasskeyNotRegisteredError` /
  `PasskeyDisabledError` from `@touchque/web`.
