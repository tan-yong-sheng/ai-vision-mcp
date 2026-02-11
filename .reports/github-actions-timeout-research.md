# GitHub Actions Test Timeout Best Practices Research

## Executive Summary

This report covers best practices for handling test timeouts and hanging tests in GitHub Actions, specifically tailored for the ai-vision-mcp project which uses Vitest as its testing framework.

---

## Table of Contents

1. [Vitest Timeout Configuration](#1-vitest-timeout-configuration)
2. [GitHub Actions Timeout Settings](#2-github-actions-timeout-settings)
3. [Handling Hanging Tests](#3-handling-hanging-tests)
4. [Parallel Test Execution Strategies](#4-parallel-test-execution-strategies)
5. [Test Health Checks and Retries](#5-test-health-checks-and-retries)
6. [Recommended Configuration for ai-vision-mcp](#6-recommended-configuration-for-ai-vision-mcp)

---

## 1. Vitest Timeout Configuration

### 1.1 Core Timeout Settings

Vitest provides several timeout configuration options that should be adjusted for CI environments:

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Default: 5000ms (5 seconds)
    // Increase for integration/e2e tests
    testTimeout: process.env.CI ? 30000 : 5000,

    // Default: 10000ms (10 seconds)
    // For beforeAll/afterAll hooks
    hookTimeout: process.env.CI ? 30000 : 10000,

    // Default: 10000ms (10 seconds)
    // For globalSetup/globalTeardown
    teardownTimeout: process.env.CI ? 30000 : 10000,

    // Retry failed tests in CI (flaky test handling)
    retry: process.env.CI ? 2 : 0,
  }
})
```

### 1.2 CLI Timeout Options

```bash
# Run with custom timeouts
vitest --run \
  --testTimeout=30000 \
  --hookTimeout=30000 \
  --teardownTimeout=30000
```

### 1.3 Per-Test Timeout Overrides

```typescript
import { test, describe } from 'vitest'

// Individual test timeout
test('slow test', { timeout: 60000 }, async () => {
  // Test that needs more time
})

// Suite-level timeout
describe('integration tests', { timeout: 120000 }, () => {
  // All tests in this suite get 2 minutes
})

// Using test tags for different timeout profiles
// In vitest.config.ts
tags: [
  {
    name: 'e2e',
    description: 'End-to-end tests',
    timeout: 120000,
  },
  {
    name: 'flaky',
    description: 'Known flaky tests',
    retry: process.env.CI ? 3 : 0,
    timeout: 60000,
  }
]
```

### 1.4 Runtime Configuration Changes

```typescript
import { vi } from 'vitest'

// Change timeout dynamically during test file execution
vi.setConfig({
  testTimeout: 10000,
  hookTimeout: 10000,
})
```

---

## 2. GitHub Actions Timeout Settings

### 2.1 Workflow-Level Timeouts

```yaml
# .github/workflows/test.yml
name: Test

# Global workflow timeout (default: 360 minutes)
# Set a reasonable default for the entire workflow
timeout-minutes: 30

jobs:
  test:
    runs-on: ubuntu-latest
    # Job-level timeout (overrides workflow default)
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      # Step-level timeout for specific long-running operations
      - name: Install dependencies
        timeout-minutes: 5
        run: npm ci

      - name: Run tests
        timeout-minutes: 10
        run: npm test
```

### 2.2 Recommended Timeout Hierarchy

| Level | Default | Purpose |
|-------|---------|---------|
| Workflow | 30 min | Upper bound for entire pipeline |
| Job | 20 min | Specific job limit |
| Step (install) | 5 min | Prevent hanging npm install |
| Step (test) | 10 min | Test execution limit |

### 2.3 Timeout for Matrix Builds

```yaml
jobs:
  test:
    runs-on: ${{ matrix.os }}
    timeout-minutes: 20
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]
        node: [18, 20, 22]
      fail-fast: false  # Continue other jobs if one fails
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node }}
      - run: npm ci
      - run: npm test
```

---

## 3. Handling Hanging Tests

### 3.1 Vitest Hanging Process Detection

Vitest provides a specialized reporter to detect hanging processes:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Use hanging-process reporter to debug exit issues
    reporters: process.env.CI
      ? ['default', 'hanging-process']
      : ['default'],
  }
})
```

Or via CLI:
```bash
vitest --run --reporter=hanging-process
```

**Note:** The `hanging-process` reporter is resource-intensive and should only be used for debugging.

### 3.2 Force Exit Configuration

When tests hang due to open handles (connections, timers, etc.):

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Force exit after teardown
    poolExitTimeout: 30000,  // Wait 30s for workers to exit

    // Or use CLI flag for force exit
    // vitest --run --poolExitTimeout=30000
  }
})
```

### 3.3 Global Setup/Teardown Best Practices

```typescript
// globalSetup.ts
export default async function setup() {
  // Setup code
  const server = await startServer()

  // Return teardown function
  return async () => {
    // Clean up resources properly
    await server.close()
    // Close database connections
    await db.destroy()
    // Clear any timers
    clearInterval(heartbeatInterval)
  }
}
```

### 3.4 Debugging Hanging Tests in CI

Add these debugging steps to your workflow:

```yaml
- name: Run tests with debug info
  timeout-minutes: 10
  run: |
    # Run with hanging process detection
    npx vitest --run --reporter=hanging-process 2>&1 | tee test-output.log
  env:
    # Enable Node debug info
    NODE_DEBUG: 'net,http,stream'

- name: Upload test output on failure
  if: failure()
  uses: actions/upload-artifact@v4
  with:
    name: test-output
    path: test-output.log
```

### 3.5 Common Causes of Hanging Tests

1. **Open database connections** - Always close connections in afterAll/afterEach
2. **HTTP servers not closed** - Ensure server.close() is called
3. **Unclosed file handles** - Use fs/promises with proper cleanup
4. **Timers/Intervals** - Clear all intervals in cleanup
5. **Worker threads** - Ensure proper termination

---

## 4. Parallel Test Execution Strategies

### 4.1 Vitest Pool Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Pool type: 'forks' (default) or 'threads'
    // 'threads' can be faster for larger projects
    pool: 'threads',

    // Thread/worker configuration
    poolOptions: {
      threads: {
        // Minimum threads to keep alive
        minThreads: 2,
        // Maximum threads (defaults to number of CPUs)
        maxThreads: 4,
        // Isolate tests in each thread
        isolate: true,
      },
      forks: {
        // For fork pool
        minForks: 2,
        maxForks: 4,
      }
    },

    // Control file-level parallelism
    fileParallelism: true,

    // Maximum concurrent tests in same file
    maxConcurrency: 5,
  }
})
```

### 4.2 GitHub Actions Parallel Strategy

```yaml
jobs:
  # Shard tests across multiple jobs
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        shard: [1, 2, 3, 4]  # Split into 4 shards
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npx vitest --run --shard=${{ matrix.shard }}/${{ strategy.job-total }}
```

### 4.3 Test Sharding with Vitest

```bash
# Run specific shard (e.g., shard 1 of 4)
vitest --run --shard=1/4

# Combine with coverage
vitest --run --shard=1/4 --coverage
```

### 4.4 Concurrent Test Marking

```typescript
import { describe, it } from 'vitest'

// Run these tests in parallel within the same file
describe.concurrent('parallel suite', () => {
  it('test 1', async () => {
    // Runs in parallel with test 2 and 3
  })

  it('test 2', async () => {
    // Runs in parallel
  })

  it('test 3', async () => {
    // Runs in parallel
  })
})

// Or mark individual tests
describe('mixed suite', () => {
  it('serial test', async () => {
    // Runs first, alone
  })

  it.concurrent('parallel 1', async () => {
    // Runs in parallel with parallel 2
  })

  it.concurrent('parallel 2', async () => {
    // Runs in parallel with parallel 1
  })
})
```

**Important:** When using concurrent tests, always use `expect` from the test context:

```typescript
it.concurrent('test', async ({ expect }) => {
  // Use local expect, not global
  expect(true).toBe(true)
})
```

### 4.5 Performance Optimization Checklist

- [ ] Use `pool: 'threads'` for larger projects
- [ ] Disable isolation with `--no-isolate` if tests are independent (faster but riskier)
- [ ] Use test sharding for large test suites
- [ ] Mark independent tests with `.concurrent()`
- [ ] Set appropriate `maxConcurrency` based on CI runner CPUs

---

## 5. Test Health Checks and Retries

### 5.1 Retry Configuration

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Global retry count for failed tests
    retry: process.env.CI ? 2 : 0,

    // Or with delay between retries
    retry: {
      count: 2,
      delay: 100,  // ms between retries
    },
  }
})
```

### 5.2 Conditional Retries

```typescript
import { test } from 'vitest'

// Retry only on specific error types
test('flaky network test', {
  retry: {
    count: 3,
    condition: (error) => error.message.includes('network'),
  }
}, async () => {
  // Test code
})

// Suite-level retry
describe('flaky suite', {
  retry: {
    count: 2,
    delay: 500,
  }
}, () => {
  // All tests in this suite get retries
})
```

### 5.3 Flaky Test Detection and Reporting

```yaml
- name: Run tests with retry reporting
  run: npx vitest --run --reporter=verbose

- name: Upload test results
  if: always()
  uses: actions/upload-artifact@v4
  with:
    name: test-results
    path: |
      test-results/
      coverage/
```

### 5.4 Health Check Pattern

Create a health check test that runs first:

```typescript
// health-check.spec.ts
describe('health check', () => {
  it('environment is ready', async () => {
    // Check critical services
    expect(await checkDatabase()).toBe(true)
    expect(await checkApiServer()).toBe(true)
  }, { timeout: 30000 })
})
```

Then in CI, run health check first:

```yaml
- name: Health check
  timeout-minutes: 2
  run: npx vitest --run health-check

- name: Run full test suite
  timeout-minutes: 10
  run: npx vitest --run --exclude="**/health-check.spec.ts"
```

### 5.5 Test Stability Tracking

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    // Track flaky tests
    reporters: [
      'default',
      ['json', { outputFile: 'test-results/flaky-report.json' }]
    ],

    // Output test results for analysis
    outputFile: {
      json: 'test-results/results.json',
      junit: 'test-results/junit.xml',
    },
  }
})
```

---

## 6. Recommended Configuration for ai-vision-mcp

### 6.1 Complete vitest.config.ts

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config'

const isCI = process.env.CI === 'true'

export default defineConfig({
  test: {
    // Timeout configurations
    testTimeout: isCI ? 60000 : 10000,     // 60s in CI, 10s local
    hookTimeout: isCI ? 30000 : 10000,     // 30s in CI
    teardownTimeout: isCI ? 30000 : 10000, // 30s in CI

    // Retry flaky tests in CI
    retry: isCI ? 2 : 0,

    // Parallel execution
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 2,
        maxThreads: isCI ? 4 : undefined, // Use 4 threads in CI
        isolate: true,
      },
    },
    maxConcurrency: 5,
    fileParallelism: true,

    // Reporters
    reporters: isCI
      ? ['default', 'hanging-process', 'github-actions']
      : ['default'],

    // Output files
    outputFile: isCI ? {
      json: 'test-results/results.json',
      junit: 'test-results/junit.xml',
    } : undefined,

    // Coverage
    coverage: isCI ? {
      reporter: ['text', 'json', 'lcov'],
      reportsDirectory: './coverage',
    } : undefined,

    // Test tags for different categories
    tags: [
      {
        name: 'e2e',
        description: 'End-to-end tests with vision APIs',
        timeout: 120000,
        retry: isCI ? 2 : 0,
      },
      {
        name: 'unit',
        description: 'Unit tests',
        timeout: 10000,
      },
      {
        name: 'integration',
        description: 'Integration tests',
        timeout: 60000,
        retry: isCI ? 1 : 0,
      },
    ],
  },
})
```

### 6.2 Complete GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

# Global timeout
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  lint:
    runs-on: ubuntu-latest
    timeout-minutes: 5
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint

  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      matrix:
        shard: [1, 2, 3, 4]
      fail-fast: false
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        timeout-minutes: 5
        run: npm ci

      - name: Run health check
        timeout-minutes: 2
        run: npx vitest --run --testNamePattern="health check"
        continue-on-error: false

      - name: Run tests (shard ${{ matrix.shard }}/4)
        timeout-minutes: 10
        run: npx vitest --run --shard=${{ matrix.shard }}/4
        env:
          CI: true

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: test-results-shard-${{ matrix.shard }}
          path: test-results/

      - name: Upload coverage
        if: matrix.shard == 1
        uses: codecov/codecov-action@v4
        with:
          files: ./coverage/lcov.info

  test-summary:
    needs: test
    runs-on: ubuntu-latest
    if: always()
    steps:
      - name: Download all test results
        uses: actions/download-artifact@v4
        with:
          pattern: test-results-shard-*
          merge-multiple: true

      - name: Display test summary
        run: |
          echo "Test results from all shards:"
          ls -la test-results/
```

### 6.3 package.json Scripts

```json
{
  "scripts": {
    "test": "vitest --run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --run --coverage",
    "test:debug": "vitest --run --reporter=hanging-process --logHeapUsage",
    "test:shard": "vitest --run --shard",
    "test:e2e": "vitest --run --tag=e2e",
    "test:unit": "vitest --run --tag=unit"
  }
}
```

### 6.4 Pre-Commit Checklist

Before submitting changes:

- [ ] Tests pass locally with `npm test`
- [ ] No hanging processes with `npm run test:debug`
- [ ] All tests have appropriate timeout values
- [ ] Global setup/teardown properly clean up resources
- [ ] Concurrent tests use local `expect` from context
- [ ] CI timeout-minutes set appropriately

---

## References

1. [Vitest CLI Documentation](https://vitest.dev/guide/cli.html)
2. [Vitest Config Reference](https://vitest.dev/config/)
3. [GitHub Actions Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
4. [Vitest Improving Performance](https://vitest.dev/guide/improving-performance.html)
5. [Vitest Parallelism Guide](https://vitest.dev/guide/parallelism.html)
6. [GitHub Actions Timeouts Best Practices](https://exercism.org/docs/building/github/gha-best-practices)

---

*Report generated: 2026-02-11*
*For: ai-vision-mcp project*
