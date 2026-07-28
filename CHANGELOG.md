# Changelog

All notable changes are documented here. The project follows Semantic
Versioning for published packages while it is in `0.x`; minor versions may
contain additive API evolution, but versioned share URLs remain readable.

## [Unreleased]

## [0.2.1] - 2026-07-28

### Added

- Interactive wheel: hovering or keyboard-focusing a planet spotlights every
  aspect line touching it; clicking opens a centred detail dialog with
  position, house, speed, and the planet's aspects sorted by orb.
- True synastry bi-wheel for a pair: per-person ring guides and legend, and
  the cross-chart aspect lines drawn between the rings.
- Display toggles above the wheel: Degrees, Inner aspects, and Bond lines.
- Per-planet colour shading on discs and glyphs; entrance and line-draw
  animations that collapse under prefers-reduced-motion.
- Executable Cucumber acceptance scenarios for natal URLs, comparison URLs, and
  stateless calculation.
- V8 coverage thresholds and Stryker mutation testing.
- Unified quality policy, release checklist, contributor templates, and CI
  report artifacts.
- Production screenshots using synthetic chart data.

### Changed

- Expanded README, contribution, conduct, and self-hosting guidance.
- Added ESLint and a machine-checked quality contract.

### Fixed

- The planet dialog renders through a body portal so the result panel's
  backdrop-filter cannot re-anchor it into the scroll flow.
- The server package's bundled web app is rebuilt from source at build time
  (it had shipped a stale copy predating the interactive wheel).

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
