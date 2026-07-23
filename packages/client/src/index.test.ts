import { describe, expect, it, vi } from "vitest";
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

  it("calls the open ephemeris API without importing its implementation", async () => {
    const fetchImplementation = vi.fn(
      async (input: string | URL | Request, init?: RequestInit) => {
        expect(new URL(String(input)).pathname).toBe("/api/v1/ephemeris");
        expect(JSON.parse(String(init?.body))).toEqual({
          operation: "positions",
          input: {
            samples: [{ julianDay: 2_461_231, bodyIds: [0] }],
          },
        });
        return new Response(
          JSON.stringify({
            apiVersion: "v1",
            operation: "positions",
            engine: { name: "Swiss Ephemeris", version: "test" },
            result: [{ positions: [{ bodyId: 0, longitude: 107.5 }] }],
          }),
          {
            headers: { "content-type": "application/json" },
          },
        );
      },
    );
    const client = new ChartsClient({
      baseUrl: "https://charts.example.test",
      fetch: fetchImplementation as typeof fetch,
    });

    await expect(
      client.ephemeris("positions", {
        samples: [{ julianDay: 2_461_231, bodyIds: [0] }],
      }),
    ).resolves.toEqual([{ positions: [{ bodyId: 0, longitude: 107.5 }] }]);
    expect(fetchImplementation).toHaveBeenCalledOnce();
  });
});
