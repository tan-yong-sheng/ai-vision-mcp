# Phase 07 - Observability, Operations, and Release Controls

## Objective
Achieve production-grade operations parity: measurable quality, safer releases, and incident traceability.

## Workstreams
### 1) Request tracing and auditability
- Correlate `request_id` across all router responses.
- Persist admin and tool actions into `audit_log`.
- Add privacy-safe structured logs (no secret/token leakage).

### 2) SLOs and dashboards
- SLO candidates:
  - p95 chat stream start latency
  - p95 retrieval latency
  - error rate for auth/admin/tool endpoints
- Publish dashboards and alert thresholds.

### 3) Queue and indexing operations
- DLQ monitoring with replay tooling.
- Reindex progress endpoints with percentile completion metrics.

### 4) Release discipline
- CI gates:
  - OpenAPI validation
  - contract drift checks
  - smoke/integration suite
- Staged rollout with feature flags per phase.

## Security and Compliance Controls
- Token rotation playbook and emergency revocation.
- Service-account credentials scoped by minimal permissions.
- API Shield schema validation for sensitive routes.

## Acceptance Criteria
- Every incident has sufficient trace/audit metadata to root cause.
- Rollbacks are documented and tested.
- Operational docs are current for on-call handoff.

## Reference Sources
- Cloudflare API Shield schema validation: https://developers.cloudflare.com/api-shield/security/schema-validation/
