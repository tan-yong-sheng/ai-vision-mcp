---
name: access-control-policy-design
description: >
  USE THIS SKILL whenever any topic related to access control, authorization, permissions,
  or security policy arises in any form. Triggers include — but are not limited to:
  RBAC, ABAC, PBAC, ACL, DAC, ReBAC, Zanzibar, OPA, Cedar, Casbin, SpiceDB, OpenFGA,
  Permify, Oso, Cerbos, Permit.io; any mention of "who can do what", "role", "permission",
  "policy", "authorization", "multi-tenant access", "least privilege", "Zero Trust",
  "IAM design", "SaaS permission modeling", "access audit", "compliance access control"
  (HIPAA, GDPR, SOC2, PCI-DSS, ISO27001); also trigger when designing any new feature
  that controls what users can see or do, or when reviewing, refactoring, or debugging
  any auth/authz system. When in doubt — trigger this skill. Access control is
  architectural and getting it wrong is expensive.
---

# Access Control Policy Design — Skill Navigator

## What this skill does

Acts as a senior IAM/authorization architect. Covers all major access control paradigms,
hybrid composition patterns, policy engines, compliance mapping, implementation code, and
decision frameworks for modern apps (SaaS, multi-tenant, microservices, cloud-native).

---

## Core Mental Model (always apply this first)

Every access control system answers one runtime question:
> **Should subject S perform action A on resource R right now?**

Models differ in *how* that decision is made. They are **layers, not competitors**:

| Layer | Model | Answers |
|-------|-------|---------|
| Structure | RBAC | Who are you organizationally? |
| Context | ABAC | What conditions apply right now? |
| Governance | PBAC | Who controls the rules and how? |
| Relationships | ReBAC | How do entities connect to resources? |
| Precision | ACL | What's explicitly allowed on this object? |
| Delegation | DAC | What has the owner chosen to share? |

**Key principle:** Most mature systems use 3–4 of these together, with PBAC as the
governance shell wrapping the others. Start simple (RBAC), add layers as complexity demands.

---

## Quick Decision Matrix

| Scenario | Recommended Model(s) | Reference File |
|----------|----------------------|----------------|
| Internal tool, stable job roles | RBAC | `01-rbac.md` |
| Multi-tenant SaaS | RBAC + ABAC | `01-rbac.md`, `02-abac.md` |
| Healthcare / Finance data | ABAC + PBAC | `02-abac.md`, `03-pbac-opa.md` |
| Collaborative hierarchical content | ReBAC | `04-rebac-zanzibar.md` |
| Object-level sharing exceptions | ACL on top of RBAC | `05-acl-dac.md` |
| Consumer app with owner sharing | DAC + guardrails | `05-acl-dac.md` |
| Many microservices, many teams | PBAC (OPA/Cedar) | `03-pbac-opa.md` |
| Zero Trust architecture | RBAC + ABAC + PBAC | `06-hybrid-patterns.md` |
| SOC2 / HIPAA / GDPR compliance | PBAC + audit trail | `08-compliance.md` |
| Early-stage startup (<50 users) | RBAC only | `01-rbac.md` |

---

## Reference Files (load the relevant one per task)

```
references/
├── 01-rbac.md               — RBAC deep dive: design, role taxonomy, anti-patterns, OPA/Casbin code
├── 02-abac.md               — ABAC deep dive: attribute schema, OPA Rego policies, XACML, JWT patterns
├── 03-pbac-opa.md           — PBAC + OPA/Cedar/Casbin: policy-as-code, engine selection, CI/CD
├── 04-rebac-zanzibar.md     — ReBAC/Zanzibar: SpiceDB, OpenFGA, schema design, dual-write patterns
├── 05-acl-dac.md            — ACL + DAC: when to use, guardrails, combining with RBAC
├── 06-hybrid-patterns.md    — Layered defense, multi-tenant patterns, Zero Trust, evolution arc
├── 07-policy-engines.md     — Engine comparison matrix: OPA vs Cedar vs Casbin vs SpiceDB vs Permify
├── 08-compliance.md         — HIPAA, GDPR, SOC2, PCI-DSS, ISO27001 — exact mapping + audit schema
└── 09-code-examples.md      — Ready-to-use code: Python, Node.js, Go across all models
```

**When to load which file:**
- User asks about a specific model → load that model's reference file
- User asks about implementation / code → load `09-code-examples.md` + model file
- User asks about tool/engine selection → load `07-policy-engines.md`
- User asks about compliance → load `08-compliance.md`
- User is designing multi-tenant or microservices → load `06-hybrid-patterns.md`
- User is debugging broken access / role explosion → load `06-hybrid-patterns.md` §Warning Signs

---

## Evolution Arc (how real systems grow)

```
Phase 1 — Early product:     RBAC (Admin / User / Viewer). Fast, auditable.
Phase 2 — Multi-tenant:      RBAC + ABAC (tenant_id attribute, conditional access).
Phase 3 — Multiple services: PBAC layer (OPA/Cedar policy engine, decoupled from code).
Phase 4 — Collaborative:     ReBAC (hierarchical resource ownership + sharing graph).
Phase 5 — Enterprise/regulated: Full hybrid — RBAC+ABAC+PBAC+ReBAC, audit logging,
                                 access certification, anomaly detection.
```

---

## Universal Rules (apply regardless of model chosen)

1. **Deny by default** — explicit ALLOW, implicit DENY everywhere
2. **Enforce server-side** — UI hints only; never trust client-side permission checks
3. **Log every decision** — allow AND deny, with subject/action/resource/reason/timestamp
4. **Least privilege** — grant minimum access required; time-bound temporary elevations
5. **Version policies** — treat authorization rules as code: review, test, deploy, roll back
6. **Quarterly access reviews** — permissions rot without active curation
7. **Test both allow and deny** — missing a deny test is a security gap

---

## Warning Signs (diagnose broken access control fast)

| Symptom | Root Cause | Fix |
|---------|------------|-----|
| Role count doubles every quarter | RBAC role explosion | Introduce ABAC attributes |
| "We have a role for that" for every edge case | RBAC over-stretch | ABAC conditions |
| Different services enforce the same rule differently | Authorization scatter | PBAC engine |
| Can't answer "who has access to X?" | ACL sprawl | Centralize with PBAC |
| Audit takes days to compile | No central access log | Structured decision logging |
| Access doesn't revoke when user changes teams | Role creep | Access certification process |
| Sharing causes accidental data exposure | Unbounded DAC | DAC guardrails / boundaries |
| One engineer understands all the auth rules | ABAC policy sprawl | PBAC + documentation |

---

## Two-Question Clarity Test

**Q1: What will be harder in 6 months — explaining access decisions, or changing them safely?**
- Hard to *explain* → ABAC/PBAC + visibility tooling
- Hard to *change safely* → PBAC governance layer before system becomes brittle

**Q2: Does "same action" need different decisions based on context?**
- YES → ABAC is mandatory
- NO → Pure RBAC may be sufficient for now


## Online Sources
  - https://www.loginradius.com/blog/identity/how-access-control-models-work
  - https://www.openpolicyagent.org/docs/comparisons/access-control-systems
  - https://www.osohq.com/learn/abac-with-open-policy-agent-opa
  - https://authzed.com/learn/google-zanzibar
  - https://authzed.com/docs/spicedb/concepts/zanzibar
  - https://github.com/openfga
  - https://auth0.com/blog/how-to-choose-the-right-authorization-model-for-your-multi-tenant-saas-application
  - https://www.permit.io/blog/authorization-with-open-policy-agent-opa
  - https://www.styra.com/blog/enforcing-role-based-access-control-rbac-policies-with-opa/