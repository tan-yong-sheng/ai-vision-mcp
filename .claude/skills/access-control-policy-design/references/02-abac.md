# Reference: ABAC — Attribute-Based Access Control
## Deep Developer Guide

### Table of Contents
1. [Core Mechanics](#1-core-mechanics)
2. [Attribute Schema Design](#2-attribute-schema-design)
3. [Policy Rule Patterns](#3-policy-rule-patterns)
4. [JWT + ABAC Integration](#4-jwt--abac-integration)
5. [OPA ABAC Implementation](#5-opa-abac-implementation)
6. [Multi-Tenant ABAC Patterns](#6-multi-tenant-abac-patterns)
7. [Dynamic/Contextual Access](#7-dynamiccontextual-access)
8. [Failure Modes & Mitigations](#8-failure-modes--mitigations)
9. [Testing ABAC Policies](#9-testing-abac-policies)

---

## 1. Core Mechanics

ABAC evaluates attributes of the **subject**, **resource**, **action**, and **environment**
simultaneously to reach an access decision.

```
ALLOW if:
  subject.attributes  satisfy
  resource.attributes satisfy  ──► Policy Rules ──► ALLOW / DENY
  environment.attributes satisfy
  action.attributes   satisfy
```

### Four attribute dimensions:

| Dimension | What it captures | Examples |
|-----------|-----------------|---------|
| **Subject** | Who is making the request | role, department, tenant_id, clearance_level, subscription_tier, user_id |
| **Resource** | What is being accessed | type, owner_id, classification, tenant_id, sensitivity_tag, region, created_at |
| **Environment** | Conditions of the request | time_of_day, ip_address, device_managed, location, risk_score, session_age |
| **Action** | What they want to do | read, write, delete, approve, export, share, admin |

---

## 2. Attribute Schema Design

### Namespace all attributes to prevent collisions
```
user:role              user:department       user:tenant_id
user:clearance         user:subscription

resource:type          resource:owner_id     resource:tenant_id
resource:classification resource:region      resource:sensitivity

env:device_managed     env:location          env:time_hour
env:ip_network         env:risk_score        env:mfa_verified

action:name            action:bulk           action:destructive
```

### Subject attribute payload (from JWT or user store)
```json
{
  "sub": "user_abc123",
  "user:role": "manager",
  "user:department": "engineering",
  "user:tenant_id": "tenant_xyz",
  "user:subscription_tier": "enterprise",
  "user:clearance_level": 3,
  "user:mfa_verified": true,
  "user:last_login_region": "US"
}
```

### Resource attribute payload (from resource store)
```json
{
  "resource_id": "doc_789",
  "resource:type": "document",
  "resource:classification": "confidential",
  "resource:tenant_id": "tenant_xyz",
  "resource:owner_id": "user_abc123",
  "resource:region": "US",
  "resource:sensitivity": "high"
}
```

### Environment attributes (derived at request time)
```python
def build_env_context(request) -> dict:
    return {
        "env:time_hour":      datetime.utcnow().hour,
        "env:day_of_week":    datetime.utcnow().strftime("%A"),
        "env:ip_address":     request.remote_addr,
        "env:ip_is_corporate": is_corporate_network(request.remote_addr),
        "env:device_managed": get_device_compliance(request.headers.get("X-Device-ID")),
        "env:risk_score":     get_risk_score(request.user_id),
        "env:location":       geoip_lookup(request.remote_addr),
    }
```

---

## 3. Policy Rule Patterns

### Pattern 1 — Tenant isolation (mandatory for multi-tenant SaaS)
```python
# Every access check must enforce tenant boundary first
def check_tenant_isolation(subject_attrs, resource_attrs) -> bool:
    return subject_attrs["user:tenant_id"] == resource_attrs["resource:tenant_id"]
```

### Pattern 2 — Classification-aware access
```python
CLEARANCE_REQUIRED = {
    "public":       0,
    "internal":     1,
    "confidential": 2,
    "restricted":   3,
    "top_secret":   4,
}

def can_access_by_classification(user_clearance: int, resource_classification: str) -> bool:
    required = CLEARANCE_REQUIRED.get(resource_classification, 999)
    return user_clearance >= required
```

### Pattern 3 — Time-based access window
```python
from datetime import datetime, time

def within_business_hours(timezone: str = "UTC") -> bool:
    now = datetime.now()
    return (
        now.weekday() < 5 and               # Monday–Friday
        time(8, 0) <= now.time() <= time(18, 0)  # 08:00–18:00
    )

def check_time_restricted_access(resource_attrs, env_attrs) -> bool:
    if resource_attrs.get("resource:time_restricted"):
        return within_business_hours()
    return True
```

### Pattern 4 — Device posture enforcement
```python
def requires_managed_device(resource_attrs) -> bool:
    return resource_attrs.get("resource:classification") in ["confidential", "restricted"]

def check_device_compliance(resource_attrs, env_attrs) -> bool:
    if requires_managed_device(resource_attrs):
        return env_attrs.get("env:device_managed") is True
    return True
```

### Pattern 5 — Composited ABAC check (combine all layers)
```python
def abac_check(subject_attrs, resource_attrs, env_attrs, action) -> dict:
    """Returns detailed decision with deny reason for debugging."""
    checks = {
        "tenant_isolation":   check_tenant_isolation(subject_attrs, resource_attrs),
        "classification":     can_access_by_classification(
                                subject_attrs.get("user:clearance_level", 0),
                                resource_attrs.get("resource:classification", "public")),
        "device_compliance":  check_device_compliance(resource_attrs, env_attrs),
        "time_window":        check_time_restricted_access(resource_attrs, env_attrs),
        "mfa_required":       not resource_attrs.get("resource:mfa_required") or
                              subject_attrs.get("user:mfa_verified"),
    }
    allowed = all(checks.values())
    failed = [k for k, v in checks.items() if not v]
    return {
        "allowed": allowed,
        "failed_checks": failed,
        "audit": {**subject_attrs, **resource_attrs, "action": action, "timestamp": datetime.utcnow().isoformat()}
    }
```

---

## 4. JWT + ABAC Integration

Include user attributes in the JWT at login time. Validate server-side for sensitive actions.

```python
# At login — embed ABAC attributes in JWT
def create_access_token(user: User) -> str:
    tenant = db.get_tenant(user.tenant_id)
    payload = {
        "sub":                    user.id,
        "user:role":              user.role,
        "user:department":        user.department,
        "user:tenant_id":         user.tenant_id,
        "user:subscription_tier": tenant.plan,
        "user:clearance_level":   user.clearance_level,
        "user:mfa_verified":      user.mfa_verified,
        "iat":                    datetime.utcnow(),
        "exp":                    datetime.utcnow() + timedelta(hours=1),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="RS256")

# At resource access — enrich with resource + env attributes
async def authorize_resource_access(
    token: str, resource_id: str, action: str, request
) -> bool:
    subject_attrs = jwt.decode(token, PUBLIC_KEY, algorithms=["RS256"])
    resource_attrs = await db.get_resource_attributes(resource_id)
    env_attrs      = build_env_context(request)

    result = abac_check(subject_attrs, resource_attrs, env_attrs, action)
    await audit_log(result)  # Always log the decision

    return result["allowed"]
```

**IMPORTANT:** For sensitive operations (financial, PII, admin), do NOT rely solely on JWT
claims. Fetch fresh attributes from the database to prevent stale attribute exploits.

---

## 5. OPA ABAC Implementation

OPA's Rego language is well-suited for ABAC because it evaluates structured JSON natively.

```rego
package authz.abac

import future.keywords.if
import future.keywords.in

default allow := false

# Core ABAC rule: combine all conditions
allow if {
    tenant_isolation_passes
    classification_passes
    device_compliance_passes
    time_window_passes
    role_permits_action
}

# 1. Tenant isolation — always required
tenant_isolation_passes if {
    input.subject["user:tenant_id"] == input.resource["resource:tenant_id"]
}

# 2. Data classification check
clearance_levels := {
    "public": 0, "internal": 1, "confidential": 2, "restricted": 3
}

classification_passes if {
    required := clearance_levels[input.resource["resource:classification"]]
    input.subject["user:clearance_level"] >= required
}

classification_passes if {
    # No classification attribute means public access
    not input.resource["resource:classification"]
}

# 3. Device compliance
device_compliance_passes if {
    input.resource["resource:classification"] in ["confidential", "restricted"]
    input.env["env:device_managed"] == true
}

device_compliance_passes if {
    not input.resource["resource:classification"] in ["confidential", "restricted"]
}

# 4. Business hours check (UTC)
time_window_passes if {
    input.resource["resource:time_restricted"] == true
    input.env["env:time_hour"] >= 8
    input.env["env:time_hour"] < 18
    input.env["env:day_of_week"] in ["Monday","Tuesday","Wednesday","Thursday","Friday"]
}

time_window_passes if {
    not input.resource["resource:time_restricted"]
}

# 5. Role-based action permissions (RBAC as one ABAC input)
role_action_map := {
    "manager": ["read","write","approve"],
    "editor":  ["read","write"],
    "viewer":  ["read"],
}

role_permits_action if {
    some role in input.subject["user:roles"]
    some action in role_action_map[role]
    action == input.action
}

# Deny reason — crucial for debugging and audit
deny_reasons[reason] if {
    not tenant_isolation_passes
    reason := "tenant_isolation: subject and resource belong to different tenants"
}

deny_reasons[reason] if {
    not classification_passes
    reason := sprintf("classification: user clearance %v insufficient for %v resource",
        [input.subject["user:clearance_level"], input.resource["resource:classification"]])
}

deny_reasons[reason] if {
    not device_compliance_passes
    reason := "device_compliance: managed device required for confidential/restricted resources"
}
```

### Call OPA from your app:
```python
import httpx

async def check_permission_opa(subject, resource, env, action) -> bool:
    payload = {
        "input": {
            "subject":  subject,
            "resource": resource,
            "env":      env,
            "action":   action,
        }
    }
    resp = await httpx.AsyncClient().post(
        "http://opa:8181/v1/data/authz/abac/allow",
        json=payload,
        timeout=0.1  # Authorization must be fast — set strict timeout
    )
    result = resp.json()
    return result.get("result", False)
```

---

## 6. Multi-Tenant ABAC Patterns

### Mandatory tenant isolation attribute check
Never skip this. Every ABAC policy must include tenant boundary enforcement.

```rego
# Enforce in OPA as a mandatory base rule
base_check if {
    # User must be from same tenant as resource — non-negotiable
    input.user.tenant_id == input.resource.tenant_id
}

# Cross-tenant access only for super_admin with explicit cross_tenant permission
base_check if {
    input.user.role == "super_admin"
    "cross_tenant_access" in input.user.permissions
}
```

### Per-tenant feature gating
```python
FEATURE_REQUIREMENTS = {
    "advanced_analytics":   {"plan": ["enterprise"]},
    "api_access":           {"plan": ["pro", "enterprise"]},
    "custom_roles":         {"plan": ["enterprise"]},
    "data_export":          {"plan": ["pro", "enterprise"], "clearance": 1},
    "admin_audit_logs":     {"plan": ["enterprise"], "role": ["tenant_admin"]},
}

def can_access_feature(user_attrs, tenant_attrs, feature: str) -> bool:
    reqs = FEATURE_REQUIREMENTS.get(feature)
    if not reqs:
        return True  # Feature not gated
    if "plan" in reqs and tenant_attrs["plan"] not in reqs["plan"]:
        return False
    if "role" in reqs and user_attrs["role"] not in reqs["role"]:
        return False
    if "clearance" in reqs and user_attrs.get("clearance_level", 0) < reqs["clearance"]:
        return False
    return True
```

---

## 7. Dynamic/Contextual Access

Dynamic access evaluates signals that can change per-request, enabling real-time decisions.

### Risk-based step-up authentication
```python
RISK_THRESHOLDS = {
    "new_location":        {"risk_delta": 20, "action": "require_mfa"},
    "high_value_resource": {"risk_delta": 30, "action": "require_mfa"},
    "unusual_time":        {"risk_delta": 15, "action": "log_only"},
    "new_device":          {"risk_delta": 25, "action": "require_mfa"},
    "high_risk_score":     {"risk_threshold": 70, "action": "block"},
}

def evaluate_dynamic_access(user_id, resource_id, env_attrs) -> dict:
    risk_score = compute_risk_score(user_id, resource_id, env_attrs)
    if risk_score >= 70:
        return {"allowed": False, "reason": "risk_score_too_high", "score": risk_score}
    if risk_score >= 40:
        return {"allowed": "step_up", "reason": "elevated_risk_requires_mfa", "score": risk_score}
    return {"allowed": True, "score": risk_score}

def compute_risk_score(user_id, resource_id, env_attrs) -> int:
    score = 0
    if is_new_location(user_id, env_attrs["env:location"]):     score += 20
    if is_unusual_hour(env_attrs["env:time_hour"]):             score += 15
    if not env_attrs.get("env:device_managed"):                 score += 25
    if is_high_value_resource(resource_id):                     score += 30
    if not env_attrs.get("env:mfa_verified"):                   score += 10
    return min(score, 100)
```

---

## 8. Failure Modes & Mitigations

| Failure | Risk | Mitigation |
|---------|------|-----------|
| Stale JWT attributes | User changes role; old role persists in token | Short token TTL (15–60 min) + server-side lookup for sensitive ops |
| Missing attribute = access denied | Poor UX when attributes not populated | Default values + graceful degradation strategy |
| Policy sprawl | No one knows all the rules | PBAC governance layer + policy documentation CI |
| Debugging black box | Can't explain why access was denied | Structured deny_reason logging (see OPA example above) |
| Attribute spoofing | User manipulates JWT claims | Never trust client-provided attributes without server validation |
| N+1 attribute fetching | Performance hit loading attributes per-request | Cache attribute bundles with short TTL (30–60 sec) |

---

## 9. Testing ABAC Policies

```python
# Test matrix: for every condition, test the boundary
class TestABAC:

    # Tenant isolation
    def test_same_tenant_allowed(self): ...
    def test_cross_tenant_denied(self): ...
    def test_super_admin_cross_tenant_allowed(self): ...

    # Classification
    def test_clearance_3_can_read_confidential(self): ...
    def test_clearance_1_cannot_read_confidential(self): ...
    def test_public_resource_any_clearance_allowed(self): ...

    # Device compliance
    def test_unmanaged_device_denied_confidential(self): ...
    def test_managed_device_allowed_confidential(self): ...
    def test_unmanaged_device_allowed_public(self): ...

    # Time-based
    def test_business_hours_allowed(self, mock_time_10am): ...
    def test_outside_hours_denied(self, mock_time_11pm): ...
    def test_weekend_denied(self, mock_date_saturday): ...

    # Composite: all conditions must pass
    def test_all_conditions_pass(self): ...
    def test_one_failing_condition_denies_all(self): ...
    def test_deny_reason_populated_on_failure(self): ...
```

→ For policy engine setup and CI/CD integration, see `references/03-pbac-opa.md`
→ For multi-tenant architecture patterns, see `references/06-hybrid-patterns.md`