# Phase 02 - OpenAPI Contract and API Shield

## Objective
Establish a contract-first API (`openapi.json`) and enforce request/response integrity using Cloudflare API Shield schema validation.

## Why
- OpenWebUI exposes a broad API surface; parity requires a stable, machine-readable contract.
- MCP and external tool integrations require reliable schemas for client generation.

## Current State
- A draft `docs/openapi.yaml` exists locally (untracked).
- No guaranteed route-to-spec sync or CI validation gate.

## Target Artifacts
- `public/openapi.json` (generated canonical spec)
- `docs/openapi.source.yaml` (human-maintained source)
- `scripts/validate_openapi.sh` (lint + semantic checks)
- CI gate: fail PR when spec and implementation drift

## Implementation Plan
### 1) Spec ownership
- Define `operationId` for each route.
- Standardize error schema:
  - `{ error: string, message: string, request_id?: string }`
- Document SSE endpoints with explicit `text/event-stream` responses.

### 2) Code-to-spec checks
- Add script that parses router path regex/strings and compares with OpenAPI paths.
- Required coverage threshold: 100% for `/api/*` production endpoints.

### 3) Publish and discoverability
- Serve `GET /openapi.json` from assets.
- Add `GET /api/meta` exposing version, commit SHA, and OpenAPI URL.

### 4) API Shield rollout
- Import OpenAPI v3 schema into API Shield for schema validation where feasible.
- Start in monitor mode, then enforce on high-risk routes (`/api/auth/*`, `/api/admin/*`).

## Notes on Versioning
- Keep OpenAPI at `3.0.x` for API Shield compatibility constraints.
- Use semantic API versioning by path (`/api/v1`) only when breaking changes are unavoidable.

## Acceptance Criteria
- `openapi.json` is generated in CI and deployed with app assets.
- Every non-streaming endpoint has request + response schemas.
- API Shield configured for key routes with alerting.

## Reference Sources
- OpenAPI Specification: https://spec.openapis.org/oas/latest.html
- Cloudflare API Shield schema validation: https://developers.cloudflare.com/api-shield/security/schema-validation/
