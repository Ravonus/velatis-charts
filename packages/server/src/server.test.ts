import { afterEach, describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import type { AddressInfo } from "node:net";
import type { Server } from "node:http";
import path from "node:path";
import os from "node:os";
import { createDefaultChartState } from "@velatis/charts-contracts";
import { listen } from "./server.js";

let server: Server | undefined;
let temporaryDirectory: string | undefined;

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server?.close((error) => (error ? reject(error) : resolve()));
  });
  server = undefined;
  if (temporaryDirectory) {
    await rm(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

function serverUrl(): string {
  const { port } = server?.address() as AddressInfo;
  return `http://127.0.0.1:${port}`;
}

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

  it("reports exact source, statelessness, and privacy headers", async () => {
    server = await listen({
      port: 0,
      sourceUrl: "https://github.com/Ravonus/velatis-charts/tree/test",
    });
    const response = await fetch(`${serverUrl()}/api/v1/health`);
    expect(response.status).toBe(200);
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(response.headers.get("permissions-policy")).toContain("camera=()");
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      status: "ok",
      service: "velatis-charts",
      apiVersion: "v1",
      stateless: true,
      source: "https://github.com/Ravonus/velatis-charts/tree/test",
    });
  });

  it("calculates charts and rejects invalid or oversized bodies", async () => {
    server = await listen({ port: 0 });
    const valid = await fetch(`${serverUrl()}/api/v1/charts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(createDefaultChartState()),
    });
    expect(valid.status).toBe(200);
    await expect(valid.json()).resolves.toMatchObject({
      apiVersion: "v1",
      charts: [{ personName: "Chart 1" }],
    });

    const invalid = await fetch(`${serverUrl()}/api/v1/charts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    expect(invalid.status).toBe(400);
    await expect(invalid.json()).resolves.toMatchObject({
      error: { code: "invalid_chart_state" },
    });

    const oversized = await fetch(`${serverUrl()}/api/v1/charts`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(256_001) }),
    });
    expect(oversized.status).toBe(413);
    await expect(oversized.json()).resolves.toMatchObject({
      error: { code: "request_too_large" },
    });
  });

  it("enforces the configured browser origins", async () => {
    server = await listen({
      port: 0,
      allowedOrigins: ["https://allowed.example"],
    });
    const allowed = await fetch(`${serverUrl()}/api/v1/health`, {
      method: "OPTIONS",
      headers: { origin: "https://allowed.example" },
    });
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "https://allowed.example",
    );

    const rejected = await fetch(`${serverUrl()}/api/v1/health`, {
      method: "OPTIONS",
      headers: { origin: "https://rejected.example" },
    });
    expect(rejected.status).toBe(403);
  });

  it("supports an explicit wildcard CORS policy", async () => {
    server = await listen({ port: 0, allowedOrigins: ["*"] });
    const response = await fetch(`${serverUrl()}/api/v1/health`, {
      headers: { origin: "https://integrator.example" },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("access-control-allow-origin")).toBe(
      "https://integrator.example",
    );
  });

  it("serves immutable assets and falls back to the SPA", async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "velatis-charts-server-"),
    );
    await writeFile(
      path.join(temporaryDirectory, "index.html"),
      "<!doctype html><title>Test chart UI</title>",
    );
    await writeFile(
      path.join(temporaryDirectory, "asset.css"),
      "body{color:white}",
    );
    await writeFile(path.join(temporaryDirectory, "module.js"), "export{}");
    await writeFile(path.join(temporaryDirectory, "mark.svg"), "<svg></svg>");
    await writeFile(path.join(temporaryDirectory, "data.json"), "{}");
    await writeFile(path.join(temporaryDirectory, "binary.dat"), "test");
    server = await listen({
      port: 0,
      publicDirectory: temporaryDirectory,
    });

    const asset = await fetch(`${serverUrl()}/asset.css`);
    expect(asset.status).toBe(200);
    expect(asset.headers.get("content-type")).toContain("text/css");
    expect(asset.headers.get("cache-control")).toContain("immutable");

    for (const [file, contentType] of [
      ["module.js", "text/javascript"],
      ["mark.svg", "image/svg+xml"],
      ["data.json", "application/json"],
      ["binary.dat", "application/octet-stream"],
    ]) {
      const response = await fetch(`${serverUrl()}/${file}`);
      expect(response.headers.get("content-type")).toContain(contentType);
    }

    const index = await fetch(`${serverUrl()}/`);
    expect(index.headers.get("content-type")).toContain("text/html");

    const fallback = await fetch(`${serverUrl()}/portable/chart/url`);
    expect(fallback.status).toBe(200);
    expect(fallback.headers.get("cache-control")).toContain("no-store");
    await expect(fallback.text()).resolves.toContain("Test chart UI");
  });

  it("returns JSON 404 when no web build is present", async () => {
    temporaryDirectory = await mkdtemp(
      path.join(os.tmpdir(), "velatis-charts-empty-"),
    );
    server = await listen({
      port: 0,
      publicDirectory: temporaryDirectory,
    });
    const response = await fetch(`${serverUrl()}/missing`);
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: { code: "not_found", message: "Not found" },
    });
  });

  it("rejects oversized ephemeris requests", async () => {
    server = await listen({ port: 0 });
    const response = await fetch(`${serverUrl()}/api/v1/ephemeris`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ value: "x".repeat(256_001) }),
    });
    expect(response.status).toBe(413);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "request_too_large" },
    });
  });
});
