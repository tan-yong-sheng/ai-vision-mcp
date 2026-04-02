# 002a - GEMINI FRONTEND RBAC PLAN (Admin Users)

## Owner
- Primary agent: Gemini
- Worktree: `.worktrees/gemini-frontend-rbac`
- Branch: `gemini/frontend-rbac`

## Scope
Frontend-first design and permission-aware UX for:
- `/admin/users/overview`
- `/admin/users/groups`

Use `@open-webui` as UI/interaction reference, adapted to GrowChat patterns.

## Why This Slice
This split isolates user and group administration surfaces so they can be designed and iterated independently from broader settings pages.

## Route Goals
### `/admin/users/overview`
- user list with search/filter/sort
- role badges and status indicators
- clear empty/loading/error states
- detail panel or row actions for user-level operations

### `/admin/users/groups`
- group list with member counts
- group creation/edit flow
- add/remove members UI
- role/permission mapping visibility for each group

## RBAC UX Rules
1. Frontend permission checks are UI hints only; backend remains source of truth.
2. Hide or disable controls if permission is missing.
3. Handle `403` with explicit, non-technical feedback.
4. If RBAC APIs are unavailable, show graceful fallback state instead of breaking layout.

## Suggested Frontend Targets
- `public/js/app.js`
- `public/js/api.js`
- `public/js/store.js`
- new components under `public/js/components/admin/users/`
- optional admin route shell in `public/index.html`

## Acceptance Criteria
1. Admin-capable users can access users overview and groups pages.
2. Non-admin users do not see misleading user-management controls.
3. `403`/API-unavailable states are handled cleanly and consistently.
4. UI supports mobile without header/viewport regressions.

## Verification Checklist
- screenshots for `/admin/users/overview` and `/admin/users/groups`
- allowed vs denied UI state examples
- list of gated actions and required permissions
- notes on fallback behavior when RBAC endpoints are missing
