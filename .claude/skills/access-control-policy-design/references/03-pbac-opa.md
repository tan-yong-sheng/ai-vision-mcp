# Reference: PBAC + Policy Engines (OPA, Cedar, Casbin)
## Deep Developer Guide

### Table of Contents
1. [What PBAC Actually Is](#1-what-pbac-actually-is)
2. [Policy-as-Code Principles](#2-policy-as-code-principles)
3. [OPA — Open Policy Agent](#3-opa--open-policy-agent)
4. [AWS Cedar](#4-aws-cedar)
5. [Casbin — Embedded Policy Engine](#5-casbin--embedded-policy-engine)
6. [CI/CD Integration](#6-cicd-integration)
7. [Deployment Architectures](#7-deployment-architectures)
8. [Performance & Caching](#8-performance--caching)

---

## 1. What PBAC Actually Is

PBAC (Policy-Based Access Control) is NOT a sixth model to compete with RBAC/ABAC.
It is the **governance layer** that contains and manages them.

```
WITHOUT PBAC (authorization scattered in code):
  ServiceA: if user.role == "admin": allow
  ServiceB: if "admin" in user.groups: allow
  ServiceC: if user.is_admin and tenant_check(): allow
  ← Same rule, 3 different implementations, all can drift

WITH PBAC (authorization centralized in policies):
  Policy engine: single source of truth
  All services query: engine.isAllowed(subject, action, resource)
  ← One implementation, consistent enforcement, testable, auditable
```

**Key property of PBAC:** Authorization logic is:
- **Externalized** — lives outside application code
- **Versioned** — tracked in git like source code
- **Tested** — unit tests against policy files
- **Deployed independently** — change access rules without shipping new app code
- **Auditable** — every decision is logged with the policy that applied

---

## 2. Policy-as-Code Principles

### Write policies as code, not configuration
```bash
# Policies live in your repo
authz/
├── policies/
│   ├── rbac.rego           # Role-based rules
│   ├── abac.rego           # Attribute-based rules
│   ├── tenant.rego         # Tenant isolation rules
│   └── compliance.rego     # Regulatory rules
├── tests/
│   ├── rbac_test.rego
│   ├── abac_test.rego
│   └── fixtures/
│       ├── users.json
│       └── resources.json
└── .github/workflows/
    └── policy-test.yml     # CI: test on every PR
```

### Policy lifecycle (treat like code)
```
Author → PR Review → Policy Tests (CI) → Staging Deploy → Canary → Production
```

Never deploy untested policy changes directly to production.
Always run `opa test` or equivalent before deploying.

---

## 3. OPA — Open Policy Agent

OPA is a general-purpose policy engine. It evaluates JSON input against Rego policies
and returns structured JSON output. Runs as a sidecar, standalone service, or embedded library.

### Installation & first run
```bash
# Install OPA
brew install opa          # macOS
curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64_static
chmod +x opa && mv opa /usr/local/bin/

# Or via Docker
docker pull openpolicyagent/opa:latest

# Start OPA as a server
opa run --server --addr :8181 ./policies/
```

### Complete RBAC + ABAC policy with deny reasons
```rego
package authz.main

import future.keywords.if
import future.keywords.in

# ──────────────────────────────────────────
# Entry points
# ──────────────────────────────────────────
default allow := false
default deny_reasons := set()

allow if {
    count(deny_reasons) == 0
    at_least_one_allow_rule
}

at_least_one_allow_rule if role_permits_action
at_least_one_allow_rule if owner_permits_action

# ──────────────────────────────────────────
# RBAC layer
# ──────────────────────────────────────────
role_permissions := {
    "super_admin": {"*"},
    "tenant_admin": {"users:*","resources:*","settings:*"},
    "manager":      {"users:read","resources:read","resources:write","reports:read"},
    "editor":       {"resources:read","resources:write"},
    "viewer":       {"resources:read"},
}

role_permits_action if {
    some role in data.user_roles[input.subject.id]
    "*" in role_permissions[role]
}

role_permits_action if {
    some role in data.user_roles[input.subject.id]
    some perm in role_permissions[role]
    perm == sprintf("%v:%v", [input.resource.type, input.action])
}

# ──────────────────────────────────────────
# ABAC layer — deny conditions
# ──────────────────────────────────────────
deny_reasons[msg] if {
    # Tenant isolation — ALWAYS enforce
    input.subject.tenant_id != input.resource.tenant_id
    msg := "tenant_isolation_violation"
}

deny_reasons[msg] if {
    # Classification check
    clearance_levels := {"public":0,"internal":1,"confidential":2,"restricted":3}
    required := clearance_levels[input.resource.classification]
    input.subject.clearance_level < required
    msg := sprintf("insufficient_clearance: need %v, have %v",
        [required, input.subject.clearance_level])
}

deny_reasons[msg] if {
    # Device posture
    input.resource.classification in ["confidential","restricted"]
    not input.env.device_managed
    msg := "unmanaged_device_blocked_for_sensitive_resource"
}

deny_reasons[msg] if {
    # MFA required
    input.resource.requires_mfa
    not input.subject.mfa_verified
    msg := "mfa_required_but_not_verified"
}

# ──────────────────────────────────────────
# Owner access (DAC-style override)
# ──────────────────────────────────────────
owner_permits_action if {
    input.resource.owner_id == input.subject.id
    input.action in ["read","write","delete","share"]
    # Still blocked by ABAC deny rules above
    count(deny_reasons) == 0
}
```

### OPA test file
```rego
package authz.main_test

import future.keywords.if

# ── RBAC tests ──
test_admin_can_do_anything if {
    allow with input as {
        "subject":  {"id":"u1","tenant_id":"t1","clearance_level":3,"mfa_verified":true},
        "resource": {"type":"document","tenant_id":"t1","classification":"public","owner_id":"u2"},
        "action":   "delete",
        "env":      {"device_managed":true},
    } with data.user_roles as {"u1":["super_admin"]}
}

test_viewer_cannot_write if {
    not allow with input as {
        "subject":  {"id":"u2","tenant_id":"t1","clearance_level":0,"mfa_verified":true},
        "resource": {"type":"document","tenant_id":"t1","classification":"public","owner_id":"u3"},
        "action":   "write",
        "env":      {"device_managed":true},
    } with data.user_roles as {"u2":["viewer"]}
}

# ── Tenant isolation ──
test_cross_tenant_denied if {
    reasons := deny_reasons with input as {
        "subject":  {"id":"u1","tenant_id":"tenant_a","clearance_level":3},
        "resource": {"type":"document","tenant_id":"tenant_b","classification":"public"},
        "action":   "read",
        "env":      {},
    }
    "tenant_isolation_violation" in reasons
}
```

### Run tests in CI
```bash
opa test ./policies/ ./tests/ -v
# Output:
# PASS: 24/24 (1.2ms)
```

---

## 4. AWS Cedar

Cedar is Amazon's open-source policy language, designed specifically for application-level
authorization. It's statically typed, human-readable, and integrates with AWS Verified Permissions.

```cedar
// Define entity types
entity User = {
  "department": String,
  "clearance": Long,
  "tenant": Tenant,
};

entity Tenant;

entity Document = {
  "classification": String,
  "owner": User,
  "tenant": Tenant,
};

// Define actions
action Read, Write, Delete, Share appliesTo {
  principal: [User],
  resource:  [Document],
};

// Policy 1: Tenant isolation (always required)
permit(
  principal,
  action,
  resource
) when {
  principal.tenant == resource.tenant
};

// Policy 2: Clearance-based access
permit(
  principal,
  action in [Action::"Read"],
  resource
) when {
  (resource.classification == "public") ||
  (resource.classification == "internal"     && principal.clearance >= 1) ||
  (resource.classification == "confidential" && principal.clearance >= 2) ||
  (resource.classification == "restricted"   && principal.clearance >= 3)
};

// Policy 3: Owner can always access their own documents
permit(
  principal,
  action in [Action::"Read", Action::"Write", Action::"Delete"],
  resource
) when {
  resource.owner == principal
};

// Explicit deny overrides all permits
forbid(
  principal,
  action,
  resource
) when {
  principal.tenant != resource.tenant  // Belt and suspenders
};
```

### Call Cedar from Node.js (AWS Verified Permissions)
```javascript
const { VerifiedPermissionsClient, IsAuthorizedCommand } = require("@aws-sdk/client-verifiedpermissions");

const vpc = new VerifiedPermissionsClient({ region: "us-east-1" });

async function isAuthorized(userId, action, documentId) {
  const cmd = new IsAuthorizedCommand({
    policyStoreId: process.env.POLICY_STORE_ID,
    principal:  { entityType: "User",     entityId: userId },
    action:     { actionType: "Document", actionId: action },
    resource:   { entityType: "Document", entityId: documentId },
    context: {
      contextMap: {
        device_managed: { boolean: true },
        mfa_verified:   { boolean: true },
      }
    }
  });
  const result = await vpc.send(cmd);
  return result.decision === "ALLOW";
}
```

---

## 5. Casbin — Embedded Policy Engine

Casbin runs inside your app process. Ideal when you don't want a separate network service.
Supports Go, Node.js, Python, Java, Rust, PHP, and more.

### Model definition (RBAC with ABAC conditions)
```ini
# model.conf
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act

[role_definition]
g = _, _, _          # user, role, domain (tenant)

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act
```

### Policy file
```csv
# policy.csv
p, tenant_admin, tenant_a, documents, read
p, tenant_admin, tenant_a, documents, write
p, editor,       tenant_a, documents, read
p, editor,       tenant_a, documents, write
p, viewer,       tenant_a, documents, read

g, alice, tenant_admin, tenant_a
g, bob,   editor,       tenant_a
g, carol, viewer,       tenant_a
```

### Go implementation
```go
package authz

import (
    "github.com/casbin/casbin/v2"
    gormadapter "github.com/casbin/gorm-adapter/v3"
    "gorm.io/gorm"
)

func NewEnforcer(db *gorm.DB) (*casbin.Enforcer, error) {
    adapter, err := gormadapter.NewAdapterByDB(db)
    if err != nil {
        return nil, err
    }
    enforcer, err := casbin.NewEnforcer("model.conf", adapter)
    if err != nil {
        return nil, err
    }
    enforcer.EnableAutoSave(true)
    return enforcer, nil
}

func CanAccess(enforcer *casbin.Enforcer, userID, tenantID, resource, action string) bool {
    allowed, err := enforcer.Enforce(userID, tenantID, resource, action)
    if err != nil {
        log.Errorf("casbin enforce error: %v", err)
        return false  // Fail closed
    }
    return allowed
}
```

---

## 6. CI/CD Integration

Always test policies before deploying. Authorization changes are production security changes.

```yaml
# .github/workflows/policy-test.yml
name: Policy Tests

on: [push, pull_request]

jobs:
  opa-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install OPA
        run: |
          curl -L -o opa https://openpolicyagent.org/downloads/latest/opa_linux_amd64_static
          chmod +x opa && sudo mv opa /usr/local/bin/

      - name: Run policy unit tests
        run: opa test ./policies/ ./tests/ -v --threshold 100

      - name: Policy coverage report
        run: opa test ./policies/ ./tests/ --coverage --format pretty

      - name: Check for policy lint issues
        run: opa check ./policies/ --strict

      - name: Validate policy bundle
        run: opa build ./policies/ -o bundle.tar.gz
```

### Policy change review checklist (for PRs)
```
[ ] All new policies have corresponding test cases
[ ] Both ALLOW and DENY scenarios are tested
[ ] No policy grants broader access than before (regression check)
[ ] Tenant isolation invariant preserved in all new policies
[ ] New policy documented with reason and ticket reference
[ ] Performance impact assessed for new rules over large datasets
[ ] Compliance team notified if policy affects regulated data access
```

---

## 7. Deployment Architectures

### Option A: OPA as sidecar (low latency, high availability)
```yaml
# docker-compose.yml
services:
  app:
    image: myapp:latest
    environment:
      OPA_URL: http://localhost:8181

  opa-sidecar:
    image: openpolicyagent/opa:latest
    network_mode: "service:app"  # Same network namespace
    command:
      - run
      - --server
      - --addr=0.0.0.0:8181
      - --bundle=http://policy-bundle-server/bundle.tar.gz
      - --set=decision_logs.console=true
    restart: always
```

### Option B: OPA as centralized service
```
Services ──HTTP/gRPC──► OPA Cluster ──reads──► Policy Bundle (S3/GCS)
                                    ──reads──► Data (PostgreSQL/Elasticsearch)
```
Use when: multiple services, central governance, compliance requirements.

### Option C: Embedded (Casbin/Oso)
Authorization runs inside the app process. No network hop. Best for single services.
Trade-off: harder to update policies without redeployment.

---

## 8. Performance & Caching

Authorization must be fast. Target < 5ms p95.

```python
# Cache authorization decisions with short TTL
# Use composite cache key: user_id + action + resource_id + attribute_hash
from functools import lru_cache
import hashlib, time

AUTHZ_CACHE: dict = {}  # In production: Redis
CACHE_TTL_SEC = 30

def get_cache_key(subject_attrs, action, resource_id) -> str:
    attrs_hash = hashlib.md5(str(sorted(subject_attrs.items())).encode()).hexdigest()[:8]
    return f"authz:{subject_attrs['id']}:{action}:{resource_id}:{attrs_hash}"

async def cached_authz_check(subject_attrs, action, resource_id) -> bool:
    key = get_cache_key(subject_attrs, action, resource_id)
    cached = AUTHZ_CACHE.get(key)
    if cached and cached["expires"] > time.time():
        return cached["result"]

    result = await opa_check(subject_attrs, action, resource_id)
    AUTHZ_CACHE[key] = {"result": result, "expires": time.time() + CACHE_TTL_SEC}
    return result
```

**Cache invalidation triggers:**
- User role changes → invalidate all keys for that user_id
- Resource attribute changes → invalidate all keys for that resource_id
- Policy deployment → flush entire authz cache (with gradual rollout for high traffic)
- Tenant plan changes → invalidate all keys for that tenant_id

→ For engine comparison and selection guidance, see `references/07-policy-engines.md`