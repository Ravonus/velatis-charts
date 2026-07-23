# Contributing

Thank you for helping improve open charting.

## Development

Requirements:

- Node.js 22 or newer;
- pnpm 10;
- a C/C++ toolchain supported by `node-gyp`.

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm charts
```

Every change should include the smallest useful test. Contract changes must
preserve existing version-1 URLs or add an explicit migration. Engine changes
should include a deterministic fixture and name the source of any expected
astronomical value.

## Design rules

- Keep the server stateless.
- Do not add accounts, databases, tracking, chat, video, billing, or unrelated
  product features.
- Prefer the shared contract over product-specific fields.
- Use reverse-DNS extension keys for experimental downstream features.
- Keep Swiss Ephemeris code in the AGPL server package.
- Keep the client and contracts free of native or AGPL dependencies.
- Never log chart request bodies or share-URL query strings.

## Pull requests

Keep pull requests focused. Explain the user-facing outcome, licensing impact,
tests run, and whether a contract or share URL changes. By contributing, you
agree that your contribution is licensed under the license of the package you
modify.
