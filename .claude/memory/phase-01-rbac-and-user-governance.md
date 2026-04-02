# Phase 01 - RBAC and User Governance

## Objective
Move GrowChat from coarse role checks to policy-grade RBAC comparable to OpenWebUI admin/user-group capabilities.

## Current State
- Role checks exist but are inconsistent (`src/utils/rbac.js`, `src/utils/admin.js`, inline checks in routers).
- Effective model is mostly boolean admin/non-admin.
- No centralized permission matrix, no scoped resource actions.

## Target State
### Permission model
- Core entities: `user`, `team`, `role`, `permission`, `policy_binding`, `service_account`.
- Permission granularity:
  - `chat.read`, `chat.write`, `chat.delete`, `chat.share`
  - `model.use:<model_id>`, `model.admin`
  - `kb.read`, `kb.write`, `kb.reindex`
  - `file.upload`, `file.delete`
  - `admin.user.read`, `admin.user.write`, `admin.audit.read`
- Role tiers:
  - `owner`, `admin`, `manager`, `member`, `viewer`, `service`

### Data model additions (D1)
- `roles(id, name, system, created_at)`
- `permissions(id, key, description)`
- `role_permissions(role_id, permission_id)`
- `user_roles(user_id, role_id, scope_type, scope_id)`
- `audit_log(id, actor_id, action, resource_type, resource_id, metadata, created_at)`

### Runtime enforcement
- Introduce one enforcement function in request path:
  - `authorize(user, action, resourceContext) -> {allow, reason}`
- Replace all inline role checks in routers with `authorize`.
- Make denial reason machine-readable for UI and audit.

## API Additions
- `GET /api/admin/rbac/roles`
- `POST /api/admin/rbac/roles`
- `PUT /api/admin/rbac/roles/:id`
- `GET /api/admin/rbac/permissions`
- `POST /api/admin/rbac/bindings`
- `GET /api/admin/audit`

## Security Hardening
- JWT contains only identity claims, not full permission graph.
- Permission resolution from D1 with bounded cache in DO/KV.
- Every admin mutation writes audit events.
- Immutable audit rows (append-only, no update endpoint).

## Migration Plan
1. Add tables + backfill default role mappings.
2. Add `authorize` helper and dual-run mode (log-only before enforce).
3. Flip enforcement per router in sequence: admin -> models -> files -> knowledge -> chats.
4. Remove legacy helper divergence (`utils/admin.js` vs `utils/rbac.js`).

## Acceptance Criteria
- All privileged endpoints require explicit permissions.
- Audit log present for all admin writes.
- Integration tests prove deny-by-default on unbound roles.

## OpenWebUI Parity Notes
- Replaces OpenWebUI group/permission semantics with D1-backed policy bindings.
- Keeps parity on principle (granular permissions), not schema identity.
