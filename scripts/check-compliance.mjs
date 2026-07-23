import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const failures = [];

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function json(relativePath) {
  return JSON.parse(read(relativePath));
}

function expect(condition, message) {
  if (!condition) failures.push(message);
}

const contracts = json("packages/contracts/package.json");
const client = json("packages/client/package.json");
const server = json("packages/server/package.json");
const web = json("packages/web/package.json");

expect(contracts.license === "Apache-2.0", "contracts must remain Apache-2.0");
expect(client.license === "Apache-2.0", "client must remain Apache-2.0");
expect(
  server.license === "AGPL-3.0-or-later",
  "server must remain AGPL-3.0-or-later",
);
expect(
  web.license === "AGPL-3.0-or-later",
  "web must remain AGPL-3.0-or-later",
);
expect(
  server.dependencies?.["swisseph-v2"],
  "server must declare the Swiss Ephemeris adapter",
);
expect(
  !client.dependencies?.["swisseph-v2"],
  "client must never depend on Swiss Ephemeris",
);
expect(
  !contracts.dependencies?.["swisseph-v2"],
  "contracts must never depend on Swiss Ephemeris",
);

const permissiveSource = [
  ...fs
    .readdirSync(path.join(root, "packages/client/src"))
    .map((file) => `packages/client/src/${file}`),
  ...fs
    .readdirSync(path.join(root, "packages/contracts/src"))
    .map((file) => `packages/contracts/src/${file}`),
]
  .filter((file) => /\.(?:ts|tsx)$/u.test(file))
  .map(read)
  .join("\n");
expect(
  !/from\s+["']swisseph-v2|require\(["']swisseph-v2/u.test(permissiveSource),
  "permissive packages must not import or wrap Swiss code",
);

const webSource = read("packages/web/src/App.tsx");
const serverSource = read("packages/server/src/server.ts");
expect(
  webSource.includes("View corresponding source"),
  "web UI must expose corresponding source",
);
expect(
  serverSource.includes('"cache-control", "no-store'),
  "chart API must remain no-store",
);
expect(
  serverSource.includes("sourceUrl"),
  "health metadata must expose a source URL",
);

for (const requiredFile of [
  "LICENSE",
  "LICENSING.md",
  "packages/client/LICENSE",
  "packages/contracts/LICENSE",
  "packages/server/LICENSE",
  "packages/server/NOTICE",
]) {
  expect(
    fs.existsSync(path.join(root, requiredFile)),
    `missing required licensing file: ${requiredFile}`,
  );
}

const allManifests = [contracts, client, server, web];
const forbiddenDependencies = [
  "better-auth",
  "next-auth",
  "passport",
  "prisma",
  "drizzle-orm",
  "mongoose",
  "socket.io",
  "twilio",
  "stream-chat",
];
for (const manifest of allManifests) {
  const dependencies = {
    ...manifest.dependencies,
    ...manifest.optionalDependencies,
  };
  for (const dependency of forbiddenDependencies) {
    expect(
      !dependencies[dependency],
      `${manifest.name} must not add product dependency ${dependency}`,
    );
  }
}

if (failures.length) {
  process.stderr.write(
    `Compliance gate failed:\n${failures.map((failure) => `- ${failure}`).join("\n")}\n`,
  );
  process.exit(1);
}

process.stdout.write(
  "Compliance gate passed: the permissive client boundary is Swiss-free and the AGPL source offer is present.\n",
);
