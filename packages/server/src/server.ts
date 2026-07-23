import * as fs from "node:fs";
import * as http from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { calculateChartState } from "./engine.js";

const MAX_BODY_BYTES = 256_000;
const moduleDirectory = path.dirname(fileURLToPath(import.meta.url));
const defaultPublicDirectory = path.resolve(moduleDirectory, "../public");

export interface ChartsServerOptions {
  host?: string;
  port?: number;
  allowedOrigins?: string[];
  publicDirectory?: string;
  sourceUrl?: string;
}

function setCommonHeaders(response: ServerResponse): void {
  response.setHeader("x-content-type-options", "nosniff");
  response.setHeader("referrer-policy", "no-referrer");
  response.setHeader(
    "permissions-policy",
    "camera=(), microphone=(), geolocation=()",
  );
  response.setHeader("cross-origin-resource-policy", "same-site");
}

function writeJson(
  response: ServerResponse,
  status: number,
  body: unknown,
): void {
  response.statusCode = status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.setHeader("cache-control", "no-store, max-age=0");
  response.end(JSON.stringify(body));
}

async function readJson(request: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const chunk of request) {
    const buffer = Buffer.from(chunk);
    bytes += buffer.length;
    if (bytes > MAX_BODY_BYTES)
      throw new RangeError("Request body exceeds 256 kB");
    chunks.push(buffer);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function corsOrigin(
  request: IncomingMessage,
  allowedOrigins: string[],
): string | undefined {
  const origin = request.headers.origin;
  if (!origin) return undefined;
  return allowedOrigins.includes("*") || allowedOrigins.includes(origin)
    ? origin
    : undefined;
}

function contentType(file: string): string {
  if (file.endsWith(".html")) return "text/html; charset=utf-8";
  if (file.endsWith(".js")) return "text/javascript; charset=utf-8";
  if (file.endsWith(".css")) return "text/css; charset=utf-8";
  if (file.endsWith(".svg")) return "image/svg+xml";
  if (file.endsWith(".json")) return "application/json; charset=utf-8";
  return "application/octet-stream";
}

function serveAsset(
  response: ServerResponse,
  publicDirectory: string,
  requestPath: string,
): boolean {
  const normalized = path.posix
    .normalize(requestPath)
    .replace(/^(\.\.(\/|\\|$))+/u, "");
  const relative =
    normalized === "/" ? "index.html" : normalized.replace(/^\/+/u, "");
  const requestedFile = path.resolve(publicDirectory, relative);
  if (!requestedFile.startsWith(`${path.resolve(publicDirectory)}${path.sep}`))
    return false;
  const file =
    fs.existsSync(requestedFile) && fs.statSync(requestedFile).isFile()
      ? requestedFile
      : undefined;
  if (!file) return false;
  response.statusCode = 200;
  response.setHeader("content-type", contentType(file));
  response.setHeader(
    "cache-control",
    file.endsWith(".html") ? "no-store" : "public, max-age=31536000, immutable",
  );
  fs.createReadStream(file).pipe(response);
  return true;
}

export function createChartsServer(options: ChartsServerOptions = {}): Server {
  const allowedOrigins = options.allowedOrigins ?? [];
  const publicDirectory = options.publicDirectory ?? defaultPublicDirectory;
  const sourceUrl =
    options.sourceUrl ?? "https://github.com/Ravonus/velatis-charts";

  return http.createServer(async (request, response) => {
    setCommonHeaders(response);
    const origin = corsOrigin(request, allowedOrigins);
    if (origin) {
      response.setHeader("access-control-allow-origin", origin);
      response.setHeader("vary", "origin");
      response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
      response.setHeader("access-control-allow-headers", "content-type");
    }

    if (request.method === "OPTIONS") {
      response.statusCode = origin ? 204 : 403;
      response.end();
      return;
    }

    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname === "/api/v1/health" && request.method === "GET") {
      writeJson(response, 200, {
        status: "ok",
        service: "velatis-charts",
        apiVersion: "v1",
        stateless: true,
        source: sourceUrl,
      });
      return;
    }

    if (url.pathname === "/api/v1/charts" && request.method === "POST") {
      try {
        const state = await readJson(request);
        writeJson(response, 200, calculateChartState(state));
      } catch (error) {
        const tooLarge = error instanceof RangeError;
        writeJson(response, tooLarge ? 413 : 400, {
          error: {
            code: tooLarge ? "request_too_large" : "invalid_chart_state",
            message:
              error instanceof Error
                ? error.message
                : "Could not calculate the chart",
          },
        });
      }
      return;
    }

    if (request.method === "GET") {
      if (serveAsset(response, publicDirectory, url.pathname)) return;
      const indexFile = path.join(publicDirectory, "index.html");
      if (fs.existsSync(indexFile)) {
        response.statusCode = 200;
        response.setHeader("content-type", "text/html; charset=utf-8");
        response.setHeader("cache-control", "no-store");
        fs.createReadStream(indexFile).pipe(response);
        return;
      }
    }

    writeJson(response, 404, {
      error: { code: "not_found", message: "Not found" },
    });
  });
}

export async function listen(
  options: ChartsServerOptions = {},
): Promise<Server> {
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? 4321;
  const server = createChartsServer(options);
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });
  return server;
}
