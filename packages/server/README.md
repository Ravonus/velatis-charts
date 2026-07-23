# `@velatis/charts-server`

The self-hosted, stateless Swiss Ephemeris runtime and charting web application.
It has no database, accounts, analytics, chat, video, AI, billing, or storage.

```bash
pnpm dlx @velatis/charts-server serve --host 0.0.0.0 --port 4321
```

The server exposes:

- `POST /api/v1/charts`
- `GET /api/v1/health`
- the shareable chart builder at `/`

The server and bundled web UI are AGPL-3.0-or-later. Network operators must
provide corresponding source to users as required by that license. The
`@velatis/charts-client` integration package is separately Apache-2.0 licensed
and contains no Swiss Ephemeris code.
