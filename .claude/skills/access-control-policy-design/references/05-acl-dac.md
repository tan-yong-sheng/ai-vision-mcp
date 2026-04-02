# Reference: ACL & DAC — Access Control Lists and Discretionary Access Control
## Deep Developer Guide

### Table of Contents
1. [ACL Mechanics & Use Cases](#1-acl-mechanics--use-cases)
2. [ACL Data Models](#2-acl-data-models)
3. [Row-Level Security (Database ACLs)](#3-row-level-security-database-acls)
4. [DAC Design Patterns](#4-dac-design-patterns)
5. [DAC Guardrails (Required for Regulated Apps)](#5-dac-guardrails-required-for-regulated-apps)
6. [ACL + RBAC Composition](#6-acl--rbac-composition)
7. [Audit & Compliance Considerations](#7-audit--compliance-considerations)

---

## 1. ACL Mechanics & Use Cases

An ACL (Access Control List) is an explicit list attached to a resource that declares
who can do what to it. The resource is its own access ledger.

```
resource: /documents/invoice_q3.pdf
ACL:
  alice         → [read, write, share]
  bob           → [read]
  group:finance → [read, write, approve]
  group:auditors→ [read]
```

### When ACLs are the right tool

**Use ACLs for:**
- Object-level exceptions that don't fit into role-based rules
- Per-resource sharing in collaborative tools (bounded scope)
- Cloud storage buckets (S3, GCS, Azure Blob) — these are ACL-native
- Database row-level security
- POSIX file system permissions

**Do NOT use ACLs as your primary model when:**
- You have thousands of resources (becomes a maintenance sink)
- You need centralized visibility into "who has access to what"
- Permissions change frequently across many resources
- Your compliance team needs to produce access reports

---

## 2. ACL Data Models

### Simple ACL table (PostgreSQL)
```sql
-- ACL table: links subjects (users/groups) to resources with permissions
CREATE TABLE resource_acls (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_type   TEXT NOT NULL,           -- 'document', 'folder', 'report'
    resource_id     UUID NOT NULL,
    subject_type    TEXT NOT NULL,           -- 'user', 'group', 'role'
    subject_id      UUID NOT NULL,
    permissions     TEXT[] NOT NULL,         -- ['read','write','share','delete']
    granted_by      UUID REFERENCES users(id),
    granted_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at      TIMESTAMPTZ,             -- NULL = no expiry
    reason          TEXT,                    -- Audit trail context
    UNIQUE (resource_type, resource_id, subject_type, subject_id)
);

CREATE INDEX idx_acl_resource ON resource_acls(resource_type, resource_id);
CREATE INDEX idx_acl_subject  ON resource_acls(subject_type, subject_id);
CREATE INDEX idx_acl_expiry   ON resource_acls(expires_at) WHERE expires_at IS NOT NULL;
```

### Check ACL permission (Python)
```python
from datetime import datetime
from typing import List, Optional

async def check_acl_permission(
    db,
    subject_id:    str,
    subject_groups: List[str],
    resource_type:  str,
    resource_id:    str,
    action:         str,
) -> bool:
    """Check if subject has permission via ACL, including group membership."""
    now = datetime.utcnow()

    # Build subject set: direct user + all group memberships
    subject_clauses = (
        [("user", subject_id)] +
        [("group", gid) for gid in subject_groups]
    )

    for subject_type, sid in subject_clauses:
        row = await db.fetchrow("""
            SELECT permissions FROM resource_acls
            WHERE resource_type = $1
              AND resource_id    = $2
              AND subject_type   = $3
              AND subject_id     = $4
              AND (expires_at IS NULL OR expires_at > $5)
        """, resource_type, resource_id, subject_type, sid, now)

        if row and action in row["permissions"]:
            return True

    return False
```

### Revoke ACL (important: clean up on user departure)
```python
async def revoke_acl(db, resource_type, resource_id, subject_id):
    """Remove all permissions for a subject on a resource."""
    await db.execute("""
        DELETE FROM resource_acls
        WHERE resource_type = $1
          AND resource_id   = $2
          AND subject_id    = $3
    """, resource_type, resource_id, subject_id)
    # Also audit log the revocation
    await audit_log("acl_revoked", resource_type, resource_id, subject_id)

async def revoke_all_user_acls(db, user_id):
    """Called when a user is deprovisioned — removes all their ACL entries."""
    rows = await db.fetch("""
        DELETE FROM resource_acls
        WHERE subject_id = $1
        RETURNING resource_type, resource_id, permissions
    """, user_id)
    await audit_log_bulk("user_deprovisioned_acl_cleanup", user_id, rows)
```

---

## 3. Row-Level Security (Database ACLs)

PostgreSQL RLS enforces ACLs directly in the database — no app-layer check needed.

```sql
-- Enable RLS on the documents table
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Policy: users can only see documents they own OR have ACL access to
CREATE POLICY document_select_policy ON documents
    FOR SELECT
    USING (
        -- Owner can always read
        owner_id = current_setting('app.current_user_id')::uuid
        OR
        -- ACL grants read permission
        EXISTS (
            SELECT 1 FROM resource_acls
            WHERE resource_type = 'document'
              AND resource_id   = documents.id
              AND subject_id    = current_setting('app.current_user_id')::uuid
              AND 'read'        = ANY(permissions)
              AND (expires_at IS NULL OR expires_at > now())
        )
    );

-- Tenant isolation policy (always required for multi-tenant)
CREATE POLICY tenant_isolation_policy ON documents
    FOR ALL
    USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

```python
# Set session context before each query
async def execute_with_context(db, user_id: str, tenant_id: str, query: str, *args):
    async with db.transaction():
        await db.execute("SELECT set_config('app.current_user_id', $1, true)", user_id)
        await db.execute("SELECT set_config('app.current_tenant_id', $1, true)", tenant_id)
        return await db.fetch(query, *args)
```

---

## 4. DAC Design Patterns

DAC (Discretionary Access Control) gives resource owners the ability to grant and
revoke access to their own resources.

### Owner-driven sharing model
```python
async def share_resource(
    db,
    owner_id:      str,
    resource_id:   str,
    resource_type: str,
    target_user_id: str,
    permissions:   List[str],
    expires_days:  Optional[int] = None,
) -> dict:
    """Owner shares their resource with another user."""

    # Verify the sharer actually owns this resource
    resource = await db.fetchrow(
        "SELECT owner_id, tenant_id FROM resources WHERE id = $1",
        resource_id
    )
    if not resource or str(resource["owner_id"]) != owner_id:
        raise PermissionError("Only the resource owner can share it")

    # Verify target user is in same tenant (DAC guardrail)
    target = await db.fetchrow(
        "SELECT tenant_id FROM users WHERE id = $1",
        target_user_id
    )
    if str(target["tenant_id"]) != str(resource["tenant_id"]):
        raise ValueError("Cannot share outside your organization")

    # Enforce permission boundaries (DAC guardrail)
    allowed_permissions = get_shareable_permissions(owner_id, resource_id)
    invalid = set(permissions) - set(allowed_permissions)
    if invalid:
        raise ValueError(f"Cannot grant permissions: {invalid}")

    expires_at = (
        datetime.utcnow() + timedelta(days=expires_days)
        if expires_days else None
    )

    await db.execute("""
        INSERT INTO resource_acls
            (resource_type, resource_id, subject_type, subject_id, permissions,
             granted_by, expires_at, reason)
        VALUES ($1, $2, 'user', $3, $4, $5, $6, 'owner_share')
        ON CONFLICT (resource_type, resource_id, subject_type, subject_id)
        DO UPDATE SET permissions = $4, expires_at = $6, granted_by = $5
    """, resource_type, resource_id, target_user_id, permissions, owner_id, expires_at)

    await audit_log("resource_shared", {
        "resource_id": resource_id, "granted_to": target_user_id,
        "permissions": permissions, "by": owner_id
    })
    return {"success": True, "expires_at": expires_at}
```

---

## 5. DAC Guardrails (Required for Regulated Apps)

Unbounded DAC is a compliance liability. Always apply these constraints:

### Guardrail 1 — No cross-tenant sharing
```python
# Always verify same tenant before allowing any share
assert source_tenant_id == target_tenant_id, "Cross-tenant sharing not permitted"
```

### Guardrail 2 — No public links for sensitive resources
```python
CLASSIFICATION_ALLOWS_PUBLIC = ["public", "internal"]

def can_create_public_link(resource: dict) -> bool:
    if resource["classification"] not in CLASSIFICATION_ALLOWS_PUBLIC:
        raise PolicyViolation(
            f"{resource['classification']} resources cannot be shared via public link"
        )
    return True
```

### Guardrail 3 — Permission ceiling (owners can't grant more than they have)
```python
def get_shareable_permissions(user_id: str, resource_id: str) -> List[str]:
    """A user cannot grant permissions they don't themselves hold."""
    user_permissions = get_effective_permissions(user_id, resource_id)
    # Remove admin permissions from what can be shared
    shareable = [p for p in user_permissions if p not in ["admin", "transfer_ownership"]]
    return shareable
```

### Guardrail 4 — Expiry on all shared access (recommended)
```python
# Default all shared access to auto-expire
DEFAULT_SHARE_EXPIRY_DAYS = 30  # Configurable per plan

# Require admin approval for permanent shares on sensitive data
if resource["classification"] in ["confidential", "restricted"]:
    if not expires_days:
        raise PolicyViolation("Sensitive resources require expiry date on shares")
```

### Guardrail 5 — Admin audit visibility
```python
# Admins must always be able to see all shares, even DAC ones
async def get_all_shares_for_tenant(db, tenant_id: str) -> List[dict]:
    """Compliance report: all active ACL entries in tenant."""
    return await db.fetch("""
        SELECT
            ra.resource_type, ra.resource_id, ra.subject_id,
            ra.permissions, ra.granted_by, ra.granted_at, ra.expires_at,
            u.email as subject_email,
            g.email as granted_by_email
        FROM resource_acls ra
        JOIN users u ON u.id = ra.subject_id
        JOIN users g ON g.id = ra.granted_by
        JOIN resources r ON r.id = ra.resource_id
        WHERE r.tenant_id = $1
          AND (ra.expires_at IS NULL OR ra.expires_at > now())
        ORDER BY ra.granted_at DESC
    """, tenant_id)
```

---

## 6. ACL + RBAC Composition

The standard pattern: RBAC handles broad access, ACLs handle per-object exceptions.

```python
async def check_access(
    db,
    user: User,
    resource_id: str,
    resource_type: str,
    action: str,
) -> bool:
    """
    Access check order:
    1. Admin override (RBAC) — super_admin bypasses all
    2. RBAC — does user's role allow this action on this resource type?
    3. ACL — does user have an explicit ACL grant for this specific resource?
    4. Deny (default)
    """

    # Layer 1: Admin bypass
    if "super_admin" in user.roles:
        return True

    # Layer 2: Tenant isolation (always required)
    resource = await db.get_resource(resource_id)
    if resource.tenant_id != user.tenant_id:
        return False

    # Layer 3: RBAC — role-based permission on resource type
    if rbac_allows(user.roles, resource_type, action):
        return True

    # Layer 4: ACL — per-object explicit grant
    if await check_acl_permission(db, user.id, user.group_ids, resource_type, resource_id, action):
        return True

    return False  # Default deny
```

---

## 7. Audit & Compliance Considerations

ACL systems must produce clean audit trails, especially in SOC2/HIPAA environments.

```python
# Every ACL change must be logged
async def audit_acl_change(event_type: str, details: dict):
    await db.execute("""
        INSERT INTO access_audit_log
            (event_type, resource_type, resource_id, subject_id,
             permissions, changed_by, timestamp, details)
        VALUES ($1, $2, $3, $4, $5, $6, now(), $7)
    """,
        event_type,                     # 'acl_granted', 'acl_revoked', 'acl_expired'
        details["resource_type"],
        details["resource_id"],
        details["subject_id"],
        details.get("permissions"),
        details["changed_by"],
        json.dumps(details)
    )

# Quarterly access review export
async def export_access_review(db, tenant_id: str) -> List[dict]:
    return await db.fetch("""
        SELECT
            u.email,
            r.name AS resource_name,
            ra.permissions,
            ra.granted_at,
            ra.expires_at,
            ra.reason,
            gb.email AS granted_by
        FROM resource_acls ra
        JOIN users u       ON u.id = ra.subject_id
        JOIN resources r   ON r.id = ra.resource_id
        JOIN users gb      ON gb.id = ra.granted_by
        WHERE r.tenant_id = $1
        ORDER BY u.email, r.name
    """, tenant_id)
```

→ For compliance requirements mapping, see `references/08-compliance.md`
→ For combining ACL with RBAC + ABAC in production, see `references/06-hybrid-patterns.md`