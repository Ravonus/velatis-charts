import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { qualityContract } from "../quality/contract.mjs";

const root = process.cwd();
const requiredScripts = [
  "lint",
  "quality",
  "test:acceptance",
  "test:coverage",
  "test:mutation",
];
const requiredFiles = [
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "QUALITY.md",
  "SECURITY.md",
  "SUPPORT.md",
  "tests/acceptance/features/chart-sharing.feature",
];

async function featureFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await featureFiles(absolute)));
    if (entry.isFile() && entry.name.endsWith(".feature")) files.push(absolute);
  }
  return files;
}

const failures = [];
const packageJson = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);

for (const script of requiredScripts) {
  if (!packageJson.scripts?.[script])
    failures.push(`Missing script: ${script}`);
}

for (const file of requiredFiles) {
  try {
    await readFile(path.join(root, file), "utf8");
  } catch {
    failures.push(`Missing quality file: ${file}`);
  }
}

const features = await featureFiles(
  path.join(root, "tests/acceptance/features"),
);
for (const feature of features) {
  const source = await readFile(feature, "utf8");
  const relative = path.relative(root, feature);
  if (!source.includes(qualityContract.acceptance.requiredTag)) {
    failures.push(
      `${relative} must include ${qualityContract.acceptance.requiredTag}`,
    );
  }
  if (!/^\s*Feature:/mu.test(source)) {
    failures.push(`${relative} has no Feature`);
  }
  if (!/^\s*Scenario(?: Outline)?:/mu.test(source)) {
    failures.push(`${relative} has no Scenario`);
  }
  for (const tag of qualityContract.acceptance.forbiddenTags) {
    if (source.includes(tag)) failures.push(`${relative} contains ${tag}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) console.error(`Quality contract: ${failure}`);
  process.exitCode = 1;
} else {
  console.warn(
    `Quality contract v${qualityContract.version} passed for ${features.length} feature file(s).`,
  );
}
