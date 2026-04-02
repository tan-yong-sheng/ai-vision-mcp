# RBAC + D1 Debug Note (2026-03-08)

- Symptom seen by user: `POST /api/auth/login` returned `500` with `no such table: user_roles`.
- Important context: Wrangler local D1 is scoped to working directory (`.wrangler/state/v3/d1`), so one folder can be migrated while another is not.
- Root cause: auth role-binding wrote to `user_roles` before RBAC migration existed in the active DB target.
- Additional issue: `PRAGMA database_list` can throw `SQLITE_AUTH` in some D1 environments; avoid depending on it for schema checks.

## Stabilization Applied

- `src/routers/auth.js`
  - `ensureUserRoleBinding()` now catches missing RBAC tables and skips binding with warning instead of breaking login.
  - This prevents auth outages before migration is applied.
- `src/index.js`
  - RBAC diagnostics use `sqlite_master` table existence checks only.
  - Removed dependency on `PRAGMA database_list` to avoid `SQLITE_AUTH`.
  - Logs clear missing-table guidance: run `migrations/008_rbac_core.sql`.

## Behavioral Confirmation

- Playwright reproduction on local dev showed login request returns `401 Invalid credentials` (expected for unknown/incorrect user), not `500`.
- Wrangler logs confirmed: `RBAC schema ready. Required tables present.` in migrated local environment.

## Open WebUI Alignment Note

- First-user admin behavior is implemented with post-insert check in signup flow (insert user, then promote to admin if total users == 1), mirroring Open WebUI’s safer pattern.

## RBAC Revisit Backlog vs `claude/backend-rbac` (2026-03-08)

This list tracks RBAC-related deltas that are still not fully merged from `claude/backend-rbac` into `main`.

### Candidate Features Not Fully Merged Yet

- `src/routers/faqs.js`
  - Branch has broader `authorize()` usage and admin checks across FAQ mutation routes.
  - `main` already logs `faq_updated` and `faq_deleted`, but authorization parity should be re-verified endpoint-by-endpoint.
- `src/routers/knowledge.js`
  - Branch uses `kb.delete` permission for KB delete path.
  - `main` should confirm `kb.delete` exists in schema before adopting this permission gate.
- `src/routers/rbac.js`
  - Branch includes alternate role/permission response shapes and direct audit query code.
  - If we want richer RBAC admin APIs, cherry-pick carefully and keep `main` permission gates unchanged.

### Intentionally Deferred (Risky if Merged As-Is)

- `src/utils/authorize.js`
  - Branch removes legacy fallback permission behavior for partially migrated DBs.
  - Keep `main` fallback until RBAC migration is guaranteed everywhere.
- `src/routers/users.js`
  - Branch removes `upsertGlobalRoleBinding()` calls on role change/deactivation.
  - Keep `main` behavior to avoid `users.role` vs `user_roles` drift during transition.
- `src/routers/rbac.js`
  - Branch weakens admin gate (`admin.user.read` used broadly in branch variant seen during review).
  - Keep `main` split permissions (`admin.rbac.admin` and `admin.audit.read`).

### Migration Delta to Revisit

- `migrations/008_rbac_core.sql`
  - Branch variant drops legacy `user_roles` bootstrap insert.
  - Keep `main` bootstrap until all existing users are confirmed backfilled.
  - Branch variant also changes `audit_log.actor_id` to `NOT NULL`; evaluate only after confirming delete semantics and audit retention policy.

### Safe Revisit Preconditions

- Apply `migrations/008_rbac_core.sql` consistently across all local/dev/prod DB targets.
- Run a parity test matrix for:
  - login/register/refresh under migrated + non-migrated local DBs
  - admin role change/deactivate flows
  - RBAC admin endpoints (`/api/admin/rbac/*`, `/api/admin/audit`)
- Only cherry-pick branch commits/file hunks that improve behavior without removing current compatibility guards.
