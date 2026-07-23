import { afterEach, describe, expect, it } from "vitest";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import { listen } from "./server.js";

let server: Server | undefined;

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server?.close((error) => (error ? reject(error) : resolve()));
  });
  server = undefined;
});

describe("ephemeris HTTP API", () => {
  it("serves a real stateless calculation with a versioned envelope", async () => {
    server = await listen({ port: 0 });
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/ephemeris`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        operation: "positions",
        input: {
          samples: [{ julianDay: 2_461_231, bodyIds: [0, 1] }],
        },
      }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      apiVersion: "v1",
      operation: "positions",
      engine: { name: "Swiss Ephemeris" },
      result: [
        {
          julianDay: 2_461_231,
          positions: [
            { bodyId: 0, longitude: expect.any(Number) },
            { bodyId: 1, longitude: expect.any(Number) },
          ],
        },
      ],
    });
  });

  it("rejects unsupported operations without retaining the request", async () => {
    server = await listen({ port: 0 });
    const { port } = server.address() as AddressInfo;
    const response = await fetch(`http://127.0.0.1:${port}/api/v1/ephemeris`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ operation: "not-real", input: {} }),
    });

    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "invalid_ephemeris_operation" },
    });
  });
});
