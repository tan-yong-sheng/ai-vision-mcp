## Plan: Use ImageScript for annotation + implement full MCP logging (stdio)

### Context
Codex/Claude Code stdio tool calls intermittently fail with `Transport closed`.

Primary root causes in this repo:
1) Native image dependencies can crash the MCP process at startup or during image annotation.
2) Non-JSON output on stdout corrupts MCP stdio framing (newline-delimited JSON-RPC). Any stdout logging can trigger disconnects.

Goals:
- Use **ImageScript** for image annotation while preserving annotated output for `detect_objects_in_image`.
- Implement **MCP-native logging** (logging capability + `notifications/message`) and ensure **stdout is JSON-RPC only**.
- Add a `doctor` check for dependency health and update docs (README + docs/SPEC.md).

### Options (considered)

#### Option 1: Use `imagescript` everywhere (SELECTED)
- Use `imagescript` to decode, get dimensions, draw bounding boxes, and render labels.

Pros:
- Removes fragile native dependency.
- TypeScript-friendly.

Cons:
- Potentially slower than native alternatives.
- Text rendering depends on font availability.

#### Option 2: Make annotation runtime-optional (lazy import)
Pros: minimal refactor
Cons: still depends on optional runtime components; still can fail

#### Option 3: Drop annotated-image output (detections only)
Pros: maximum reliability
Cons: feature regression

### Decisions (confirmed)
- Annotated images must include **boxes + text labels**.
- Use a **bundled lightweight font** (commit into repo or ship with package) to avoid system-font variability.
- Default MCP log emission level: **info**.

### Implementation (phases)

#### Phase 1 — Confirm ImageScript capabilities
- Verify decode JPEG/PNG from Buffer.
- Verify drawing rectangle outlines.
- Verify text rendering with a bundled font.
- Verify encode PNG.

#### Phase 2 — ImageScript annotation
- Update `src/tools/detect_objects_in_image.ts` to use ImageScript to read dimensions + choose output format.
- Rewrite `src/utils/imageAnnotator.ts` to annotate using ImageScript drawing primitives.
- Ensure there are no remaining native annotation dependencies.

#### Phase 3 — Implement MCP-native logging
- Declare logging capability on server creation.
- Add `LoggerService` wrapper: MCP `sendLoggingMessage` when connected, stderr fallback otherwise.
- Replace server lifecycle + tool handler logs with LoggerService.
- Remove accidental stdout logging.

#### Phase 4 — Dependency + audit cleanup
- Ensure `imagescript` is installed and healthy.
- Upgrade `@modelcontextprotocol/sdk` to latest 1.x.
- Upgrade `@google-cloud/storage` to latest 7.x.
- Remove stub/unnecessary `@types/*` deps where unused.
- Update `doctor` script to validate ImageScript loads.

#### Phase 5 — Docs sync (repo requirement)
- README: update troubleshooting, logging behavior, `npm run doctor`, dependency notes.
- docs/SPEC.md: document new annotation stack + logging architecture.

### Verification / Test plan
- `npm run build`
- `npm run lint`
- stdio smoke test: `initialize`, `tools/list`, `ping`.
- functional: `detect_objects_in_image` returns detections + annotated image file.
- logging test: client uses `logging/setLevel` and receives `notifications/message`.

### Rollback
- If ImageScript annotation quality insufficient: revert annotation behind a capability check while keeping MCP logging.
- If dependency upgrades regress: pin versions and re-run smoke tests.
