# Phase 06 - Tools, Extensions, and Pipelines Parity

## Objective
Provide OpenWebUI-like extensibility without requiring in-process Python execution.

## OpenWebUI Baseline to Replace
- Native Python function tools
- Pipelines/plugin patterns
- Broad third-party integration surface

## GrowChat Cloudflare-Compatible Replacement
### Extension Model
- HTTP tool contracts described in OpenAPI and MCP tool metadata.
- Worker-side tool adapters invoking:
  - Internal services (knowledge, prompts, memories, analytics)
  - External HTTPS tools through allowlisted egress policy

### Execution model
- Deterministic function adapter runtime in JS/TS Worker modules.
- Async/long-running tool jobs pushed to Cloudflare Queues.
- Optional durable orchestration in DO for multi-step workflows.

### Governance
- Per-tool RBAC scopes
- Per-tool timeout, retry, and cost budget policy
- Structured tool invocation logs for audit and debugging

## API/Schema Plan
- `GET /api/tools` -> discoverable catalog
- `POST /api/tools/:id/invoke` -> audited invocation endpoint
- MCP `tools/list`, `tools/call` bridged to same backend handlers

## Non-goals in this phase
- Running arbitrary user-submitted Python inside Worker runtime.
- Recreating OpenWebUI plugin internals one-for-one.

## Acceptance Criteria
- Tool calls work through both REST and MCP paths.
- Long-running tools are reliable via queue retries and DLQ.
- Tool failures are observable and non-fatal to chat sessions.

## Reference Sources
- Cloudflare Queues: https://developers.cloudflare.com/queues/
- OpenWebUI plugin/pipeline orientation: `open-webui/README.md`
