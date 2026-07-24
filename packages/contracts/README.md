# `@velatis/charts-contracts`

Versioned, implementation-neutral TypeScript contracts for Velatis Charts.
This Apache-2.0 package contains no ephemeris implementation.

The version-1 contract describes:

- one to eight people;
- natal, comparison, and transit modes;
- dates, exact local times, IANA time zones, and coordinates;
- zodiac, ayanamsa, house, node, point, and orb settings;
- presentation hints;
- reverse-DNS extension namespaces.

```ts
import {
  assertChartState,
  createDefaultChartState,
  type ChartStateV1,
} from "@velatis/charts-contracts";

const state: ChartStateV1 = createDefaultChartState({ name: "Avery" });
assertChartState(state);
```

Do not change the meaning of an existing version-1 field. Add backward-
compatible fields when possible; otherwise introduce a new version plus an
explicit decoder/migration so old share URLs remain readable.

Experimental product behavior belongs under a reverse-DNS extension key such
as `com.example.progressions`.
