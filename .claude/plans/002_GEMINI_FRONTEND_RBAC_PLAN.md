# 002 - GEMINI FRONTEND RBAC PLAN (GrowChat)

## Split Plan Files
This plan is now split into execution slices:
- `002a_GEMINI_FRONTEND_RBAC_PLAN.md` for `/admin/users/overview` and `/admin/users/groups`
- `002b_GEMINI_FRONTEND_RBAC_PLAN.md` for `/admin/settings/general`, `/admin/settings/connections`, `/admin/settings/integrations`
- `002c_GEMINI_FRONTEND_RBAC_PLAN.md` for `/admin/settings/documents`, `/admin/settings/web`, `/admin/settings/images`, `/admin/settings/audio`

## Owner
- Primary agent: Gemini
- Scope: admin UI, permission-aware affordances, mobile UX stability, frontend guardrails

## Why This Exists
The backend is moving toward explicit RBAC. The frontend must become permission-aware without pretending it is the source of truth. It should hide or disable unavailable actions for clarity, while still relying on backend enforcement.

## Current Findings From Review
- Recent mobile UX issues existed around chat streaming redraws and viewport sizing.
- `public/js/chat.js` previously kept redrawing the old chat during streaming, making chat switching feel blocked.
- `public/index.html` used `h-screen`, which is brittle on mobile when the soft keyboard changes viewport height.
- Frontend auth state still stores access/refresh tokens in `localStorage` (`public/js/api.js`), which is practical here but remains XSS-sensitive.
- There is no dedicated admin/RBAC UI surface yet.

## Mission
Prepare the frontend for RBAC by adding permission-aware UX, admin entry points, and safer mobile/stability behavior while keeping all current chat flows intact.

## Non-Negotiable Requirements
1. Do not rely on frontend-only permission enforcement.
2. Preserve current send/stream/stop/new-chat behavior.
3. Keep mobile layout stable during keyboard open/close and streaming.
4. Avoid blank states if RBAC APIs are unavailable; degrade gracefully.
5. Keep current styling direction; do not redesign the app wholesale.

## Frontend Deliverables
### 1. Permission-Aware App State
Add a lightweight permission surface in frontend state, populated from backend identity/RBAC APIs when available:
- current user role(s)
- resolved permission keys for UI affordances
- fallback behavior when permissions endpoint is absent

### 2. Admin Navigation and UI
Introduce minimal admin UX only when permitted:
- admin/settings entry point
- role and binding management screens or panels
- audit log viewer
- empty/loading/error states for all admin data views

### 3. Permission-Aware Actions
Gate visibility or enabled state for UI actions such as:
- global prompt management
- model admin actions
- FAQ/knowledge reindex actions
- file delete/admin actions
- user-management actions

Rules:
- hide or disable when permission is absent
- still handle `403` cleanly if backend denies
- show precise user-facing feedback without exposing internal details

### 4. Mobile UX Stabilization
Continue the recent stabilization work:
- verify dynamic viewport behavior after `100dvh` change
- verify sticky header remains visible on mobile after typing/sending
- verify switching to `New Chat` during streaming works and does not visually snap back
- verify sidebar/header interactions on small screens

### 5. Error Handling and Fallbacks
If RBAC/admin APIs are unavailable:
- do not crash the app
- do not lock the user in broken admin screens
- show clear fallback messages like `Feature unavailable: backend API missing`

## Suggested File Targets
- `public/js/app.js`
- `public/js/api.js`
- `public/js/store.js`
- `public/js/chat.js`
- `public/js/components/model-selector.js`
- `public/js/components/chat-controls-panel.js`
- `public/js/components/user-profile-footer.js`
- `public/index.html`
- new admin-focused components under `public/js/components/`

## UX/Security Checklist
- Never expose controls based solely on optimistic assumptions.
- Treat frontend permissions as hints, not guarantees.
- Handle `401/403/404` distinctly in admin UX.
- Avoid leaking sensitive audit metadata into generic UI messages.
- Keep clipboard/toast/mobile interactions stable after state updates.
- Verify no mobile header regressions from sticky containers and viewport sizing.

## Acceptance Criteria
1. Non-admin users do not see misleading admin affordances.
2. Admin-capable users can discover RBAC UI clearly.
3. Mobile header remains stable after send and keyboard transitions.
4. Creating a new chat during an active stream feels immediate and does not snap back.
5. Frontend behaves cleanly if backend RBAC endpoints are not yet deployed.

## Verification Checklist Gemini Must Return
- screenshots or snapshots for mobile send/new-chat/header behavior
- admin UI screenshots for allowed and denied states
- list of actions hidden/disabled by permission
- `403` handling notes
- remaining UX risks and TODOs


## Git Worktree Setup (Gemini Frontend RBAC)
Use a dedicated frontend worktree for this phase.

### Worktree Name
- Directory: `.worktrees/gemini-frontend-rbac`
- Branch: `gemini/frontend-rbac`

### Commands
Run from repo root:
```bash
git fetch --all --prune
mkdir -p .worktrees
git worktree add .worktrees/gemini-frontend-rbac -b gemini/frontend-rbac main
cd .worktrees/gemini-frontend-rbac
git status
```

### Notes
- Keep permission-aware UI work isolated from backend schema changes.
- Rebase or merge from `main` after backend RBAC APIs land if contract details shift.
