# ADR-002: Three-application monorepo

## Status

Accepted.

## Decision

Internal MOM, supplier portal, and customer portal remain separate deployable applications in one pnpm workspace. They share API, access-control, design-token, and domain-component packages but maintain independent routes, release artifacts, and OAuth client registrations.
