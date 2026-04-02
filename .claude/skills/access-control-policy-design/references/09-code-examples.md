# Reference: Code Examples
## Ready-to-Use Authorization Code — Python, Node.js, Go

### Table of Contents
1. [Python — Full Authorization Service](#1-python--full-authorization-service)
2. [Node.js/TypeScript — Authorization Middleware](#2-nodejstypescript--authorization-middleware)
3. [Go — Authorization with Casbin](#3-go--authorization-with-casbin)
4. [FastAPI — Dependency Injection Pattern](#4-fastapi--dependency-injection-pattern)
5. [Next.js — Server-Side Authorization](#5-nextjs--server-side-authorization)
6. [Database Helpers — PostgreSQL RLS](#6-database-helpers--postgresql-rls)
7. [Testing Patterns](#7-testing-patterns)

---

## 1. Python — Full Authorization Service

```python
"""
authz/service.py — Centralized authorization service
Implements: RBAC + ABAC + ACL with tenant isolation
"""
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from typing import Optional, List, Set
import asyncpg
import structlog

log = structlog.get_logger()

# ─── Data structures ───────────────────────────────────────────────────────

@dataclass
class Subject:
    id:                str
    tenant_id:         str
    roles:             List[str]
    department:        Optional[str]   = None
    clearance_level:   int             = 0
    mfa_verified:      bool            = False
    subscription_tier: str             = "free"

@dataclass
class Resource:
    id:              str
    type:            str
    tenant_id:       str
    owner_id:        Optional[str] = None
    classification:  str          = "public"   # public/internal/confidential/restricted
    requires_mfa:    bool         = False
    time_restricted: bool         = False

@dataclass
class Environment:
    ip_address:     Optional[str] = None
    device_managed: bool          = False
    time_hour:      int           = field(default_factory=lambda: datetime.utcnow().hour)
    day_of_week:    str           = field(default_factory=lambda: datetime.utcnow().strftime("%A"))
    risk_score:     int           = 0
    location:       Optional[str] = None

@dataclass
class AuthDecision:
    allowed:      bool
    reason:       str
    failed_layer: Optional[str] = None
    details:      dict          = field(default_factory=dict)

# ─── RBAC configuration ────────────────────────────────────────────────────

ROLE_PERMISSIONS = {
    "super_admin":  {"*"},
    "tenant_admin": {"users:*", "resources:*", "settings:*", "reports:read"},
    "manager":      {"users:read", "resources:read", "resources:write", "reports:read"},
    "editor":       {"resources:read", "resources:write"},
    "viewer":       {"resources:read"},
    "billing_admin":{"billing:*", "invoices:*"},
    "auditor":      {"audit_logs:read", "reports:read"},
}

CLASSIFICATION_CLEARANCE = {
    "public": 0, "internal": 1, "confidential": 2, "restricted": 3
}

# ─── Core authorization engine ─────────────────────────────────────────────

class AuthorizationService:

    def __init__(self, db_pool: asyncpg.Pool):
        self.db = db_pool

    async def is_allowed(
        self,
        subject:  Subject,
        resource: Resource,
        action:   str,
        env:      Environment,
    ) -> AuthDecision:
        """Main entry point. Returns allow/deny with reason."""

        # Layer 1: Tenant isolation (ALWAYS first)
        if subject.tenant_id != resource.tenant_id:
            if "super_admin" not in subject.roles:
                return self._deny("tenant_isolation")

        # Layer 2: Super admin bypass
        if "super_admin" in subject.roles and subject.mfa_verified:
            return self._allow("super_admin_bypass")

        # Layer 3: RBAC check
        if not self._rbac_check(subject.roles, resource.type, action):
            # Check ACL before final deny — ACL can grant access beyond RBAC
            if not await self._acl_check(subject, resource, action):
                return self._deny("rbac_and_acl_both_failed")

        # Layer 4: ABAC conditions
        abac_result = self._abac_check(subject, resource, env)
        if not abac_result.allowed:
            return abac_result

        return self._allow("all_checks_passed")

    def _rbac_check(self, roles: List[str], resource_type: str, action: str) -> bool:
        for role in roles:
            perms = ROLE_PERMISSIONS.get(role, set())
            if "*" in perms:
                return True
            if action in perms or f"{resource_type}:{action}" in perms:
                return True
            if f"{resource_type}:*" in perms:
                return True
        return False

    def _abac_check(
        self, subject: Subject, resource: Resource, env: Environment
    ) -> AuthDecision:
        # Classification check
        required_clearance = CLASSIFICATION_CLEARANCE.get(resource.classification, 0)
        if subject.clearance_level < required_clearance:
            return self._deny(
                "insufficient_clearance",
                details={"required": required_clearance, "actual": subject.clearance_level}
            )

        # MFA requirement
        if resource.requires_mfa and not subject.mfa_verified:
            return self._deny("mfa_required")

        # Device posture for sensitive data
        if resource.classification in ("confidential", "restricted") and not env.device_managed:
            return self._deny("unmanaged_device_blocked")

        # Business hours restriction
        if resource.time_restricted:
            if not (env.day_of_week in ("Monday","Tuesday","Wednesday","Thursday","Friday")
                    and 8 <= env.time_hour < 18):
                return self._deny("outside_business_hours")

        # Risk score block
        if env.risk_score >= 70:
            return self._deny("risk_score_too_high", details={"score": env.risk_score})

        return self._allow("abac_passed")

    async def _acl_check(
        self, subject: Subject, resource: Resource, action: str
    ) -> bool:
        row = await self.db.fetchrow("""
            SELECT permissions FROM resource_acls
            WHERE resource_type = $1
              AND resource_id   = $2
              AND subject_id    = $3
              AND (expires_at IS NULL OR expires_at > now())
        """, resource.type, resource.id, subject.id)
        return row is not None and action in row["permissions"]

    @staticmethod
    def _allow(reason: str, details: dict = None) -> AuthDecision:
        return AuthDecision(allowed=True, reason=reason, details=details or {})

    @staticmethod
    def _deny(reason: str, failed_layer: str = None, details: dict = None) -> AuthDecision:
        return AuthDecision(
            allowed=False, reason=reason,
            failed_layer=failed_layer or reason, details=details or {}
        )

    async def authorize(
        self, subject: Subject, resource: Resource, action: str, env: Environment,
        request_context: dict = None
    ) -> bool:
        """Full authorize + audit log. Use this in application code."""
        decision = await self.is_allowed(subject, resource, action, env)
        await self._audit_log(subject, resource, action, decision, request_context or {})
        return decision.allowed

    async def _audit_log(
        self, subject, resource, action, decision: AuthDecision, ctx: dict
    ):
        await self.db.execute("""
            INSERT INTO access_audit_log
                (subject_id, tenant_id, action, resource_type, resource_id,
                 outcome, policy_applied, ip_address, session_id, data_classification)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        """,
            subject.id, subject.tenant_id, action,
            resource.type, resource.id,
            "allow" if decision.allowed else "deny",
            decision.reason,
            ctx.get("ip"),
            ctx.get("session_id"),
            resource.classification,
        )
```

---

## 2. Node.js/TypeScript — Authorization Middleware

```typescript
// authz/middleware.ts

import { Request, Response, NextFunction } from "express";
import { AuthorizationService } from "./service";

export function requirePermission(action: string, resourceType: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const authz: AuthorizationService = req.app.get("authz");

    const subject = {
      id:              req.user!.id,
      tenantId:        req.user!.tenantId,
      roles:           req.user!.roles,
      clearanceLevel:  req.user!.clearanceLevel ?? 0,
      mfaVerified:     req.user!.mfaVerified ?? false,
    };

    const resourceId = req.params.id ?? req.params.resourceId;
    const resource   = resourceId
      ? await req.app.get("db").getResource(resourceId)
      : { id: "new", type: resourceType, tenantId: req.user!.tenantId, classification: "internal" };

    const env = {
      ipAddress:     req.ip,
      deviceManaged: req.headers["x-device-compliant"] === "true",
      timeHour:      new Date().getUTCHours(),
      riskScore:     0,
    };

    const allowed = await authz.authorize(subject, resource, action, env, {
      ip: req.ip,
      sessionId: req.session?.id,
      requestId: req.headers["x-request-id"] as string,
    });

    if (!allowed) {
      return res.status(403).json({
        error: "Forbidden",
        action,
        resourceType,
        resourceId,
      });
    }

    next();
  };
}

// Usage in routes
router.get("/documents/:id",
  requirePermission("read", "document"),
  getDocument
);
router.put("/documents/:id",
  requirePermission("write", "document"),
  updateDocument
);
router.delete("/documents/:id",
  requirePermission("delete", "document"),
  deleteDocument
);
```

```typescript
// authz/hooks.ts — React hooks for UI permission gating

import { useCallback } from "react";
import useSWR from "swr";

interface PermissionCheck {
  allowed: boolean;
  loading: boolean;
}

export function usePermission(
  action: string,
  resourceType: string,
  resourceId?: string
): PermissionCheck {
  const key = resourceId
    ? `/api/authz/check?action=${action}&type=${resourceType}&id=${resourceId}`
    : `/api/authz/check?action=${action}&type=${resourceType}`;

  const { data, isLoading } = useSWR(key);

  return {
    allowed: data?.allowed ?? false,
    loading: isLoading,
  };
}

// Usage in components
function DocumentActions({ doc }: { doc: Document }) {
  const canEdit   = usePermission("write",  "document", doc.id);
  const canDelete = usePermission("delete", "document", doc.id);

  return (
    <div>
      {!canEdit.loading && canEdit.allowed && (
        <button onClick={() => editDoc(doc.id)}>Edit</button>
      )}
      {!canDelete.loading && canDelete.allowed && (
        <button onClick={() => deleteDoc(doc.id)}>Delete</button>
      )}
    </div>
  );
}
```

---

## 3. Go — Authorization with Casbin

```go
// authz/enforcer.go

package authz

import (
    "context"
    "fmt"

    "github.com/casbin/casbin/v2"
    gormadapter "github.com/casbin/gorm-adapter/v3"
    "go.uber.org/zap"
    "gorm.io/gorm"
)

type Enforcer struct {
    casbin *casbin.Enforcer
    logger *zap.Logger
    db     *gorm.DB
}

func NewEnforcer(db *gorm.DB, logger *zap.Logger) (*Enforcer, error) {
    adapter, err := gormadapter.NewAdapterByDB(db)
    if err != nil {
        return nil, fmt.Errorf("casbin adapter: %w", err)
    }
    e, err := casbin.NewEnforcer("authz/model.conf", adapter)
    if err != nil {
        return nil, fmt.Errorf("casbin enforcer: %w", err)
    }
    e.EnableAutoSave(true)
    e.EnableLog(true)
    return &Enforcer{casbin: e, logger: logger, db: db}, nil
}

func (e *Enforcer) Can(
    ctx context.Context,
    userID, tenantID, resourceType, action string,
) (bool, error) {
    // Casbin domain model: (user, tenant, resource, action)
    allowed, err := e.casbin.Enforce(userID, tenantID, resourceType, action)
    if err != nil {
        // FAIL CLOSED: on error, deny access
        e.logger.Error("casbin enforce error",
            zap.String("user", userID),
            zap.String("action", action),
            zap.Error(err),
        )
        return false, err
    }

    // Audit log
    e.auditLog(ctx, userID, tenantID, resourceType, action, allowed)
    return allowed, nil
}

func (e *Enforcer) AssignRole(userID, role, tenantID string) error {
    _, err := e.casbin.AddRoleForUserInDomain(userID, role, tenantID)
    return err
}

func (e *Enforcer) RevokeRole(userID, role, tenantID string) error {
    _, err := e.casbin.DeleteRoleForUserInDomain(userID, role, tenantID)
    return err
}

// Middleware for Gin
func (e *Enforcer) GinMiddleware(resourceType, action string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userID   := c.GetString("user_id")
        tenantID := c.GetString("tenant_id")

        allowed, err := e.Can(c.Request.Context(), userID, tenantID, resourceType, action)
        if err != nil || !allowed {
            c.AbortWithStatusJSON(403, gin.H{
                "error":        "Forbidden",
                "resource":     resourceType,
                "action":       action,
            })
            return
        }
        c.Next()
    }
}

// model.conf
/*
[request_definition]
r = sub, dom, obj, act

[policy_definition]
p = sub, dom, obj, act

[role_definition]
g = _, _, _

[policy_effect]
e = some(where (p.eft == allow))

[matchers]
m = g(r.sub, p.sub, r.dom) && r.dom == p.dom && r.obj == p.obj && r.act == p.act
*/
```

---

## 4. FastAPI — Dependency Injection Pattern

```python
# authz/deps.py — FastAPI dependency injection for authorization

from fastapi import Depends, HTTPException, status, Request
from functools import wraps
from typing import Optional

from .service import AuthorizationService, Subject, Resource, Environment

async def get_authz(request: Request) -> AuthorizationService:
    return request.app.state.authz

async def get_current_subject(request: Request) -> Subject:
    """Extract and validate subject from JWT token."""
    token = request.headers.get("Authorization", "").removeprefix("Bearer ")
    payload = verify_jwt(token)
    return Subject(
        id=payload["sub"],
        tenant_id=payload["tenant_id"],
        roles=payload.get("roles", []),
        clearance_level=payload.get("clearance_level", 0),
        mfa_verified=payload.get("mfa_verified", False),
    )

def require_action(action: str, resource_type: str):
    """FastAPI dependency factory for permission checks."""
    async def dep(
        request:  Request,
        subject:  Subject = Depends(get_current_subject),
        authz:    AuthorizationService = Depends(get_authz),
    ):
        resource_id = request.path_params.get("id") or request.path_params.get("resource_id")

        if resource_id:
            resource = await authz.db.fetchrow(
                "SELECT * FROM resources WHERE id = $1", resource_id
            )
            if not resource:
                raise HTTPException(status_code=404, detail="Resource not found")
            res = Resource(**dict(resource))
        else:
            res = Resource(
                id="new", type=resource_type,
                tenant_id=subject.tenant_id,
            )

        env = Environment(
            ip_address=request.client.host if request.client else None,
            device_managed=request.headers.get("X-Device-Compliant") == "true",
        )

        allowed = await authz.authorize(subject, res, action, env, {
            "ip": str(request.client.host) if request.client else None,
            "session_id": request.session.get("id") if hasattr(request, "session") else None,
        })

        if not allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail={"error": "Forbidden", "action": action, "resource": resource_type},
            )

    return dep

# Usage in routes
@router.get("/documents/{id}", dependencies=[Depends(require_action("read", "document"))])
async def get_document(id: str, db = Depends(get_db)):
    return await db.get_document(id)

@router.put("/documents/{id}", dependencies=[Depends(require_action("write", "document"))])
async def update_document(id: str, body: DocumentUpdate, db = Depends(get_db)):
    return await db.update_document(id, body)
```

---

## 5. Next.js — Server-Side Authorization

```typescript
// lib/authz.ts — Next.js server components and API routes

import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";

export async function requireServerPermission(
  action: string,
  resourceType: string,
  resourceId?: string,
): Promise<void> {
  const session = await getServerSession();
  if (!session?.user) {
    redirect("/login");
  }

  const response = await fetch(`${process.env.INTERNAL_API}/authz/check`, {
    method: "POST",
    headers: {
      "Content-Type":  "application/json",
      "Authorization": `Bearer ${process.env.SERVICE_TOKEN}`,
    },
    body: JSON.stringify({
      userId:       session.user.id,
      action,
      resourceType,
      resourceId,
    }),
    cache: "no-store",  // Never cache authorization decisions
  });

  const { allowed } = await response.json();
  if (!allowed) {
    redirect("/unauthorized");
  }
}

// Server Component usage
export default async function DocumentPage({ params }: { params: { id: string } }) {
  await requireServerPermission("read", "document", params.id);
  const doc = await getDocument(params.id);
  return <DocumentViewer doc={doc} />;
}

// API Route usage
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkPermission(session.user.id, "write", "document", params.id);
  if (!allowed) return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const updated = await updateDocument(params.id, body);
  return Response.json(updated);
}
```

---

## 6. Database Helpers — PostgreSQL RLS

```sql
-- Enable RLS on all tables containing sensitive data
ALTER TABLE documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_records  ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices         ENABLE ROW LEVEL SECURITY;

-- Documents: tenant isolation + owner + ACL
CREATE POLICY documents_isolation ON documents FOR ALL
USING (
    tenant_id = current_setting('authz.tenant_id')::uuid
);

CREATE POLICY documents_read ON documents FOR SELECT
USING (
    owner_id = current_setting('authz.user_id')::uuid
    OR EXISTS (
        SELECT 1 FROM resource_acls
        WHERE resource_type = 'document'
          AND resource_id   = documents.id
          AND subject_id    = current_setting('authz.user_id')::uuid
          AND 'read'        = ANY(permissions)
          AND (expires_at IS NULL OR expires_at > now())
    )
);

-- Helper function: set session context
CREATE OR REPLACE FUNCTION set_authz_context(user_id UUID, tenant_id UUID)
RETURNS void AS $$
BEGIN
    PERFORM set_config('authz.user_id',   user_id::text,   true);
    PERFORM set_config('authz.tenant_id', tenant_id::text, true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

```python
# Set context before every DB operation
async def execute_with_authz(db, user_id: str, tenant_id: str, query: str, *args):
    async with db.transaction():
        await db.execute(
            "SELECT set_authz_context($1, $2)", user_id, tenant_id
        )
        return await db.fetch(query, *args)
```

---

## 7. Testing Patterns

```python
# tests/test_authz.py — Comprehensive authorization test suite

import pytest
from authz.service import AuthorizationService, Subject, Resource, Environment

@pytest.fixture
def admin_subject():
    return Subject(
        id="admin_1", tenant_id="tenant_a", roles=["super_admin"],
        clearance_level=3, mfa_verified=True
    )

@pytest.fixture
def editor_subject():
    return Subject(
        id="editor_1", tenant_id="tenant_a", roles=["editor"],
        clearance_level=1, mfa_verified=True
    )

@pytest.fixture
def public_doc():
    return Resource(
        id="doc_1", type="document", tenant_id="tenant_a",
        classification="public", requires_mfa=False
    )

@pytest.fixture
def confidential_doc():
    return Resource(
        id="doc_2", type="document", tenant_id="tenant_a",
        classification="confidential", requires_mfa=True
    )

@pytest.fixture
def managed_env():
    return Environment(device_managed=True, time_hour=10, day_of_week="Monday")

@pytest.fixture
def unmanaged_env():
    return Environment(device_managed=False, time_hour=10, day_of_week="Monday")

class TestTenantIsolation:
    async def test_cross_tenant_denied(self, authz, editor_subject, public_doc, managed_env):
        cross_tenant_resource = Resource(**{**vars(public_doc), "tenant_id": "tenant_b"})
        decision = await authz.is_allowed(editor_subject, cross_tenant_resource, "read", managed_env)
        assert not decision.allowed
        assert decision.reason == "tenant_isolation"

class TestRBAC:
    async def test_editor_can_write(self, authz, editor_subject, public_doc, managed_env):
        decision = await authz.is_allowed(editor_subject, public_doc, "write", managed_env)
        assert decision.allowed

    async def test_viewer_cannot_write(self, authz, managed_env):
        viewer = Subject(id="v1", tenant_id="tenant_a", roles=["viewer"])
        decision = await authz.is_allowed(viewer, public_doc, "write", managed_env)
        assert not decision.allowed

class TestABAC:
    async def test_unmanaged_device_blocked_for_confidential(
        self, authz, admin_subject, confidential_doc, unmanaged_env
    ):
        decision = await authz.is_allowed(admin_subject, confidential_doc, "read", unmanaged_env)
        assert not decision.allowed
        assert "device" in decision.reason

    async def test_managed_device_allowed_for_confidential(
        self, authz, admin_subject, confidential_doc, managed_env
    ):
        decision = await authz.is_allowed(admin_subject, confidential_doc, "read", managed_env)
        assert decision.allowed

    async def test_insufficient_clearance_denied(self, authz, editor_subject, managed_env):
        restricted_doc = Resource(
            id="doc_3", type="document", tenant_id="tenant_a",
            classification="restricted"  # requires clearance 3
        )
        # editor has clearance 1
        decision = await authz.is_allowed(editor_subject, restricted_doc, "read", managed_env)
        assert not decision.allowed
        assert "clearance" in decision.reason

class TestDenyReasonsForDebugging:
    async def test_deny_reason_always_populated(self, authz, editor_subject, managed_env):
        """Every denial must explain WHY — enables fast debugging."""
        viewer = Subject(id="v1", tenant_id="tenant_a", roles=["viewer"])
        decision = await authz.is_allowed(viewer, public_doc, "delete", managed_env)
        assert not decision.allowed
        assert decision.reason != ""
        assert decision.reason is not None
```