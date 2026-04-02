# 004 Claude Backend Improve Test Coverage

## Mission
Increase meaningful backend test coverage for GrowChat without destabilizing `main`.

This task must prioritize production risk reduction over vanity coverage numbers.  
The current high coverage number applies mostly to selected utility modules and does not yet cover the critical router and authorization surfaces.

## Working Location (Mandatory)
- Work only in: `/workspaces/GrowChat/.worktrees/claude-tdd`
- Branch: `claude-tdd`
- Do not commit directly on `main`

## Non-Negotiable Rules
- Add only runnable tests. No placeholder `.test.js` files.
- Do not add speculative docs claiming production readiness.
- Keep commits small and cherry-pickable.
- Prefer test-only changes. If production code must change, split into a separate commit with clear bug justification.
- Every commit must pass:
  - `npm test`
  - `npm run test:coverage`

## Existing Testing Baseline
- Existing passing unit tests are in:
  - `src/auth.test.js`
  - `src/db.test.js`
  - `src/llm.test.js`
  - `src/session.test.js`
  - `src/utils/response.test.js`
- Vitest currently discovers `src/**/*.test.js`.

## Priority Order
Implement in this order. Do not skip ahead until current phase is green.

1. `src/utils/authorize.js` (highest security risk)
2. `src/routers/chat.js` (highest product-critical complexity)
3. `src/routers/auth.js`
4. `src/routers/users.js`
5. `src/routers/rbac.js` and `src/routers/admin.js`
6. Remaining routers/services

## Phase 1 Deliverable: authorize.js Unit Tests
Create `src/utils/authorize.test.js` with real assertions.

Minimum required scenarios:
- Permission allow path for valid role/permission binding
- Deny path for missing permission
- Scope isolation checks (self vs other-user resource access where applicable)
- Inactive/disabled user checks (if supported by implementation)
- Last-owner protection logic (if implemented in function behavior)
- Denial result schema consistency (machine-readable codes)
- Unknown permission/resource handling
- SQL parameter binding behavior (no string interpolation risk patterns in tested query paths)
- Error handling path when DB returns unexpected/null records

Acceptance:
- Tests are deterministic (no timing-based assertions)
- Branch coverage for `authorize.js` reaches meaningful level (target >= 80% for this file)

## Phase 2 Deliverable: chat.js Integration-Style Router Tests
Create `src/routers/chat.test.js` with mocked dependencies (`DB`, `AI`, fetch/OpenAI path, request/auth context).

Minimum required scenarios:
- `GET /api/chats` success + ownership filter behavior
- `POST /api/chats` create flow + default model fallback behavior
- `GET /api/chats/:id` not found vs found (ownership enforced)
- `PUT /api/chats/:id` update success and validation failures
- `DELETE /api/chats/:id` success and unauthorized access
- `POST /api/chats/:id/messages` happy path streaming
- Message streaming error path returns SSE error payload (not crash/500)
- Chat history windowing behavior (last N messages logic if present)
- Assistant response persistence after stream completion
- Updated timestamps persisted where expected

Acceptance:
- SSE behavior assertions validate event payload content and termination behavior
- Error-path tests cover LLM unavailable/setup failure and malformed streaming chunks

## Phase 3 Deliverable: auth.js Router Tests
Create `src/routers/auth.test.js`.

Minimum required scenarios:
- Register success
- Register duplicate email conflict
- Login success
- Login wrong credentials
- Refresh success with valid refresh token
- Refresh rejects invalid/expired token
- Logout success (token revocation path)
- Input validation failures (missing fields, malformed body)

## Test Quality Requirements
- Prefer behavior-driven assertions over implementation-detail assertions.
- Validate status code + response shape + side effects (DB/KV writes).
- Cover both positive and negative paths.
- No flaky checks:
  - No wall-clock timing comparisons
  - No performance-threshold assertions
- Use clear test names with expected behavior.

## Mocking Guidance
- Reuse proven patterns from existing tests (`db.test.js`, `llm.test.js`, `session.test.js`).
- Keep mocks minimal and explicit per scenario.
- For chainable DB statements, ensure `bind()` returns the statement object.
- For stream tests, use deterministic readable stream fixtures.

## Commit Strategy
Use this commit granularity:

1. `test(authorize): add unit coverage for permission and denial paths`
2. `test(chat): add router coverage for CRUD and SSE message flows`
3. `test(auth-router): add register/login/refresh/logout coverage`
4. (Optional) `fix(<area>): <bug fix summary>` if tests expose real production bug

Each commit must include:
- What was tested
- Why it matters
- Test command outputs (brief)

## Reporting Format (Per Phase)
At the end of each phase, provide:
- Files added/changed
- Number of tests added
- Coverage delta for targeted files
- Known gaps left intentionally
- Exact commands run and pass/fail result

## Explicitly Out of Scope for This Task
- Frontend/UI tests
- Massive refactors unrelated to testability
- Placeholder “future test plan” files named as executable tests
- Inflated coverage claims without module scope disclosure

## Definition of Done
- New tests are merged from `claude-tdd` to `main` via selective cherry-pick
- `npm test` and `npm run test:coverage` pass on `main`
- Critical backend surfaces (`authorize.js`, key routers) have real automated coverage
- No CI-breaking placeholder tests

---

## Addendum (2026-03-08): Strict Remediation Instructions After Review

This addendum supersedes any interpretation that "behavior contract" comments are acceptable tests.

### Current Ground Truth
- `test(authorize)` was selectively integrated to `main` and passes.
- `test(chat)` and `test(auth-router)` from `claude-tdd` were **not** integrated.
- Reason: they are largely non-executable documentation tests (tautological assertions) and do not validate actual router behavior.

### Explicit Rework Scope
Work in `claude-tdd` and **replace** these files with real executable tests:
- `src/routers/auth.test.js`
- `src/routers/chat.test.js`

Do not keep placeholder-style tests. Delete and rewrite if needed.

### Hard Prohibitions
The following patterns are forbidden and will be rejected in review:
- `expect(true).toBe(true)`
- assertions against locally constructed constants that never touch target code paths
- tests that only restate comments/spec text without invoking router handlers
- tests that pass without importing/calling the module under test

### Mandatory Test Shape (Router Tests)
Each test must:
1. Construct a real `Request` object matching endpoint method/path/body.
2. Call the actual router entry function/handler from source module.
3. Provide mocked `env` bindings (`DB`, `SESSIONS`, `AI`, etc.) only as needed.
4. Assert:
   - HTTP status code
   - response body schema/content
   - side effects (DB/KV interactions, inserts/updates/deletes)
5. Include both success and failure paths.

### Auth Router Required Cases (Minimum)
- Register: success, duplicate email (409), invalid input (400), invalid JSON (400)
- Login: success, unknown user/invalid password (401 generic message), missing credentials (400)
- Refresh: success, invalid/expired token (401), deleted user (404)
- Logout: success/no-op behavior, invalid/missing token handling
- Security assertions: no user enumeration leakage, expected token fields in success payload

### Chat Router Required Cases (Minimum)
- `GET /api/chats`: auth required (401), valid pagination, ownership filtering
- `POST /api/chats`: create success, defaults (`title/model/tags/pinned`), validation failures
- `GET /api/chats/:id`: found vs not found/unowned (404)
- `PUT /api/chats/:id`: update success, validation failure, unowned (404)
- `DELETE /api/chats/:id`: success, unowned/missing (404)
- `POST /api/chats/:id/messages`: message validation, happy path, LLM setup failure path returning SSE error payload
- Verify message persistence and `updated_at` updates where applicable

### SSE Tests (Chat Messages)
For streaming tests:
- Use deterministic stream fixtures (no network dependency)
- Assert emitted SSE chunks include expected `data:` payloads and termination behavior
- Assert error path emits structured SSE error, not crash

### Determinism and Noise Rules
- No timing/perf thresholds in assertions.
- Keep test output clean; avoid intentional `console.error` noise unless explicitly asserted.
- If mocking error branches that log, spy/suppress logs in tests and assert behavior.

### Coverage and Quality Gates
Before reporting completion, all must pass in `claude-tdd`:
- `npm test`
- `npm run test:coverage`

And additionally:
- Router test files must contain substantive assertions tied to actual handler execution.
- No CI-breaking placeholder test files under `tests/` as runnable suites.

### Commit Plan (Revised)
Use these commits (small and cherry-pickable):
1. `test(auth-router): replace contract placeholders with executable handler tests`
2. `test(chat-router): replace contract placeholders with executable handler and SSE tests`
3. Optional targeted fix commit only if tests expose a production bug:
   - `fix(router-<area>): <brief bug summary>`

### Required Completion Report
At end of rework, report:
- exact files changed
- number of real executable tests added
- commands run + pass/fail
- short list of still-untested high-risk paths
- explicit statement that no placeholder/tautology tests remain
