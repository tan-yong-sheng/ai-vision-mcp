# RBAC Implementation Task Checklist

**Overall Status**: ✅ READY TO EXECUTE
**Worktree**: `.worktrees/claude-backend-rbac` (branch: `claude/backend-rbac`)
**Date**: 2026-03-07

---

## Pre-Implementation Checklist

- [x] Codex orchestrator provided specification
- [x] Worktree created and verified
- [x] All planning documents completed
- [x] Task list created (11 tasks)
- [x] Dependency graph verified
- [x] Code patterns documented
- [x] Security requirements listed
- [x] Success criteria defined

---

## Task Execution Checklist

### PHASE 1: FOUNDATION (1-1.5 hours)

#### Task #3: Create D1 RBAC Schema Migration
**File**: `migrations/008_rbac_core.sql`
**Status**: 📋 PENDING

- [ ] Create migration file
- [ ] Add `roles` table with system roles (owner, admin, manager, member, viewer, service)
- [ ] Add `permissions` table with all permission keys
- [ ] Add `role_permissions` junction table
- [ ] Add `user_roles` table with scope support
- [ ] Add `audit_log` append-only table
- [ ] Seed default roles and permissions
- [ ] Verify migration is idempotent (IF NOT EXISTS)
- [ ] Verify parameterized queries
- [ ] Test on fresh database
- [ ] Mark COMPLETE when done

**Verification**:
- [ ] Migration runs without errors
- [ ] All tables created successfully
- [ ] Default roles exist (6 roles)
- [ ] Default permissions exist (15+ permissions)
- [ ] Idempotent (can run multiple times)

---

#### Task #4: Implement Authorization Core
**File**: `src/utils/authorize.js`
**Status**: 📋 PENDING

- [ ] Create authorize.js module
- [ ] Implement `resolvePermissions(env, user, context)`
- [ ] Implement `authorize(user, action, resourceContext)`
- [ ] Implement `logAuditEvent(env, actor, action, resource_type, resource_id, metadata)`
- [ ] Add denial reasons (missing_permission, inactive_account, insufficient_scope, last_owner_protected, system_role_immutable)
- [ ] Add parameterized DB queries
- [ ] Export all functions
- [ ] Add JSDoc comments
- [ ] Verify no hardcoded secrets
- [ ] Mark COMPLETE when done

**Verification**:
- [ ] authorize() function works correctly
- [ ] Permission resolution from database
- [ ] Denial reasons are machine-readable
- [ ] All queries parameterized
- [ ] No hardcoded secrets
- [ ] Comprehensive JSDoc

---

### PHASE 2: ROUTER MIGRATIONS (1.5-2 hours) [Can parallelize tasks #1, #5, #9-11]

#### Task #1: Refactor users.js Router
**File**: `src/routers/users.js`
**Status**: 📋 PENDING

- [ ] Import `authorize`, `logAuditEvent` from utils/authorize.js
- [ ] Keep GET /api/users/me unchanged
- [ ] Keep PUT /api/users/me unchanged
- [ ] Update GET /api/admin/users - add authorize() check
- [ ] Update admin user mutation endpoints - add authorize()
- [ ] Add last-owner protection logic
- [ ] Add audit logging for role_change events
- [ ] Add audit logging for user_activate/user_deactivate events
- [ ] Verify no inline requireAdmin() calls remain
- [ ] Test role changes create audit logs
- [ ] Test last-owner protection works
- [ ] Mark COMPLETE when done

**Verification**:
- [ ] All role checks replaced with authorize()
- [ ] All mutations logged to audit_log
- [ ] Last-owner protection prevents lockout
- [ ] No requireAdmin() calls remain
- [ ] Backward compatible

---

#### Task #5: Refactor models.js Router
**File**: `src/routers/models.js`
**Status**: 📋 PENDING

- [ ] Import `authorize`, `logAuditEvent`
- [ ] Keep GET endpoints public (public model listing)
- [ ] Add authorize() checks to admin endpoints
- [ ] Add audit logging for model config changes
- [ ] Verify no inline role checks remain
- [ ] Test with non-admin user (should be denied)
- [ ] Test with admin user (should be allowed)
- [ ] Mark COMPLETE when done

**Verification**:
- [ ] Admin endpoints require authorization
- [ ] Model config changes logged
- [ ] Public read endpoints still work
- [ ] No requireAdmin() calls remain

---

#### Task #9: Refactor admin.js Router
**File**: `src/routers/admin.js`
**Status**: 📋 PENDING

- [ ] Import `authorize`, `logAuditEvent`
- [ ] Add authorize() check to stats endpoint
- [ ] Add authorize() check to reindex endpoints
- [ ] Add audit logging for reindex operations
- [ ] Add audit logging for stats retrieval
- [ ] Verify deny-by-default enforcement
- [ ] Mark COMPLETE when done

**Verification**:
- [ ] All admin endpoints check authorization
- [ ] Stats access logged
- [ ] Reindex operations logged
- [ ] Non-admins get 403

---

#### Task #10: Refactor files.js Router
**File**: `src/routers/files.js`
**Status**: 📋 PENDING

- [ ] Import `authorize`, `logAuditEvent`
- [ ] Add authorize() for file operations
- [ ] Add audit logging for uploads and deletions
- [ ] Maintain user isolation (each user sees own files)
- [ ] Verify no admin role checks remain
- [ ] Test file upload creates audit log
- [ ] Test file delete creates audit log
- [ ] Mark COMPLETE when done

**Verification**:
- [ ] User isolation maintained
- [ ] File operations logged
- [ ] No requireAdmin() calls remain

---

#### Task #11: Refactor content routers (prompts, faqs, knowledge)
**File**: `src/routers/prompts.js`, `src/routers/faqs.js`, `src/routers/knowledge.js`
**Status**: 📋 PENDING

- [ ] Import `authorize`, `logAuditEvent` in each
- [ ] Add authorize() checks to all admin endpoints
- [ ] Add audit logging for prompt mutations (prompt_global_flag_change)
- [ ] Add audit logging for FAQ operations (faq_reindex)
- [ ] Add audit logging for knowledge mutations (knowledge_mutation)
- [ ] Verify no inline role checks remain
- [ ] Mark COMPLETE when done

**Verification**:
- [ ] All admin endpoints check authorization
- [ ] Mutations are audited
- [ ] No requireAdmin() calls remain

---

### PHASE 3: INTEGRATION (1 hour)

#### Task #2: Create Admin RBAC Management API
**File**: `src/routers/admin.js` (new endpoints) or `src/routers/rbac.js` (new file)
**Status**: 📋 PENDING

- [ ] Add GET /api/admin/rbac/roles endpoint
- [ ] Add POST /api/admin/rbac/roles endpoint
- [ ] Add PUT /api/admin/rbac/roles/:id endpoint
- [ ] Add GET /api/admin/rbac/permissions endpoint
- [ ] Add POST /api/admin/rbac/bindings endpoint
- [ ] Add GET /api/admin/rbac/bindings endpoint
- [ ] Add GET /api/admin/audit endpoint (with pagination)
- [ ] All endpoints require `admin.rbac.admin` permission
- [ ] All mutations logged to audit_log
- [ ] Mark COMPLETE when done

**Verification**:
- [ ] All RBAC endpoints exist
- [ ] All require admin.rbac.admin permission
- [ ] Role mutations logged
- [ ] Audit retrieval works with filters
- [ ] Pagination works

---

#### Task #8: Update src/index.js Initialization
**File**: `src/index.js`
**Status**: 📋 PENDING

- [ ] Add ensureRBACSchema() function similar to ensureSchemaCompatibility()
- [ ] Call ensureRBACSchema() in fetch() handler
- [ ] Seed default roles/permissions on first request (or use migration)
- [ ] Verify RBAC tables exist before accepting requests
- [ ] Keep auth/session flows unchanged
- [ ] Keep chat ownership protections unchanged
- [ ] Mark COMPLETE when done

**Verification**:
- [ ] RBAC schema check runs at startup
- [ ] Default roles seeded
- [ ] No breaking changes to existing flow

---

### PHASE 4: TESTING & VERIFICATION (1-1.5 hours)

#### Task #6: Write Security Tests
**File**: `test/authorize.test.js` or similar
**Status**: 📋 PENDING

- [ ] Set up test framework (Jest)
- [ ] Create unit tests for authorize() function
- [ ] Test permission resolution for each role
- [ ] Test denial reasons are accurate
- [ ] Test SQL injection prevention (parameterized queries)
- [ ] Test privilege escalation prevention
- [ ] Test last-owner protection
- [ ] Test scope isolation
- [ ] Test audit log creation
- [ ] Create integration tests for router authorization
- [ ] Test allow scenarios (admin can perform action)
- [ ] Test deny scenarios (non-admin cannot)
- [ ] Achieve 80%+ code coverage
- [ ] Mark COMPLETE when done

**Verification**:
- [ ] All tests pass
- [ ] 80%+ coverage achieved
- [ ] No SQL injection vulnerabilities
- [ ] Denial reasons tested
- [ ] Audit logs verified

---

#### Task #7: Create Verification Guide
**File**: `.claude/verification/rbac-test-plan.md`
**Status**: 📋 PENDING

- [ ] Document manual test cases
- [ ] Create allow/deny scenario checklist
- [ ] Create audit log verification checklist
- [ ] Create backward compatibility checklist
- [ ] Create deployment verification steps
- [ ] Document known risks and deferred items
- [ ] Create rollback procedure
- [ ] Mark COMPLETE when done

**Verification**:
- [ ] Manual test plan is comprehensive
- [ ] Covers all admin operations
- [ ] Covers all audit events
- [ ] Includes rollback steps
- [ ] Signed off by implementer

---

## Post-Implementation Checklist

### Code Quality
- [ ] All 11 tasks implemented
- [ ] No hardcoded secrets
- [ ] 100% parameterized queries
- [ ] 100% audit logging (all mutations)
- [ ] No SQL injection vulnerabilities
- [ ] No privilege escalation vectors
- [ ] 80%+ test coverage

### Documentation
- [ ] Code has JSDoc comments
- [ ] Verification guide is complete
- [ ] Risk assessment documented
- [ ] Deferred items listed
- [ ] Deployment procedure documented

### Backward Compatibility
- [ ] Chat creation/deletion works
- [ ] Message sending/retrieval works
- [ ] User login/refresh works
- [ ] Token validation works
- [ ] User profile read works
- [ ] Existing role checks maintained

### Security
- [ ] Last-owner protection works
- [ ] Audit log is append-only
- [ ] Denial messages generic (externally)
- [ ] JWT still lightweight (identity only)
- [ ] Service accounts have minimal permissions
- [ ] Admin endpoints require authorization

### Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Security tests pass
- [ ] Manual verification completed
- [ ] E2E tests (chat flow) pass

---

## Git & Review Checklist

### Before Creating PR
- [ ] All changes committed to claude/backend-rbac branch
- [ ] Branch is up to date with main
- [ ] Commit messages are descriptive
- [ ] No merge conflicts
- [ ] All tests pass locally

### PR Creation
- [ ] PR title is concise (<70 chars)
- [ ] PR description includes:
  - [ ] Summary of changes (3-5 bullet points)
  - [ ] Files changed summary
  - [ ] Migration summary
  - [ ] Permission matrix summary
  - [ ] Audit events emitted
  - [ ] Test plan with TODOs
  - [ ] Manual verification notes
  - [ ] Known risks and deferred items

### Code Review
- [ ] Assigned to code reviewer agent
- [ ] CRITICAL issues addressed
- [ ] HIGH issues addressed
- [ ] MEDIUM issues fixed when possible
- [ ] All feedback incorporated

### Deployment
- [ ] Schema migration applied
- [ ] Default seed data loaded
- [ ] Staging deployment verified
- [ ] Audit logs flowing correctly
- [ ] No breaking changes observed
- [ ] Performance metrics acceptable

---

## Success Criteria - Final Checklist

✅ Completion:
- [ ] All 11 tasks completed
- [ ] All code reviewed and approved
- [ ] All tests passing
- [ ] Manual verification signed off
- [ ] PR merged to main

✅ Quality:
- [ ] 80%+ test coverage
- [ ] 100% parameterized queries
- [ ] 100% audit logging
- [ ] Zero security issues
- [ ] Zero breaking changes

✅ Documentation:
- [ ] Implementation roadmap complete
- [ ] Verification guide complete
- [ ] Risk assessment documented
- [ ] Deferred items listed
- [ ] Deployment procedure documented

✅ Operational:
- [ ] Schema migration idempotent
- [ ] Seed data loads correctly
- [ ] Audit tables populated
- [ ] Admin API endpoints functional
- [ ] Last-owner protection active

---

## Status Board

| Phase | Task | Status | Completion |
|-------|------|--------|-----------|
| 1 | #3 Schema | 📋 PENDING | 0% |
| 1 | #4 authorize.js | 📋 PENDING | 0% |
| 2 | #1 users.js | 📋 PENDING | 0% |
| 2 | #5 models.js | 📋 PENDING | 0% |
| 2 | #9 admin.js | 📋 PENDING | 0% |
| 2 | #10 files.js | 📋 PENDING | 0% |
| 2 | #11 content routers | 📋 PENDING | 0% |
| 3 | #2 Admin API | 📋 PENDING | 0% |
| 3 | #8 index.js | 📋 PENDING | 0% |
| 4 | #6 Tests | 📋 PENDING | 0% |
| 4 | #7 Verification | 📋 PENDING | 0% |

**Overall Progress**: 🟩 0/11 tasks (0%)

---

## Reference Documents

- 📄 IMPLEMENTATION_READY.md - Summary of everything prepared
- 📄 RBAC_QUICK_START.md - Step-by-step guide for each task
- 📄 003_RBAC_IMPLEMENTATION_ROADMAP.md - Full roadmap
- 📄 RBAC_CURRENT_STATUS.md - Current state analysis
- 📄 002_CLAUDE_BACKEND_RBAC_PLAN.md - Original specification

---

**Last Updated**: 2026-03-07
**Status**: ✅ READY TO EXECUTE
