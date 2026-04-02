# 002b - GEMINI FRONTEND RBAC PLAN (Admin Settings Core)

## Owner
- Primary agent: Gemini
- Worktree: `.worktrees/gemini-frontend-rbac-settings-core`
- Branch: `gemini/frontend-rbac-settings-core`

## Scope
Frontend-first design and permission-aware UX for:
- `/admin/settings/general`
- `/admin/settings/connections`
- `/admin/settings/integrations`

Use `@open-webui` as UI/interaction reference, adapted to GrowChat architecture.

## Why This Slice
General platform configuration and external provider setup share similar form-heavy UX, validation needs, and permission boundaries.

## Route Goals
### `/admin/settings/general`
- app-level metadata and defaults
- save/revert patterns with dirty-state handling
- clear success/error toasts and inline validation

### `/admin/settings/connections`
- provider endpoint/key configuration surfaces
- connection health/status indicators
- safe masking of sensitive values in UI

### `/admin/settings/integrations`
- integration list and enable/disable controls
- per-integration configuration panels
- status, sync, and error visibility patterns

## RBAC UX Rules
1. Do not assume permission; fetch and resolve before enabling controls.
2. Hide or disable edit/save actions if missing required permission.
3. Show clear `401/403/404` distinction in admin UX.
4. Never expose secret values in plain text after save/load.
5. If backend settings APIs are unavailable, show `Feature unavailable: backend API missing`.

## Suggested Frontend Targets
- `public/js/app.js`
- `public/js/api.js`
- `public/js/store.js`
- new components under `public/js/components/admin/settings/core/`
- shared admin form/status utilities under `public/js/components/admin/`

## Acceptance Criteria
1. Settings pages render stable loading, empty, success, and error states.
2. Permission-denied users cannot trigger restricted mutations via UI controls.
3. Sensitive connection/integration fields are masked and safely handled.
4. Mobile layout and sticky header behavior remain stable during editing.

## Verification Checklist
- screenshots for general/connections/integrations pages
- examples of editable vs read-only states
- `403` handling notes for save/update attempts
- fallback screenshots when APIs are missing

## Git Worktree Setup
Run from repo root:
```bash
git fetch --all --prune
mkdir -p .worktrees
git worktree add .worktrees/gemini-frontend-rbac-settings-core -b gemini/frontend-rbac-settings-core main
cd .worktrees/gemini-frontend-rbac-settings-core
git status
```
