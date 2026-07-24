# Governance

Velatis Charts is currently maintainer-led. The goal is transparent technical
decisions, a stable public contract, and a project that remains usable without
commercial services.

## Maintainer responsibilities

Maintainers:

- review issues and pull requests;
- protect the stateless charting scope and package/license boundary;
- require evidence for calculation, privacy, accessibility, and compatibility
  claims;
- publish signed-off releases and exact source links;
- enforce the code of conduct and security policy;
- disclose conflicts of interest that could affect a project decision.

## Decisions

Small implementation decisions happen in pull requests. Changes to the
versioned chart contract, package licensing, privacy model, supported engine, or
project scope require a public issue or discussion before implementation.

Maintainers seek practical consensus. If consensus is not available, the active
maintainers make and document a decision based on user impact, compatibility,
maintenance cost, licensing, and project purpose.

## Becoming a maintainer

Regular contributors may be invited after demonstrating:

- sustained respectful participation;
- sound reviews and reliable follow-through;
- care with synthetic data and privacy;
- understanding of the contract and license boundary;
- willingness to support releases and community maintenance.

Access follows least privilege and can be removed for inactivity, security
needs, or conduct/policy violations.

## Releases

At least one maintainer must verify the release checklist and exact CI commit.
No maintainer may publish around a failed required gate. Security releases may
use a private preparation branch, followed by coordinated disclosure and public
source at release time.

## Project independence

Velatis may fund or use the project, but the public packages, source, issue
history, and documented self-hosting path remain available without a private
Velatis account or service.
