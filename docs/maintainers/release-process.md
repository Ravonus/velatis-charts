# Maintainer release process

## Prepare

1. Confirm the intended version and compatibility impact.
2. Update package versions, lockfile, changelog, and migration notes.
3. Run `pnpm install --frozen-lockfile` in a clean checkout.
4. Run `pnpm check` and preserve coverage/mutation reports.
5. Complete `docs/qa/release-checklist.md`.
6. Pack every published package and smoke-test it from an empty directory.
7. Build and smoke-test the production container.

## Review

1. Open a release pull request with exact artifact names and checksums.
2. Verify client/contracts contain no Swiss Ephemeris or AGPL runtime code.
3. Verify server/web artifacts include required license, notice, and source
   metadata.
4. Require green CI on the exact release commit.

## Publish

1. Merge the reviewed release commit.
2. Create an annotated `vX.Y.Z` tag on that exact commit.
3. Publish packages from the tag, never from a dirty worktree.
4. Attach package tarballs, checksums, and container metadata to the GitHub
   release.
5. Set `VELATIS_CHARTS_SOURCE_URL` to the exact public tag for hosted instances.

## Verify

1. Install the public tarball using the README command.
2. Fetch `/api/v1/health` and verify the version/source metadata.
3. Execute a real `positions` request and a synthetic two-person chart.
4. Load the hosted builder and its share URL in a fresh browser.
5. Confirm the live service and published artifacts correspond to the tag.

If any verification fails, stop promotion, document the issue, and publish a
fixed version. Do not replace immutable release artifacts in place.
