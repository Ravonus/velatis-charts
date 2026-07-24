import { defineConfig } from "vitest/config";
import { qualityContract } from "./quality/contract.mjs";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      include: [
        "packages/client/src/index.ts",
        "packages/contracts/src/index.ts",
        "packages/server/src/engine.ts",
        "packages/server/src/operations.ts",
        "packages/server/src/server.ts",
      ],
      exclude: ["**/*.test.ts"],
      reporter: ["text", "json-summary", "html"],
      reportsDirectory: "coverage",
      thresholds: qualityContract.coverage,
    },
  },
});
