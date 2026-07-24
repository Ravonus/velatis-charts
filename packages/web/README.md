# `@velatis/charts-web`

The AGPL browser interface bundled by `@velatis/charts-server`.

It provides:

- a keyboard-accessible chart builder;
- natal and multi-person inputs;
- an SVG chart wheel;
- equivalent detailed position tables;
- deterministic share URLs;
- visible privacy and corresponding-source links.

The web package is not an independent published integration boundary.
Applications should use `@velatis/charts-client`; self-hosters should run
`@velatis/charts-server`.

Visible changes require synthetic-data screenshots plus keyboard, responsive,
automated accessibility, and screen-reader QA.
