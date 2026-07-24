# `@velatis/charts-server`

The self-hosted, stateless Swiss Ephemeris runtime and charting web application.
It has no database, accounts, analytics, chat, video, AI, billing, or storage.

```bash
pnpm --allow-build=swisseph-v2 dlx \
  @velatis/charts-server serve \
  --host 127.0.0.1 \
  --port 4321
```

Until the npm package is published, use:

```text
https://github.com/Ravonus/velatis-charts/releases/download/v0.2.0/velatis-charts-server-0.2.0.tgz
```

## Endpoints

- `POST /api/v1/charts`
- `POST /api/v1/ephemeris`
- `GET /api/v1/health`
- the bundled chart builder at `/`

Chart and ephemeris responses use `Cache-Control: no-store`. Request bodies are
bounded to 256 kB. The service applies no persistence; operators must also
configure proxies, CDNs, and logs not to retain chart bodies or share queries.

Set `VELATIS_CHARTS_SOURCE_URL` to the exact corresponding-source tag for the
running build. Use `VELATIS_CHARTS_ALLOWED_ORIGINS` to restrict browser CORS.

The server and bundled web UI are AGPL-3.0-or-later. Network operators are
responsible for the corresponding-source obligations. The separately licensed
Apache client contains no Swiss Ephemeris implementation.

See the root [README](../../README.md), [LICENSING.md](../../LICENSING.md), and
[release checklist](../../docs/qa/release-checklist.md).
