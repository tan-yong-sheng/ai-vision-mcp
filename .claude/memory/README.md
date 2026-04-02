# GrowChat Parity Planning Memory

This folder contains a phased roadmap to close key feature and architecture gaps between OpenWebUI and GrowChat on Cloudflare.

## Files
- `phase-00-openwebui-gap-map.md`
- `phase-01-rbac-and-user-governance.md`
- `phase-02-openapi-contract-and-api-shield.md`
- `phase-03-mcp-streamable-http.md`
- `phase-04-rag-knowledge-vectorize.md`
- `phase-05-realtime-and-collaboration-transport.md`
- `phase-06-tools-extensions-and-pipelines.md`
- `phase-07-observability-ops-and-release.md`
- `phase-08-non-goals-and-discard-list.md`

## Intent
- Keep OpenWebUI-level product capability where it is feasible on Cloudflare.
- Replace incompatible backend assumptions (Python runtime, Redis/WebSocket-first) with Cloudflare-native equivalents.
- Maintain explicit non-goals to avoid accidental scope explosion.
