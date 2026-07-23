#!/usr/bin/env node
import { listen } from "./server.js";

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function help(): void {
  process.stdout.write(`Velatis Charts

Usage:
  velatis-charts serve [--host 127.0.0.1] [--port 4321]

Environment:
  HOST                              Listening interface
  PORT                              Listening port
  VELATIS_CHARTS_ALLOWED_ORIGINS    Comma-separated CORS allowlist
  VELATIS_CHARTS_SOURCE_URL         Public source-code URL shown by the API

This server is stateless. It has no database, accounts, tracking, chat, video,
or storage. Birth data is accepted only for the current calculation request.
`);
}

const command = process.argv[2] ?? "serve";
if (command === "--help" || command === "-h" || command === "help") {
  help();
  process.exit(0);
}
if (command !== "serve") {
  help();
  process.exitCode = 1;
} else {
  const host = argument("--host") ?? process.env.HOST ?? "127.0.0.1";
  const port = Number(argument("--port") ?? process.env.PORT ?? 4321);
  if (!Number.isInteger(port) || port < 1 || port > 65_535)
    throw new TypeError("port must be an integer from 1-65535");
  const allowedOrigins = (process.env.VELATIS_CHARTS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  await listen({
    host,
    port,
    allowedOrigins,
    sourceUrl: process.env.VELATIS_CHARTS_SOURCE_URL,
  });
  process.stdout.write(
    `Velatis Charts is listening on http://${host}:${port}\n`,
  );
}
