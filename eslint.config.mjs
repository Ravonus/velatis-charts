import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

const nodeGlobals = {
  Buffer: "readonly",
  URL: "readonly",
  console: "readonly",
  fetch: "readonly",
  process: "readonly",
  setTimeout: "readonly",
};

const browserGlobals = {
  AbortSignal: "readonly",
  Headers: "readonly",
  Request: "readonly",
  Response: "readonly",
  TextDecoder: "readonly",
  TextEncoder: "readonly",
  URL: "readonly",
  crypto: "readonly",
  document: "readonly",
  fetch: "readonly",
  navigator: "readonly",
  structuredClone: "readonly",
  window: "readonly",
};

export default tseslint.config(
  {
    ignores: [
      "**/dist/**",
      "**/public/**",
      ".stryker-tmp/**",
      "coverage/**",
      "node_modules/**",
      "reports/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2023,
      globals: { ...nodeGlobals, ...browserGlobals },
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      complexity: ["error", 25],
      eqeqeq: ["error", "always"],
      "max-depth": ["error", 4],
      "max-lines-per-function": [
        "error",
        { max: 350, skipBlankLines: true, skipComments: true },
      ],
      "no-console": ["error", { allow: ["error", "warn"] }],
      "no-else-return": ["error", { allowElseIf: false }],
      "no-nested-ternary": "error",
      "prefer-const": "error",
    },
  },
  {
    files: ["packages/web/src/**/*.{ts,tsx}"],
    plugins: { "react-hooks": reactHooks },
    rules: {
      "react-hooks/exhaustive-deps": "error",
      "react-hooks/rules-of-hooks": "error",
    },
  },
  {
    files: ["**/*.test.ts", "tests/**/*.{js,mjs,ts}"],
    rules: {
      "max-lines-per-function": "off",
      "no-console": "off",
    },
  },
);
