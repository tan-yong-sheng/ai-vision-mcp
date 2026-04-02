# Phase 05 - Realtime and Collaboration Transport

## Objective
Deliver reliable realtime UX while keeping a transport model compatible with Cloudflare edge constraints and current frontend architecture.

## Current State
- GrowChat uses SSE to stream model tokens and realtime events.
- Durable Object hub is already in place for fan-out (`src/routers/realtime.js`).

## Decision: SSE-first Product Contract
- Keep browser client contract on SSE.
- Avoid mandatory WebSocket adoption in product API for now.

## Why SSE-first
- Simpler auth and reconnection model for existing frontend.
- Aligns with current incremental message stream handling.
- Works well with MCP optional SSE path and HTTP semantics.

## What We Discard (for now)
- Full OpenWebUI-style WebSocket-centric state sync.
- Bi-directional browser socket protocol as default transport.

## Important Nuance
- Cloudflare Durable Objects can support WebSockets and hibernation.
- We still keep SSE as official external contract to minimize complexity and maintain deterministic server behavior.

## Enhancements in this phase
- Add event IDs and resumable stream semantics (`Last-Event-ID`).
- Unified event envelope for chat, folder, prompt, and knowledge updates.
- Backpressure controls and rate limits per user/session.
- Explicit heartbeat and idle timeout policies.

## Acceptance Criteria
- Reconnect does not duplicate events.
- Session fan-out remains isolated per user tenant.
- Realtime failures never block core CRUD endpoints.

## Reference Sources
- Cloudflare Durable Objects: https://developers.cloudflare.com/durable-objects/
- MCP Streamable HTTP + SSE semantics: https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
