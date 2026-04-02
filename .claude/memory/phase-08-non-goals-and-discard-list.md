# Phase 08 - Non-Goals and Explicit Discard List

## Purpose
Prevent roadmap drift by explicitly documenting what will not be replicated one-to-one from OpenWebUI under current GrowChat constraints.

## Non-Goals (Current Program)
1. Full infrastructure parity with OpenWebUI self-hosted Python stack.
2. Arbitrary Python runtime/plugin execution in backend request path.
3. Full provider-matrix parity (all STT/TTS/image/search providers) in initial milestones.
4. WebSocket-first public API parity.
5. LDAP/SCIM enterprise parity in first delivery wave.

## Explicit Discards and Replacements
### Discard: WebSocket-first client protocol
- OpenWebUI pattern: Redis/WebSocket-heavy horizontal sync.
- GrowChat replacement: SSE-first external protocol + Durable Object coordination.

### Discard: Native Python tools execution
- OpenWebUI pattern: Python function workspace.
- GrowChat replacement: JS/TS tool adapters + MCP/HTTP tool bridge.

### Discard: Multi-vector-DB support matrix
- OpenWebUI pattern: many selectable vector backends.
- GrowChat replacement: standardize on Vectorize for operational simplicity.

### Discard: Heterogeneous storage backend matrix (S3/GCS/Azure)
- OpenWebUI pattern: pluggable cloud storage backends.
- GrowChat replacement: R2 as canonical object store.

### Discard: Heavy in-process background workers
- OpenWebUI pattern: server-local task execution patterns.
- GrowChat replacement: Cloudflare Queues + Durable Objects + `waitUntil` for bounded async.

## Deferred (Not discarded)
- Enterprise identity federation (via Cloudflare Access + custom claims mapping)
- Team/workspace RBAC model
- Advanced multimodal features

## Guardrails
- Any feature request that violates these constraints must include a platform-impact RFC.
- If RFC is rejected, feature must be redesigned to fit existing edge-native architecture.

## Success Condition
The product reaches practical parity for chat, RAG, admin governance, tool invocation, and API interoperability without reproducing incompatible infrastructure assumptions.
