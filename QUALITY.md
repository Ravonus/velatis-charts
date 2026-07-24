# Quality policy

Velatis Charts treats correctness, privacy, compatibility, accessibility, and
licensing as release behavior—not optional documentation.

The machine-readable thresholds live in
[`quality/contract.mjs`](./quality/contract.mjs). Configuration files import
that contract so the documented and executable gates cannot silently diverge.

## Commands

| Command                | Purpose                                                    |
| ---------------------- | ---------------------------------------------------------- |
| `pnpm quality:fast`    | Formatting, lint, types, unit tests, and acceptance tests  |
| `pnpm test:coverage`   | Unit tests plus V8 statement/branch/function/line coverage |
| `pnpm test:acceptance` | Production build plus executable Cucumber scenarios        |
| `pnpm test:mutation`   | Stryker mutations against the URL/client boundary          |
| `pnpm compliance`      | License/package-boundary and corresponding-source checks   |
| `pnpm check`           | Complete pull-request and release gate                     |

## Automated thresholds

### Coverage

The release-critical client, contract, server, and engine sources must meet:

| Metric     | Minimum |
| ---------- | ------: |
| Statements |     85% |
| Branches   |     80% |
| Functions  |     85% |
| Lines      |     85% |

Coverage is evidence that code executed, not proof that assertions were useful.
The mutation gate addresses that second question.

### Mutation

Stryker starts with the portable URL/client boundary because a surviving mutant
there can corrupt links or integration behavior without crashing.

| Mutation score | Meaning            |
| -------------- | ------------------ |
| 80%+           | Healthy            |
| 70–79.99%      | Review and improve |
| Below 65%      | Release fails      |

Mutation scope expands only when it can remain deterministic and complete in
normal CI. Do not run an unbounded whole-engine mutation job that routinely
times out and teaches contributors to ignore it.

### Defects and accessibility

A release may have:

- zero blocker defects;
- zero critical defects;
- zero serious or critical automated accessibility violations;
- zero known silent chart-state corruption;
- zero known request-body or share-query logging.

## Gherkin acceptance rules

Acceptance features live in `tests/acceptance/features`. Every file:

- uses domain language rather than implementation selectors;
- carries `@acceptance` plus relevant risk tags;
- uses synthetic data;
- has executable step definitions;
- cannot contain `@only` or `@wip` in a release branch.

Gherkin covers stable user/product contracts. It does not replace focused unit
tests or become a verbose wrapper around every function.

## Test layers

1. **Static:** formatting, ESLint, TypeScript, package/compliance boundaries.
2. **Unit:** codec, validation, engine, operations, and presentation helpers.
3. **HTTP integration:** real server, native engine, limits, headers, errors.
4. **Acceptance:** portable URLs, comparison, and stateless calculation.
5. **Mutation:** assertion strength at high-risk decision boundaries.
6. **Manual/release:** real browsers, screen readers, packaging, self-hosting,
   and corresponding-source proof.

## Flaky-test policy

Retries are diagnostic only. A test that passes only after a retry is not green.
Quarantine requires an issue, owner, reason, expiry date, and replacement
coverage. Random astronomical fixtures are forbidden unless their seed is
printed and replayable.

## Release evidence

Follow [`docs/qa/release-checklist.md`](./docs/qa/release-checklist.md).
Record:

- commit/tag;
- Node, pnpm, OS, and architecture;
- `pnpm check` result;
- coverage summary;
- mutation score;
- manual browser/accessibility results;
- package/container smoke proof;
- exact corresponding-source URL.

Keep generated HTML/JSON reports as CI artifacts. Do not commit large generated
coverage or mutation directories.
