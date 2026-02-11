# E2E Test Code Examples

This document shows concrete code snippets for implementing E2E tests.

## 1. Test Setup (tests/e2e/setup.ts)

```typescript
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { afterAll, beforeAll } from 'vitest';

export interface TestContext {
  client: Client;
  transport: StdioClientTransport;
}

export async function createMcpClient(): Promise<TestContext> {
  // Start server as subprocess
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['dist/index.js'],
    env: {
      ...process.env,
      IMAGE_PROVIDER: 'google',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY || 'test-key',
    },
  });

  const client = new Client({
    name: 'test-client',
    version: '1.0.0',
  });

  await client.connect(transport);

  return { client, transport };
}

export async function closeMcpClient(context: TestContext): Promise<void> {
  await context.client.close();
}
```

## 2. Protocol Tests (tests/e2e/protocol.test.ts)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMcpClient, closeMcpClient, TestContext } from './setup.js';

describe('MCP Protocol', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient(ctx);
  });

  it('should complete initialize handshake', async () => {
    const result = await ctx.client.initialize({
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'test-client', version: '1.0' },
    });

    expect(result.protocolVersion).toBe('2024-11-05');
    expect(result.serverInfo.name).toBe('ai-vision-mcp');
    expect(result.serverInfo.version).toBe('0.0.5');
    expect(result.capabilities.tools).toBeDefined();
  });

  it('should list all 4 tools', async () => {
    const tools = await ctx.client.listTools();

    expect(tools.tools).toHaveLength(4);
    expect(tools.tools.map(t => t.name)).toContain('analyze_image');
    expect(tools.tools.map(t => t.name)).toContain('compare_images');
    expect(tools.tools.map(t => t.name)).toContain('detect_objects_in_image');
    expect(tools.tools.map(t => t.name)).toContain('analyze_video');
  });

  it('should have valid input schema for analyze_image', async () => {
    const tools = await ctx.client.listTools();
    const tool = tools.tools.find(t => t.name === 'analyze_image');

    expect(tool).toBeDefined();
    expect(tool?.inputSchema).toBeDefined();
    expect(tool?.inputSchema.required).toContain('imageSource');
    expect(tool?.inputSchema.required).toContain('prompt');
  });
});
```

## 3. Validation Tests (tests/e2e/validation.test.ts)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMcpClient, closeMcpClient, TestContext } from './setup.js';

describe('Input Validation', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient(ctx);
  });

  it('should return error for missing imageSource', async () => {
    const result = await ctx.client.callTool('analyze_image', {
      prompt: 'Describe this',
      // imageSource missing
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('imageSource is required');
  });

  it('should return error for missing prompt', async () => {
    const result = await ctx.client.callTool('analyze_image', {
      imageSource: 'https://example.com/image.jpg',
      // prompt missing
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('prompt is required');
  });

  it('should return error for too few images in compare', async () => {
    const result = await ctx.client.callTool('compare_images', {
      imageSources: ['https://example.com/image1.jpg'], // Only 1 image
      prompt: 'Compare these',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('minimum');
  });
});
```

## 4. Integration Tests (tests/e2e/integration.test.ts)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createMcpClient, closeMcpClient, TestContext } from './setup.js';

describe('Integration Tests', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createMcpClient();
  });

  afterAll(async () => {
    await closeMcpClient(ctx);
  });

  it('should analyze image from URL', async () => {
    const result = await ctx.client.callTool('analyze_image', {
      imageSource: 'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg',
      prompt: 'What is this image about?',
    });

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.text).toBeDefined();
    expect(data.metadata).toBeDefined();
    expect(data.metadata.model).toBeDefined();
  }, 30000);

  it('should detect objects in image', async () => {
    const result = await ctx.client.callTool('detect_objects_in_image', {
      imageSource: 'https://ichef.bbci.co.uk/images/ic/480xn/p0529h01.jpg',
      prompt: 'Detect people',
    });

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.detections).toBeDefined();
    expect(Array.isArray(data.detections)).toBe(true);
    expect(data.tempFile).toBeDefined();
  }, 30000);

  it('should compare two images', async () => {
    const result = await ctx.client.callTool('compare_images', {
      imageSources: [
        'https://img.freepik.com/free-photo/beautiful-girl-stands-park_8353-5084.jpg',
        'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg',
      ],
      prompt: 'Compare these images',
    });

    expect(result.isError).toBeFalsy();
    const data = JSON.parse(result.content[0].text);
    expect(data.text).toBeDefined();
  }, 45000);
});
```

## 5. Mock Utilities (tests/mocks/gemini.ts)

```typescript
import { vi } from 'vitest';

export function mockGeminiApi() {
  return {
    generateContent: vi.fn().mockResolvedValue({
      text: () => 'Mocked analysis result',
      usageMetadata: {
        promptTokenCount: 100,
        candidatesTokenCount: 50,
        totalTokenCount: 150,
      },
    }),
  };
}

export function mockFetch() {
  return vi.fn().mockImplementation((url: string) => {
    if (url.includes('.jpg') || url.includes('.jpeg') || url.includes('.png')) {
      return Promise.resolve({
        ok: true,
        arrayBuffer: () => Promise.resolve(Buffer.from('fake-image-data')),
        headers: {
          get: (header: string) => {
            if (header === 'content-type') return 'image/jpeg';
            return null;
          },
        },
      });
    }
    return Promise.reject(new Error('Not found'));
  });
}
```

## 6. Vitest Config (vitest.config.ts)

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 60000, // 60s for API calls
    hookTimeout: 30000,
    include: ['tests/**/*.test.ts'],
    exclude: ['tests/mocks/**'],
  },
});
```

## 7. Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest run",
    "test:e2e": "vitest run tests/e2e",
    "test:e2e:protocol": "vitest run tests/e2e/protocol.test.ts",
    "test:e2e:ci": "vitest run tests/e2e/protocol.test.ts tests/e2e/validation.test.ts",
    "test:watch": "vitest watch"
  }
}
```

## File Structure

```
tests/
├── e2e/
│   ├── setup.ts              # Test harness
│   ├── protocol.test.ts      # MCP protocol tests
│   ├── validation.test.ts    # Input validation tests
│   └── integration.test.ts   # Full API tests
├── mocks/
│   └── gemini.ts             # Mock utilities
└── unit/                     # Existing unit tests
```

## Dependencies to Add

```bash
npm install --save-dev vitest @vitest/coverage-v8
```

## Running Tests

```bash
# All tests
npm test

# E2E only
npm run test:e2e

# Protocol tests (fast, no API)
npm run test:e2e:protocol

# CI tests (protocol + validation)
npm run test:e2e:ci

# Watch mode
npm run test:watch
```
