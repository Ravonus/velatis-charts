import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: {
    resolve: ["@velatis/charts-contracts"],
  },
  entry: ["src/index.ts", "src/cli.ts"],
  external: ["swisseph-v2"],
  format: ["esm"],
  sourcemap: true,
});
