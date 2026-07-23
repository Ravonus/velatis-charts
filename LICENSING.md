# Licensing and distribution

This repository uses a deliberate mixed-license architecture.

## Chart server and web application

`packages/server` and `packages/web` are licensed under
AGPL-3.0-or-later. The server uses Swiss Ephemeris through `swisseph-v2`.
Operators who modify or provide the AGPL application over a network are
responsible for satisfying the AGPL corresponding-source requirements,
including the complete corresponding source for their running version.

The public source link in the web UI and health response points to this
repository by default. Set `VELATIS_CHARTS_SOURCE_URL` to the exact source for
your deployed version when operating a modified build.

Swiss Ephemeris itself is distributed by Astrodienst under its own dual-license
terms. Review the current official terms before redistribution:
<https://www.astro.com/swisseph/sweph_g.htm>.

## Client and contracts

`packages/client` and `packages/contracts` are separately licensed under
Apache-2.0. They contain no Swiss Ephemeris code and do not calculate charts.
They let open or proprietary applications communicate with the chart server at
an arm's-length HTTP/URL boundary.

Combining packages differently can change the legal analysis. In particular,
do not bundle or link the AGPL server package into a closed-source program.

This document describes the project architecture; it is not legal advice.
