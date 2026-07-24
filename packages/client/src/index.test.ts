import { describe, expect, it, vi } from "vitest";
import {
  ChartsApiError,
  ChartsClient,
  buildEmbedUrl,
  buildShareUrl,
  createDefaultChartState,
  decodeChartState,
  encodeChartState,
  readChartStateFromUrl,
} from "./index.js";

describe("chart URL state", () => {
  it("round trips Unicode names and canonicalizes object keys", () => {
    const first = createDefaultChartState({
      name: "A௿",
      timeZone: "America/Denver",
    });
    first.extensions = {
      "test.example.order": { zebra: 1, alpha: { delta: 4, beta: 2 } },
    };
    const second = structuredClone(first);
    second.extensions = {
      "test.example.order": { alpha: { beta: 2, delta: 4 }, zebra: 1 },
    };
    const encoded = encodeChartState(first);
    expect(encoded).toContain("-");
    expect(encoded).toContain("_");
    expect(encoded).not.toContain("=");
    expect(decodeChartState(encoded)).toEqual(first);
    expect(encodeChartState(second)).toBe(encoded);
  });

  it.each(["A", "AB", "ABC", "Aÿ"])(
    "round trips base64 padding boundary for %s",
    (name) => {
      const state = createDefaultChartState({ name });
      expect(decodeChartState(encodeChartState(state))).toEqual(state);
    },
  );

  it("builds a shareable URL without network or storage", () => {
    const url = buildShareUrl(
      "https://charts.example.test/read",
      createDefaultChartState(),
    );
    expect(url.origin).toBe("https://charts.example.test");
    expect(url.searchParams.get("chart")).toBeTruthy();
    expect(readChartStateFromUrl(url)).toEqual(createDefaultChartState());
    expect(readChartStateFromUrl("https://charts.example.test")).toBeNull();
  });

  it("builds compact and transparent embed URLs", () => {
    const state = createDefaultChartState();
    const url = buildEmbedUrl("https://charts.example.test", state, {
      compact: true,
      transparent: true,
    });
    expect(url.searchParams.get("embed")).toBe("1");
    expect(url.searchParams.get("compact")).toBe("1");
    expect(url.searchParams.get("transparent")).toBe("1");

    const client = new ChartsClient({ baseUrl: url.origin });
    expect(client.shareUrl(state).searchParams.has("chart")).toBe(true);
    expect(client.embedUrl(state).searchParams.get("embed")).toBe("1");
    expect(client.embedUrl(state).searchParams.get("compact")).toBeNull();
    expect(client.embedUrl(state).searchParams.get("transparent")).toBeNull();
  });

  it("rejects oversized and invalid encoded state", () => {
    expect(() => decodeChartState("x".repeat(80_001))).toThrow(
      "Encoded chart state is too large",
    );
    let boundaryError: unknown;
    try {
      decodeChartState("x".repeat(80_000));
    } catch (error) {
      boundaryError = error;
    }
    expect(boundaryError).toBeInstanceOf(Error);
    expect((boundaryError as Error).message).not.toBe(
      "Encoded chart state is too large",
    );
    const invalid = globalThis
      .btoa(JSON.stringify({ version: 99 }))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replace(/=+$/u, "");
    expect(() => decodeChartState(invalid)).toThrow(
      "Unsupported chart state version",
    );
  });

  it("retains the global fetch receiver when no custom implementation is passed", async () => {
    const original = globalThis.fetch;
    const receiver = globalThis;
    globalThis.fetch = function (
      this: typeof globalThis,
      input: string | URL | Request,
      init?: RequestInit,
    ) {
      if (this !== receiver) throw new TypeError("Illegal invocation");
      expect(new URL(String(input)).pathname).toBe("/api/v1/charts");
      expect(init?.method).toBe("POST");
      expect(init?.cache).toBe("no-store");
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
        expect(init?.method).toBe("POST");
        expect(init?.cache).toBe("no-store");
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

  it.each(["calculate", "ephemeris"] as const)(
    "surfaces typed API errors from %s",
    async (method) => {
      const client = new ChartsClient({
        baseUrl: "https://charts.example.test",
        headers: { "x-test-client": "quality" },
        fetch: async (_input, init) => {
          expect(init?.headers).toMatchObject({
            "content-type": "application/json",
            "x-test-client": "quality",
          });
          return new Response(
            JSON.stringify({
              error: { code: "invalid_synthetic_input", message: "Nope" },
            }),
            { status: 400, headers: { "content-type": "application/json" } },
          );
        },
      });
      const operation =
        method === "calculate"
          ? client.calculate(createDefaultChartState())
          : client.ephemeris("positions", { samples: [] });
      const error = await operation.catch((reason: unknown) => reason);
      expect(error).toBeInstanceOf(ChartsApiError);
      expect(error).toMatchObject({
        name: "ChartsApiError",
        status: 400,
        code: "invalid_synthetic_input",
        message: "Nope",
      });
    },
  );
});
