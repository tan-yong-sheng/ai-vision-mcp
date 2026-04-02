# 001 - CLAUDE BACKEND SPEC (GrowChat)

## Owner
- Primary agent: Claude
- Scope: backend APIs, schema, auth/session, streaming, realtime transport, deploy-safe migrations

## Mission
Stabilize and complete backend capabilities required for OpenWebUI-style branching/regenerate behavior while keeping GrowChat Cloudflare-native and production-safe.

## Current Runtime Constraints
- Platform: Cloudflare Workers
- Data: D1 (`DB`), KV (`SESSIONS`), optional DO bindings
- Streaming: SSE for model responses
- Auth: JWT access token + refresh token
- Canonical entry: `src/index.js`

## Non-Negotiable Requirements
1. Keep all existing auth routes functional (`/api/auth/*`, `/api/users/me`).
2. Keep chat streaming SSE-compatible for browser fetch streaming; no mandatory WebSocket requirement.
3. Branching must stay in one chat ID with deterministic parent-child lineage.
4. Regenerate must create a sibling assistant branch from the same parent user message.
5. Message delete must safely remove subtree only within same chat and update `chats.current_message_id` correctly.
6. Never break older linear chats with `parent_id` missing; compatibility fallback required.
7. RAG must be gated by env flag (`ENABLE_RAG`) and default off until pipeline is validated.
8. Realtime failures must not block core send/regenerate/chat CRUD flows.

## Data Model Requirements
- `messages.parent_id` must exist.
- `chats.current_message_id` must exist.
- Ensure index on `messages(parent_id)`.
- Compatibility function must be idempotent and safe on already-migrated databases.

## API Contract Requirements
### Existing
- `POST /api/chats/:id/messages` (SSE stream)
- `GET /api/chats/:id` returns all message rows needed by frontend projection (`id`, `role`, `content`, `model`, `citations`, `parent_id`, `created_at`) and chat metadata (`current_message_id`, `model`).

### Required branch endpoints
- `POST /api/chats/:id/messages/:msgId/branch`
  - Input: edited user content
  - Behavior: create new user message under original parent, generate assistant as child, stream SSE.
- `POST /api/chats/:id/messages/:msgId/regenerate`
  - Behavior: identify parent user message for target assistant, create sibling assistant branch, stream SSE.
- `DELETE /api/chats/:id/messages/:msgId`
  - Behavior: recursive subtree delete scoped to chat.

## Streaming Contract (SSE)
- Must emit `data: {"event":"start", ...}` first.
- Must emit incremental `data: {"response":"..."}` chunks.
- Must emit recoverable error payloads (not worker crash).
- Must emit `data: [DONE]` terminal marker.

## Realtime Transport Requirements
- Temporary mode allowed: no-op `/api/realtime/stream` endpoint returning SSE heartbeat comment.
- If DO realtime is disabled, endpoint must not 404.
- Realtime is additive only; no dependency from chat send/regenerate success path.

## Security and Correctness
- Enforce ownership (`user_id`) on all chat/message mutating routes.
- Reject invalid JSON bodies with 400.
- Reject missing required content with 400.
- Ensure no cross-chat message reference leaks.
- Ensure refresh/token flow remains unchanged.

## Acceptance Criteria (Backend)
1. Sending message streams immediately and persists user+assistant with correct parent chain.
2. Regenerate produces a new assistant sibling under same parent user message.
3. Branch edit produces new user+assistant branch within same chat ID.
4. Reloading chat returns stable message tree data without artificial branch multiplication.
5. `/api/realtime/stream` never returns 404 in enabled UI builds.
6. No auth regressions on `/auth` and protected routes.

## Git Worktree Setup (Claude Backend)
Run from repo root:
```bash
# Update refs
git fetch --all --prune

# Create backend worktree from main
mkdir -p .worktrees
git worktree add .worktrees/claude-backend -b claude/backend-parity main

# Enter backend worktree
cd .worktrees/claude-backend

# Verify
git status
```

## Branching and PR Rules
- Branch name: `claude/backend-*`
- Small commits by concern: schema, router, streaming, compatibility
- Include migration/compat notes in commit message body
- Never force-push shared branch without instruction

## Handoff Deliverables Claude Must Provide
1. File-level change summary with route list.
2. Exact migration/compat SQL executed or auto-applied.
3. Manual verification matrix (`send`, `branch`, `regenerate`, `delete`, reload).
4. Known risks and follow-up tasks.
