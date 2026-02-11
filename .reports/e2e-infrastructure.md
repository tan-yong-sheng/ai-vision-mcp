# E2E Test Infrastructure Analysis

## 1. Test Framework Used

**Vitest** is the test framework used for all testing including E2E tests.

### Configuration (from `vitest.config.ts`):
- **Environment**: Node.js
- **Test Timeout**: 60 seconds (`testTimeout: 60000`)
- **Hook Timeout**: 30 seconds (`hookTimeout: 30000`)
- **Test Pattern**: `tests/**/*.test.ts`
- **Exclusions**: `tests/mocks/**`, `tests/fixtures/**`, `tests/e2e/fixtures/**`
- **Path Aliases**:
  - `@/` → `src/`
  - `@tests/` → `tests/`

### NPM Scripts (from `package.json`):
```bash
npm run test:e2e          # Run all E2E tests
npm run test:e2e:protocol # Run only protocol tests
npm run test:e2e:ci       # Run protocol + validation tests (CI-friendly)
```

---

## 2. MCP Client Setup Mechanism

The E2E tests use the **@modelcontextprotocol/sdk** to create MCP clients.

### Key Components (`tests/e2e/setup.ts`):

#### StdioClientTransport
```typescript
const transport = new StdioClientTransport({
  command: 'node',
  args: [serverPath],
  env,
  cwd: PROJECT_ROOT,
});
```

The transport spawns the server as a child process and communicates via stdin/stdout using the MCP protocol.

#### Client Configuration
```typescript
const client = new Client(
  {
    name: 'e2e-test-client',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);
```

#### Primary Setup Function
```typescript
export async function createMCPClient(
  envOverrides: Record<string, string> = {}
): Promise<{ client: TestClient; server: ServerProcess }>
```

---

## 3. How Tests Spawn the Server

The infrastructure provides **two mechanisms** for server spawning:

### Method 1: Direct Spawn (for manual control)
```typescript
export async function startServer(
  envOverrides: Record<string, string> = {}
): Promise<ServerProcess>
```
- Spawns `node dist/index.js` directly
- Captures stdout/stderr (limited to 100 lines buffer)
- Waits 500ms for initialization
- Returns process handle with log buffers

### Method 2: Via StdioClientTransport (recommended)
```typescript
export async function createMCPClient(
  envOverrides: Record<string, string> = {}
): Promise<{ client: TestClient; server: ServerProcess }>
```
- The `StdioClientTransport` internally spawns the server
- Client connects automatically
- Stderr is captured for debugging

### Default Test Environment
```typescript
export const defaultTestEnv: Record<string, string> = {
  NODE_ENV: 'test',
  LOG_LEVEL: 'error',
  IMAGE_PROVIDER: 'google',
  VIDEO_PROVIDER: 'google',
  GEMINI_API_KEY: 'test-api-key-for-e2e-tests',
};
```

### Server Lifecycle Management
```typescript
// Cleanup function
export async function teardownMCPClient(
  client: TestClient,
  _server?: ServerProcess
): Promise<void>

// Graceful shutdown with fallback to SIGKILL
export async function stopServer(server: ServerProcess): Promise<void>
```

---

## 4. Test Utilities Available

### Core Setup/Teardown
| Function | Purpose |
|----------|---------|
| `createMCPClient(envOverrides?)` | Create client with auto-spawned server |
| `setupMCPClient(envOverrides?)` | Alias for createMCPClient (deprecated) |
| `teardownMCPClient(client, server?)` | Clean up client connection |
| `startServer(envOverrides?)` | Manual server spawning |
| `stopServer(server)` | Stop server process |

### Environment Helpers
| Function | Purpose |
|----------|---------|
| `createTestEnv(overrides?)` | Merge default + process + override env vars |

### Debug Utilities
| Function | Purpose |
|----------|---------|
| `getServerLogs(server)` | Get captured stdout/stderr as strings |
| `waitForServerMessage(server, predicate, timeoutMs?)` | Wait for specific output |

### Response Helpers
| Function | Purpose |
|----------|---------|
| `isErrorResponse(response)` | Type guard for error responses |
| `parseToolResult<T>(response)` | Parse tool result content as JSON |

### Types
```typescript
interface TestClient extends Client {
  transport?: StdioClientTransport;
}

interface ServerProcess {
  process: ChildProcess;
  stdout: string[];
  stderr: string[];
}
```

---

## 5. Can Infrastructure Support CLI Testing?

**Yes, with modifications.** The current infrastructure is **MCP-focused** but has foundational elements that can support CLI testing.

### What's Already Available:
1. **Server spawning via `child_process.spawn`** - Can be adapted for CLI
2. **Environment variable management** - `createTestEnv()` works for any spawn
3. **Output capture** - stdout/stderr capture already implemented
4. **Process lifecycle management** - `stopServer()` pattern applies

### Current Limitations:
1. **No CLI-specific spawn function** - Tests only spawn the MCP server entry point
2. **No CLI output parsing helpers** - MCP tests parse JSON tool responses, not CLI text output
3. **No CLI argument builder** - Each CLI command needs custom arg construction
4. **Tests assume MCP protocol** - All current E2E tests use `client.callTool()`

---

## 6. What's Needed to Add CLI E2E Tests

### A. New Test Utilities (in `tests/e2e/setup.ts` or new file)

```typescript
// New function needed
export async function runCliCommand(
  command: string,
  args: string[],
  envOverrides: Record<string, string> = {}
): Promise<{ stdout: string; stderr: string; exitCode: number }>
```

### B. CLI-Specific Helpers

```typescript
// Parse CLI JSON output
export function parseCliJsonOutput(stdout: string): unknown

// Wait for CLI process completion
export async function waitForCliExit(
  process: ChildProcess,
  timeoutMs?: number
): Promise<number>  // exit code
```

### C. Example CLI Test Structure

```typescript
// tests/e2e/cli.test.ts (NEW)
import { describe, it, expect } from 'vitest';
import { runCliCommand, parseCliJsonOutput } from './setup.js';

describe('CLI E2E', () => {
  it('should analyze image via CLI', async () => {
    const result = await runCliCommand('analyze-image', [
      'tests/fixtures/test-image.jpg',
      '--prompt', 'describe this image',
      '--json'
    ]);

    expect(result.exitCode).toBe(0);
    const output = parseCliJsonOutput(result.stdout);
    expect(output).toHaveProperty('analysis');
  });
});
```

### D. File Changes Required

| File | Change |
|------|--------|
| `tests/e2e/setup.ts` | Add `runCliCommand()` and CLI helpers |
| `tests/e2e/cli.test.ts` | Create new test file for CLI commands |
| `package.json` | Add `test:e2e:cli` script |

### E. Implementation Notes

1. **Entry Point**: The CLI uses the same `dist/index.js` but detects CLI mode via the entry point logic in `src/index.ts`

2. **Command Structure** (from `src/cli/index.ts`):
   - `analyze-image <source> --prompt <text>`
   - `compare-images <sources...> --prompt <text>`
   - `detect-objects <source> --prompt <text>`
   - `analyze-video <source> --prompt <text>`

3. **Exit Codes**: Tests should verify:
   - `0` = success
   - `1` = error/unknown command

4. **Output Modes**:
   - Without `--json`: Human-readable text
   - With `--json`: Raw JSON output

---

## Summary

| Aspect | Status |
|--------|--------|
| Test Framework | Vitest with 60s timeout |
| MCP Client | @modelcontextprotocol/sdk with StdioClientTransport |
| Server Spawning | Via transport or direct spawn |
| Test Utilities | Comprehensive (setup, teardown, parsing, debugging) |
| CLI E2E Tests | **Not implemented** - requires new utilities |
| Add CLI Tests | Needs `runCliCommand()` + parsing helpers |

The infrastructure is well-designed for MCP testing. Adding CLI E2E tests would require ~100-150 lines of new utility code in `setup.ts` and a new test file following the existing patterns.
