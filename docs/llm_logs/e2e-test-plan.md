# E2E Test Plan for ai-vision-mcp

## Executive Summary

This document outlines a comprehensive End-to-End (E2E) testing strategy for the ai-vision-mcp server. Given that this is an MCP (Model Context Protocol) server using stdio transport, traditional HTTP-based E2E testing tools like Playwright are not suitable. Instead, we will use the MCP SDK Client with StdioClientTransport for true integration testing.

## Architecture Overview

### What is ai-vision-mcp?
- **Type**: Model Context Protocol (MCP) Server
- **Transport**: stdio (stdin/stdout JSON-RPC)
- **Purpose**: AI-powered image and video analysis using Google Gemini/Vertex AI
- **Tools Exposed**:
  1. `analyze_image` - Analyze single images
  2. `compare_images` - Compare multiple images
  3. `detect_objects_in_image` - Object detection with bounding boxes
  4. `analyze_video` - Video analysis

### External Dependencies
- Google Gemini API or Vertex AI (requires API keys)
- External image/video URLs or local files
- File system for temp file storage

## E2E Testing Strategy

### Approach: MCP SDK Client-Based Testing

Since the server uses stdio transport, we will:
1. Spawn the server as a subprocess using `StdioClientTransport`
2. Send JSON-RPC messages via stdin
3. Receive responses via stdout
4. Validate the complete flow from input to output

### Why Not Playwright?
- Playwright is for browser automation
- MCP servers communicate via stdio, not HTTP
- No browser UI to interact with

## Test Categories

### 1. MCP Protocol Tests (No External APIs)

These tests verify the MCP protocol implementation without calling external AI services.

#### 1.1 Initialize Handshake
**Purpose**: Verify proper MCP initialization
```typescript
test('should complete initialize handshake', async () => {
  const client = new Client({ name: 'test', version: '1.0' });
  await client.connect(transport);

  const result = await client.initialize({
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0' }
  });

  expect(result.protocolVersion).toBe('2024-11-05');
  expect(result.serverInfo.name).toBe('ai-vision-mcp');
  expect(result.capabilities.tools).toBeDefined();
});
```

#### 1.2 Tools/List
**Purpose**: Verify all tools are registered
```typescript
test('should list all 4 tools', async () => {
  const tools = await client.listTools();

  expect(tools.tools).toHaveLength(4);
  expect(tools.tools.map(t => t.name)).toContain('analyze_image');
  expect(tools.tools.map(t => t.name)).toContain('compare_images');
  expect(tools.tools.map(t => t.name)).toContain('detect_objects_in_image');
  expect(tools.tools.map(t => t.name)).toContain('analyze_video');
});
```

#### 1.3 Tool Schema Validation
**Purpose**: Verify tool input schemas are correct
```typescript
test('should have valid input schema for analyze_image', async () => {
  const tools = await client.listTools();
  const analyzeImage = tools.tools.find(t => t.name === 'analyze_image');

  expect(analyzeImage.inputSchema).toBeDefined();
  expect(analyzeImage.inputSchema.required).toContain('imageSource');
  expect(analyzeImage.inputSchema.required).toContain('prompt');
});
```

### 2. Input Validation Tests (No External APIs)

These tests verify proper error handling for invalid inputs.

#### 2.1 Missing Required Parameters
```typescript
test('should return error for missing imageSource', async () => {
  const result = await client.callTool('analyze_image', {
    prompt: 'Describe this'
    // imageSource missing
  });

  expect(result.isError).toBe(true);
  expect(result.content[0].text).toContain('imageSource is required');
});
```

#### 2.2 Invalid Image Source
```typescript
test('should return error for invalid image source format', async () => {
  const result = await client.callTool('analyze_image', {
    imageSource: 'not-a-valid-url-or-path',
    prompt: 'Describe this'
  });

  expect(result.isError).toBe(true);
});
```

#### 2.3 Too Many Images for Comparison
```typescript
test('should return error when exceeding max images', async () => {
  const result = await client.callTool('compare_images', {
    imageSources: ['url1', 'url2', 'url3', 'url4', 'url5'], // Assuming max is 4
    prompt: 'Compare these'
  });

  expect(result.isError).toBe(true);
  expect(result.content[0].text).toContain('Maximum');
});
```

### 3. File Handling Tests (Mock External Services)

These tests verify file processing without calling actual AI APIs.

#### 3.1 URL Image Fetching (Mock fetch)
```typescript
test('should fetch image from URL', async () => {
  // Mock node-fetch to return a test image
  const mockFetch = jest.fn().mockResolvedValue({
    ok: true,
    arrayBuffer: () => Promise.resolve(Buffer.from('fake-image-data'))
  });

  // Test that URL is fetched and processed
});
```

#### 3.2 Base64 Image Processing
```typescript
test('should process base64 image data', async () => {
  const base64Image = 'data:image/jpeg;base64,/9j/4AAQSkZ...';

  // Verify base64 is decoded correctly
});
```

#### 3.3 Local File Handling (Temp files)
```typescript
test('should handle local file path', async () => {
  // Create temp file, verify it's read
  // Clean up after test
});
```

### 4. Full Integration Tests (With Real API)

These tests use actual API calls. Should be run:
- Only in CI with secrets
- With rate limiting awareness
- Not on every PR (too slow/expensive)

#### 4.1 Image Analysis (Real API)
```typescript
test('should analyze image from URL', async () => {
  const result = await client.callTool('analyze_image', {
    imageSource: 'https://images.pexels.com/photos/1391498/pexels-photo-1391498.jpeg',
    prompt: 'What is this image about?'
  });

  expect(result.isError).toBeFalsy();
  expect(result.content[0].text).toContain('woman'); // Basic content check
  expect(result.content[0].text).toContain('metadata');
}, 30000); // 30s timeout
```

#### 4.2 Object Detection (Real API)
```typescript
test('should detect objects in image', async () => {
  const result = await client.callTool('detect_objects_in_image', {
    imageSource: 'https://ichef.bbci.co.uk/images/ic/480xn/p0529h01.jpg',
    prompt: 'Detect people'
  });

  expect(result.isError).toBeFalsy();
  const data = JSON.parse(result.content[0].text);
  expect(data.detections).toBeDefined();
  expect(Array.isArray(data.detections)).toBe(true);
}, 30000);
```

#### 4.3 Video Analysis (Real API)
```typescript
test('should analyze YouTube video', async () => {
  const result = await client.callTool('analyze_video', {
    videoSource: 'https://www.youtube.com/watch?v=9hE5-98ZeCg',
    prompt: 'Summarize this video'
  });

  expect(result.isError).toBeFalsy();
}, 60000); // 60s timeout
```

### 5. Error Handling Tests

#### 5.1 Invalid API Key
```typescript
test('should handle invalid API key', async () => {
  // Start server with invalid GEMINI_API_KEY
  // Expect authentication error
});
```

#### 5.2 Rate Limiting
```typescript
test('should handle rate limit', async () => {
  // Make many rapid requests
  // Expect rate limit error with retry info
});
```

#### 5.3 Network Errors
```typescript
test('should handle network timeout', async () => {
  // Mock network to be unavailable
  // Expect network error
});
```

### 6. Configuration Tests

#### 6.1 Environment Variables
```typescript
test('should respect IMAGE_MODEL env var', async () => {
  // Start server with IMAGE_MODEL=gemini-2.5-pro
  // Verify pro model is used
});
```

#### 6.2 Missing Configuration
```typescript
test('should fail gracefully without API key', async () => {
  // Start server without GEMINI_API_KEY
  // Expect config error
});
```

## Test Environment Setup

### Directory Structure
```
tests/
├── e2e/
│   ├── setup.ts              # Test setup, client creation
│   ├── protocol.test.ts      # MCP protocol tests
│   ├── validation.test.ts    # Input validation tests
│   ├── integration.test.ts   # Full API tests (optional in CI)
│   └── fixtures/
│       ├── test-image.jpg    # Sample images
│       └── test-video.mp4    # Sample videos
├── unit/
│   └── (existing unit tests)
└── mocks/
    ├── fetch.ts              # Mock fetch for image URLs
    └── gemini-api.ts         # Mock Gemini API responses
```

### Test Configuration

#### Environment Variables for Tests
```bash
# Required for full integration tests
GEMINI_API_KEY=test-key-for-ci

# Optional - for specific tests
IMAGE_MODEL=gemini-2.5-flash-lite
VIDEO_MODEL=gemini-2.5-flash
MAX_IMAGES_FOR_COMPARISON=4
```

#### Test Scripts (package.json)
```json
{
  "scripts": {
    "test": "vitest run",
    "test:unit": "vitest run tests/unit",
    "test:e2e": "vitest run tests/e2e",
    "test:e2e:protocol": "vitest run tests/e2e/protocol.test.ts",
    "test:e2e:ci": "vitest run tests/e2e/protocol.test.ts tests/e2e/validation.test.ts",
    "test:watch": "vitest watch"
  }
}
```

## GitHub Actions Integration

### Workflow: e2e.yml
```yaml
name: E2E Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  workflow_dispatch:  # Manual trigger

jobs:
  protocol-tests:
    name: MCP Protocol Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e:protocol

  integration-tests:
    name: Integration Tests (with API)
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch' || github.ref == 'refs/heads/main'
    env:
      GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - run: npm run test:e2e
```

## Implementation Priority

### Phase 1: Protocol Tests (High Priority)
- Initialize handshake
- Tools/list
- Tool schema validation
- **Value**: Ensures MCP compliance, fast, no API costs

### Phase 2: Input Validation (High Priority)
- Missing parameters
- Invalid formats
- Type checking
- **Value**: Catches bugs early, no API costs

### Phase 3: Integration Tests (Medium Priority)
- Real image analysis
- Real video analysis
- **Value**: Verifies end-to-end flow
- **Note**: Only run in CI with secrets, rate limited

### Phase 4: Error Handling (Medium Priority)
- API errors
- Network errors
- Configuration errors
- **Value**: Ensures graceful degradation

## Testing Best Practices

### 1. Test Isolation
- Each test starts fresh server instance
- Clean up temp files after tests
- Reset environment variables

### 2. Test Data
- Use stable, publicly available images
- Don't rely on external services that might change
- Mock where appropriate

### 3. Timeouts
- Protocol tests: 5s timeout
- API tests: 30-60s timeout
- Video tests: 120s timeout

### 4. Cost Management
- Use cheapest model (flash-lite) for tests
- Limit test image sizes
- Skip API tests in PRs by default

### 5. Debugging
- Capture server stderr on failure
- Log all JSON-RPC messages
- Provide clear failure messages

## Mocking Strategy

### What to Mock
1. **External HTTP calls** (node-fetch) - Use nock or MSW
2. **Gemini API responses** - Return canned responses
3. **File system** (optional) - For faster tests

### What NOT to Mock
1. **MCP protocol layer** - Test the real thing
2. **stdio transport** - Test the real thing
3. **Tool registration** - Test the real thing

## Success Criteria

E2E tests are considered successful when:
1. ✅ All protocol tests pass
2. ✅ All validation tests pass
3. ✅ Integration tests pass (when API key available)
4. ✅ Server handles errors gracefully
5. ✅ No memory leaks (server can be started/stopped repeatedly)
6. ✅ Tests complete in reasonable time (< 5 min for protocol, < 10 min for full)

## Conclusion

This E2E testing strategy focuses on:
- **MCP Protocol Compliance** (stdio transport, JSON-RPC)
- **Input Validation** (error handling, edge cases)
- **Integration** (real API calls with proper mocking)
- **CI/CD Integration** (GitHub Actions with secrets management)

The approach prioritizes fast, reliable tests that can run on every PR while still providing confidence that the server works correctly with real AI APIs.
