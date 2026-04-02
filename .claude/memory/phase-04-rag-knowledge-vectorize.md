# Phase 04 - RAG and Knowledge Parity with Vectorize

Note: This has been deprecated ....

## Objective
Close retrieval and knowledge-management gaps using R2 + extraction + Vectorize + citations pipeline.

## Current State
- File upload/extraction path exists (`src/routers/files.js`, `src/services/extraction.js`).
- Knowledge base APIs exist (`src/routers/knowledge.js`).
- Memory semantic query endpoint is placeholder (`src/routers/memories.js`).

## Target State
### End-to-end retrieval pipeline
1. Upload files to R2.
2. Extract structured text chunks.
3. Embed chunks (Workers AI or provider embedding endpoint).
4. Upsert vectors into Vectorize with metadata filters.
5. Query vectors per chat context and user scope.
6. Inject top-k passages into model context with explicit citations.

### Data model upgrades
- `documents`: add `source_type`, `version`, `checksum`, `visibility_scope`
- `document_chunks`: add `token_count`, `chunk_hash`, `section_title`
- `retrieval_runs`: query trace table for audit/debug/cost reporting

### Retrieval quality controls
- Hybrid retrieval option (keyword prefilter + vector similarity)
- Per-tenant and per-knowledge-base filtering
- Reciprocal reranking (basic) before prompt injection
- Hard token budget for context packing

## Feature Parity Mapping
- OpenWebUI multiple vector backends -> GrowChat standardizes on Vectorize
- OpenWebUI multiple extractors -> GrowChat extraction adapters with worker-safe defaults
- OpenWebUI doc library + in-chat references -> GrowChat `knowledge_bases` + citation payloads

## Missing Work
- Implement semantic query in memories endpoint.
- Normalize citation format across chat responses.
- Add admin reindex job observability and failure drill-down.

## Acceptance Criteria
- Querying knowledge base returns stable, scoped citations.
- Reindex jobs are resumable and recoverable.
- Retrieval latency and top-k relevance meet defined SLOs.

## Reference Sources
- Cloudflare Vectorize: https://developers.cloudflare.com/vectorize/
- Cloudflare R2: https://developers.cloudflare.com/r2/
- Cloudflare D1: https://developers.cloudflare.com/d1/
