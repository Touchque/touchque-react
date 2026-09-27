# @touchque/react

React bindings for [`@touchque/web`](https://www.npmjs.com/package/@touchque/web)
— hooks and components for [TouchQue](https://touchque.com) push 2FA and
passkey sign-in, so you don't hand-write the step-up polling loop yourself.

[![npm version](https://img.shields.io/npm/v/@touchque/react.svg)](https://www.npmjs.com/package/@touchque/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

📘 Full docs: **[authenticator.touchque.com/docs](https://authenticator.touchque.com/docs)**

## Install

```bash
npm install @touchque/react @touchque/web
```

`@touchque/web` is a peer dependency — install it alongside this package.

## Quick start — protect any action

Pair this with a server route guarded by a TouchQue server SDK
(e.g. Node's `requireTouchQue('SEND_MONEY')`):

```tsx
import { useTouchQueAction } from '@touchque/react';

function TransferButton() {
  const { run, status, step } = useTouchQueAction();

  return (
    <>
      <button onClick={() => run('/api/transfer', { method: 'POST', body: ... })}>
        Send
      </button>
      {status === 'waiting' && step.number && <p>Approve {step.number} on your phone</p>}
      {status === 'enroll' && <img src={step.enroll.qrCodeDataUrl} alt="Scan with TouchQue" />}
    </>
  );
}
```

## Login (enroll + push, number matching)

```tsx
import { TwoFactorLoginButton, TwoFactorEnroll, useTouchQueLogin } from '@touchque/react';

<TwoFactorEnroll onLinked={() => setStep('login')} />
<TwoFactorLoginButton onSuccess={(result) => setSession(result)} />
```

Or drive the same flow yourself with `useTouchQueLogin()` / `useTouchQueEnroll()`.

## Passkeys

```tsx
import { PasskeyButton, useTouchQuePasskey } from '@touchque/react';

<PasskeyButton email={email} onSuccess={(result) => setSession(result)} />
```

`useTouchQuePasskey()` exposes the same flow as a hook if you want your own UI.

## Errors

Re-exported from `@touchque/web` so you don't need a second import for
`instanceof` checks: `PasskeyDismissedError`, `PasskeyNotRegisteredError`,
`PasskeyDisabledError`, `EnrollmentTimeoutError`, `EnrollmentCancelledError`,
`PasskeyRequiredError`, `TouchQueWebAPIError`.

## Security

This package renders whatever `@touchque/web` gives it — it never holds an
API secret and only talks to your own backend. See
[SECURITY.md](./SECURITY.md) to report a vulnerability.

## Requirements

- React 18+
- `@touchque/web` and a TouchQue server SDK relaying requests on your backend

## Contributing

This package's tests build against a local `@touchque/web` checkout — clone
[`touchque-web`](https://github.com/Touchque/touchque-web) as a sibling
directory before running `npm install`. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT © [TouchQue](https://touchque.com)
