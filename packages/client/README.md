# `@velatis/charts-client`

The Apache-2.0 integration package for Velatis Charts. It contains:

- the versioned chart-state contract;
- canonical URL encoding and decoding;
- share and embed URL helpers;
- typed chart and ephemeris HTTP methods;
- structured API errors.

It contains no Swiss Ephemeris code, native binding, server implementation, or
storage.

```ts
import { ChartsClient, createDefaultChartState } from "@velatis/charts-client";

const client = new ChartsClient({
  baseUrl: "https://charts-api.velatis.io",
  headers: { "x-example-client": "my-product" },
});

const state = createDefaultChartState({
  name: "Avery",
  timeZone: "America/Denver",
  latitude: 39.7392,
  longitude: -104.9903,
});

const shareUrl = client.shareUrl(state);
const embedUrl = client.embedUrl(state, { compact: true });
const chart = await client.calculate(state);

const positions = await client.ephemeris("positions", {
  samples: [{ julianDay: 2_461_231, bodyIds: [0, 1] }],
});
```

Share URLs contain readable-by-the-recipient chart inputs. Treat them as
private data, do not log their query strings, and explain this behavior to
users.

The client expects a separately operated AGPL `@velatis/charts-server` over
HTTP. Do not use this package as a path to bundle the server or Swiss Ephemeris
into a closed-source application.
