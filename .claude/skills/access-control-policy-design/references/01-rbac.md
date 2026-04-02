# Reference: RBAC — Role-Based Access Control
## Deep Developer Guide

### Table of Contents
1. [Core Mechanics](#1-core-mechanics)
2. [Role Taxonomy Design](#2-role-taxonomy-design)
3. [Hierarchical RBAC](#3-hierarchical-rbac)
4. [Anti-Patterns & Failure Modes](#4-anti-patterns--failure-modes)
5. [Implementation Code](#5-implementation-code)
6. [Testing RBAC](#6-testing-rbac)
7. [When to Graduate to ABAC](#7-when-to-graduate-to-abac)

---

## 1. Core Mechanics

RBAC works by assigning permissions to roles, then assigning roles to users. Users inherit
all permissions of their assigned roles.

```
User ──assigned_to──► Role ──carries──► Permission ──applies_to──► Resource
```

Three fundamental relationships:
- **User-Role Assignment (UA):** Which users hold which roles
- **Permission-Role Assignment (PA):** Which permissions belong to which roles
- **Permission check:** Is action A on resource R in any permission set of user U's roles?

NIST defines 4 levels of RBAC:
| Level | Description |
|-------|-------------|
| **Flat RBAC** | Basic user-role-permission mapping |
| **Hierarchical RBAC** | Roles inherit from parent roles |
| **Constrained RBAC** | Separation of Duties (SoD) enforced |
| **Symmetric RBAC** | Both role-permission and user-role reviews |

---

## 2. Role Taxonomy Design

### Good role taxonomy principles
- Roles map to **job functions**, not individuals
- One role per broad responsibility boundary
- Use **resource-scoped** roles sparingly (prefer attribute-based scoping)
- Keep total role count **under 20** for most applications before introducing ABAC

### Canonical SaaS role set (starting template)
```
super_admin        — Full system access, billing, tenant management
tenant_admin       — Full access within their tenant only
manager            — Read/write for team resources, user management within team
editor             — Create and update content; cannot delete or manage users
viewer             — Read-only access to permitted resources
api_service        — Machine-to-machine access for service accounts
billing_admin      — Billing and subscription management only
support_agent      — Read-only access + ticket management, cross-tenant (restricted)
auditor            — Read-only access to audit logs and access reports
```

### Separation of Duties (SoD) constraints
SoD prevents one user from having conflicting roles that could enable fraud or abuse:

```python
# Mutually exclusive role pairs — no user should hold BOTH roles simultaneously
CONFLICTING_ROLES = [
    ("invoice_creator",   "invoice_approver"),
    ("developer",         "production_deployer"),
    ("data_analyst",      "data_deleter"),
    ("user_admin",        "auditor"),
]

def validate_role_assignment(user_id: str, new_role: str) -> bool:
    current_roles = get_user_roles(user_id)
    for (role_a, role_b) in CONFLICTING_ROLES:
        if new_role == role_a and role_b in current_roles:
            raise SoDViolationError(f"Cannot assign {role_a}: user already has {role_b}")
        if new_role == role_b and role_a in current_roles:
            raise SoDViolationError(f"Cannot assign {role_b}: user already has {role_a}")
    return True
```

---

## 3. Hierarchical RBAC

Parent roles automatically inherit all child role permissions.

```
super_admin
    └─ tenant_admin
           ├─ manager
           │      ├─ editor
           │      └─ viewer
           └─ billing_admin
```

```python
# Build effective permission set by traversing hierarchy
def get_effective_permissions(role: str, role_hierarchy: dict) -> set:
    """Returns all permissions including those inherited from parent roles."""
    permissions = set(role_hierarchy[role].get("permissions", []))
    for child_role in role_hierarchy[role].get("inherits_from", []):
        permissions |= get_effective_permissions(child_role, role_hierarchy)
    return permissions
```

---

## 4. Anti-Patterns & Failure Modes

### Anti-pattern 1: Role Explosion
**Symptom:** 80+ roles, many named after individuals or specific edge cases.
```
# BAD — encoding context in role name
EMEA_Finance_TempQ3_ReadOnly
US_West_RegionalManager_FullAccess

# GOOD — encode context as ABAC attributes, keep role as job function
role: "regional_manager"  +  attribute: { region: "US_West" }
```

### Anti-pattern 2: Role Creep
Users accumulate roles over time as they change jobs or take on projects.
**Fix:** Time-bound role assignments + quarterly access certification.
```python
# Always set expiry on temporary role assignments
assign_role(
    user_id=user_id,
    role="project_admin",
    expires_at=datetime.now() + timedelta(days=90),
    reason="Q3 project ownership — ticket #4821"
)
```

### Anti-pattern 3: God Roles
A single role with near-total permissions granted too broadly.
**Fix:** Break god roles into composable permissions. Use `super_admin` only for humans
who genuinely need it; prefer narrower roles for service accounts.

### Anti-pattern 4: Implicit Trust in JWT Claims
Never trust role claims from JWT tokens without server-side verification.
```python
# BAD
user_role = jwt_payload["role"]  # Could be tampered with
if user_role == "admin": grant_access()

# GOOD
user_id = jwt_payload["sub"]
user_role = db.get_current_role(user_id)  # Server-side lookup
if user_role == "admin": grant_access()
```

---

## 5. Implementation Code

### Python — Minimal RBAC engine
```python
from functools import wraps
from typing import Set, Dict, List

ROLE_PERMISSIONS: Dict[str, Set[str]] = {
    "super_admin":  {"*"},  # Wildcard
    "tenant_admin": {"users:read","users:write","resources:*","settings:read","settings:write"},
    "manager":      {"users:read","resources:read","resources:write","reports:read"},
    "editor":       {"resources:read","resources:write"},
    "viewer":       {"resources:read"},
}

USER_ROLES: Dict[str, List[str]] = {}  # In production: load from DB

def get_user_permissions(user_id: str) -> Set[str]:
    roles = USER_ROLES.get(user_id, ["viewer"])
    permissions: Set[str] = set()
    for role in roles:
        perms = ROLE_PERMISSIONS.get(role, set())
        if "*" in perms:
            return {"*"}
        permissions |= perms
    return permissions

def has_permission(user_id: str, required: str) -> bool:
    user_perms = get_user_permissions(user_id)
    if "*" in user_perms:
        return True
    # Support wildcard suffix: "resources:*" matches "resources:read"
    resource, _, action = required.partition(":")
    return (
        required in user_perms or
        f"{resource}:*" in user_perms
    )

def require_permission(permission: str):
    """Decorator for Flask/FastAPI route handlers."""
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            user_id = get_current_user_id()  # From session/JWT
            if not has_permission(user_id, permission):
                raise PermissionDeniedError(f"Missing permission: {permission}")
            return fn(*args, **kwargs)
        return wrapper
    return decorator

# Usage
@require_permission("resources:write")
def update_document(doc_id: str, content: str):
    ...
```

### Node.js — RBAC middleware (Express)
```javascript
const ROLE_PERMISSIONS = {
  super_admin:  new Set(['*']),
  tenant_admin: new Set(['users:read','users:write','resources:*','settings:*']),
  manager:      new Set(['users:read','resources:read','resources:write']),
  editor:       new Set(['resources:read','resources:write']),
  viewer:       new Set(['resources:read']),
};

function hasPermission(userRoles, required) {
  for (const role of userRoles) {
    const perms = ROLE_PERMISSIONS[role] || new Set();
    if (perms.has('*')) return true;
    if (perms.has(required)) return true;
    const [resource] = required.split(':');
    if (perms.has(`${resource}:*`)) return true;
  }
  return false;
}

// Express middleware
function requirePermission(permission) {
  return async (req, res, next) => {
    const roles = await getUserRoles(req.user.id); // DB lookup
    if (!hasPermission(roles, permission)) {
      return res.status(403).json({ error: 'Permission denied', required: permission });
    }
    next();
  };
}

// Usage
router.put('/documents/:id', requirePermission('resources:write'), updateDocument);
```

### OPA (Rego) — RBAC policy
```rego
package authz.rbac

import future.keywords.if
import future.keywords.in

# Role-permission assignments
role_permissions := {
    "tenant_admin": ["users:read","users:write","resources:read","resources:write"],
    "manager":      ["users:read","resources:read","resources:write","reports:read"],
    "editor":       ["resources:read","resources:write"],
    "viewer":       ["resources:read"],
}

# Default deny
default allow := false

# Allow if any of user's roles carries the required permission
allow if {
    some role in data.user_roles[input.user_id]
    some perm in role_permissions[role]
    perm == input.permission
}

# Wildcard: tenant_admin gets all permissions
allow if {
    "tenant_admin" in data.user_roles[input.user_id]
}

# Denial reason for debugging
deny_reason := reason if {
    not allow
    reason := sprintf("User %v lacks permission %v. Current roles: %v",
        [input.user_id, input.permission, data.user_roles[input.user_id]])
}
```

---

## 6. Testing RBAC

Always test BOTH allow and deny cases. Missing a deny test is a security gap.

```python
import pytest

@pytest.fixture
def rbac():
    return RBACEngine(ROLE_PERMISSIONS)

class TestRBAC:
    # === ALLOW cases ===
    def test_editor_can_write_resources(self, rbac):
        assert rbac.check("user_editor", "resources:write") is True

    def test_admin_wildcard_allows_everything(self, rbac):
        assert rbac.check("user_admin", "anything:ever") is True

    def test_manager_inherits_editor_permissions(self, rbac):
        assert rbac.check("user_manager", "resources:write") is True

    # === DENY cases ===
    def test_viewer_cannot_write(self, rbac):
        assert rbac.check("user_viewer", "resources:write") is False

    def test_editor_cannot_manage_users(self, rbac):
        assert rbac.check("user_editor", "users:write") is False

    def test_unauthenticated_user_denied(self, rbac):
        assert rbac.check(None, "resources:read") is False

    # === Edge cases ===
    def test_expired_role_denied(self, rbac):
        # Assign role with past expiry
        rbac.assign_role("user_x", "manager", expires_at=past_datetime())
        assert rbac.check("user_x", "resources:write") is False

    def test_sod_violation_prevented(self, rbac):
        rbac.assign_role("user_y", "invoice_creator")
        with pytest.raises(SoDViolationError):
            rbac.assign_role("user_y", "invoice_approver")
```

---

## 7. When to Graduate to ABAC

RBAC is the right starting point. Introduce ABAC when you observe any of these:

| Signal | Example | Action |
|--------|---------|--------|
| Roles encoding tenant context | `Admin_TenantA`, `Admin_TenantB` | Replace with `admin` role + `tenant_id` attribute |
| Roles encoding region | `Manager_EMEA`, `Manager_APAC` | Replace with `manager` role + `region` attribute |
| Roles encoding time limits | `TempAccess_Q3` | Replace with time-bounded ABAC condition |
| Roles encoding device type | `MobileEditor` vs `DesktopEditor` | Replace with `device_type` environment attribute |
| Access should depend on subscription tier | `PremiumViewer` vs `FreeViewer` | Replace with `tenant.plan` ABAC attribute |
| Access varies by data classification | `SensitiveDataAdmin` | Replace with `resource.classification` ABAC attribute |

**Rule of thumb:** If you're putting a condition into a role name, that condition belongs
in an ABAC attribute, not a role.

→ See `references/02-abac.md` for ABAC design and implementation.