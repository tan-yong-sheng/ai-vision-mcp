# 005 Gemini Frontend UI Regression and UI Logic Test Plan

## Mission
Build a deterministic frontend regression suite that catches:
- UI corruption: broken layout, missing controls, visual regressions
- UI logic corruption: broken interactions, state transitions, auth/session flow, realtime behavior

This plan is the source of truth for Gemini execution.

## Required Worktree Setup (Mandatory)
All work must be isolated from `main`.

```bash
# from /workspaces/GrowChat
git fetch --all --prune

git worktree add .worktrees/gemini-frontend-tests -b gemini/frontend-tests main
cd .worktrees/gemini-frontend-tests

# verify context
pwd
git branch --show-current
git status --short --branch
```

Expected:
- path contains `.worktrees/gemini-frontend-tests`
- branch is `gemini/frontend-tests`
- clean working tree before edits

## Non-Negotiable Rules
- No direct commit to `main`
- No placeholder/pseudo-tests
- No tautological assertions (e.g., constant-only assertions not touching app behavior)
- Tests must be deterministic and headless-CI friendly
- No unrelated UI refactor
- If production code change is necessary for testability, isolate to separate `fix(frontend-testability): ...` commit

## Frontend Surface Map (Must Consider)
Primary entrypoints:
- `public/auth.html`
- `public/index.html`
- `public/js/auth.js`
- `public/js/app.js`
- `public/js/chat.js`
- `public/js/api.js`

Critical logic modules:
- `public/js/realtime.js`
- `public/js/shortcuts.js`
- `public/js/store.js`

Critical components:
- `public/js/components/message-input.js`
- `public/js/components/model-selector.js`
- `public/js/components/sidebar.js`
- `public/js/components/search-modal.js`
- `public/js/components/files-modal.js`
- `public/js/components/chat-row.js`
- `public/js/components/folder-sidebar.js`
- `public/js/components/user-profile-footer.js`

Secondary (if shipped/used):
- `public/widget.js` (embeddable widget flow)

## Test Strategy
Use Playwright E2E + visual snapshots.

### 1) Behavior E2E (Required)
Implement end-to-end behavior tests with network interception.

### 2) Visual Regression (Required)
Snapshot critical screens and high-risk states.

### 3) Module-Level UI Logic (Required)
For pure UI logic modules (`store`, `shortcuts`, `realtime`) add lightweight unit/component tests if easier than full E2E for edge cases.

## Deterministic Mocking Rules
Use controlled fixtures and route interception:
- Mock all `/api/*` calls used by tested flows
- Mock SSE/realtime streams deterministically
- No dependency on real LLM/network timing
- Explicit waits by selectors/events; avoid arbitrary sleeps

Recommended fixture location:
- `tests/e2e/fixtures/*.json`

## Required Test Matrix (Detailed)

### A. Auth Page (`/auth.html`) and Auth Flow
Files touched:
- `public/auth.html`, `public/js/auth.js`, `public/js/api.js`

Required tests:
1. Login mode renders expected controls and labels
2. Toggle to register mode shows name field and label changes
3. Failed login shows inline error message
4. Successful login stores auth state and redirects to `/`
5. Failed register shows API error
6. Successful register redirects to `/`

### B. App Bootstrap and Route Guards (`/`)
Files touched:
- `public/js/app.js`

Required tests:
1. Unauthenticated user redirected to `/auth.html`
2. Shared route `/s/:id` renders read-only page (and handles not found)
3. Authenticated bootstrap loads chats/models and renders shell
4. Failure to load `/api/chats` renders fallback error UI

### C. Core Chat UI Logic
Files touched:
- `public/js/chat.js`, `public/js/components/message-input.js`, `public/js/components/chat-row.js`

Required tests:
1. New chat creation adds row and selects chat
2. Chat selection loads message history
3. Send message path:
   - user message appears
   - streaming assistant tokens append incrementally
   - final state settles with completed assistant message
4. Empty/whitespace message cannot be sent
5. Streaming error path shows failure indicator/toast and UI recovers
6. Chat actions work (at least rename + delete)

### D. Token Refresh/Session Recovery
Files touched:
- `public/js/api.js`, `public/js/app.js`

Required tests:
1. API 401 triggers refresh call
2. Refresh success retries original request and UI continues
3. Refresh failure clears auth state and redirects to `/auth.html`

### E. Realtime Sync and Event Safety
Files touched:
- `public/js/realtime.js`, `public/js/chat.js`

Required tests:
1. Client connects with bearer token and `x-client-session-id`
2. 401 on realtime stream attempts refresh and reconnect
3. Duplicate events are deduped
4. Reconnect backoff occurs after stream failure
5. Realtime event updates chat/message UI state as expected

### F. Keyboard Shortcuts
Files touched:
- `public/js/shortcuts.js`

Required tests:
1. `mod+k` toggles search
2. `mod+shift+o` triggers new chat
3. `shift+escape` focuses message input
4. `escape` closes search modal
5. Shortcuts that should not trigger while typing are blocked in input/textarea

### G. Store Persistence and Responsive Behavior
Files touched:
- `public/js/store.js`

Required tests:
1. `sidebarCollapsed`, `sidebarWidth`, drafts, defaultModel persisted to storage
2. Resize transition updates `isMobile` and `showSidebar` correctly
3. State subscription emits expected updates on setState

### H. Search Modal Behavior
Files touched:
- `public/js/components/search-modal.js`

Required tests:
1. Open/close modal behavior
2. Debounced query updates result list
3. Keyboard navigation (up/down/enter)
4. Preview panel loads chat content
5. No-results and loading states render correctly

### I. Files Modal Behavior
Files touched:
- `public/js/components/files-modal.js`

Required tests:
1. Modal open/close
2. Upload flow updates list
3. Search filters list
4. File select toggles and updates selected count
5. Attach button enabled only when selection exists
6. Delete action removes file row

### J. Message Input Queue and Prompt Commands
Files touched:
- `public/js/components/message-input.js`

Required tests:
1. Queue add/reorder/edit/delete controls work
2. Stop generation button aborts stream behavior
3. Slash prompt picker appears and applies prompt content
4. Prompt variable substitution inserts user-provided values

### K. Model Selector and Default Model Save
Files touched:
- `public/js/components/model-selector.js`

Required tests:
1. Dropdown open/search/select model updates active model
2. “Set as default” calls `/api/users/me` and updates state
3. API failure fallback stores local default and shows feedback path

### L. Sidebar and Layout Stability
Files touched:
- `public/js/components/sidebar.js`

Required tests:
1. Desktop collapse/expand states
2. Width resize clamp boundaries
3. Mobile sidebar visibility behavior
4. Key controls remain visible in both collapsed/full states

### M. Widget (Optional Phase 1.5, Required if shipped)
Files touched:
- `public/widget.js`

If widget is active in production, add at least smoke tests for:
1. Open/close widget
2. Send message and render streamed assistant output
3. Theme toggle and clear-chat action

## Visual Snapshot Coverage (Required)
Capture stable snapshots for:
- `/auth.html` login mode
- `/auth.html` register mode
- main app shell loaded
- chat selected with messages
- message streaming state
- search modal open with results
- files modal open with selected files
- mobile viewport app shell

Viewports:
- Desktop: `1366x768`
- Mobile: `390x844`

Tag visual specs with `@visual` for selective runs.

## Tooling / Project Setup Tasks
If missing in worktree, add:
- `playwright.config.ts`
- package scripts:
  - `test:e2e`
  - `test:e2e:ui`
  - `test:e2e:update-snapshots`

Recommended test dirs:
- `tests/e2e/frontend/*.spec.ts`
- `tests/e2e/fixtures/*.json`

## Quality Gates (Must Pass Before Handoff)
Run from Gemini worktree:
```bash
npm test
npm run test:coverage
npm run test:e2e
npm run test:e2e -- --grep @visual
```

All required commands must pass.

## Commit Plan (Small, Cherry-Pickable)
Use this exact sequence where feasible:
1. `test(frontend): add playwright config and deterministic fixtures`
2. `test(frontend-auth): add auth and bootstrap regression coverage`
3. `test(frontend-chat): add core chat + token refresh + realtime coverage`
4. `test(frontend-ui-logic): add shortcuts/store/component logic coverage`
5. `test(frontend-visual): add visual baseline snapshots for critical screens`
6. Optional only if required:
   - `fix(frontend-testability): <brief reason>`

## Reporting Format (Required)
Gemini must provide:
- files added/changed
- test counts per suite
- command outputs (pass/fail)
- what regressions are now covered
- remaining high-risk gaps
- exact commit hashes in cherry-pick order

## Integration to Main (Selective Only)
Do not merge branch wholesale.

```bash
cd /workspaces/GrowChat
git checkout main
git cherry-pick <commit1> <commit2> <commit3> ...

npm test
npm run test:coverage
npm run test:e2e
```

## Out of Scope (This Phase)
- full cross-browser matrix
- performance benchmarking
- non-critical animation-only assertions
- broad visual snapshotting for every permutation

## Definition of Done
- Critical frontend journeys have deterministic automated tests
- High-risk UI logic modules have coverage for key failure/recovery behavior
- Visual baselines protect main surfaces from layout corruption
- Suite passes in CI-style headless execution
- Commits are reviewable and cherry-pickable into `main`

## 2026-03-08 Strict Unblock Addendum (Codex Review)
This section is mandatory follow-up based on direct review/run of `gemini-frontend-tests`.

### Verified Failures/Root Causes
1. Shared route spec currently fails and lands on auth page.
   - Failing file: `tests/e2e/frontend/bootstrap.spec.ts`
   - Current route mock is too narrow and not deterministic.
2. Visual search modal spec uses a non-existent selector.
   - `#search-modal` does not exist in current app.
   - Use `#modal-root` (from search modal component) or `#search-modal-container`.
3. Realtime reconnect spec currently expects behavior the implementation does not guarantee.
   - `public/js/realtime.js` keeps `abortController` set after 401 path, so reconnect may not call stream twice.
4. Chat streaming spec uses wrong SSE payload shape.
   - Current parser expects `data: {"response":"..."}` or OpenAI delta payload, not `{"type":"chunk","content":"..."}`.
5. Multiple specs monkey-patch `localStorage.getItem`; this is race-prone during early bootstrap.

### Required Test Harness Corrections (Do First)
1. Stop monkey-patching `localStorage.getItem` in E2E specs.
2. Use Playwright `storageState` for authenticated contexts.
   - Reuse `tests/e2e/fixtures/auth-state.json`.
   - Create two projects in `playwright.config.ts`:
     - `chromium-auth` with `storageState`
     - `chromium-guest` without `storageState`
3. Remove broad catch-all `page.route('**/api/**', ...)` in specs.
   - Mock only exact endpoints needed by each test.
4. Replace arbitrary waits (`waitForTimeout`) with request/response driven waits.
   - `page.waitForRequest`, `page.waitForResponse`, or explicit DOM state assertions.

### Required Selector Alignment (Use These IDs First)
Use stable IDs present in the app:
- `#new-chat`
- `#open-search`
- `#message-input`
- `#send-btn`
- `#chat-list`
- `#sidebar`
- `#toggle-sidebar-mobile`
- `#toggle-sidebar-desktop`
- `#modal-root` (search modal)
- `#search-modal-container`
- `#files-modal-container`

Avoid selectors that do not exist (e.g., `#search-modal`) or unstable Tailwind class chains.

### Shared Route Test Fix Protocol
For `/s/:id` test:
1. Do not require auth state.
2. Mock HTML navigation request for `/s/:id` to serve app shell (`index.html`) when needed by harness.
3. Mock JSON fetch request with broad-enough matcher:
   - `**/s/*?format=json`
4. Assert shared page content:
   - title text from mocked chat
   - `Read-only view` visible
5. Add negative case:
   - 404 JSON response renders "Shared chat not found." fallback.

### Realtime Test Fix Protocol
Split into two categories:
1. **Current behavior contract (must pass now)**
   - 401 stream triggers refresh call.
   - App remains usable (no crash / shell remains rendered).
2. **Reconnect-after-refresh (only if implementation is fixed)**
   - Keep as TODO/pending OR separate failing-known-issue test with clear annotation.

Do not force `streamCalledCount >= 2` until reconnect behavior is guaranteed by production code.

### SSE/Chat Streaming Test Protocol
Use valid mocked SSE payloads:
- `data: {"response":"The answer"}\n\n`
- `data: {"response":" is 4."}\n\n`
- `data: [DONE]\n\n`

Then assert final rendered assistant text and settled message state.

### File-Level Mandatory Edits
Apply these updates at minimum:
1. `playwright.config.ts`
   - Add project split for authenticated vs guest contexts.
2. `tests/e2e/frontend/bootstrap.spec.ts`
   - Remove `addInitScript` monkey patches.
   - Fix shared route interception pattern.
3. `tests/e2e/frontend/chat.spec.ts`
   - Replace invalid SSE payload shape.
   - Remove catch-all API route.
4. `tests/e2e/frontend/realtime.spec.ts`
   - Replace timer-based reconnect assertion with deterministic current-behavior checks.
5. `tests/e2e/frontend/ui-logic.spec.ts`
   - Remove monkey patches; rely on authenticated storageState project.
6. `tests/e2e/frontend/visual.spec.ts`
   - Replace `#search-modal` assertion target with `#modal-root` or container that actually exists.

### Acceptance Criteria for This Addendum
Before claiming completion, Gemini must provide:
1. Passing output for:
   - `npm run test:e2e`
   - `npm run test:e2e -- --grep @visual`
2. Explicit list of removed flaky patterns:
   - monkey-patched `localStorage.getItem`
   - arbitrary `waitForTimeout` waits
   - invalid selectors
3. Any remaining known limitation documented as:
   - exact file/test
   - reason
   - whether app fix is required
