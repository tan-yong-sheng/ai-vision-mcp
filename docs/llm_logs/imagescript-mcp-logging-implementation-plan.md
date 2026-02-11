## Plan: Replace `sharp` with ImageScript + implement full MCP logging (stdio)

### Context
Codex/Claude Code stdio tool calls intermittently fail with `Transport closed`.

Primary root causes in this repo:
1) Native image dependency failures (previously `sharp`) can crash the MCP process at startup or during image annotation.
2) Non-JSON output on stdout corrupts MCP stdio framing (newline-delimited JSON-RPC). Any stdout logging can trigger disconnects.

Goals:
- Remove `sharp` usage and replace image annotation with **ImageScript** while preserving annotated output for `detect_objects_in_image`.
- Implement **MCP-native logging** (logging capability + `notifications/message`) and ensure **stdout is JSON-RPC only**.
- Add a `doctor` check for dependency health and update docs (README + docs/SPEC.md).

### Options (considered)

#### Option 1: Replace `sharp` with `imagescript` everywhere (SELECTED)
- Remove/stop importing `sharp` entirely.
- Use `imagescript` to decode, get dimensions, draw bounding boxes, and render labels.

Pros:
- Removes fragile native dependency.
- TypeScript-friendly.

Cons:
- Potentially slower than sharp.
- Text rendering depends on font availability.

#### Option 2: Keep `sharp` but make it runtime-optional (lazy import)
Pros: minimal refactor
Cons: still depends on native runtime; still can fail

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

#### Phase 2 — Replace `sharp` usage
- Update `src/tools/detect_objects_in_image.ts` to use ImageScript to read dimensions + choose output format.
- Rewrite `src/utils/imageAnnotator.ts` to annotate using ImageScript drawing primitives.
- Ensure there are **no remaining sharp imports**.

#### Phase 3 — Implement MCP-native logging
- Declare logging capability on server creation.
- Add `LoggerService` wrapper: MCP `sendLoggingMessage` when connected, stderr fallback otherwise.
- Replace server lifecycle + tool handler logs with LoggerService.
- Remove accidental stdout logging.

#### Phase 4 — Dependency + audit cleanup
- Add `imagescript`, remove `sharp`.
- Upgrade `@modelcontextprotocol/sdk` to latest 1.x.
- Upgrade `@google-cloud/storage` to latest 7.x.
- Remove stub/unnecessary `@types/*` deps where unused.
- Update `doctor` script to validate ImageScript loads.

#### Phase 5 — Docs sync (repo requirement)
- README: update troubleshooting, logging behavior, `npm run doctor`, sharp removal.
- docs/SPEC.md: document new annotation stack + logging architecture.

### Verification / Test plan
- `npm run build`
- `npm run lint`
- stdio smoke test: `initialize`, `tools/list`, `ping`.
- functional: `detect_objects_in_image` returns detections + annotated image file.
- logging test: client uses `logging/setLevel` and receives `notifications/message`.

### Rollback
- If ImageScript annotation quality insufficient: revert annotation to optional sharp (lazy import) while keeping MCP logging.
- If dependency upgrades regress: pin versions and re-run smoke tests.
