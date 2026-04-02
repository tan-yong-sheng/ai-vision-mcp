# 002 - CLAUDE BACKEND RBAC PLAN (GrowChat)

## Owner
- Primary agent: Claude
- Scope: D1 schema, authorization core, admin APIs, audit trail, deploy-safe migrations

## Why This Exists
GrowChat currently has only coarse role checks (`admin` vs `user`) spread across multiple helpers and routers. The next backend phase is to move to centralized, deny-by-default RBAC aligned with `.claude/memory/phase-01-rbac-and-user-governance.md`.

## Current Findings From Review
- Duplicate admin helpers exist in `src/utils/admin.js` and `src/utils/rbac.js`.
- Routers still use inline role checks such as `user.role !== 'admin'` in multiple places.
- There is no single `authorize()` entry point in the request path.
- No audit log tables or append-only admin mutation log exist yet.
- Current JWT payload carries role-like identity, but there is no scoped permission resolution layer.
- Cloudflare DO config is active, but `wrangler.jsonc` still lacks explicit DO migrations.

## Mission
Implement a Cloudflare-native RBAC foundation that is small, explicit, and production-safe:
- centralized permission resolution,
- enforceable admin/resource permissions,
- auditable admin mutations,
- incremental rollout without breaking current auth/chat flows.

## Non-Negotiable Requirements
1. Do not break existing auth/session flows in `src/auth.js`, `src/session.js`, or `/api/auth/*`.
2. Keep JWT limited to identity claims; do not embed the full permission graph.
3. Add RBAC in a deny-by-default model with clear machine-readable denial reasons.
4. Keep authorization checks server-side only; never rely on frontend role hiding.
5. Make migrations idempotent and safe for existing D1 databases.
6. Preserve current chat ownership protections while replacing coarse admin checks.
7. Every admin write must emit an audit log row.
8. Add Wrangler DO migrations if needed while touching deployment config.

## Target Schema Additions
Add D1 migrations for:
- `roles(id, name, system, created_at)`
- `permissions(id, key, description)`
- `role_permissions(role_id, permission_id)`
- `user_roles(user_id, role_id, scope_type, scope_id)`
- `audit_log(id, actor_id, action, resource_type, resource_id, metadata, created_at)`

Recommended defaults:
- system roles: `owner`, `admin`, `manager`, `member`, `viewer`, `service`
- base permissions:
  - `chat.read`, `chat.write`, `chat.delete`, `chat.share`
  - `model.use`, `model.admin`
  - `kb.read`, `kb.write`, `kb.reindex`
  - `file.upload`, `file.delete`
  - `admin.user.read`, `admin.user.write`, `admin.audit.read`

## Required Backend Deliverables
### 1. Authorization Core
Create a single authorization surface, likely in a new file such as `src/utils/authorize.js`:
- `resolvePermissions(env, user, context)`
- `authorize(user, action, resourceContext)`
- standardized denial object:
  - `{ allow: false, code: 'forbidden', reason: 'missing_permission', action: '...' }`

### 2. Router Migration
Refactor these routes away from inline role checks:
- `src/routers/admin.js`
- `src/routers/users.js`
- `src/routers/models.js`
- `src/routers/faqs.js`
- `src/routers/prompts.js`
- `src/routers/knowledge.js`
- `src/routers/files.js`

### 3. Audit Trail
Add append-only logging for admin mutations:
- user role changes
- user activation/deactivation
- prompt global/admin mutations
- model configuration mutations
- FAQ/knowledge reindex operations
- future RBAC binding changes

### 4. Admin RBAC API
Add minimal admin endpoints:
- `GET /api/admin/rbac/roles`
- `POST /api/admin/rbac/roles`
- `PUT /api/admin/rbac/roles/:id`
- `GET /api/admin/rbac/permissions`
- `POST /api/admin/rbac/bindings`
- `GET /api/admin/audit`

### 5. Compatibility and Rollout
Implement in stages:
1. schema + default seed data
2. `authorize()` helper + log-only mode
3. admin routes enforce mode
4. models/files/knowledge/prompts enforce mode
5. remove legacy helper divergence

## Suggested File Targets
- `migrations/008_rbac_core.sql`
- `src/utils/authorize.js`
- `src/utils/rbac.js`
- `src/utils/admin.js`
- `src/index.js`
- `src/routers/admin.js`
- `src/routers/users.js`
- `src/routers/models.js`
- `src/routers/faqs.js`
- `src/routers/prompts.js`
- `wrangler.jsonc`

## Security Checklist
- No SQL string concatenation in RBAC queries.
- Bound all authorization queries with parameterized D1 calls.
- Never trust client-supplied role/permission data.
- Do not expose audit log mutation endpoints.
- Avoid overbroad `admin` bypasses except where intentionally documented.
- Add explicit last-owner protections before role demotion or deactivation.
- Keep denial messages generic externally and detailed in audit metadata.

## Acceptance Criteria
1. One authorization entry point is used by privileged routes.
2. All privileged routes require explicit permissions, not ad hoc role checks.
3. Audit rows exist for every admin mutation.
4. Legacy admin helpers are either removed or reduced to thin wrappers over the new core.
5. Existing chat/auth behavior still works unchanged for normal users.
6. Wrangler config includes any required DO migration metadata for safe deploys.

## Verification Checklist Claude Must Return
- changed files list
- migration SQL summary
- permission matrix summary
- routes migrated to `authorize()`
- audit events emitted by each admin mutation
- manual verification notes for allow/deny cases
- known risks and deferred items


## Git Worktree Setup (Claude Backend RBAC)
Use a dedicated backend worktree for this phase.

### Worktree Name
- Directory: `.worktrees/claude-backend-rbac`
- Branch: `claude/backend-rbac`

### Commands
Run from repo root:
```bash
git fetch --all --prune
mkdir -p .worktrees
git worktree add .worktrees/claude-backend-rbac -b claude/backend-rbac main
cd .worktrees/claude-backend-rbac
git status
```

### Notes
- Keep RBAC schema and authz changes isolated to this worktree.
- Rebase or merge from `main` before opening a PR if frontend work proceeds in parallel.
