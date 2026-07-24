# Changelog

All notable changes are documented here. The project follows Semantic
Versioning for published packages while it is in `0.x`; minor versions may
contain additive API evolution, but versioned share URLs remain readable.

## [Unreleased]

### Added

- Executable Cucumber acceptance scenarios for natal URLs, comparison URLs, and
  stateless calculation.
- V8 coverage thresholds and Stryker mutation testing.
- Unified quality policy, release checklist, contributor templates, and CI
  report artifacts.
- Production screenshots using synthetic chart data.

### Changed

- Expanded README, contribution, conduct, and self-hosting guidance.
- Added ESLint and a machine-checked quality contract.

## [0.2.0] - 2026-07-23

### Added

- Open-ended `POST /api/v1/ephemeris` operations for chart frames, positions,
  crossings, eclipses, rise/set events, and fixed stars.
- Released Apache-2.0 client and contracts artifacts.
- Production container and reverse-proxy examples.
- Exact corresponding-source metadata in health responses.

### Changed

- Established the separately operated AGPL server as the Swiss Ephemeris
  boundary for downstream applications.

## [0.1.0] - 2026-07-23

### Added

- Stateless natal and multi-person chart calculation.
- Version-1 share URL contract.
- Accessible SVG chart wheel and detailed text tables.
- AGPL server/web and Apache client/contracts package split.

[Unreleased]: https://github.com/Ravonus/velatis-charts/compare/v0.2.0...HEAD
[0.2.0]: https://github.com/Ravonus/velatis-charts/releases/tag/v0.2.0
[0.1.0]: https://github.com/Ravonus/velatis-charts/releases/tag/v0.1.0
