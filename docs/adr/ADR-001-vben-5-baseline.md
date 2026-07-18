# ADR-001: Vben 5 reference baseline

## Status

Accepted.

## Decision

The Web platform follows Vue Vben Admin `v5.7.0` as the upstream architecture and UI capability reference. Runtime requirements remain Node `22.18+` or `24` and pnpm `11.7.0`.

The MOM repository owns its application names, business routes, domain packages, API contracts, prototypes, and design system. Complete upstream demo applications are not copied blindly. Any imported Vben source must record its original path, tag, license, and MOM modifications.
