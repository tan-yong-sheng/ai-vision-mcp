# Phase 00 - OpenWebUI Gap Map and Cloudflare Replacement Strategy

## Objective
Define a concrete parity roadmap to close the highest-value product gaps between OpenWebUI and GrowChat while staying native to Cloudflare Workers.

## Current GrowChat Baseline (from repository)
- Runtime: Cloudflare Workers (`src/index.js`)
- Data: D1 (SQLite), KV, R2, Vectorize, Durable Objects (configured in `wrangler.jsonc`)
- LLM routing: Workers AI + OpenAI-compatible endpoints (`src/llm.js`, `src/routers/models.js`)
- Realtime: SSE stream endpoint with Durable Object fan-out (`src/routers/realtime.js`)
- Existing features: auth, chats, share/archive, folders, prompts, files, knowledge bases, memories, admin stats

## OpenWebUI Capability Domains (baseline target)
Derived from OpenWebUI README and backend surface in `open-webui/`.
- Multi-model chat and providers
- Tooling/plugins/pipelines extensibility
- RAG and document ingestion
- Fine-grained RBAC + enterprise identity
- Realtime collaboration and scale-out
- Admin/analytics/operations
- Voice/video and multimodal interactions

## Tech Stack Replacement Matrix (OpenWebUI -> GrowChat on Cloudflare)
| OpenWebUI stack/feature | GrowChat Cloudflare replacement | Notes |
|---|---|---|
| Python FastAPI backend | Cloudflare Workers module worker | Single edge runtime, no VM/server management |
| SQLAlchemy + SQLite/Postgres | D1 (SQLite semantics, serverless) | Keep schema simple, append-only migrations |
| Redis session/cache/bus | KV + Durable Objects + Queues | KV for token/session material, DO for coordination, Queues for async workloads |
| S3/GCS/Azure Blob | R2 | Native object storage with Worker bindings |
| Chroma/PGVector/Qdrant/etc | Vectorize | Single managed vector DB for semantic retrieval |
| WebSocket-heavy realtime | SSE-first transport + optional DO WebSockets internally | Product contract stays SSE for browser simplicity and edge compatibility |
| Python tools/pipelines execution | HTTP tools + MCP servers + Worker-safe adapters | No arbitrary Python runtime in Worker |
| SCIM/LDAP/AD middleware stack | Cloudflare Access/JWT claims + app RBAC in D1 | Enterprise parity via edge identity + local role model |
| OpenAPI docs tooling in Python | Static/generated `openapi.json` served by Worker + API Shield validation | Contract-first APIs and external validation |

## Gap Inventory and Priority
### P0 (Must close for functional parity)
- RBAC hardening and scoped permissions (beyond admin/non-admin)
- Stable API contract and `openapi.json` publication
- MCP Streamable HTTP endpoint support for tool ecosystem
- End-to-end RAG flow (upload -> extract -> embed -> retrieve -> cite)
- Auditable admin user/session management

### P1 (High value)
- Async indexing/processing with robust queue semantics and retries
- Model governance (allowlist, per-role model access, quotas)
- Usage analytics and cost controls
- Prompt/template governance with approval workflow

### P2 (Selective parity)
- Shared workspaces/teams model
- Rich import/export compatibility
- Advanced retrieval options (hybrid retrieval, rerank)

### P3 (Optional)
- Advanced collaboration semantics (co-editing, live cursors)
- Native plugin marketplace equivalent

## Delivery Architecture Principles
- Edge-first, stateless request handlers; state coordination via D1 + DO.
- Contract-first APIs with OpenAPI as source of truth.
- Explicit consistency model: D1 is system of record, Vectorize is derived index.
- Backpressure and async processing by design; avoid synchronous heavy pipelines on request path.
- Security defaults: deny-by-default RBAC, scoped tokens, origin checks for MCP HTTP transports.

## Out-of-Scope for Immediate Parity
- Direct in-process Python code execution inside GrowChat Worker.
- Full OpenWebUI deployment model parity (Docker/K8s self-hosting stack).
- One-to-one replication of every provider integration in first wave.

## Deliverables in This Plan Set
- `phase-01-rbac-and-user-governance.md`
- `phase-02-openapi-contract-and-api-shield.md`
- `phase-03-mcp-streamable-http.md`
- `phase-04-rag-knowledge-vectorize.md`
- `phase-05-realtime-and-collaboration-transport.md`
- `phase-06-tools-extensions-and-pipelines.md`
- `phase-07-observability-ops-and-release.md`
- `phase-08-non-goals-and-discard-list.md`

## Reference Sources
- OpenWebUI README: `open-webui/README.md`
- Cloudflare D1: https://developers.cloudflare.com/d1/
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Cloudflare Vectorize: https://developers.cloudflare.com/vectorize/
- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/
- Cloudflare Queues: https://developers.cloudflare.com/queues/
