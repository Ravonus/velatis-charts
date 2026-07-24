import { qualityContract } from "./quality/contract.mjs";

export default {
  $schema: "./node_modules/@stryker-mutator/core/schema/stryker-schema.json",
  mutate: ["packages/client/src/index.ts"],
  testRunner: "vitest",
  plugins: ["@stryker-mutator/vitest-runner"],
  vitest: {
    configFile: "vitest.config.ts",
    related: true,
  },
  thresholds: qualityContract.mutation,
  reporters: ["clear-text", "progress", "html", "json"],
  htmlReporter: {
    fileName: "reports/mutation/index.html",
  },
  jsonReporter: {
    fileName: "reports/mutation/mutation.json",
  },
  tempDirName: ".stryker-tmp",
  cleanTempDir: true,
  concurrency: 4,
};
