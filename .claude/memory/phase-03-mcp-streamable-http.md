# Phase 03 - MCP Streamable HTTP Support

## Objective
Add first-class MCP server compatibility to GrowChat using Streamable HTTP transport with secure edge-native implementation.

## Why
- OpenWebUI ecosystem heavily leverages tools/plugins and external function endpoints.
- MCP is becoming the interoperability layer for tool servers and model clients.

## Transport Decision
- Implement MCP Streamable HTTP endpoints.
- Support optional SSE stream on GET per spec.
- Keep legacy internal SSE chat streaming separate from MCP protocol frames.

## Endpoint Plan
- `POST /mcp` -> JSON-RPC request/response over HTTP
- `GET /mcp` -> optional SSE stream for server notifications/events
- `POST /mcp/sessions/:id/resume` -> optional resumable stream control (if adopted)

## Security Requirements (non-negotiable)
- Validate `Origin` header for browser-facing MCP calls.
- Require auth (Bearer JWT or scoped PAT/service token).
- Enforce per-token scopes (e.g., `mcp.invoke`, `mcp.subscribe`).
- Strict request size limits and method allowlist.

## Cloudflare-Native Design
- Session coordination in Durable Objects (`MCP_SESSION_HUB`).
- Protocol event buffering in DO in-memory with optional durable cursor checkpoints.
- Tool invocation adapters call existing routers/services through internal module imports.

## Tool Surface Strategy
### Initial built-in tools
- `growchat.search_chats`
- `growchat.get_chat`
- `growchat.query_knowledge`
- `growchat.list_models`
- `growchat.create_memory`

### Future external tool bridge
- Outbound HTTP tool connectors with allowlisted domains.
- Signed request headers and egress policy checks.

## Compatibility Notes
- MCP Streamable HTTP supersedes older HTTP+SSE transport; keep optional compatibility shim only if specific clients require it.

## Test Plan
- Protocol conformance tests for initialize, call tool, errors.
- SSE multiplex tests for concurrent streams.
- Security tests for origin spoofing and unauthorized invocation.

## Acceptance Criteria
- MCP-compatible clients can connect over Streamable HTTP.
- Tool calls are auditable and subject to RBAC scopes.
- No cross-tenant leakage under concurrent load tests.

## Reference Sources
- MCP Transports (Protocol revision 2025-06-18): https://modelcontextprotocol.io/specification/2025-06-18/basic/transports
