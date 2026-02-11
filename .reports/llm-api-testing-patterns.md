# LLM API Testing Patterns - Comprehensive Guide

## Executive Summary

Testing applications that integrate with LLM APIs (OpenAI, Gemini, Claude, etc.) presents unique challenges: non-deterministic responses, rate limits, API costs, and variable latency. This guide covers battle-tested patterns for effectively testing LLM-powered applications without breaking the bank or hitting rate limits.

**Key Principle:** Never call real LLM APIs in unit tests. Use a combination of mocks, stubs, and fixtures to create deterministic, fast, and cost-effective test suites.

---

## Table of Contents

1. [Mocking Strategies](#1-mocking-strategies)
2. [Test Fixtures and Fixtures Patterns](#2-test-fixtures-and-fixtures-patterns)
3. [Avoiding Real API Calls](#3-avoiding-real-api-calls)
4. [Handling Timeouts and Retries](#4-handling-timeouts-and-retries)
5. [Cost-Saving Strategies](#5-cost-saving-strategies)
6. [Integration Testing](#6-integration-testing)
7. [E2E Testing with LLMs](#7-e2e-testing-with-llms)
8. [Tools and Libraries](#8-tools-and-libraries)
9. [Best Practices Summary](#9-best-practices-summary)

---

## 1. Mocking Strategies

### 1.1 SDK-Level Mocking (Recommended)

Mock the LLM SDK client directly. This provides the highest fidelity while avoiding real API calls.

**Example: Mocking Google Gemini SDK (Vitest)**

```typescript
// tests/mocks/gemini.ts
import { vi } from 'vitest';

export interface MockGeminiClient {
  models: {
    generateContent: ReturnType<typeof vi.fn>;
    generateContentStream: ReturnType<typeof vi.fn>;
  };
  files?: {
    upload: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

export function createMockGeminiClient(
  overrides: Partial<MockGeminiClient> = {}
): MockGeminiClient {
  const defaultResponse = {
    text: () => JSON.stringify({
      description: 'A test image description',
      metadata: { model: 'gemini-2.0-flash', total_tokens: 150 }
    }),
    usageMetadata: { totalTokenCount: 150 }
  };

  return {
    models: {
      generateContent: vi.fn().mockResolvedValue(defaultResponse),
      generateContentStream: vi.fn().mockResolvedValue({
        [Symbol.asyncIterator]: async function* () {
          yield defaultResponse;
        },
      }),
      ...overrides.models,
    },
    files: {
      upload: vi.fn().mockResolvedValue({
        uri: 'https://generativelanguage.googleapis.com/files/test-file',
        name: 'files/test-file',
      }),
      ...overrides.files,
    },
  };
}

// In your test setup
vi.mock('@google/genai', () => ({
  GoogleGenAI: vi.fn().mockImplementation(() => createMockGeminiClient()),
}));
```

**Example: Mocking OpenAI SDK**

```typescript
// tests/mocks/openai.ts
import { vi } from 'vitest';

export function createMockOpenAIClient() {
  return {
    chat: {
      completions: {
        create: vi.fn().mockResolvedValue({
          choices: [{
            message: {
              content: JSON.stringify({ analysis: 'test result' })
            }
          }],
          usage: { total_tokens: 100 }
        })
      }
    },
    images: {
      generate: vi.fn().mockResolvedValue({
        data: [{ url: 'https://example.com/image.png' }]
      })
    }
  };
}

// In your test setup
vi.mock('openai', () => ({
  default: vi.fn().mockImplementation(createMockOpenAIClient)
}));
```

### 1.2 HTTP-Level Mocking with MSW

Use Mock Service Worker (MSW) to intercept HTTP requests at the network level. This works regardless of which SDK you're using.

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

const handlers = [
  // Gemini API
  http.post('https://generativelanguage.googleapis.com/v1beta/models/:model',
    async ({ request, params }) => {
      const { model } = params;
      return HttpResponse.json({
        candidates: [{
          content: {
            parts: [{ text: JSON.stringify({ result: 'mocked response' }) }]
          }
        }],
        usageMetadata: { totalTokenCount: 100 }
      });
    }
  ),

  // OpenAI API
  http.post('https://api.openai.com/v1/chat/completions', async () => {
    return HttpResponse.json({
      id: 'test-id',
      choices: [{
        message: { content: 'Mocked OpenAI response' }
      }],
      usage: { total_tokens: 50 }
    });
  }),
];

export const server = setupServer(...handlers);

// In test setup
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

### 1.3 Provider Interface Mocking

Create a provider interface that can be swapped between real and mock implementations.

```typescript
// src/providers/base/VisionProvider.ts
export interface VisionProvider {
  analyzeImage(source: string, prompt: string): Promise<AnalysisResult>;
  compareImages(sources: string[], prompt: string): Promise<AnalysisResult>;
  healthCheck(): Promise<HealthStatus>;
}

// src/providers/MockVisionProvider.ts
export class MockVisionProvider implements VisionProvider {
  private responses: Map<string, any> = new Map();

  setResponse(method: string, response: any) {
    this.responses.set(method, response);
  }

  async analyzeImage(): Promise<AnalysisResult> {
    return this.responses.get('analyzeImage') || {
      description: 'Mock analysis',
      metadata: { model: 'mock', total_tokens: 0 }
    };
  }

  async compareImages(): Promise<AnalysisResult> {
    return this.responses.get('compareImages') || {
      description: 'Mock comparison',
      metadata: { model: 'mock', total_tokens: 0 }
    };
  }

  async healthCheck(): Promise<HealthStatus> {
    return { status: 'healthy' };
  }
}

// Factory for dependency injection
export class VisionProviderFactory {
  static create(config: Config, mode: 'real' | 'mock' = 'real'): VisionProvider {
    return mode === 'mock'
      ? new MockVisionProvider()
      : new GeminiProvider(config);
  }
}
```

### 1.4 Repository Pattern with Mock Repositories

```typescript
// Abstract repository for testability
export interface LLMRepository {
  generateContent(prompt: string): Promise<string>;
  analyzeImage(imageUrl: string, prompt: string): Promise<AnalysisResult>;
}

// Real implementation
export class GeminiRepository implements LLMRepository {
  async generateContent(prompt: string): Promise<string> {
    // Real SDK call
  }
}

// Mock implementation for tests
export class MockLLMRepository implements LLMRepository {
  private cannedResponses: Map<string, string> = new Map();

  setCannedResponse(promptPattern: RegExp, response: string) {
    this.cannedResponses.set(promptPattern.source, response);
  }

  async generateContent(prompt: string): Promise<string> {
    for (const [pattern, response] of this.cannedResponses) {
      if (new RegExp(pattern).test(prompt)) {
        return response;
      }
    }
    return 'Default mock response';
  }
}
```

---

## 2. Test Fixtures and Fixtures Patterns

### 2.1 Canned LLM Responses

Create a library of realistic LLM responses for different scenarios.

```typescript
// tests/fixtures/llm-responses.ts
export const analysisResponses = {
  imageAnalysis: {
    simple: {
      description: 'A red apple on a wooden table',
      objects: [{ label: 'apple', confidence: 0.98 }],
      metadata: { model: 'gemini-2.0-flash', total_tokens: 150 }
    },
    complex: {
      description: 'A busy street scene with pedestrians, cars, and storefronts. '
        + 'The weather appears sunny with clear skies.',
      objects: [
        { label: 'person', confidence: 0.95 },
        { label: 'car', confidence: 0.92 },
        { label: 'building', confidence: 0.88 }
      ],
      metadata: { model: 'gemini-2.0-flash', total_tokens: 250 }
    },
    empty: {
      description: '',
      objects: [],
      metadata: { model: 'gemini-2.0-flash', total_tokens: 50 }
    }
  },

  detectionResults: {
    standard: {
      detections: [
        { label: 'person', confidence: 0.95, bbox: { x: 100, y: 100, width: 200, height: 300 } },
        { label: 'car', confidence: 0.87, bbox: { x: 400, y: 200, width: 150, height: 100 } }
      ],
      summary: { total_objects: 2, unique_labels: ['person', 'car'] },
      metadata: { model: 'gemini-2.0-flash', total_tokens: 200 }
    }
  }
};

// Usage in tests
mockClient.models.generateContent.mockResolvedValue({
  text: () => JSON.stringify(analysisResponses.imageAnalysis.simple)
});
```

### 2.2 Image Test Fixtures

```typescript
// tests/fixtures/images.ts
export const testImages = {
  // Minimal valid JPEG (1x1 pixel)
  jpeg1x1: Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46,
    0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00,
    0xff, 0xd9
  ]),

  // Minimal valid PNG (1x1 transparent pixel)
  png1x1: Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
    0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
    0x54, 0x78, 0x9c, 0x63, 0x60, 0x00, 0x00, 0x00,
    0x02, 0x00, 0x01, 0xe2, 0x21, 0xbc, 0x33, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
    0x42, 0x60, 0x82
  ]),

  // Base64 encoded test images
  base64: {
    jpeg: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=',
    png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
  }
};

// Helper to create fake image buffers
export function createFakeImageBuffer(
  mimeType: string = 'image/jpeg',
  size: number = 1024
): ArrayBuffer {
  const jpegHeader = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
  ]);
  const pngHeader = new Uint8Array([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  ]);

  const header = mimeType === 'image/png' ? pngHeader : jpegHeader;
  const buffer = new ArrayBuffer(Math.max(size, header.length));
  const view = new Uint8Array(buffer);
  view.set(header);

  for (let i = header.length; i < size; i++) {
    view[i] = Math.floor(Math.random() * 256);
  }

  return buffer;
}
```

### 2.3 Error Fixtures

```typescript
// tests/fixtures/errors.ts
export const llmErrors = {
  // API errors
  rateLimit: new Error('429 Too Many Requests'),
  quotaExceeded: new Error('Quota exceeded for quota metric'),
  invalidApiKey: new Error('Invalid API key provided'),
  invalidRequest: new Error('Invalid request: malformed content'),
  serverError: new Error('500 Internal Server Error'),

  // Network errors
  networkError: new Error('Network error - connection refused'),
  timeoutError: new Error('Request timeout after 30000ms'),
  connectionRefused: new Error('ECONNREFUSED'),
  dnsLookupFailed: new Error('ENOTFOUND'),

  // SDK errors
  streamingError: new Error('Stream ended unexpectedly'),
  parsingError: new Error('Failed to parse JSON response'),
};

// Usage
mockClient.models.generateContent.mockRejectedValue(llmErrors.rateLimit);
```

---

## 3. Avoiding Real API Calls

### 3.1 Environment-Based Configuration

```typescript
// src/config/test-config.ts
export function getTestConfig(): Config {
  return {
    // Always use dummy/test values in test environment
    apiKey: process.env.TEST_API_KEY || 'test-api-key-12345',
    baseUrl: process.env.TEST_BASE_URL || 'https://test-api.example.com',

    // Feature flags
    enableRealLLMCalls: process.env.ENABLE_REAL_LLM_CALLS === 'true',
  };
}

// src/providers/factory.ts
export class ProviderFactory {
  static create(config: Config): VisionProvider {
    // In test mode, always return mock
    if (process.env.NODE_ENV === 'test' && !config.enableRealLLMCalls) {
      return new MockVisionProvider();
    }
    return new GeminiProvider(config);
  }
}
```

### 3.2 Test Mode Guards

```typescript
// src/utils/guards.ts
export function assertNotInProduction(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('This operation is not allowed in production');
  }
}

export function requireTestApiKey(): string {
  const key = process.env.GEMINI_API_KEY;

  // Prevent accidental use of real API keys in tests
  if (key && !key.startsWith('test-')) {
    throw new Error(
      'Real API key detected in test environment. ' +
      'Use a test-prefixed key or set ENABLE_REAL_LLM_CALLS=true'
    );
  }

  return key || 'test-api-key';
}
```

### 3.3 HTTP Interception Pattern

```typescript
// tests/utils/intercept-http.ts
export function interceptHttpRequests() {
  const originalFetch = global.fetch;

  beforeAll(() => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      // Block any requests to real LLM APIs
      const blockedHosts = [
        'api.openai.com',
        'generativelanguage.googleapis.com',
        'api.anthropic.com',
      ];

      const urlObj = new URL(url);
      if (blockedHosts.includes(urlObj.hostname)) {
        throw new Error(
          `Blocked real HTTP request to ${url}. ` +
          'Use mocks for LLM API calls in tests.'
        );
      }

      return originalFetch(url);
    });
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });
}
```

---

## 4. Handling Timeouts and Retries

### 4.1 Configurable Timeout Testing

```typescript
// tests/utils/timeout-testing.ts
export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage: string = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

// Usage in tests
test('should timeout if LLM takes too long', async () => {
  // Mock a slow response
  mockClient.models.generateContent.mockImplementation(() =>
    new Promise(resolve => setTimeout(resolve, 10000))
  );

  await expect(
    withTimeout(
      provider.analyzeImage('test.jpg', 'describe'),
      1000,
      'LLM request timed out'
    )
  ).rejects.toThrow('LLM request timed out');
});
```

### 4.2 Retry Logic Testing

```typescript
// src/utils/retry.ts
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries: number;
    delayMs: number;
    shouldRetry?: (error: Error) => boolean;
  }
): Promise<T> {
  const { maxRetries, delayMs, shouldRetry = () => true } = options;

  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries + 1; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt > maxRetries || !shouldRetry(lastError)) {
        throw lastError;
      }

      await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
    }
  }

  throw lastError!;
}

// tests/retry.test.ts
test('should retry on rate limit error', async () => {
  let callCount = 0;

  mockClient.models.generateContent.mockImplementation(() => {
    callCount++;
    if (callCount < 3) {
      throw new Error('429 Too Many Requests');
    }
    return { text: () => 'Success' };
  });

  const result = await withRetry(
    () => provider.analyzeImage('test.jpg', 'describe'),
    { maxRetries: 3, delayMs: 100 }
  );

  expect(callCount).toBe(3);
  expect(result.description).toBe('Success');
});
```

### 4.3 Circuit Breaker Pattern

```typescript
// src/utils/circuit-breaker.ts
export class CircuitBreaker {
  private failures = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private nextAttempt = Date.now();

  constructor(
    private threshold = 5,
    private timeout = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() < this.nextAttempt) {
        throw new Error('Circuit breaker is open');
      }
      this.state = 'HALF_OPEN';
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    if (this.failures >= this.threshold) {
      this.state = 'OPEN';
      this.nextAttempt = Date.now() + this.timeout;
    }
  }
}
```

---

## 5. Cost-Saving Strategies

### 5.1 Token Count Estimation

```typescript
// src/utils/token-counter.ts
export function estimateTokens(text: string): number {
  // Rough approximation: 1 token ≈ 4 characters
  return Math.ceil(text.length / 4);
}

export function estimateImageTokens(
  width: number,
  height: number,
  detail: 'low' | 'high' = 'low'
): number {
  if (detail === 'low') {
    // Low detail images cost fixed tokens
    return 85;
  }

  // High detail: image is scaled to fit in 2048x2048, then tiled into 512x512
  const scaledWidth = Math.min(width, 2048);
  const scaledHeight = Math.min(height, 2048);
  const tiles = Math.ceil(scaledWidth / 512) * Math.ceil(scaledHeight / 512);

  return tiles * 170 + 85;
}

// Test utility to verify cost estimates
test('should estimate token costs correctly', () => {
  expect(estimateTokens('Hello world')).toBe(3);
  expect(estimateImageTokens(1024, 1024, 'high')).toBe(765); // 4 tiles + base
});
```

### 5.2 Test Mode Cost Tracking

```typescript
// tests/utils/cost-tracker.ts
export class TestCostTracker {
  private calls: Array<{
    provider: string;
    model: string;
    estimatedTokens: number;
    timestamp: Date;
  }> = [];

  track(provider: string, model: string, estimatedTokens: number) {
    this.calls.push({ provider, model, estimatedTokens, timestamp: new Date() });
  }

  getReport() {
    const totalTokens = this.calls.reduce((sum, c) => sum + c.estimatedTokens, 0);
    const byProvider = this.calls.reduce((acc, c) => {
      acc[c.provider] = (acc[c.provider] || 0) + c.estimatedTokens;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalCalls: this.calls.length,
      totalTokens,
      byProvider,
      estimatedCost: this.calculateCost(totalTokens)
    };
  }

  private calculateCost(tokens: number): number {
    // Approximate cost per 1K tokens
    return (tokens / 1000) * 0.002;
  }
}

// In tests, use this to track what calls would have been made
const tracker = new TestCostTracker();
beforeEach(() => {
  mockClient.models.generateContent.mockImplementation((params) => {
    tracker.track('gemini', params.model, estimateTokens(params.contents[0].text));
    return mockResponse;
  });
});

afterAll(() => {
  console.log('Test would have cost:', tracker.getReport());
});
```

### 5.3 Selective Real API Testing

```typescript
// tests/e2e/selective-real-api.test.ts
describe('Real LLM API Tests', () => {
  // Only run if explicitly enabled
  const runRealTests = process.env.RUN_REAL_LLM_TESTS === 'true';

  (runRealTests ? describe : describe.skip)('with real API', () => {
    beforeAll(() => {
      // Validate API key is present
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY required for real API tests');
      }
    });

    test('should analyze image with real API', async () => {
      const provider = new GeminiProvider({
        apiKey: process.env.GEMINI_API_KEY!,
        baseUrl: 'https://generativelanguage.googleapis.com'
      });

      const result = await provider.analyzeImage(
        'https://example.com/test.jpg',
        'Describe this image'
      );

      expect(result.description).toBeTruthy();
    }, 30000); // Longer timeout for real API
  });
});
```

---

## 6. Integration Testing

### 6.1 MCP Server Testing

```typescript
// tests/e2e/mcp-integration.ts
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

export async function createTestMCPClient(
  envOverrides: Record<string, string> = {}
): Promise<Client> {
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['./dist/index.js'],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      GEMINI_API_KEY: 'test-api-key',
      ...envOverrides
    }
  });

  const client = new Client(
    { name: 'test-client', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  await client.connect(transport);
  return client;
}

// Test usage
describe('MCP Integration', () => {
  let client: Client;

  beforeAll(async () => {
    client = await createTestMCPClient();
  });

  afterAll(async () => {
    await client.close();
  });

  test('should list available tools', async () => {
    const tools = await client.listTools();
    expect(tools.tools).toContainEqual(
      expect.objectContaining({ name: 'analyze_image' })
    );
  });

  test('should call analyze_image tool', async () => {
    const result = await client.callTool('analyze_image', {
      imageSource: 'data:image/jpeg;base64,/9j/4AAQ...',
      prompt: 'Describe this image'
    });

    expect(result.content).toBeDefined();
  });
});
```

### 6.2 CLI Testing

```typescript
// tests/e2e/cli.test.ts
import { spawn } from 'child_process';
import { join } from 'path';

export function runCLI(args: string[], env: Record<string, string> = {}): Promise<{
  stdout: string;
  stderr: string;
  exitCode: number;
}> {
  return new Promise((resolve, reject) => {
    const stdout: string[] = [];
    const stderr: string[] = [];

    const child = spawn('node', [
      join(__dirname, '../../dist/index.js'),
      ...args
    ], {
      env: { ...process.env, NODE_ENV: 'test', ...env }
    });

    child.stdout.on('data', (data) => stdout.push(data.toString()));
    child.stderr.on('data', (data) => stderr.push(data.toString()));

    child.on('close', (exitCode) => {
      resolve({
        stdout: stdout.join(''),
        stderr: stderr.join(''),
        exitCode: exitCode || 0
      });
    });

    child.on('error', reject);
  });
}

describe('CLI', () => {
  test('should analyze image via CLI', async () => {
    const { stdout, exitCode } = await runCLI([
      'analyze-image',
      'data:image/jpeg;base64,/9j/4AAQ...',
      '--prompt', 'Describe'
    ]);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('description');
  }, 30000);
});
```

---

## 7. E2E Testing with LLMs

### 7.1 Contract Testing Pattern

```typescript
// tests/e2e/contract.test.ts
// Verify that mocks match real API behavior

describe('LLM API Contract', () => {
  const runContractTests = process.env.RUN_CONTRACT_TESTS === 'true';

  (runContractTests ? test : test.skip)(
    'real API response matches mock structure',
    async () => {
      const realProvider = new GeminiProvider({
        apiKey: process.env.GEMINI_API_KEY!,
        baseUrl: 'https://generativelanguage.googleapis.com'
      });

      const mockProvider = new MockVisionProvider();
      mockProvider.setResponse('analyzeImage', {
        description: 'test',
        metadata: { model: 'gemini-2.0-flash', total_tokens: 100 }
      });

      // Compare response structures
      const [realResult, mockResult] = await Promise.all([
        realProvider.analyzeImage('test.jpg', 'describe'),
        mockProvider.analyzeImage('test.jpg', 'describe')
      ]);

      // Ensure mock has all required fields that real API returns
      const realKeys = Object.keys(realResult).sort();
      const mockKeys = Object.keys(mockResult).sort();

      expect(mockKeys).toEqual(expect.arrayContaining(realKeys));
    }
  );
});
```

### 7.2 Snapshot Testing for LLM Responses

```typescript
// tests/e2e/snapshot.test.ts
test('LLM response structure is stable', async () => {
  const result = await mockProvider.analyzeImage('test.jpg', 'describe');

  // Use snapshot to detect unexpected changes
  expect(result).toMatchSnapshot({
    // Exclude variable fields
    metadata: {
      total_tokens: expect.any(Number),
      processing_time: expect.any(Number)
    }
  });
});
```

### 7.3 Recording and Replaying Real API Responses

```typescript
// tests/utils/recorder.ts
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export class LLMRecorder {
  private recordingsDir = join(__dirname, '../recordings');

  async record<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const recordingPath = join(this.recordingsDir, `${name}.json`);

    // If recording exists, replay it
    if (existsSync(recordingPath) && process.env.REPLAY_RECORDINGS === 'true') {
      const data = JSON.parse(readFileSync(recordingPath, 'utf-8'));
      return data as T;
    }

    // Otherwise, perform real call and record
    const result = await operation();
    writeFileSync(recordingPath, JSON.stringify(result, null, 2));
    return result;
  }
}

// Usage
test('recorded LLM call', async () => {
  const recorder = new LLMRecorder();

  const result = await recorder.record('image-analysis', () =>
    realProvider.analyzeImage('test.jpg', 'describe')
  );

  expect(result.description).toBeDefined();
});
```

---

## 8. Tools and Libraries

### 8.1 Recommended Testing Stack

| Tool | Purpose | Best For |
|------|---------|----------|
| **Vitest/Jest** | Test runner | Unit and integration tests |
| **MSW** | HTTP mocking | Network-level interception |
| **vi.fn()** | Function mocking | SDK method mocking |
| **Nock** | HTTP mocking | Legacy Node.js projects |
| **Polly.js** | Recording/Replay | E2E tests with real API fallbacks |
| **WireMock** | Mock server | Complex service dependencies |

### 8.2 MSW Setup for LLM APIs

```typescript
// tests/mocks/msw-server.ts
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

export const llmHandlers = [
  // Gemini
  http.post('https://generativelanguage.googleapis.com/v1beta/models/*',
    () => HttpResponse.json({
      candidates: [{ content: { parts: [{ text: 'Mocked' }] } }]
    })
  ),

  // OpenAI
  http.post('https://api.openai.com/v1/*', () =>
    HttpResponse.json({ choices: [{ message: { content: 'Mocked' } }] })
  ),

  // Anthropic
  http.post('https://api.anthropic.com/v1/*', () =>
    HttpResponse.json({ content: [{ text: 'Mocked' }] })
  ),
];

export const mswServer = setupServer(...llmHandlers);
```

### 8.3 VCR Pattern with Polly.js

```typescript
// tests/utils/polly.ts
import { Polly } from '@pollyjs/core';
import NodeHttpAdapter from '@pollyjs/adapter-node-http';
import FSPersister from '@pollyjs/persister-fs';

Polly.register(NodeHttpAdapter);
Polly.register(FSPersister);

export function setupPolly(testName: string) {
  const polly = new Polly(testName, {
    adapters: ['node-http'],
    persister: 'fs',
    persisterOptions: {
      fs: { recordingsDir: './tests/recordings' }
    },
    recordIfMissing: process.env.RECORD_POLLY === 'true',
    mode: process.env.REPLAY_POLLY === 'true' ? 'replay' : 'passthrough'
  });

  return polly;
}
```

---

## 9. Best Practices Summary

### 9.1 Golden Rules

1. **Never call real LLM APIs in unit tests** - Use mocks for speed and determinism
2. **Use consistent fixtures** - Create a library of canned responses
3. **Test error paths** - Mock failures, rate limits, and network errors
4. **Verify mock calls** - Ensure the right parameters are passed to SDK methods
5. **Isolate tests** - Reset mocks between tests
6. **Use type-safe mocks** - Leverage TypeScript for accurate mock types

### 9.2 Test Pyramid for LLM Applications

```
       /\
      /  \
     / E2E\          <- 5% of tests (selective real API calls)
    /________\
   /          \
  / Integration \     <- 15% of tests (MCP/CLI with mocks)
 /______________\
/                \
/      Unit       \   <- 80% of tests (pure mocks, fast)
/__________________\
```

### 9.3 CI/CD Configuration

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run unit tests
        run: npm test
        env:
          NODE_ENV: test
          # Never use real API key here
          GEMINI_API_KEY: test-api-key-ci

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run integration tests
        run: npm run test:integration

  # Optional: Run real API tests on schedule (not every PR)
  real-api-tests:
    if: github.event_name == 'schedule'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Run real API tests
        run: npm run test:e2e:real
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
          RUN_REAL_LLM_TESTS: true
```

### 9.4 Checklist for LLM Test Implementation

- [ ] Mock SDK client created with realistic response structure
- [ ] Test fixtures for common LLM responses
- [ ] Error scenario fixtures (rate limit, quota, network)
- [ ] HTTP interception to prevent accidental real calls
- [ ] Environment guards to block production APIs in tests
- [ ] Token/cost estimation for test awareness
- [ ] Timeout configuration for long-running operations
- [ ] Retry logic tested with simulated failures
- [ ] MCP server testing utilities
- [ ] CLI testing with captured output
- [ ] CI/CD configured without real API keys
- [ ] Selective real API tests for contract verification

---

## 10. Implementation in ai-vision-mcp

Based on this research, the ai-vision-mcp project implements several best practices:

### Existing Patterns:

1. **SDK Mocking** (`tests/mocks/gemini.ts`)
   - Mock client with configurable responses
   - Error simulation utilities
   - Fake image buffer generation

2. **Test Fixtures**
   - Sample base64 images
   - Detection result fixtures
   - Error type constants

3. **E2E Test Setup** (`tests/e2e/setup.ts`)
   - MCP client creation with stdio transport
   - CLI command execution utilities
   - Server lifecycle management

4. **Environment Configuration**
   - Dummy API keys for tests
   - Test environment detection
   - Configurable base URLs

### Recommendations for Enhancement:

1. Add MSW for HTTP-level mocking as a safety net
2. Implement token cost estimation for test awareness
3. Add circuit breaker for provider resilience
4. Create recording/replay system for contract tests
5. Add rate limiting simulation in mocks

---

## References

1. [Vitest Mocking Guide](https://vitest.dev/guide/mocking.html)
2. [MSW Documentation](https://mswjs.io/docs/)
3. [Google Gemini SDK Reference](https://ai.google.dev/api)
4. [MCP SDK Testing](https://github.com/modelcontextprotocol)
5. [LangChain MCP Adapters](https://github.com/langchain-ai/langchain-mcp-adapters)
