# 002c - GEMINI FRONTEND RBAC PLAN (Admin Settings Content & Channels)

## Owner
- Primary agent: Gemini
- Worktree: `.worktrees/gemini-frontend-rbac-settings-content`
- Branch: `gemini/frontend-rbac-settings-content`

## Scope
Frontend-first design and permission-aware UX for:
- `/admin/settings/documents`
- `/admin/settings/web`
- `/admin/settings/images`
- `/admin/settings/audio`

Use `@open-webui` as UI/interaction reference, adapted to GrowChat UX and architecture.

## Why This Slice
These pages are content/channel focused and likely share upload/index/processing UX, making them a strong implementation group.

## Route Goals
### `/admin/settings/documents`
- document source list and status
- upload/manage/delete UI
- indexing/reindex trigger affordances with progress/status display

### `/admin/settings/web`
- web source configuration and crawling/index settings
- source health/status visibility
- scoped sync/re-sync controls

### `/admin/settings/images`
- image model/provider settings
- generation or processing policy controls
- storage/retention-related settings UI (if exposed)

### `/admin/settings/audio`
- speech/audio model settings
- transcription/tts toggles and defaults
- processing limits/quality controls (as defined by backend contract)

## RBAC UX Rules
1. Treat upload/delete/reindex/sync as privileged actions.
2. Hide or disable destructive/admin actions without permission.
3. Handle backend `403` gracefully even when UI looked allowed.
4. Use non-blocking status surfaces for long-running tasks.
5. If feature endpoints are absent, render clear unavailable states without crashing.

## Suggested Frontend Targets
- `public/js/app.js`
- `public/js/api.js`
- `public/js/store.js`
- `public/js/chat.js` (only if shared upload/status elements are reused)
- new components under `public/js/components/admin/settings/content/`

## Acceptance Criteria
1. All four settings pages have consistent admin layout and status patterns.
2. Permission-aware controls prevent misleading affordances for non-admin users.
3. Long-running operations show progress/state without UI lockups.
4. API-missing and permission-denied paths are clear and recoverable.

## Verification Checklist
- screenshots for documents/web/images/audio pages
- list of gated actions and permission mappings
- `403` and API-unavailable behavior notes
- mobile regression notes for upload/status-heavy screens

## Git Worktree Setup
Run from repo root:
```bash
git fetch --all --prune
mkdir -p .worktrees
git worktree add .worktrees/gemini-frontend-rbac-settings-content -b gemini/frontend-rbac-settings-content main
cd .worktrees/gemini-frontend-rbac-settings-content
git status
```
