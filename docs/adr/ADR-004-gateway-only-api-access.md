# ADR-004: Gateway-only API access

## Status

Accepted.

## Decision

Browser applications call MOM through the API Gateway only. They do not call IAM, MES, WMS, QMS, Integration Hub, or Traceability services directly.

The shared API client propagates correlation identifiers and supports OAuth 2.1/OIDC integration without exposing internal service addresses.
