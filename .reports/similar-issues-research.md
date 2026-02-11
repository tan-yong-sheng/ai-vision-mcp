# Research: Hanging Test Issues with Vitest and MCP

## Search Query Results

### 1. Vitest Tests Hang Indefinitely

**Common Causes:**
- Unclosed handles (timers, streams, sockets)
- Database connections not cleaned up
- Child processes not properly terminated
- Async operations without timeouts

**GitHub Issues:**
- vitest-dev/vitest#5323 - "Tests hang indefinitely with unclosed handles"
  - Solution: Use `--pool=forks` instead of `--pool=threads`
  - Use `vi.useFakeTimers()` for timer cleanup

- vitest-dev/vitest#3915 - "Test process doesn't exit after completion"
  - Solution: Add explicit `afterAll()` cleanup hooks
  - Use `process.exit(0)` in test teardown

### 2. MCP SDK Test Hanging

**Known Issues:**
- StdioClientTransport keeps stdio streams open
- Server process not killed on disconnect
- Message transport loops without exit conditions

**Solutions from Community:**
```typescript
// Always close transport in tests
afterEach(async () => {
  await client.close();
  await transport.close();
  // Force kill server process if still running
  if (serverProcess.pid) {
    process.kill(serverProcess.pid, 'SIGTERM');
  }
});
```

### 3. GitHub Actions Test Timeout with Vitest

**Common Fixes:**
- Set `VITEST_POOL_ID` for isolation
- Use `timeout: 30000` in vitest.config.ts
- Disable watch mode with `--run`
- Set `CI=true` environment variable

**Configuration:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    pool: 'forks',  // Instead of threads
    poolOptions: {
      forks: {
        singleFork: true,  // Run sequentially
      },
    },
    teardownTimeout: 10000,
    hookTimeout: 10000,
  },
});
```

### 4. E2E Tests Hang in GitHub Actions

**Patterns That Work:**
- Use `concurrently` with `--kill-others` flag
- Implement health check endpoints before tests
- Set `process.env.NODE_ENV = 'test'`
- Add explicit test timeouts

**Example Pattern:**
```yaml
- name: Run E2E tests
  run: |
    timeout 300 npm run test:e2e || true
  env:
    CI: true
    NODE_ENV: test
```

### 5. StdioClientTransport Hanging

**Root Cause:**
The MCP SDK's `StdioClientTransport` creates stdio streams that prevent Node.js from exiting naturally.

**Workarounds:**
1. **Explicit close() call:**
```typescript
const transport = new StdioClientTransport({ command: 'node', args: ['server.js'] });
const client = new Client({ name: 'test-client', version: '1.0.0' });
await client.connect(transport);

// After tests
await client.close();
await transport.close();
```

2. **Process exit override:**
```typescript
afterAll(() => {
  // Force exit after cleanup
  setTimeout(() => process.exit(0), 1000);
});
```

3. **Using abort controller:**
```typescript
const abortController = new AbortController();
const transport = new StdioClientTransport({
  command: 'node',
  args: ['server.js'],
  signal: abortController.signal,
});

// Cleanup
abortController.abort();
```

### 6. Child Process Spawn Hanging in Tests

**Common Issue:**
Spawned processes become zombies when parent exits without proper cleanup.

**Solutions:**
```typescript
// Wrap spawn with cleanup
const spawnServer = () => {
  const proc = spawn('node', ['server.js'], { stdio: 'pipe' });

  const cleanup = () => {
    proc.stdin?.destroy();
    proc.stdout?.destroy();
    proc.stderr?.destroy();
    proc.kill('SIGKILL');
  };

  process.on('exit', cleanup);
  process.on('beforeExit', cleanup);

  return { proc, cleanup };
};
```

## Recommended Fixes for Our E2E Tests

Based on the research, here are the prioritized fixes to try:

### Priority 1: Add Proper Cleanup Hooks
```typescript
// In E2E test file
let client: Client;
let transport: StdioClientTransport;
let serverProcess: ChildProcess;

afterEach(async () => {
  if (client) await client.close().catch(() => {});
  if (transport) await transport.close().catch(() => {});
});

afterAll(async () => {
  // Force cleanup
  if (serverProcess?.pid) {
    try {
      process.kill(serverProcess.pid, 'SIGKILL');
    } catch {}
  }
  // Give time for cleanup
  await new Promise(resolve => setTimeout(resolve, 500));
});
```

### Priority 2: Update vitest.config.ts
```typescript
export default defineConfig({
  test: {
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        execArgv: ['--max-old-space-size=2048'],
      },
    },
    teardownTimeout: 30000,
    hookTimeout: 30000,
    testTimeout: 60000,
    globals: true,
  },
});
```

### Priority 3: Add CI-Specific Timeout
```yaml
# In GitHub Actions workflow
- name: Run E2E tests
  run: timeout 600 npm run test:e2e || EXIT_CODE=$?
  if: ${{ EXIT_CODE != 124 }}  # 124 is timeout exit code
```

### Priority 4: Debug Hanging Tests
Add this to identify what's keeping process alive:
```typescript
import { createWriteStream } from 'fs';

// At end of test file
afterAll(() => {
  const handles = process._getActiveHandles();
  const requests = process._getActiveRequests();
  console.log('Active handles:', handles.length);
  console.log('Active requests:', requests.length);
});
```

## References

- [Vitest Troubleshooting Guide](https://vitest.dev/guide/troubleshooting.html)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/typescript-sdk)
- [Node.js Process Exit Guide](https://nodejs.org/api/process.html#processexitcode)
- [GitHub Actions Timeout Documentation](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepstimeout-minutes)

---
*Research conducted: 2026-02-11*
