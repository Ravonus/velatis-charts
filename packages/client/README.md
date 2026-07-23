# `@velatis/charts-client`

The integration package for any application that uses Velatis Charts. It
contains the versioned URL codec, typed API client, and embed helpers, but no
Swiss Ephemeris code.

```ts
import { ChartsClient, createDefaultChartState } from "@velatis/charts-client";

const client = new ChartsClient({ baseUrl: "https://charts.example.com" });
const state = createDefaultChartState({ name: "Avery" });

console.log(client.shareUrl(state).toString());
const result = await client.calculate(state);
```
