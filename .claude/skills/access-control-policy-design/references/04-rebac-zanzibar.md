# Reference: ReBAC — Relationship-Based Access Control
## Zanzibar, SpiceDB, OpenFGA — Deep Developer Guide

### Table of Contents
1. [What ReBAC Is and Why It Exists](#1-what-rebac-is-and-why-it-exists)
2. [Core Concepts](#2-core-concepts)
3. [SpiceDB — Schema Design](#3-spicedb--schema-design)
4. [OpenFGA — Schema Design](#4-openfga--schema-design)
5. [The Dual-Write Problem](#5-the-dual-write-problem)
6. [The New Enemy Problem](#6-the-new-enemy-problem)
7. [Reverse Lookups](#7-reverse-lookups)
8. [When ReBAC is Wrong for You](#8-when-rebac-is-wrong-for-you)
9. [Integration Code](#9-integration-code)

---

## 1. What ReBAC Is and Why It Exists

ReBAC (Relationship-Based Access Control) answers the question:
> "Does user A have a direct or **indirect** relationship of type B with object C?"

It was introduced publicly via the **Google Zanzibar paper (USENIX 2019)** — the system
that powers Google Drive, Calendar, YouTube, Maps, Photos, and Cloud at 10M+ queries/sec
across trillions of ACLs.

**Why RBAC breaks for collaborative hierarchical content:**
```
# RBAC: 3 users, 100 documents, 3 roles = manageable
admin → can access all 100 documents
editor → can access all 100 documents
viewer → can read all 100 documents

# Real product reality:
Alice owns Document 47. She shares it with Bob (view) and Carol (edit).
Bob is a viewer globally but should be able to view this specific document.
Carol is an editor globally but Dave added her to edit THIS folder only.
Document 47 is inside Folder 12, which is inside Project 3, which is inside Org 1.

# RBAC has no way to express this without:
# - Creating per-document roles (100 × 3 = 300 roles) OR
# - Maintaining ACLs for every document (which is just ACL, not RBAC)
# ReBAC solves this with relationship graph traversal.
```

---

## 2. Core Concepts

### Relation Tuples (the data model)
All authorization data in ReBAC is stored as relation tuples:
```
object_type:object_id#relation@subject_type:subject_id

Examples:
  document:doc47#owner@user:alice           → Alice owns doc47
  document:doc47#viewer@user:bob            → Bob is a viewer of doc47
  folder:folder12#editor@user:carol         → Carol is an editor of folder12
  document:doc47#parent@folder:folder12     → doc47 is inside folder12
  group:engineers#member@user:dave          → Dave is a member of the engineers group
  folder:folder12#viewer@group:engineers#member  → engineers members can view folder12
```

### Permission Derivation (the graph traversal)
```
Can alice READ document:doc47?
  → Is alice in document:doc47#viewer? YES (direct)
  → ALLOW

Can bob READ document:doc47?
  → Is bob in document:doc47#viewer? YES (direct)
  → ALLOW

Can carol EDIT document:doc47?
  → Is carol in document:doc47#editor? NO (direct check fails)
  → Is carol in document:doc47#parent#editor? Check folder:folder12#editor
    → Is carol in folder:folder12#editor? YES
  → ALLOW via inheritance

Can dave READ document:doc47?
  → Is dave in document:doc47#viewer? NO
  → Is dave in document:doc47#parent's viewer chain?
    → folder:folder12#viewer → group:engineers#member
    → Is dave in group:engineers#member? YES
  → ALLOW via group membership + inheritance
```

---

## 3. SpiceDB — Schema Design

SpiceDB uses a human-readable schema language (Zed Language / ZedLang).

### Complete multi-tenant SaaS schema
```zed
// ─── Core entity types ───

definition user {}

definition tenant {
  relation member: user
  relation admin:  user

  permission can_manage_tenant = admin
}

definition group {
  relation member: user | group#member  // Groups can contain other groups
  relation owner:  user
}

definition folder {
  relation owner:  user
  relation editor: user | group#member
  relation viewer: user | group#member
  relation parent: folder
  relation tenant: tenant

  // Permissions compose relationships
  permission can_read   = viewer + editor + owner + parent->can_read + tenant->admin
  permission can_write  = editor + owner + parent->can_write + tenant->admin
  permission can_delete = owner + tenant->admin
  permission can_share  = owner + editor + tenant->admin
}

definition document {
  relation owner:  user
  relation editor: user | group#member
  relation viewer: user | group#member
  relation parent: folder
  relation tenant: tenant

  // Inherited from parent folder chain
  permission can_read   = viewer + editor + owner + parent->can_read
  permission can_write  = editor + owner + parent->can_write
  permission can_delete = owner + parent->can_delete + tenant->admin
  permission can_share  = owner + editor + parent->can_share
  permission can_admin  = owner + tenant->admin
}
```

### Writing relationships (SpiceDB Go client)
```go
import (
    pb "github.com/authzed/authzed-go/proto/authzed/api/v1"
    "github.com/authzed/authzed-go/v1"
)

func ShareDocument(ctx context.Context, client *authzed.Client, docID, userID, relation string) error {
    _, err := client.WriteRelationships(ctx, &pb.WriteRelationshipsRequest{
        Updates: []*pb.RelationshipUpdate{
            {
                Operation: pb.RelationshipUpdate_OPERATION_TOUCH,
                Relationship: &pb.Relationship{
                    Resource: &pb.ObjectReference{ObjectType: "document", ObjectId: docID},
                    Relation: relation,  // "viewer" or "editor"
                    Subject:  &pb.SubjectReference{
                        Object: &pb.ObjectReference{ObjectType: "user", ObjectId: userID},
                    },
                },
            },
        },
    })
    return err
}

func CanUserAccess(ctx context.Context, client *authzed.Client,
    userID, docID, permission string) (bool, error) {

    resp, err := client.CheckPermission(ctx, &pb.CheckPermissionRequest{
        Resource:   &pb.ObjectReference{ObjectType: "document", ObjectId: docID},
        Permission: permission,
        Subject: &pb.SubjectReference{
            Object: &pb.ObjectReference{ObjectType: "user", ObjectId: userID},
        },
    })
    if err != nil {
        return false, err
    }
    return resp.Permissionship == pb.CheckPermissionResponse_PERMISSIONSHIP_HAS_PERMISSION, nil
}
```

### Running SpiceDB locally
```bash
# Docker
docker run -p 50051:50051 -p 8080:8080 \
  authzed/spicedb:latest serve \
  --grpc-preshared-key "somerandomkeyhere" \
  --http-enabled

# Or with PostgreSQL backend
docker run -p 50051:50051 \
  -e SPICEDB_DATASTORE_ENGINE=postgres \
  -e SPICEDB_DATASTORE_CONN_URI="postgres://user:pass@db:5432/spicedb?sslmode=disable" \
  authzed/spicedb:latest serve \
  --grpc-preshared-key "somerandomkeyhere"
```

---

## 4. OpenFGA — Schema Design

OpenFGA (from Auth0/Okta) is CNCF-hosted, uses a JSON/DSL model, and is optimized for
developer experience. Adopted by Grafana, Canonical, Docker, and others.

### Authorization model (JSON DSL)
```json
{
  "schema_version": "1.1",
  "type_definitions": [
    { "type": "user" },
    {
      "type": "folder",
      "relations": {
        "owner":  { "this": {} },
        "editor": { "union": { "child": [
          { "this": {} },
          { "computedUserset": { "object": "", "relation": "owner" } }
        ]}},
        "viewer": { "union": { "child": [
          { "this": {} },
          { "computedUserset": { "object": "", "relation": "editor" } }
        ]}}
      },
      "metadata": {
        "relations": {
          "owner":  { "directly_related_user_types": [{"type":"user"}] },
          "editor": { "directly_related_user_types": [{"type":"user"}] },
          "viewer": { "directly_related_user_types": [{"type":"user"}] }
        }
      }
    },
    {
      "type": "document",
      "relations": {
        "parent": { "this": {} },
        "owner":  { "this": {} },
        "editor": { "union": { "child": [
          { "this": {} },
          { "tupleToUserset": {
            "tupleset":        { "object": "", "relation": "parent" },
            "computedUserset": { "object": "$TUPLE_USERSET_OBJECT", "relation": "editor" }
          }}
        ]}},
        "can_read": { "union": { "child": [
          { "computedUserset": { "object": "", "relation": "owner" } },
          { "computedUserset": { "object": "", "relation": "editor" } },
          { "tupleToUserset": {
            "tupleset": { "object": "", "relation": "parent" },
            "computedUserset": { "object": "$TUPLE_USERSET_OBJECT", "relation": "viewer" }
          }}
        ]}}
      }
    }
  ]
}
```

### OpenFGA TypeScript SDK
```typescript
import { OpenFgaClient } from "@openfga/sdk";

const fga = new OpenFgaClient({
  apiUrl: process.env.FGA_API_URL,
  storeId: process.env.FGA_STORE_ID,
  authorizationModelId: process.env.FGA_MODEL_ID,
});

// Write relationship
await fga.write({
  writes: [{
    user:     "user:alice",
    relation: "editor",
    object:   "document:doc47",
  }],
});

// Check permission
const { allowed } = await fga.check({
  user:     `user:${userId}`,
  relation: "can_read",
  object:   `document:${docId}`,
});

// List all documents a user can read (reverse lookup)
const { objects } = await fga.listObjects({
  user:             `user:${userId}`,
  relation:         "can_read",
  type:             "document",
});
```

---

## 5. The Dual-Write Problem

ReBAC requires a separate relationship store in sync with your application database.
When you create a document, you must ALSO write the ownership relationship to SpiceDB/OpenFGA.

```python
import asyncio

async def create_document(user_id: str, folder_id: str, content: str) -> dict:
    """Atomically create document in app DB and write relationship to SpiceDB."""

    # Start a transaction in app DB
    async with db.transaction() as txn:
        doc = await txn.execute(
            "INSERT INTO documents (content, owner_id, folder_id) VALUES ($1, $2, $3) RETURNING id",
            content, user_id, folder_id
        )
        doc_id = doc["id"]

        # Write relationships to SpiceDB within the same logical operation
        try:
            await spicedb_client.write_relationships([
                # Owner relationship
                {"resource": f"document:{doc_id}", "relation": "owner",
                 "subject": f"user:{user_id}"},
                # Parent folder relationship
                {"resource": f"document:{doc_id}", "relation": "parent",
                 "subject": f"folder:{folder_id}"},
            ])
        except SpiceDBError as e:
            await txn.rollback()
            raise

    return {"doc_id": doc_id}
```

**Consistency strategies:**
| Strategy | Consistency | Use When |
|----------|------------|----------|
| Synchronous dual-write | Strong | Critical resources (financial, medical) |
| Saga pattern | Eventual | High throughput, tolerate brief gaps |
| CDC (Change Data Capture) | Eventual | Event-driven architectures |
| Outbox pattern | Strong eventual | Most SaaS apps (recommended) |

**Outbox pattern (recommended):**
```python
# 1. Write document + relationship-pending record in ONE DB transaction
async with db.transaction() as txn:
    doc = await txn.insert_document(content, user_id, folder_id)
    await txn.insert_outbox_event({
        "type": "relationship_write",
        "payload": {
            "resource": f"document:{doc.id}",
            "relation": "owner",
            "subject":  f"user:{user_id}",
        }
    })

# 2. Background worker processes outbox → writes to SpiceDB
# If SpiceDB write fails, retry without losing data
```

---

## 6. The New Enemy Problem

A critical correctness challenge: when a user is removed from a group AFTER a document
is created, the stale cache might still grant them access to the new document.

SpiceDB solves this with **ZedTokens** (equivalent to Zanzibar's Zookies):

```go
// When you write a relationship, SpiceDB returns a ZedToken
writeResp, _ := client.WriteRelationships(ctx, writeRequest)
zedToken := writeResp.WrittenAt.Token  // "zedtoken:v1:abc123..."

// Pass the ZedToken when checking permissions that depend on the write
checkResp, _ := client.CheckPermission(ctx, &v1.CheckPermissionRequest{
    Consistency: &v1.Consistency{
        Requirement: &v1.Consistency_AtLeastAsFresh{
            AtLeastAsFresh: &v1.ZedToken{Token: zedToken},
        },
    },
    Resource:   &v1.ObjectReference{ObjectType: "document", ObjectId: docId},
    Permission: "can_read",
    Subject:    subjectRef,
})
```

---

## 7. Reverse Lookups

ReBAC supports powerful reverse queries that RBAC/ABAC cannot:

```go
// "What resources can user X access?" (e.g., for search results, dashboards)
objects, _ := client.LookupResources(ctx, &v1.LookupResourcesRequest{
    ResourceObjectType: "document",
    Permission:         "can_read",
    Subject: &v1.SubjectReference{
        Object: &v1.ObjectReference{ObjectType: "user", ObjectId: userID},
    },
})

// "Who can access resource Y?" (e.g., for sharing dialogs, audit)
subjects, _ := client.LookupSubjects(ctx, &v1.LookupSubjectsRequest{
    Resource:   &v1.ObjectReference{ObjectType: "document", ObjectId: docID},
    Permission: "can_read",
    SubjectObjectType: "user",
})

// "What does this user have permission to do?" (for UI rendering)
// Use LookupResources + filter by permission type
```

---

## 8. When ReBAC is Wrong for You

ReBAC is powerful but NOT always the right choice. Avoid it when:

| Situation | Why ReBAC Hurts | Better Choice |
|-----------|----------------|--------------|
| Simple app, <5 resource types | Operational overhead > benefit | RBAC |
| Pure attribute conditions (no hierarchies) | Forcing relationships for what's naturally conditional | ABAC |
| Startup / MVP | Too complex to design correctly early | RBAC + ABAC |
| No hierarchical/collaborative resource model | No relationship graph to traverse | RBAC |
| Team unfamiliar with graph data models | High learning curve, high risk of incorrect schema | Start with ABAC |

---

## 9. Integration Code

### Middleware pattern (Express + OpenFGA)
```javascript
function requireFGAPermission(relation) {
  return async (req, res, next) => {
    const resourceId = req.params.id;
    const userId     = req.user.id;

    try {
      const { allowed } = await fga.check({
        user:     `user:${userId}`,
        relation: relation,
        object:   `document:${resourceId}`,
      });

      if (!allowed) {
        return res.status(403).json({ error: "Forbidden", relation, resourceId });
      }
      next();
    } catch (err) {
      // FAIL CLOSED: network errors → deny access
      console.error("FGA check failed:", err);
      return res.status(403).json({ error: "Authorization check failed" });
    }
  };
}

// Usage
router.get("/documents/:id",
  requireFGAPermission("can_read"),
  getDocument
);
router.put("/documents/:id",
  requireFGAPermission("can_write"),
  updateDocument
);
```

→ For tool selection between SpiceDB, OpenFGA, Permify, etc., see `references/07-policy-engines.md`
→ For combining ReBAC with RBAC/ABAC in a multi-tenant system, see `references/06-hybrid-patterns.md`