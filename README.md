# Velatis Charts

Open-source, stateless astrology charting with deterministic share URLs.

Velatis Charts does one thing: calculate and render charts. It has no database,
accounts, chat, video, AI, billing, analytics, ads, or tracking. A chart can
contain one person, multiple people for comparison, or transit settings. The
entire versioned input can be carried in a URL.

## Run it

Once the first public package is released:

```bash
pnpm --allow-build=swisseph-v2 dlx @velatis/charts-server serve
```

The GitHub release works before the npm registry package is available:

```bash
pnpm --allow-build=swisseph-v2 dlx https://github.com/Ravonus/velatis-charts/releases/download/v0.2.0/velatis-charts-server-0.2.0.tgz serve
```

From a checkout:

```bash
pnpm install --frozen-lockfile
pnpm check
pnpm charts
```

Then open <http://127.0.0.1:4321>.

The explicit `--allow-build` grants only the Swiss Ephemeris native binding
permission to compile. Modern pnpm versions block dependency build scripts by
default, so omitting that flag can produce a server that starts but cannot
calculate.

## Use it from another product

Applications import only the permissively licensed client:

```bash
pnpm add @velatis/charts-client
```

```ts
import {
  ChartsClient,
  buildShareUrl,
  createDefaultChartState,
} from "@velatis/charts-client";

const state = createDefaultChartState({
  name: "Avery",
  localDate: "1990-01-01",
  localTime: "12:00",
  timeZone: "America/Denver",
  latitude: 39.7392,
  longitude: -104.9903,
});

const charts = new ChartsClient({
  baseUrl: "https://charts.example.com",
});

const shareUrl = buildShareUrl(charts.baseUrl, state);
const result = await charts.calculate(state);

const positions = await charts.ephemeris("positions", {
  samples: [{ julianDay: 2_461_231, bodyIds: [0, 1] }],
});
```

The application talks to a separately operated `@velatis/charts-server`. It
must not import the server package into a closed-source program.

## Packages and licensing

| Package                     | Purpose                                           | License           |
| --------------------------- | ------------------------------------------------- | ----------------- |
| `@velatis/charts-contracts` | Versioned data contract and extension model       | Apache-2.0        |
| `@velatis/charts-client`    | URL codec, API client, and embed helpers          | Apache-2.0        |
| `@velatis/charts-server`    | Swiss Ephemeris adapter, HTTP API, and bundled UI | AGPL-3.0-or-later |
| `@velatis/charts-web`       | Chart builder and SVG viewer                      | AGPL-3.0-or-later |

The package boundary is intentional. The client and contracts have no Swiss
Ephemeris dependency. The server and web application are released as source
under AGPL-3.0-or-later, which is compatible with the Swiss Ephemeris public
license route. See [LICENSING.md](./LICENSING.md).

## Stable public surface

The state contract starts at `version: 1`. It supports:

- natal, multi-person compare, and transit modes;
- tropical and sidereal zodiac settings;
- major house systems, ayanamsas, true/mean node, selectable points, and orbs;
- presentation hints that do not affect the calculation;
- reverse-DNS extension keys such as `com.example.progressions`.

Unknown product workflows belong in namespaced extensions until they are mature
enough to become a shared contract field. That lets downstream products move
quickly without maintaining a private fork of chart calculation or URL state.

## API

`POST /api/v1/charts`

- accepts a `ChartStateV1` JSON body;
- returns a typed `ChartResultV1`;
- sets `Cache-Control: no-store`;
- rejects invalid inputs and bodies over 256 kB;
- does not retain request data.

`POST /api/v1/ephemeris`

- accepts a versioned `{ operation, input }` JSON envelope;
- supports chart frames, batched positions, exact crossings, eclipse searches,
  rise/set calculations, and fixed-star catalog/position operations;
- returns only JSON and never exposes or transfers the native engine;
- is bounded by operation-specific sample/result limits;
- sets `Cache-Control: no-store` and does not retain request data.

`GET /api/v1/health`

- returns service and source metadata;
- reports process readiness; production consumers should also execute a small
  `positions` request before declaring calculation readiness.

## Privacy

Share URLs contain birth inputs in readable-by-the-recipient encoded form.
They are transport, not encryption. Anyone who receives a link can decode its
chart data. Operators should avoid access logs containing query strings and
should configure their CDN, reverse proxy, and analytics accordingly.

The calculation API uses POST and `no-store` responses so chart inputs do not
need to appear in an API URL.

## Contributing and support

Issues and pull requests are welcome. We support self-hosters and integrators in
public GitHub discussions and issues when possible. See
[SUPPORT.md](./SUPPORT.md) for boundaries and [CONTRIBUTING.md](./CONTRIBUTING.md)
for the development workflow.

## Project status

`0.x` is the public foundation. Contracts are versioned now, but package APIs
may receive additive improvements before `1.0`. Breaking chart-state changes
require a new decoder/migration path; existing share URLs must remain readable.
