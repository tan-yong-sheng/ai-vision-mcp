# 003 - RBAC Implementation Roadmap

**Status**: In Progress
**Worktree**: `.worktrees/claude-backend-rbac` (branch: `claude/backend-rbac`)
**Date Started**: 2026-03-07

## Executive Summary

This document outlines the detailed implementation roadmap for the GrowChat backend RBAC system as defined in `002_CLAUDE_BACKEND_RBAC_PLAN.md`. The implementation is divided into 11 core tasks in dependency order with clear acceptance criteria.

## Task Dependencies

```
Task #3 (RBAC Schema)
    ↓
Task #4 (authorize.js Core)
    ↓
Tasks #1, #5, #9, #10, #11 (Router Migrations) [PARALLEL]
    ↓
Task #2 (Admin RBAC API)
    ↓
Task #8 (Index.js Initialization)
    ↓
Task #6 (Security Tests)
    ↓
Task #7 (Verification Guide)
```

## Implementation Phases

### Phase 1: Foundation (Tasks #3-4)
- Create RBAC database schema with idempotent migration
- Build centralized authorization core (`authorize.js`)
- Ensure deny-by-default model with clear denial reasons
- Set up seed data for default roles and permissions

**Acceptance Criteria**:
- Schema migration is idempotent and safe for existing databases
- `authorize()` function exported and ready for use
- All permissions enumerated in database
- System roles (owner, admin, manager, member, viewer, service) seeded
- No breaking changes to existing auth/JWT system

### Phase 2: Router Migration (Tasks #1, #5, #9, #10, #11)
- Migrate each router away from inline `requireAdmin()` calls
- Replace with parameterized `authorize(user, action, context)` calls
- Add audit logging for all admin mutations
- Maintain backward compatibility with existing request/response formats

**Routers to Migrate**:
1. **admin.js** (#9) - Stats, reindex operations → audit all mutations
2. **users.js** (#1) - User role changes, deactivation → audit with old/new values
3. **models.js** (#5) - Model config mutations → audit configuration changes
4. **prompts.js, faqs.js, knowledge.js** (#11) - Content admin mutations → audit all
5. **files.js** (#10) - File access control → audit uploads/deletes

**Acceptance Criteria** (per router):
- All role checks replaced with `authorize()` calls
- Each admin mutation emits audit_log row
- No inline `requireAdmin()` or role string checks remain
- Backward compatibility maintained
- Parameterized queries only (no string concatenation)

### Phase 3: Admin API & Integration (Tasks #2, #8)
- Build admin-facing RBAC management endpoints
- Initialize RBAC at worker startup
- Seed default roles/permissions on first request
- Ensure schema compatibility check for RBAC tables

**Admin Endpoints**:
- `GET /api/admin/rbac/roles`
- `POST /api/admin/rbac/roles`
- `PUT /api/admin/rbac/roles/:id`
- `GET /api/admin/rbac/permissions`
- `POST /api/admin/rbac/bindings`
- `GET /api/admin/rbac/bindings`
- `GET /api/admin/audit`

**Acceptance Criteria**:
- All RBAC endpoints require `admin.rbac.admin` permission
- Audit logs created for role/permission mutations
- Worker startup includes schema compatibility check
- Seed data applied idempotently
- Wrangler config updated if DO migrations needed

### Phase 4: Testing & Verification (Tasks #6, #7)
- Write comprehensive security tests (80%+ coverage)
- Document manual verification steps
- Create rollout checklist
- Identify risks and deferred items

**Acceptance Criteria**:
- Unit tests for `authorize()` with various permissions
- Integration tests for router authorization paths
- Audit log generation verified
- SQL injection prevention confirmed
- Manual test cases for allow/deny scenarios documented
- Risk assessment and deferred items captured

## File Changes Summary

### New Files
- `migrations/008_rbac_core.sql` - RBAC schema and default seed data
- `src/utils/authorize.js` - Centralized authorization core
- `.claude/verification/rbac-test-plan.md` - Manual verification guide

### Modified Files
- `src/index.js` - Add RBAC schema compatibility check
- `src/routers/admin.js` - Replace role checks with `authorize()`
- `src/routers/users.js` - Add audit logging for user mutations
- `src/routers/models.js` - Use `authorize()` for config endpoints
- `src/routers/prompts.js` - Audit prompt mutations
- `src/routers/faqs.js` - Audit reindex operations
- `src/routers/knowledge.js` - Audit knowledge mutations
- `src/routers/files.js` - Use `authorize()` for file access
- `src/utils/admin.js` - Deprecate or reduce to thin wrapper (if needed)
- `src/utils/rbac.js` - Remove duplicate code after `authorize.js` exists
- `wrangler.jsonc` - Add DO migration metadata if needed

### Database Schema
New tables:
- `roles(id, name, system, created_at)`
- `permissions(id, key, description)`
- `role_permissions(role_id, permission_id)`
- `user_roles(user_id, role_id, scope_type, scope_id)`
- `audit_log(id, actor_id, action, resource_type, resource_id, metadata, created_at)`

## Key Implementation Notes

### Authorization Core Design
```javascript
// Standard usage pattern
const decision = await authorize(env, user, {
  action: 'admin.user.write',
  resource: 'user',
  resourceId: targetUserId,
  context: { oldRole: 'user', newRole: 'admin' }
});

if (!decision.allow) {
  return error(req, decision.reason, 403);  // machine-readable
}

// Emit audit log
await logAuditEvent(env, {
  actor_id: user.sub,
  action: 'role_change',
  resource_type: 'user',
  resource_id: targetUserId,
  metadata: { old_role: 'user', new_role: 'admin' }
});
```

### Audit Trail Events
Each router should emit these events:
- **admin.js**: `stats_query`, `reindex_start`
- **users.js**: `role_change`, `user_deactivate`, `user_activate`
- **models.js**: `model_config_update`
- **prompts.js**: `prompt_global_flag_change`
- **faqs.js**: `faq_reindex`
- **knowledge.js**: `knowledge_mutation`
- **files.js**: `file_upload`, `file_delete`

### Last-Owner Protection
Before allowing a user to be demoted from their last admin role:
```javascript
const adminCount = await env.DB.prepare(
  'SELECT COUNT(*) as count FROM user_roles ur
   INNER JOIN roles r ON ur.role_id = r.id
   WHERE r.name = ? AND ur.user_id != ?'
).bind(['admin', userId]).first();

if (adminCount.count === 0) {
  return error(req, 'Cannot demote last admin', 409);
}
```

## Security Checklist

Before deployment:
- [ ] No hardcoded secrets in migration files
- [ ] All D1 queries use parameterized statements
- [ ] Audit log is append-only (no UPDATE/DELETE allowed)
- [ ] Denial messages generic externally, detailed in audit
- [ ] JWT still carries only identity claims
- [ ] Admin endpoints require explicit `admin.rbac.admin` permission
- [ ] No circular role dependencies possible
- [ ] Scope isolation enforced (users can't see other users' scoped permissions)
- [ ] Service accounts default to minimal permissions

## Rollout Strategy

### Local Testing
1. Apply migration to local D1
2. Seed default roles/permissions
3. Test each router with `authorize()` calls
4. Verify audit logs are created correctly
5. Test allow and deny scenarios

### Staging Deployment
1. Deploy to staging worker with new schema
2. Run full E2E test suite
3. Verify no breaking changes to chat/auth flows
4. Check audit log tables populate correctly

### Production Rollout
1. Deploy worker with schema migration
2. Monitor logs for compatibility errors
3. Verify audit tables are in use
4. Document any issues for next phase

## Deferred Items (Not in Scope)

- UI admin panel for role management (Future: Phase 3)
- Fine-grained object-level permissions (Future: Phase 3)
- Permission inheritance chains (Future: Phase 3)
- SSO integration with RBAC (Future: Phase 4)
- Audit log retention policies (Future: Phase 3)
- Real-time permission change propagation (Future: Phase 3)

## Risk Assessment

### High Confidence
- RBAC schema design is proven and battle-tested
- Authorization core is simple deny-by-default logic
- Existing auth/JWT flows unchanged
- Audit logging is append-only (safe)

### Medium Confidence
- Router migration scope (11 files) requires careful testing
- Backward compatibility with existing chats/sessions needs verification
- Open-webui integration (if relevant) needs cross-check

### Known Risks
- If last-owner check fails, could lock out all admins → Mitigated by thorough testing
- Migration rollback complexity → Mitigated by idempotent schema
- Performance impact of permission resolution → Mitigated by caching strategy (future)

## Success Metrics

1. ✅ All 11 tasks completed and reviewed
2. ✅ Zero breaking changes to chat/auth flows
3. ✅ All admin mutations emit audit logs
4. ✅ 80%+ test coverage achieved
5. ✅ Manual verification checklist passes
6. ✅ PR review approved by code reviewer agent
7. ✅ Deployment to staging verified
8. ✅ All acceptance criteria met

## Related Documentation

- `002_CLAUDE_BACKEND_RBAC_PLAN.md` - Original plan and requirements
- `.claude/memory/phase-01-rbac-and-user-governance.md` - RBAC principles
- `AGENTS.md` - GrowChat architecture overview
- `wrangler.jsonc` - Worker configuration

---

**Next Steps**: Begin with Task #3 (RBAC Schema Migration)
