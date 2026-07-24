# Release QA checklist

Use synthetic chart data throughout. Record the commit, candidate version,
operator, date, OS, architecture, Node version, and pnpm version.

## 1. Automated gate

- [ ] Clean checkout installs with `pnpm install --frozen-lockfile`.
- [ ] `pnpm check` passes without retries or threshold overrides.
- [ ] Coverage meets the contract in `quality/contract.mjs`.
- [ ] Mutation score is at or above the break threshold.
- [ ] AGPL/client boundary compliance passes.
- [ ] The working tree is clean after the gate.

## 2. Chart behavior

- [ ] Calculate a natal chart from synthetic data.
- [ ] Add a second person and calculate comparison/synastry.
- [ ] Switch tropical/sidereal, house, node, point, and orb settings.
- [ ] Reload a copied share URL and compare all inputs/results.
- [ ] Open an older version-1 fixture URL.
- [ ] Confirm invalid date, time zone, latitude, longitude, and duplicate IDs
      produce useful errors.

## 3. Privacy and HTTP

- [ ] Chart and ephemeris responses include `Cache-Control: no-store`.
- [ ] Request bodies and share-query strings are absent from application,
      reverse-proxy, CDN, and error logs.
- [ ] Bodies over 256 kB are rejected.
- [ ] Disallowed CORS origins are rejected.
- [ ] Camera, microphone, and geolocation permissions are disabled.
- [ ] Health reports statelessness and the exact corresponding-source URL.

## 4. Accessibility and responsive UI

- [ ] Complete the builder using only a keyboard.
- [ ] Verify visible focus, labels, validation, status announcements, and skip
      link.
- [ ] Inspect the SVG chart and detailed table with VoiceOver or NVDA.
- [ ] Check 200% zoom and 320 px width without horizontal page overflow.
- [ ] Check desktop Chromium, Firefox, and Safari.
- [ ] Check one physical iOS device and one physical Android device.
- [ ] Run automated WCAG 2.2 AA checks with zero serious/critical violations.

## 5. Performance

- [ ] Measure a cold production load on desktop and throttled mobile.
- [ ] LCP ≤ 2.5 s, CLS ≤ 0.1, and INP ≤ 200 ms at p75-equivalent conditions.
- [ ] No single main-thread task exceeds 500 ms during initial interaction.
- [ ] Record built JS/CSS sizes and investigate material regression.

## 6. Packaging and self-hosting

- [ ] Install the packed server artifact in an empty directory.
- [ ] Start it using the documented one-line pnpm command.
- [ ] Calculate a real Sun/Moon position through the packaged API.
- [ ] Start the production container with the documented compose file.
- [ ] Verify loopback-only binding and HTTPS reverse-proxy behavior.
- [ ] Confirm the package includes license, notice, source offer, and web assets.

## 7. Release

- [ ] Tag and artifact versions agree.
- [ ] Changelog and migration notes are complete.
- [ ] Required CI is green on the exact commit.
- [ ] The live health response points to the exact tag, not a moving branch.
- [ ] A live chart calculation succeeds after deployment.
- [ ] GitHub release artifacts and checksums are published.
