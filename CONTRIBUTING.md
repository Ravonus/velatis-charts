# Contributing

Thank you for helping make open charting more accurate, portable, and private.

## Before opening code

Use an issue or discussion for substantial contract, engine, or architecture
changes. Small fixes and documentation improvements can go directly to a pull
request.

Read:

- [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md)
- [LICENSING.md](./LICENSING.md)
- [QUALITY.md](./QUALITY.md)
- [SECURITY.md](./SECURITY.md)

Never include real birth data, secrets, production URLs containing chart state,
or proprietary source in a contribution.

## Development setup

Requirements:

- Node.js 22 or newer;
- pnpm 10;
- a C/C++ toolchain supported by `node-gyp`.

```bash
pnpm install --frozen-lockfile
pnpm quality:fast
pnpm charts
```

Before opening a pull request, run the complete gate:

```bash
pnpm check
```

## Design rules

- Keep the server stateless.
- Do not add accounts, databases, tracking, chat, video, billing, advertising,
  or unrelated product features.
- Prefer the versioned shared contract over product-specific fields.
- Put experimental downstream fields under reverse-DNS extension keys.
- Keep Swiss Ephemeris code in the AGPL server package.
- Keep the client and contracts free of native and AGPL dependencies.
- Never log chart request bodies or share-URL query strings.
- Prefer small, deterministic functions and explicit bounds.

## Testing expectations

Use the smallest test that proves the behavior:

- unit tests for validation, URL codecs, calculations, and edge cases;
- Cucumber scenarios for user-visible or cross-package acceptance contracts;
- HTTP tests for status, headers, limits, and privacy behavior;
- mutation testing for decision-heavy pure code;
- manual QA for visuals, assistive technology, packaging, and real browsers.

Bug fixes should reproduce the failure before changing production code. Engine
changes need deterministic synthetic fixtures and the source of every expected
astronomical value. Contract changes must preserve version-1 URLs or include an
explicit decoder/migration.

Do not weaken coverage or mutation thresholds to make a pull request pass.
Improve the test or explain an exceptional, narrowly reviewed exclusion.

## Pull requests

Keep pull requests focused and include:

- the user-facing outcome;
- the reason and approach;
- tests and QA performed;
- coverage/mutation impact;
- URL, API, privacy, and licensing impact;
- screenshots for visible changes.

By contributing, you agree that your contribution is licensed under the license
of the package you modify.

Maintainers may request changes or close work that conflicts with the project's
stateless charting scope, even when the implementation itself is sound.
