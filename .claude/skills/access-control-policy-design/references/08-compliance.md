# Reference: Compliance Mapping
## HIPAA, GDPR, SOC2, PCI-DSS, ISO27001 — Access Control Requirements

### Table of Contents
1. [Audit Log Schema (Universal)](#1-audit-log-schema-universal)
2. [HIPAA](#2-hipaa)
3. [GDPR](#3-gdpr)
4. [SOC 2 Type II](#4-soc-2-type-ii)
5. [PCI-DSS v4.0](#5-pci-dss-v40)
6. [ISO 27001:2022](#6-iso-270012022)
7. [Access Certification Process](#7-access-certification-process)
8. [Compliance Checklist](#8-compliance-checklist)

---

## 1. Audit Log Schema (Universal)

Every compliance framework requires audit logs for access events. Use this schema to
satisfy all of them simultaneously.

```sql
CREATE TABLE access_audit_log (
    -- Identity
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id        UUID NOT NULL DEFAULT gen_random_uuid(),  -- Idempotency key

    -- Who
    subject_id      TEXT NOT NULL,       -- User or service ID
    subject_type    TEXT NOT NULL,       -- 'user', 'service', 'api_key'
    subject_email   TEXT,                -- For human-readable reports
    tenant_id       UUID NOT NULL,

    -- What
    action          TEXT NOT NULL,       -- 'read', 'write', 'delete', 'login', 'export'
    resource_type   TEXT NOT NULL,       -- 'document', 'patient_record', 'payment'
    resource_id     TEXT,                -- Specific resource identifier
    outcome         TEXT NOT NULL,       -- 'allow', 'deny', 'step_up_required'
    policy_applied  TEXT,                -- Which rule/policy produced the outcome

    -- Context
    ip_address      INET,
    user_agent      TEXT,
    device_id       TEXT,
    location        TEXT,                -- Country/region from GeoIP
    session_id      TEXT,
    request_id      TEXT,                -- Trace/correlation ID

    -- Data context (for HIPAA/GDPR)
    data_classification TEXT,            -- 'public', 'internal', 'confidential', 'phi', 'pii'
    purpose         TEXT,                -- Business reason for access (GDPR)

    -- Timing
    timestamp       TIMESTAMPTZ NOT NULL DEFAULT now(),
    response_time_ms INTEGER,

    -- Immutability
    checksum        TEXT,                -- Hash of (subject_id + resource_id + timestamp)
    archived_at     TIMESTAMPTZ          -- When exported to cold storage

) PARTITION BY RANGE (timestamp);

-- Partition by month for efficient retention management
CREATE TABLE access_audit_log_2025_01 PARTITION OF access_audit_log
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Indexes for common compliance queries
CREATE INDEX idx_audit_subject   ON access_audit_log(subject_id, timestamp DESC);
CREATE INDEX idx_audit_resource  ON access_audit_log(resource_id, timestamp DESC);
CREATE INDEX idx_audit_tenant    ON access_audit_log(tenant_id, timestamp DESC);
CREATE INDEX idx_audit_outcome   ON access_audit_log(outcome, timestamp DESC);
```

### Write audit log on every access decision
```python
async def log_access_decision(
    subject_id, subject_type, tenant_id,
    action, resource_type, resource_id,
    outcome, policy_applied,
    request_context: dict
):
    entry = {
        "subject_id":       subject_id,
        "subject_type":     subject_type,
        "tenant_id":        tenant_id,
        "action":           action,
        "resource_type":    resource_type,
        "resource_id":      resource_id,
        "outcome":          outcome,
        "policy_applied":   policy_applied,
        "ip_address":       request_context.get("ip"),
        "device_id":        request_context.get("device_id"),
        "session_id":       request_context.get("session_id"),
        "request_id":       request_context.get("request_id"),
        "data_classification": request_context.get("data_classification"),
    }
    # Use fire-and-forget to avoid blocking the response
    asyncio.create_task(db.insert("access_audit_log", entry))
```

---

## 2. HIPAA

**Applicability:** Healthcare apps handling PHI (Protected Health Information)

### Relevant HIPAA rules
| Rule | Section | Requirement | Access Control Response |
|------|---------|-------------|------------------------|
| Security Rule | 164.312(a)(1) | Unique user identification | Each user has unique ID; no shared credentials |
| Security Rule | 164.312(a)(2)(i) | Emergency access procedure | Break-glass access with extra logging |
| Security Rule | 164.312(a)(2)(ii) | Auto logoff | Session timeout after inactivity |
| Security Rule | 164.312(b) | Audit controls | Log all PHI access (allow + deny) |
| Security Rule | 164.312(d) | Person or entity authentication | MFA for PHI access |
| Security Rule | 164.314(a)(2)(iii) | Workforce access controls | RBAC + ABAC for minimum necessary access |
| Privacy Rule | 164.502 | Minimum necessary | Access only PHI needed for the specific task |

### HIPAA-specific access control implementation
```python
# HIPAA requires "minimum necessary" access — ABAC is essential
HIPAA_PHI_FIELDS = {
    "patient_record":    ["name","dob","ssn","diagnosis","treatment","insurance"],
    "lab_result":        ["patient_id","result_values","ordering_physician"],
    "prescription":      ["patient_id","medication","dosage","prescriber"],
}

def filter_phi_for_role(record: dict, user_role: str, context: str) -> dict:
    """Return only PHI fields needed for this role and context."""
    if user_role == "physician" and context == "treatment":
        return record  # Full access for treating physician

    if user_role == "billing_staff":
        # Billing needs limited PHI only
        allowed_fields = ["patient_id", "insurance_id", "diagnosis_code"]
        return {k: v for k, v in record.items() if k in allowed_fields}

    if user_role == "researcher":
        # Researchers get de-identified data only
        return de_identify_phi(record)

    return {}  # No access by default

# Emergency / break-glass access
async def emergency_phi_access(user_id: str, patient_id: str, reason: str) -> dict:
    """Emergency access to PHI — always logged and reviewed."""
    await db.insert("phi_emergency_access_log", {
        "accessed_by": user_id,
        "patient_id": patient_id,
        "reason": reason,
        "timestamp": datetime.utcnow(),
        "requires_review": True,
    })
    # Alert compliance team
    await notify_compliance_team(user_id, patient_id, reason)
    return await db.get_patient_record(patient_id)
```

### HIPAA audit requirements in SQL
```sql
-- HIPAA requires: who accessed what PHI, when, from where
-- Retention: minimum 6 years

-- Report: All PHI access for a specific patient (for patient request)
SELECT
    subject_email AS accessed_by,
    action,
    timestamp,
    ip_address,
    purpose
FROM access_audit_log
WHERE resource_type = 'patient_record'
  AND resource_id   = $1
  AND data_classification IN ('phi', 'pii')
ORDER BY timestamp DESC;

-- Report: All PHI access by an employee (for workforce audit)
SELECT resource_id, action, timestamp, outcome
FROM access_audit_log
WHERE subject_id = $1
  AND data_classification IN ('phi', 'pii')
ORDER BY timestamp DESC;
```

---

## 3. GDPR

**Applicability:** Any app processing personal data of EU residents

### Relevant GDPR articles
| Article | Requirement | Access Control Response |
|---------|------------|------------------------|
| Art. 5(1)(b) | Purpose limitation | Log purpose for every data access |
| Art. 5(1)(c) | Data minimization | ABAC: limit access to fields needed for purpose |
| Art. 17 | Right to erasure | Delete all personal data + audit log references |
| Art. 30 | Records of processing | Maintain access records; log data flows |
| Art. 32 | Security of processing | Encryption, access controls, pseudonymization |
| Art. 35 | Data Protection Impact Assessment | Document access control model choices |

### Consent-based access (GDPR Art. 5)
```python
# Access to personal data must be tied to a lawful basis
LAWFUL_BASIS = {
    "consent":           "user explicitly consented",
    "contract":          "necessary for contract performance",
    "legal_obligation":  "required by law",
    "vital_interests":   "necessary to protect life",
    "public_task":       "necessary for public interest",
    "legitimate_interests": "legitimate interests of controller",
}

async def access_personal_data(
    subject_id:     str,
    data_subject_id: str,
    data_type:      str,
    lawful_basis:   str,
    purpose:        str,
) -> dict:
    """All access to personal data must declare lawful basis and purpose."""
    assert lawful_basis in LAWFUL_BASIS, f"Invalid lawful basis: {lawful_basis}"

    if lawful_basis == "consent":
        has_consent = await db.check_consent(data_subject_id, purpose)
        if not has_consent:
            raise ConsentRequiredError(f"No consent for purpose: {purpose}")

    data = await db.get_personal_data(data_subject_id, data_type)

    # Log every access with purpose
    await log_access_decision(
        subject_id, "user", None, "read", data_type, data_subject_id,
        "allow", lawful_basis,
        {"purpose": purpose, "data_classification": "pii"}
    )
    return data
```

### Right to erasure (Art. 17)
```python
async def process_erasure_request(data_subject_id: str, requester_notes: str):
    """GDPR Art. 17 — delete all personal data for a data subject."""
    tables_with_personal_data = [
        "users", "profiles", "sessions", "audit_logs_personal",
        "user_preferences", "notification_subscriptions",
    ]
    for table in tables_with_personal_data:
        await db.pseudonymize_or_delete(table, data_subject_id)

    # Keep audit log entry but remove personal identifiers
    await db.execute("""
        UPDATE access_audit_log
        SET subject_email = '[erased]',
            ip_address    = NULL,
            device_id     = NULL
        WHERE subject_id = $1
    """, data_subject_id)

    # Log the erasure itself (required record)
    await db.insert("erasure_requests", {
        "data_subject_id": data_subject_id,
        "requested_at":    datetime.utcnow(),
        "completed_at":    datetime.utcnow(),
        "notes":           requester_notes,
    })
```

---

## 4. SOC 2 Type II

**Applicability:** SaaS companies serving enterprise customers

### SOC 2 Trust Service Criteria — Access Control requirements

| Criteria | Code | Requirement | Implementation |
|----------|------|-------------|----------------|
| Logical access controls | CC6.1 | Identify and authenticate users | Unique IDs, MFA |
| Restrict access to authorized users | CC6.2 | Least privilege RBAC | Role taxonomy + access reviews |
| Access provisioning/deprovisioning | CC6.3 | Formal provisioning process | HR-triggered role assignment |
| Restrict access to system components | CC6.6 | Separate prod/staging access | Environment-scoped roles |
| Protect against external threats | CC6.7 | Network + session controls | Device posture, ABAC |
| Remove access for terminated users | CC6.2 | Deprovisioning workflow | Lifecycle automation |
| Monitor access | CC7.2 | Detect anomalous access | Audit logging + alerting |
| Access reviews | CC5.3 | Periodic access certification | Quarterly reviews |

### SOC 2 access review automation
```python
async def generate_access_review_report(db, tenant_id: str) -> dict:
    """Generate quarterly access certification report for SOC 2."""
    report = {
        "generated_at": datetime.utcnow().isoformat(),
        "tenant_id":    str(tenant_id),
        "period":       "Q" + str((datetime.utcnow().month - 1) // 3 + 1),
        "users":        [],
        "findings":     [],
    }

    users = await db.fetch(
        "SELECT * FROM users WHERE tenant_id = $1 AND active = true", tenant_id
    )

    for user in users:
        roles  = await db.fetch("SELECT * FROM user_roles WHERE user_id=$1", user["id"])
        acls   = await db.fetch("SELECT * FROM resource_acls WHERE subject_id=$1", user["id"])
        last_login = await db.fetchrow(
            "SELECT MAX(timestamp) FROM access_audit_log WHERE subject_id=$1", user["id"]
        )

        user_entry = {
            "user_id":    str(user["id"]),
            "email":      user["email"],
            "roles":      [r["role_name"] for r in roles],
            "acl_count":  len(acls),
            "last_active": last_login["max"].isoformat() if last_login["max"] else None,
        }

        # Flag risks
        if len(roles) > 3:
            report["findings"].append({
                "type":    "role_accumulation",
                "user_id": str(user["id"]),
                "detail":  f"User has {len(roles)} roles — potential over-privilege",
            })
        if not last_login["max"] or last_login["max"] < datetime.utcnow() - timedelta(days=90):
            report["findings"].append({
                "type":    "dormant_account",
                "user_id": str(user["id"]),
                "detail":  "No activity in 90+ days — consider deprovisioning",
            })

        report["users"].append(user_entry)

    return report
```

---

## 5. PCI-DSS v4.0

**Applicability:** Apps that store, process, or transmit cardholder data (CHD)

### PCI-DSS access control requirements
| Requirement | Description | Implementation |
|-------------|-------------|----------------|
| Req 7.1 | Least privilege | RBAC with minimal permissions for CHD access |
| Req 7.2 | Access control systems | Formal RBAC documented and implemented |
| Req 7.3 | Restrict access to system components | Separate roles for CHD zone vs non-CHD |
| Req 8.2 | Unique user accounts | No shared credentials in CHD environment |
| Req 8.4 | MFA | MFA required for all CDE access |
| Req 8.8 | Review access privileges | Periodic access review |
| Req 10.2 | Audit log events | Log CHD access (allow + deny) |
| Req 10.3 | Protect audit logs | Tamper-evident, immutable logs |
| Req 10.5 | Log retention | 12 months minimum (3 months immediately available) |

### PCI-DSS network segmentation pattern
```python
# Resources in Cardholder Data Environment (CDE) require extra checks
CDE_RESOURCE_TYPES = {"payment_card", "pan_data", "cvv_data", "cardholder_record"}

async def pci_aware_check(user, resource, action, env) -> bool:
    if resource.type in CDE_RESOURCE_TYPES:
        # All CDE access requires:
        checks = [
            user.mfa_verified,                          # MFA mandatory
            env.get("device_managed"),                  # Managed device
            env.get("network_zone") == "cde_approved",  # Network segmentation
            user.pci_training_current,                  # Annual PCI training
        ]
        if not all(checks):
            await log_pci_violation(user, resource, action, checks)
            return False

    return await standard_abac_check(user, resource, action, env)
```

---

## 6. ISO 27001:2022

**Applicability:** Organizations seeking certification for ISMS

### Relevant ISO 27001 Annex A controls
| Control | Ref | Requirement | Implementation |
|---------|-----|-------------|----------------|
| Access control policy | A.5.15 | Formal access policy documented | This SKILL.md is part of your documentation |
| Privileged access management | A.8.2 | Restrict & monitor privileged access | PAM tool + RBAC super_admin review |
| Information access restriction | A.8.3 | Access to information per policy | ABAC data classification |
| Access rights management | A.5.18 | Provisioning/deprovisioning process | HR integration |
| Authentication | A.8.5 | Secure authentication | MFA, strong passwords |
| Review of access rights | A.5.18 | Periodic review | Quarterly access certification |
| Monitoring system activities | A.8.16 | Monitor and log access | Universal audit log schema above |

---

## 7. Access Certification Process

Required by SOC 2 (CC5.3) and ISO 27001 (A.5.18). Run quarterly minimum.

```python
class AccessCertificationCampaign:
    """Quarterly access review campaign."""

    async def start_campaign(self, db, tenant_id: str, period: str):
        users  = await db.get_active_users(tenant_id)
        managers = await db.get_managers(tenant_id)

        for user in users:
            manager = get_user_manager(user, managers)
            accesses = await self.get_user_accesses(db, user.id)

            # Create review task for each manager
            await db.insert("access_review_tasks", {
                "period":       period,
                "reviewer_id":  manager.id,
                "user_id":      user.id,
                "accesses":     json.dumps(accesses),
                "due_date":     datetime.utcnow() + timedelta(days=14),
                "status":       "pending",
            })

    async def record_decision(self, db, task_id: str, decisions: dict):
        """Manager reviews each access and approves or revokes."""
        for access_id, decision in decisions.items():
            if decision["action"] == "revoke":
                await self.revoke_access(db, access_id, decision["reason"])
                await db.update("access_review_tasks", task_id, {
                    "revocations": db.json_append({"access_id": access_id})
                })
        await db.update("access_review_tasks", task_id, {
            "status": "completed",
            "completed_at": datetime.utcnow(),
        })
```

---

## 8. Compliance Checklist

```
HIPAA
[ ] Every PHI access logged with purpose and lawful basis
[ ] Minimum necessary access enforced via ABAC
[ ] Break-glass emergency access procedure documented and logged
[ ] PHI audit logs retained for 6+ years
[ ] MFA enforced for all PHI-touching roles
[ ] Annual workforce access review

GDPR
[ ] Lawful basis recorded for every personal data access
[ ] Consent management system integrated with access control
[ ] Right to erasure workflow tested and documented
[ ] Purpose limitation enforced via access policies
[ ] Records of processing activities (Art. 30) maintained
[ ] DPA in place for all third-party processors

SOC 2
[ ] Formal RBAC taxonomy documented
[ ] Provisioning/deprovisioning process with evidence
[ ] Quarterly access certification reports generated
[ ] Dormant account detection and auto-deprovisioning
[ ] Audit logs immutable and retained for 12 months
[ ] Access anomaly detection alerts configured

PCI-DSS
[ ] CHD zone network segmentation enforced in access control
[ ] MFA mandatory for all CDE access
[ ] No shared credentials in CHD environment
[ ] Audit logs tamper-evident (checksum column above)
[ ] 12-month log retention with 3-month immediate access
[ ] Annual PCI training completion tracked per user

ISO 27001
[ ] Formal access control policy document exists and is reviewed annually
[ ] Privileged access managed via PAM or equivalent
[ ] Information classification scheme applied to resources
[ ] Access rights review process with documented evidence
```