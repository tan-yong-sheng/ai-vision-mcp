# RBAC Backend Implementation - Current Status

**Date**: 2026-03-07
**Status**: Ready for Implementation
**Worktree**: `.worktrees/claude-backend-rbac` (branch `claude/backend-rbac`)

## Overview

The GrowChat backend is ready to implement a production-grade RBAC system. The codebase currently has:

✅ **Existing Structure**:
- Authentication layer (`src/auth.js`) - JWT signing/verification
- Session management (`src/session.js`) - Refresh token handling
- Basic role checks in utilities (`src/utils/admin.js`, `src/utils/rbac.js`)
- Duplicate admin helpers across multiple files
- Coarse-grained role checking (`admin` vs `user`) spread across routers

❌ **Gaps Identified**:
- No centralized authorization entry point
- No audit trail for admin mutations
- No fine-grained permission system
- Inline role checks in 7+ routers (admin, users, models, faqs, prompts, knowledge, files)
- No deny-by-default framework
- No scope-aware permissions (organization, workspace, etc.)

## Implementation Plan

### Phase 1: Schema & Core (Tasks #3-4)
Create database schema with:
- `roles` table - System and custom roles
- `permissions` table - Fine-grained actions
- `role_permissions` - Many-to-many mapping
- `user_roles` - User-to-role assignment with scope support
- `audit_log` - Append-only mutation trail

Build centralized authorization module:
- `authorize(user, action, context)` function
- Permission resolution from database
- Deny-by-default with machine-readable denial reasons
- Parameterized queries only

### Phase 2: Router Migrations (Tasks #1, #5, #9-11)
Replace all inline role checks with `authorize()` calls in:
1. `src/routers/admin.js` - System statistics, reindex operations
2. `src/routers/users.js` - User management, role assignment
3. `src/routers/models.js` - Model configuration
4. `src/routers/prompts.js` - Prompt management
5. `src/routers/faqs.js` - FAQ management
6. `src/routers/knowledge.js` - Knowledge base
7. `src/routers/files.js` - File management

Each migration includes:
- Permission checks via `authorize()`
- Audit logging for all mutations
- Last-owner protections (where applicable)
- Backward compatibility

### Phase 3: Admin API & Integration (Tasks #2, #8)
Add admin-facing endpoints:
- Role management (CRUD)
- Permission management (read, assign)
- User role binding (create, delete)
- Audit log retrieval (paginated, filtered)

Update worker entry point:
- Schema compatibility checks
- Seed data initialization
- RBAC state tracking

### Phase 4: Testing & Verification (Tasks #6-7)
- Unit tests for authorization logic
- Integration tests for router migrations
- Security test suite (SQL injection, privilege escalation)
- Manual verification checklist
- Acceptance criteria verification

## Current Architecture

```
src/
├── index.js              ← Worker entry point, routing
├── auth.js               ← JWT signing/verification (unchanged)
├── db.js                 ← D1 database abstraction
├── session.js            ← Refresh token management (unchanged)
├── utils/
│   ├── admin.js         ← Legacy: isAdmin(), requireAdmin() (will deprecate)
│   ├── rbac.js          ← Legacy: Duplicate helpers (will consolidate)
│   ├── authorize.js     ← NEW: Centralized authorization (Task #4)
│   └── response.js      ← HTTP helpers
├── routers/
│   ├── auth.js          ← Authentication endpoints (unchanged)
│   ├── users.js         ← User endpoints (Task #1 - will add audit)
│   ├── chat.js          ← Chat endpoints (unchanged)
│   ├── admin.js         ← Admin stats (Task #9 - will use authorize)
│   ├── models.js        ← Model config (Task #5 - will use authorize)
│   ├── prompts.js       ← Prompt CRUD (Task #11 - will use authorize)
│   ├── faqs.js          ← FAQ CRUD (Task #11 - will use authorize)
│   ├── knowledge.js     ← Knowledge base (Task #11 - will use authorize)
│   ├── files.js         ← File upload/delete (Task #10 - will use authorize)
│   ├── public.js        ← Public routes (unchanged)
│   └── realtime.js      ← WebSocket routing (unchanged)
└── durable/
    └── message-queue.js ← DO for realtime (unchanged)

migrations/
├── 001_initial.sql      ← Base schema: users, chats, messages
├── 002-007_*.sql        ← Feature migrations
└── 008_rbac_core.sql    ← NEW: RBAC schema (Task #3)
```

## Task Dependencies & Order

**Must Complete In Order**:

1. **Task #3**: Create RBAC migration (schema foundation)
   - Input: None
   - Output: `migrations/008_rbac_core.sql`
   - Blocks: Tasks #1, #2, #4, #5, #8, #9, #10, #11

2. **Task #4**: Implement `authorize.js` core
   - Input: RBAC schema from #3
   - Output: `src/utils/authorize.js`
   - Blocks: All router migrations (#1, #5, #9-11)

3. **Tasks #1, #5, #9-11**: Router migrations (can run in parallel)
   - Input: `authorize.js` from #4
   - Output: Updated routers with `authorize()` calls + audit logging
   - Blocks: Task #2

4. **Task #2**: Admin RBAC API endpoints
   - Input: Updated routers from #1, #5, #9-11
   - Output: New admin API routes
   - Blocks: Task #8

5. **Task #8**: Update `index.js` initialization
   - Input: Admin API routes from #2
   - Output: Schema compatibility checks, seed data loading
   - Blocks: Task #6

6. **Task #6**: Security tests
   - Input: All completed implementations
   - Output: Test suite with 80%+ coverage
   - Blocks: Task #7

7. **Task #7**: Verification guide
   - Input: All completed work
   - Output: Manual test checklist, deployment verification
   - Blocks: PR creation

## Non-Negotiable Requirements (From Plan)

1. ✅ **No breaking changes** to auth/session flows
2. ✅ **JWT stays lightweight** - Only identity claims, no permissions
3. ✅ **Deny-by-default** with clear, machine-readable denial reasons
4. ✅ **Server-side only** - Never trust client-supplied role data
5. ✅ **Idempotent migrations** - Safe for existing D1 databases
6. ✅ **Chat ownership** preserved - User can only access own chats
7. ✅ **Every admin write** emits audit_log row
8. ✅ **Parameterized queries** - No SQL string concatenation
9. ✅ **Wrangler config** includes DO migration metadata if needed

## Permission Matrix (Scope)

**System Roles & Default Permissions**:

| Role | Permissions |
|------|-------------|
| `owner` | All (`admin.*`, `chat.*`, `model.*`, `kb.*`, `file.*`) |
| `admin` | `admin.*`, `model.*`, `kb.reindex`, `file.delete`, audit read |
| `manager` | `kb.*`, `model.use`, `chat.*`, `file.upload` |
| `member` | `chat.*`, `model.use`, `file.upload` |
| `viewer` | `chat.read`, `kb.read`, `file.read` |
| `service` | `chat.write` (AI responses only) |

**Core Permission Keys**:
- `chat.read`, `chat.write`, `chat.delete`, `chat.share`
- `model.use`, `model.admin`
- `kb.read`, `kb.write`, `kb.reindex`
- `file.upload`, `file.delete`
- `admin.user.read`, `admin.user.write`, `admin.audit.read`, `admin.rbac.admin`

## Security Checklist

Before any code is written:
- [ ] No SQL string concatenation (all parameterized)
- [ ] Deny-by-default enforced everywhere
- [ ] Audit table is append-only (no UPDATE/DELETE)
- [ ] JWT secret never exposed in logs or errors
- [ ] Last-owner protection prevents locking out admins
- [ ] Denial reasons generic externally, detailed in audit
- [ ] Service accounts default to minimal permissions
- [ ] Rate limiting on admin endpoints (inherited from system)

## Key Files to Review

**Current Implementation**:
- `src/utils/admin.js` (26 lines) - Simple isAdmin/requireAdmin
- `src/utils/rbac.js` (49 lines) - Duplicate helpers + email validation
- `src/index.js` (212 lines) - Worker entry point, routing
- `src/routers/admin.js` (200+ lines) - Stats and reindex endpoints
- `src/routers/users.js` (300+ lines) - User profile and admin endpoints

**Related Architecture**:
- `AGENTS.md` - Overall project structure
- `002_CLAUDE_BACKEND_RBAC_PLAN.md` - Requirements specification
- `.claude/memory/phase-01-rbac-and-user-governance.md` - RBAC principles

## Testing Strategy

**Unit Tests** (authorize.js):
- Permission resolution for each role
- Denial reason accuracy
- Scope isolation
- Last-owner protection logic
- Permission inheritance chains

**Integration Tests** (routers):
- Admin stats endpoint with various user roles
- User role change with audit logging
- Model config mutation with audit
- Last-owner protection blocks demotion

**Security Tests**:
- SQL injection prevention (parameterized queries)
- Privilege escalation attempts (scope isolation)
- Rate limiting on admin operations
- Audit log integrity (append-only)

**E2E Tests** (chat flow):
- Regular user can chat, create chats (unchanged)
- Admin sees stats, can change user roles
- Inactive user cannot access API
- Token refresh works (unchanged)

## Deployment Verification

Before merging to main:
1. ✅ All 11 tasks marked completed
2. ✅ Code reviewer agent approval (CRITICAL and HIGH issues addressed)
3. ✅ Test suite passes (80%+ coverage)
4. ✅ Manual verification checklist signed off
5. ✅ Zero breaking changes to existing APIs
6. ✅ Audit logs being created for admin mutations
7. ✅ Schema migration is idempotent
8. ✅ Wrangler config includes any DO migrations

## Next Actions

1. ✅ **Worktree created**: `.worktrees/claude-backend-rbac`
2. ✅ **Task list created**: 11 tasks in dependency order
3. ✅ **Implementation roadmap created**: `003_RBAC_IMPLEMENTATION_ROADMAP.md`
4. **Ready to start**: Task #3 (Create D1 RBAC Schema Migration)

---

## Quick Reference

| Item | Value |
|------|-------|
| Worktree | `.worktrees/claude-backend-rbac` |
| Branch | `claude/backend-rbac` |
| Entry Point | `src/index.js` |
| Database | D1 (SQLite) binding: `env.DB` |
| Schema Migration | `migrations/008_rbac_core.sql` |
| Auth Core | `src/utils/authorize.js` |
| Admin Utils | `src/utils/admin.js` (deprecating) |
| Test Framework | Jest (not yet configured) |
| Coverage Target | 80%+ |

---

**Status**: ✅ READY TO PROCEED
**Estimated Duration**: 4-6 hours for full implementation
**Risk Level**: LOW (well-scoped, proven patterns)
**Last Updated**: 2026-03-07
