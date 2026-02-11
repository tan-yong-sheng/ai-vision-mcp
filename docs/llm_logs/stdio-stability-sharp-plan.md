## Plan: Fix Codex stdio disconnects + imagescript portability

### Problem statement
- Codex/Claude Code tool calls fail with: `tools/call failed: Transport closed`.
- In this repo we observed two root causes:
  1) Server process can crash at startup if native image dependencies fail to load on some platforms (this repo now uses `imagescript` for annotation to avoid imagescript portability issues).
  2) Stdio MCP transport requires stdout to be **only** newline-delimited JSON-RPC. Any `console.log` output to stdout corrupts the stream and can cause the client to close the transport.

### Option 1: Quick Fix (30 min)
- Replace all `console.log` usage in `src/` with `console.error` to keep stdout clean.
- Document imagescript/stdout logging troubleshooting in README.

✅ Fastest, minimal code changes
❌ Still relies on imagescript being installed correctly on target machine

### Option 2: Balanced (60 min) — RECOMMENDED
- Replace all stdout logging (`console.log`) in `src/` with stderr logging (`console.error`) or MCP logging notifications.
- Add a `npm run doctor` / `npm run check:imagescript` script to validate imagescript loads and print actionable guidance.
- Update README with:
  - why stdout logging breaks stdio MCP
  - how to ensure `npm` optional deps are enabled (avoid `optional=false`, `--omit=optional`)
  - how to reinstall imagescript for current platform (`npm install --os=linux --cpu=arm64 imagescript`)

✅ Prevents silent disconnects, improves supportability
✅ Keeps existing features
❌ Requires small documentation updates

### Option 3: Comprehensive Refactor (2-4 hours)
- Make `imagescript` optional via lazy import and/or move annotation features behind a capability check.
- Replace logging with a structured logger and MCP logging notifications.
- Add integration tests using `StdioClientTransport` for initialize/tools/list/tools/call.

✅ Most robust, best portability
❌ More moving parts and regression risk

### Recommendation: Option 2
**Rationale**: Keeps features, addresses the primary stdio transport correctness issue (stdout pollution), and provides a reliable self-check for imagescript installation problems without doing risky auto-install logic inside postinstall.

### Implementation steps
1) Replace `console.log` in `src/` with `console.error` (stdio-safe).
2) Add `doctor` script(s) to package.json for imagescript validation.
3) Update README with troubleshooting and stdio logging rules.
4) Re-run smoke tests using a stdio client:
   - `initialize`
   - `tools/list`
   - `ping`
   - (optional) `tools/call` for a lightweight tool

### Testing strategy
- Local stdio smoke client using `@modelcontextprotocol/sdk` StdioClientTransport to confirm:
  - No JSON parse errors
  - Stable listTools/ping
  - No unexpected stdout output

### Rollback
- Revert the logging changes if any consumer depended on stdout logs (should not for stdio MCP).
- Remove `doctor` script if it conflicts with workflows.
