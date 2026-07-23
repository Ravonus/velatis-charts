import { describe, expect, it } from "vitest";
import {
  ChartsClient,
  buildShareUrl,
  createDefaultChartState,
  decodeChartState,
  encodeChartState,
} from "./index.js";

describe("chart URL state", () => {
  it("round trips Unicode names and canonicalizes object keys", () => {
    const state = createDefaultChartState({
      name: "Renée ✨",
      timeZone: "America/Denver",
    });
    const encoded = encodeChartState(state);
    expect(decodeChartState(encoded)).toEqual(state);
    expect(encodeChartState(structuredClone(state))).toBe(encoded);
  });

  it("builds a shareable URL without network or storage", () => {
    const url = buildShareUrl(
      "https://charts.example.test/read",
      createDefaultChartState(),
    );
    expect(url.origin).toBe("https://charts.example.test");
    expect(url.searchParams.get("chart")).toBeTruthy();
  });

  it("retains the global fetch receiver when no custom implementation is passed", async () => {
    const original = globalThis.fetch;
    const receiver = globalThis;
    globalThis.fetch = function (this: typeof globalThis) {
      if (this !== receiver) throw new TypeError("Illegal invocation");
      return Promise.resolve(
        new Response(
          JSON.stringify({
            apiVersion: "v1",
            charts: [],
            engine: { name: "Swiss Ephemeris", version: "test" },
            generatedAt: new Date(0).toISOString(),
            state: createDefaultChartState(),
            synastry: [],
          }),
          { headers: { "content-type": "application/json" } },
        ),
      );
    } as typeof fetch;
    try {
      const client = new ChartsClient({
        baseUrl: "https://charts.example.test",
      });
      await expect(
        client.calculate(createDefaultChartState()),
      ).resolves.toMatchObject({
        apiVersion: "v1",
      });
    } finally {
      globalThis.fetch = original;
    }
  });
});
