# 001 - GEMINI FRONTEND SPEC (GrowChat)

## Owner
- Primary agent: Gemini
- Scope: chat UI behavior, streaming UX, branch navigation controls, interaction polish, auth page wiring

## Mission
Deliver stable OpenWebUI-like conversation UX in GrowChat without breaking existing auth and chat entry flows.

## UX Baseline to Match
- Immediate optimistic rendering when user sends a message.
- Assistant starts streaming token-by-token immediately.
- Regenerate resets target assistant display first, then streams new branch in-place.
- Copy action shows success notification: "Copying to clipboard was successful!"
- Branch round navigator (e.g., `2 / 2`) allows switching siblings deterministically.
- Delete button on first user message only visible when that node has more than one branch.

## Functional Requirements
1. Keep message input queue behavior intact.
2. Restore and keep Stop button behavior during active stream.
3. Ensure send/regenerate/edit streaming appears live (not only after completion).
4. Preserve draft behavior per active chat and new chat draft.
5. Keep model selector and default model behavior compatible with current store.
6. Ensure no blank-page regressions from missing imports/exports.

## Frontend Integration Notice (API Contract Guardrails)
- Use existing backend APIs only; do not invent request/response shapes in frontend code.
- Before wiring a feature, verify endpoint existence from `src/routers/*.js` in the checked-out branch.
- Stable endpoints Gemini may use directly:
  - `GET /api/models`
  - `GET /api/users/me`
  - `GET/POST /api/chats`
  - `GET/PUT/DELETE /api/chats/:id`
  - `POST /api/chats/:id/messages`
  - `POST/DELETE /api/chats/:id/share`
  - `POST /api/chats/:id/archive`
  - `GET /api/chats/shared`
  - `GET /api/chats/archived`
- New/additive backend endpoints (use only if they exist in current backend branch):
  - `POST /api/chats/:id/messages/:msgId/branch` (edited user branch)
  - `POST /api/chats/:id/messages/:msgId/regenerate` (assistant sibling regenerate)
  - `DELETE /api/chats/:id/messages/:msgId` (subtree delete)
  - `GET|POST /api/realtime/stream` (realtime placeholder/stream channel)
- If an endpoint is missing or returns `404/405`:
  - Do not break the UI.
  - Show a user-facing alert/toast: `Feature unavailable: backend API missing`.
  - Keep the UI interactive and preserve local state/drafts.
  - Do not repeatedly retry in a tight loop.

## Frontend State Contract Requirements
- `chat.js` send path and `message-input.js` callback contract must match.
- If hook-based send is used (`onFinished`, `onAbortable`), input component must consume same contract.
- If callback-based send is used (`doneFn`), chat sender must keep same API.
- Do not mix both contracts simultaneously.

## Branch Projection Requirements
- Build projected visible path from all chat messages + `current_message_id`.
- Keep per-parent sibling selection map (prev/next controls).
- On reload, projection must be stable and not create phantom branches.
- Streaming override logic must clear cleanly after stream end/fail.

## Notification and Clipboard Requirements
- Copy message and copy share link should both:
  - attempt `navigator.clipboard.writeText`
  - fallback to prompt on failure
  - show toast success on success

## Auth Page Requirements
- `public/js/auth.js` must support whichever DOM variant is deployed (`tab-*` or `toggle-mode`).
- Null-safe event wiring to avoid runtime abort.
- `/auth` must never blank due to missing element references.

## Styling/UX Constraints
- Keep existing GrowChat style direction unless user asks for redesign.
- Avoid large layout rewrites while stabilizing behavior.
- Prioritize interaction correctness over visual additions.

## Verification Requirements (Gemini)
- Local run on `http://localhost:8787`
- Validate flows:
  1. login page loads
  2. send message streams immediately
  3. stop button appears and aborts stream
  4. regenerate streams in-place
  5. copy shows toast
  6. branch navigation prev/next updates displayed variant

## Git Worktree Setup (Gemini Frontend)
Run from repo root:
```bash
# Update refs
git fetch --all --prune

# Create frontend worktree from main
mkdir -p .worktrees
git worktree add .worktrees/gemini-frontend -b gemini/frontend-parity main

# Enter frontend worktree
cd .worktrees/gemini-frontend

# Verify
git status
```

## Branching and PR Rules
- Branch name: `gemini/frontend-*`
- Keep commits focused: input contract, streaming UX, branch UI, copy/toast
- Include before/after behavior notes in commit message
- Do not delete backend files unless explicitly required

## Handoff Deliverables Gemini Must Provide
1. File-level change summary.
2. Interaction behavior checklist with pass/fail notes.
3. Screenshots or concise evidence for regenerate/copy/stop flows.
4. Remaining frontend risks and TODOs.
