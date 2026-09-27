# Contributing

Thanks for considering a contribution to `@touchque/react`.

## Setup

This package's tests build against a real `@touchque/web` — clone it as a
sibling directory first:

```bash
git clone https://github.com/Touchque/touchque-web ../touchque-web
(cd ../touchque-web && npm install && npm run build)
npm install
```

(CI does the same thing automatically — no local setup step is required just
to open a PR, only to run tests locally.)

## Running tests

```bash
npm test
```

## Making a change

1. Add tests. A behavior change without a test won't be merged.
2. Update `CHANGELOG.md` (Keep a Changelog format) under `## [Unreleased]`.
3. Keep code, comments, docs and error messages in English.
4. If the change also needs a change in `@touchque/web`, open that PR first
   and link it here.

## Pull requests

- Describe what changed and why, not just what. If it's a breaking change,
  say so explicitly and explain the migration.
- CI must pass.

## Reporting a security issue

Please don't open a public issue — see [SECURITY.md](./SECURITY.md).
