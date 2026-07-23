import { defineConfig } from "tsup";

export default defineConfig({
  clean: true,
  dts: {
    resolve: ["@velatis/charts-contracts"],
  },
  entry: ["src/index.ts"],
  format: ["esm"],
  sourcemap: true,
});
