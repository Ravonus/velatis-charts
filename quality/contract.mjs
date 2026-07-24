export const qualityContract = Object.freeze({
  version: 1,
  coverage: Object.freeze({
    branches: 80,
    functions: 85,
    lines: 85,
    statements: 85,
  }),
  mutation: Object.freeze({
    high: 80,
    low: 70,
    break: 65,
  }),
  acceptance: Object.freeze({
    requiredTag: "@acceptance",
    forbiddenTags: Object.freeze(["@only", "@wip"]),
  }),
  defects: Object.freeze({
    blocker: 0,
    critical: 0,
    seriousAccessibility: 0,
  }),
});
