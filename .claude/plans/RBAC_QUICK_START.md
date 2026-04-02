# RBAC Backend Implementation - Quick Start Guide

**Status**: Ready to Begin Implementation
**Date**: 2026-03-07
**Codex Orchestrator**: Claude Backend RBAC Phase

## What You're Implementing

A production-grade Role-Based Access Control (RBAC) system for GrowChat that replaces ad-hoc role checks with:
- Centralized permission resolution
- Audit trail for all admin mutations
- Fine-grained permissions (not just admin/user)
- Last-owner protections
- Deny-by-default enforcement

## Worktree Setup (Already Done ✅)

Your worktree is ready:
```bash
# You are here:
cd /workspaces/GrowChat/.worktrees/claude-backend-rbac

# Branch: claude/backend-rbac
# Status: Clean (no changes yet)
```

## Task Execution Order

**CRITICAL**: Complete in this order (dependencies matter):

### 1️⃣ Task #3: Create RBAC Schema Migration
**File**: `migrations/008_rbac_core.sql`

What to build:
- `roles` table (id, name, system, created_at)
- `permissions` table (id, key, description)
- `role_permissions` junction table
- `user_roles` with scope support
- `audit_log` append-only table
- Default seed data (owner, admin, manager, member, viewer, service roles)

**Key Requirements**:
- Idempotent (`IF NOT EXISTS` on all creates)
- Safe for existing databases (no breaking changes)
- Parameterized queries only
- Include default permissions for chat, model, kb, file, admin

**Must Include**:
```sql
-- System roles
INSERT OR IGNORE INTO roles (id, name, system, created_at) VALUES
  ('role-owner', 'owner', 1, unixepoch()),
  ('role-admin', 'admin', 1, unixepoch()),
  ...

-- Core permissions
INSERT OR IGNORE INTO permissions (id, key, description) VALUES
  ('perm-chat-read', 'chat.read', 'Read user chats'),
  ('perm-chat-write', 'chat.write', 'Create/update chats'),
  ...

-- Role-permission mappings
INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES
  ('role-admin', 'perm-admin-all'),
  ...
```

**Verification**: Migration runs without errors on fresh DB ✅

---

### 2️⃣ Task #4: Implement Authorization Core
**File**: `src/utils/authorize.js`

What to build:
- `resolvePermissions(env, user, context)` - Load permissions from DB
- `authorize(user, action, resourceContext)` - Check permission
- Standardized denial object with reason codes
- Helper: `logAuditEvent(env, actor_id, action, resource_type, resource_id, metadata)`

**Key API**:
```javascript
// Check if user can perform action
const decision = await authorize(env, user, {
  action: 'admin.user.write',
  resource: 'user',
  resourceId: targetId
});

if (!decision.allow) {
  // Machine-readable reason for logging
  return error(req, decision.reason, 403);
}

// Log the mutation
await logAuditEvent(env, {
  actor_id: user.sub,
  action: 'role_change',
  resource_type: 'user',
  resource_id: targetId,
  metadata: { old_role: 'user', new_role: 'admin' }
});
```

**Denial Reasons** (machine-readable):
- `missing_permission` - User lacks required permission
- `inactive_account` - User is deactivated
- `insufficient_scope` - Permission doesn't apply to this resource
- `last_owner_protected` - Cannot demote last admin
- `system_role_immutable` - Cannot modify system role

**Parameterized Queries Only**:
```javascript
// DO THIS:
await env.DB.prepare('SELECT ... WHERE role_id = ? AND user_id = ?')
  .bind([roleId, userId]).all();

// NEVER THIS:
await env.DB.prepare(`SELECT ... WHERE role_id = ${roleId}`).all();
```

**Must Test**:
- Permission resolution for each role
- Denial reason accuracy
- Scope isolation (users can't see others' permissions)
- Last-owner protection logic

**Verification**:
- `authorize()` exported and usable
- All queries parameterized
- Denial reasons machine-readable
- No hardcoded secrets in code ✅

---

### 3️⃣ Task #1: Refactor users.js Router
**File**: `src/routers/users.js`

What to change:
- Keep `GET /api/users/me` unchanged (user profile)
- Keep `PUT /api/users/me` unchanged (settings, avatar)
- **CHANGE**: `GET /api/admin/users` - Use `authorize()`
- **CHANGE**: `POST /api/admin/users/:id/roles` - Add audit logging
- **ADD**: Check last-owner before demoting/deactivating

**Example Pattern**:
```javascript
// OLD:
if (!requireAdmin(user)) return error(req, 'Forbidden', 403);

// NEW:
const decision = await authorize(env, user, {
  action: 'admin.user.write',
  resource: 'user',
  resourceId: targetUserId
});
if (!decision.allow) return error(req, decision.reason, 403);

// Then log the mutation:
await logAuditEvent(env, {
  actor_id: user.sub,
  action: 'role_change',
  resource_type: 'user',
  resource_id: targetUserId,
  metadata: { old_role: oldRole, new_role: newRole }
});
```

**Last-Owner Protection**:
```javascript
// Before allowing role demotion:
const adminCount = await env.DB.prepare(
  'SELECT COUNT(*) as count FROM user_roles ur
   INNER JOIN roles r ON ur.role_id = r.id
   WHERE r.name = "admin" AND ur.user_id != ?'
).bind([userId]).first();

if (adminCount.count === 0 && newRole !== 'admin') {
  return error(req, 'Cannot demote last admin', 409);
}
```

**Audit Events to Log**:
- `role_change` - User role assignment changed
- `user_activate` - User reactivated
- `user_deactivate` - User deactivated

**Verification**:
- No inline `requireAdmin()` calls remain
- Audit logs created for all mutations
- Last-owner protection works
- Backward compatible (chat owner checks still work) ✅

---

### 4️⃣ Task #5: Refactor models.js Router
**File**: `src/routers/models.js`

What to change:
- Keep `GET /api/models` public (model listing)
- **CHANGE**: Admin endpoints use `authorize()`
- **ADD**: Audit logging for config changes

**Pattern**:
- Replace `requireAdmin(user)` with `authorize()` calls
- Add audit logging for model config mutations
- Maintain backward compatibility

**Verification**:
- All admin endpoints use `authorize()`
- Model config changes logged
- No hardcoded role checks remain ✅

---

### 5️⃣ Task #9: Refactor admin.js Router
**File**: `src/routers/admin.js`

What to change:
- Keep `GET /api/admin/stats` but add `authorize()` check
- **ADD**: Audit logging for reindex operations
- Ensure deny-by-default for all endpoints

**Audit Events**:
- `stats_query` - System statistics retrieved
- `reindex_start` - FAQ/document reindex initiated

**Verification**:
- All endpoints check `authorize()`
- Reindex operations logged
- Stats access logged ✅

---

### 6️⃣ Task #10: Refactor files.js Router
**File**: `src/routers/files.js`

What to change:
- Replace role checks with `authorize()` for admin endpoints
- Audit all file uploads/deletions
- Maintain user isolation (each user sees only own files)

**Permissions to Check**:
- `file.upload` - Allow file uploads
- `file.delete` - Allow file deletion
- `file.read` - Implicit (user sees own files only)

**Audit Events**:
- `file_upload` - File uploaded
- `file_delete` - File deleted

**Verification**:
- User isolation maintained (can't access others' files)
- File operations logged
- No admin role checks remain ✅

---

### 7️⃣ Task #11: Refactor content routers (prompts, faqs, knowledge)
**File**: `src/routers/prompts.js`, `src/routers/faqs.js`, `src/routers/knowledge.js`

What to change:
- Replace `requireAdmin()` with `authorize()` calls
- Add audit logging for mutations

**Permissions**:
- `model.admin` → Prompts (global flag changes)
- `kb.write` → Knowledge base mutations
- `kb.reindex` → FAQ reindex operations

**Audit Events**:
- `prompt_global_flag_change` - Prompt visibility changed
- `knowledge_mutation` - Knowledge base content changed
- `faq_reindex` - FAQ reindexing started

**Verification**:
- All admin endpoints use `authorize()`
- Mutations are audited
- No `requireAdmin()` calls remain ✅

---

### 8️⃣ Task #2: Create Admin RBAC API Endpoints
**File**: `src/routers/admin.js` (new endpoints) or create `src/routers/rbac.js`

Add endpoints (all require `admin.rbac.admin` permission):

```javascript
// GET /api/admin/rbac/roles
// Return: [{ id, name, system, created_at, permissions: [...] }]

// POST /api/admin/rbac/roles
// Body: { name, permissions: ['chat.read', ...] }
// Return: { id, name, ... }

// PUT /api/admin/rbac/roles/:id
// Body: { permissions: [...] }
// Return: { id, ... }

// GET /api/admin/rbac/permissions
// Return: [{ id, key, description }]

// POST /api/admin/rbac/bindings
// Body: { user_id, role_id, scope_type, scope_id }
// Return: { user_id, role_id, ... }

// GET /api/admin/rbac/bindings
// Query: ?user_id=...&role_id=...
// Return: [{ user_id, role_id, ... }]

// GET /api/admin/audit
// Query: ?actor_id=...&action=...&limit=100&offset=0
// Return: { entries: [...], total, limit, offset }
```

**Verification**:
- All endpoints check `admin.rbac.admin` permission
- Role mutations logged
- Audit retrieval works ✅

---

### 9️⃣ Task #8: Update src/index.js
**File**: `src/index.js`

What to add:
- Call `ensureRBACSchema()` alongside schema compatibility check
- Seed default roles/permissions on first request

**Pattern**:
```javascript
async function ensureRBACSchema(env) {
  // Check if roles table exists
  const info = await env.DB.prepare('PRAGMA table_info(roles)').all();
  if (info.results?.length > 0) return; // Already exists

  // Seed default data
  // (This should be in migration, but add fallback here)
  // ...
}

// In fetch():
await ensureSchemaCompatibility(env);
await ensureRBACSchema(env);
```

**Verification**:
- RBAC schema check runs at startup
- Default roles seeded
- No breaking changes to existing flow ✅

---

### 🔟 Task #6: Write Security Tests
**File**: `test/authorize.test.js` or similar

Test coverage (80%+ target):

```javascript
describe('authorize()', () => {
  test('admin can perform admin.user.write', async () => {
    const result = await authorize(env, adminUser, {
      action: 'admin.user.write',
      resource: 'user'
    });
    expect(result.allow).toBe(true);
  });

  test('member cannot perform admin.user.write', async () => {
    const result = await authorize(env, memberUser, {
      action: 'admin.user.write',
      resource: 'user'
    });
    expect(result.allow).toBe(false);
    expect(result.reason).toBe('missing_permission');
  });

  test('parameterized queries prevent SQL injection', async () => {
    // Try injecting malicious SQL
    const maliciousInput = "admin' OR '1'='1";
    const result = await authorize(env, user, {
      action: 'admin.user.write',
      resourceId: maliciousInput
    });
    // Should not execute injected SQL
    expect(result.allow).toBe(false);
  });

  test('last-owner protection prevents demoting final admin', async () => {
    // ...test logic...
  });
});
```

**Verification**:
- 80%+ code coverage achieved
- No SQL injection vulnerabilities
- All permission scenarios tested
- Denial reasons verified ✅

---

### 1️⃣1️⃣ Task #7: Create Verification Guide
**File**: `.claude/verification/rbac-test-plan.md`

Document:
- Manual test cases (allow/deny scenarios)
- Audit log verification checklist
- Backward compatibility confirmation
- Deployment verification steps
- Risk assessment

**Verification Checklist**:
- [ ] Chat flow works (user can create/send messages)
- [ ] Auth flow works (login/refresh still works)
- [ ] User can retrieve own profile
- [ ] Admin can get system statistics
- [ ] Admin can change user roles
- [ ] Audit logs created for role changes
- [ ] Inactive user cannot access API
- [ ] Last-owner protection prevents locking out admins
- [ ] SQL injection attempts blocked
- [ ] Denial reasons are machine-readable

---

## Key Code Patterns

### Pattern 1: Permission Check + Audit
```javascript
const decision = await authorize(env, user, {
  action: 'admin.user.write',
  resource: 'user',
  resourceId: targetUserId
});
if (!decision.allow) return error(req, decision.reason, 403);

// Perform mutation...
await updateUserRole(env, targetUserId, newRole);

// Log it
await logAuditEvent(env, {
  actor_id: user.sub,
  action: 'role_change',
  resource_type: 'user',
  resource_id: targetUserId,
  metadata: { old_role: oldRole, new_role: newRole }
});
```

### Pattern 2: Parameterized Queries
```javascript
// Use bind() for ALL user-supplied values:
await env.DB.prepare('SELECT ... WHERE user_id = ? AND role = ?')
  .bind([userId, roleName])
  .all();

// Queries with IN clauses:
await env.DB.prepare('SELECT ... WHERE permission_key IN (?, ?, ?)')
  .bind(['chat.read', 'chat.write', 'chat.delete'])
  .all();
```

### Pattern 3: Deny by Default
```javascript
// Check permission first, assume denial:
const decision = await authorize(env, user, { action: 'admin.something' });
if (!decision.allow) return error(req, decision.reason, 403);

// ONLY then proceed with operation
```

---

## File References

**Important Files**:
- `migrations/001_initial.sql` - Current schema (reference only)
- `src/index.js` - Worker entry point (will modify)
- `src/utils/admin.js` - Current helpers (will deprecate)
- `src/utils/rbac.js` - Duplicate helpers (will consolidate)
- `wrangler.jsonc` - Worker config (check D1 binding)

**Your New Files**:
- `migrations/008_rbac_core.sql` ← Start here
- `src/utils/authorize.js` ← Core logic
- `test/authorize.test.js` ← Test suite

---

## Common Pitfalls to Avoid

❌ **String Concatenation in SQL**:
```javascript
// WRONG:
await env.DB.prepare(`SELECT ... WHERE user_id = '${userId}'`).all();

// RIGHT:
await env.DB.prepare('SELECT ... WHERE user_id = ?').bind([userId]).all();
```

❌ **Trusting Client Roles**:
```javascript
// WRONG:
const userRole = req.body.role; // User might fake this

// RIGHT:
const userRole = user.role; // From verified JWT or DB lookup
```

❌ **Forgetting Audit Logs**:
```javascript
// WRONG:
await changeUserRole(env, userId, newRole); // No audit!

// RIGHT:
await changeUserRole(env, userId, newRole);
await logAuditEvent(env, { actor_id, action, resource_type, ... });
```

❌ **Forgetting Last-Owner Check**:
```javascript
// WRONG:
await demoteUser(env, userId, newRole); // Could lock out all admins!

// RIGHT:
const adminCount = await getAdminCount(env, userId);
if (adminCount === 0) return error(req, 'Cannot demote last admin', 409);
await demoteUser(env, userId, newRole);
```

---

## Metrics to Track

As you implement, track:
- **Lines of code changed**: Target < 2000 (focused, not scattered)
- **Test coverage**: Target 80%+
- **Parameterized queries**: 100% (all D1 calls parameterized)
- **Audit events**: Every mutation logged
- **Backward compatibility**: Zero breaking changes to chat/auth

---

## Success Criteria

✅ All 11 tasks completed
✅ Zero breaking changes to existing APIs
✅ All admin mutations emit audit logs
✅ 80%+ test coverage achieved
✅ Manual verification checklist signed off
✅ PR approved by code reviewer agent
✅ Deployable to staging without errors

---

## Quick Links

- 📋 Main Plan: `002_CLAUDE_BACKEND_RBAC_PLAN.md`
- 📊 Roadmap: `003_RBAC_IMPLEMENTATION_ROADMAP.md`
- 📈 Status: `RBAC_CURRENT_STATUS.md`
- 🔗 Architecture: `AGENTS.md`

---

**Ready to proceed with Task #3?** You have all the information you need!
**Next Step**: Implement `migrations/008_rbac_core.sql`
