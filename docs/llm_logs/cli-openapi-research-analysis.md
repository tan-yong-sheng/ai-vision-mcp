# Research: CLI and OpenAPI Support for ai-vision-mcp

## Executive Summary

This document analyzes architectural options for adding CLI and/or HTTP/OpenAPI support to ai-vision-mcp, which currently operates exclusively as a Model Context Protocol (MCP) server using stdio transport.

**Current State:**
- TypeScript MCP server using `@modelcontextprotocol/sdk`
- 4 tools: `analyze_image`, `compare_images`, `detect_objects_in_image`, `analyze_video`
- Stdio transport only (stdin/stdout JSON-RPC)
- Binary entry point: `dist/index.js` via shebang

---

## Option Analysis

### Option 1: MCP Only (Status Quo)

**Description:**
Keep only stdio MCP transport. No CLI, no HTTP.

**Pros:**
- Simple, focused architecture
- No additional code paths to maintain
- MCP is the intended primary interface
- No security concerns from exposed HTTP endpoints

**Cons:**
- Requires MCP client to use (Claude Desktop, Claude Code, etc.)
- Difficult to test directly from command line
- No direct integration with non-MCP workflows
- Debugging requires MCP protocol knowledge

**Use Cases:**
- Claude Desktop users
- Claude Code integration
- Other MCP-compatible clients

---

### Option 2: MCP + CLI

**Description:**
Add CLI commands that reuse the same tool implementations:
```bash
# Single image analysis
ai-vision-mcp analyze-image <url-or-path> --prompt "describe this image"

# Image comparison
ai-vision-mcp compare-images <url1> <url2> --prompt "find differences"

# Object detection
ai-vision-mcp detect-objects <url-or-path> --prompt "find people" --output result.jpg

# Video analysis
ai-vision-mcp analyze-video <url-or-path> --prompt "summarize"
```

**Implementation Approaches:**

#### 2A: Mode Detection in Entry Point
```typescript
// src/index.ts
if (process.argv.length > 2) {
  // CLI mode
  await runCliMode(process.argv.slice(2));
} else {
  // MCP mode (stdio)
  await runMcpMode();
}
```

#### 2B: Separate CLI Entry Point
```json
// package.json
"bin": {
  "ai-vision-mcp": "dist/index.js",
  "ai-vision": "dist/cli.js"
}
```

**Required Dependencies:**
- `commander` or `yargs` for argument parsing
- No additional runtime dependencies

**Code Structure Changes:**
```
src/
├── server.ts           # MCP server (existing)
├── cli.ts              # NEW: CLI entry point
├── tools/
│   ├── analyze_image.ts
│   ├── cli/            # NEW: CLI-specific wrappers
│   │   ├── analyze-image.ts
│   │   ├── compare-images.ts
│   │   └── ...
```

**Pros:**
- Direct command-line usage without MCP client
- Easier E2E testing (can test tools directly)
- Scriptable for automation workflows
- Better debugging experience (direct output)
- Can use in CI/CD pipelines
- Same binary, different modes

**Cons:**
- More code paths to maintain
- CLI argument parsing complexity
- Need to handle output formatting (JSON vs human-readable)
- Environment variable handling differs between modes
- Additional testing matrix

**Testing Benefits:**
```typescript
// Direct tool testing without MCP protocol overhead
const result = await analyze_image(
  { imageSource: 'test.jpg', prompt: 'describe' },
  config,
  provider,
  fileService
);
expect(result.description).toBeDefined();
```

---

### Option 3: MCP + HTTP/OpenAPI

**Description:**
Add HTTP server mode with REST endpoints:
```bash
# Start HTTP server
ai-vision-mcp --http --port 8080
```

**API Endpoints:**
```yaml
POST /analyze-image
  body: { imageSource: string, prompt: string, options?: object }
  response: { description: string, metadata: object }

POST /compare-images
  body: { imageSources: string[], prompt: string, options?: object }
  response: { comparison: string, metadata: object }

POST /detect-objects
  body: { imageSource: string, prompt: string, outputFilePath?: string }
  response: { detections: object[], imageUrl?: string }

POST /analyze-video
  body: { videoSource: string, prompt: string, options?: object }
  response: { analysis: string, metadata: object }

GET /health
  response: { status: 'ok', version: string }
```

**Implementation Approaches:**

#### 3A: Fastify/Express Server Mode
```typescript
// src/http.ts
import Fastify from 'fastify';

const app = Fastify();
app.post('/analyze-image', async (req, res) => {
  const result = await analyze_image(req.body, config, provider, fileService);
  return result;
});
```

#### 3B: Separate HTTP Binary
```json
"bin": {
  "ai-vision-mcp": "dist/index.js",
  "ai-vision-http": "dist/http.js"
}
```

**Required Dependencies:**
- `fastify` or `express` (Fastify recommended for performance)
- `@fastify/cors` for CORS support
- Optional: `swagger` for OpenAPI documentation

**Pros:**
- HTTP is familiar interface for developers
- Works with curl, Postman, HTTP clients in any language
- Easy integration with web applications
- Can add authentication/authorization middleware
- Load balancer compatible

**Cons:**
- **Security concerns**: Exposing AI vision API to network
- **Server process management**: Needs process manager (pm2, systemd)
- **Deployment complexity**: Port configuration, SSL, reverse proxy
- **Cost risk**: Exposed endpoint could be abused
- **State management**: File upload handling different from MCP
- Additional infrastructure requirements

**Security Considerations:**
- API key authentication required
- Rate limiting essential
- Input validation critical
- File upload size limits
- Network exposure risks

---

### Option 4: All Three (MCP + CLI + HTTP)

**Description:**
Universal binary with mode selection:
```bash
# Default: MCP stdio mode
ai-vision-mcp

# CLI mode
ai-vision-mcp --cli analyze-image <url> --prompt "describe"

# HTTP server mode
ai-vision-mcp --http --port 8080
```

**Implementation:**
```typescript
// src/index.ts
const args = process.argv.slice(2);

if (args.includes('--http')) {
  await runHttpMode(args);
} else if (args.includes('--cli') || args[0]?.startsWith('analyze-')) {
  await runCliMode(args);
} else {
  await runMcpMode();  // Default
}
```

**Pros:**
- Maximum flexibility for users
- Single package handles all use cases
- Users can choose their preferred interface

**Cons:**
- **High complexity**: 3x code paths to maintain
- **Testing burden**: Test matrix explodes
- **Documentation overhead**: 3 interfaces to document
- **Bundle size**: Larger package with all dependencies
- **Confusion**: Users may be unsure which mode to use

---

## Research Findings: How Other MCP Servers Handle This

### Official MCP Servers (modelcontextprotocol/servers)
The official MCP servers repository shows **stdio-only pattern**:
- `filesystem` - stdio only
- `fetch` - stdio only
- `git` - stdio only
- `postgres` - stdio only
- `sqlite` - stdio only

All follow the same pattern: single-purpose MCP tools accessed via stdio.

### Community Examples

#### Servers with CLI Wrappers
Some servers provide CLI wrappers as separate packages:
- `@anthropics/mcp-server-fetch` - stdio only
- Third-party wrappers exist but are separate projects

#### No HTTP Examples Found
No official or widely-used MCP servers expose HTTP interfaces. The protocol is designed for stdio/sse transport, not HTTP REST.

### Key Insight
MCP is designed to be a **protocol for AI assistants**, not a general-purpose API. The stdio transport is the primary interface by design.

---

## Code Structure Analysis

### Current Architecture
```
src/
├── index.ts           # Entry point (shebang -> server.ts)
├── server.ts          # MCP server with stdio transport
├── tools/             # Tool implementations
│   ├── analyze_image.ts      # Pure function: args -> result
│   ├── compare_images.ts
│   ├── detect_objects_in_image.ts
│   └── analyze_video.ts
├── services/          # Shared services
│   ├── ConfigService.ts
│   └── FileService.ts
├── providers/         # AI provider implementations
└── types/             # TypeScript types
```

### Tool Function Signature (Reusable)
```typescript
// All tools follow this pattern - agnostic to transport
export async function analyze_image(
  args: AnalyzeImageArgs,
  config: Config,
  imageProvider: VisionProvider,
  imageFileService: FileService
): Promise<AnalysisResult>
```

This is **already transport-agnostic** and can be reused for CLI/HTTP.

### MCP-Specific Code (Not Reusable)
```typescript
// server.ts - MCP-specific
const server = new McpServer({ name: 'ai-vision-mcp', version: '0.0.5' });
const transport = new StdioServerTransport();
await server.connect(transport);
```

---

## Testing Strategy Comparison

### Current E2E Testing (MCP Protocol)
```typescript
// Spawns server, uses MCP SDK client
const { client, server } = await setupMCPClient();
const result = await client.callTool('analyze_image', args);
```

**Issues:**
- Complex setup (subprocess management)
- MCP protocol overhead
- Harder to debug failures
- Flaky tests due to process lifecycle

### With CLI Mode
```typescript
// Direct function calls
const result = await analyze_image(args, config, provider, fileService);
expect(result.description).toBeDefined();
```

**Benefits:**
- No subprocess management
- No protocol overhead
- Easier to debug
- Faster tests

### HTTP Mode Testing
```typescript
// HTTP client testing
const response = await request(app)
  .post('/analyze-image')
  .send({ imageSource: 'test.jpg', prompt: 'describe' });
expect(response.status).toBe(200);
```

---

## Maintainability Trade-offs

| Aspect | MCP Only | +CLI | +HTTP | All Three |
|--------|----------|------|-------|-----------|
| **Code Complexity** | Low | Low-Medium | Medium | High |
| **Testing Matrix** | 1x | 2x | 2x | 3x |
| **Documentation** | Low | Medium | Medium | High |
| **Security Risk** | None | Low | Medium | Medium |
| **Deployment Complexity** | Low | Low | High | High |
| **User Flexibility** | Low | Medium | High | Maximum |

---

## Claude Skills Integration Analysis

### Current State (MCP Only)
```yaml
# claude_desktop_config.json or CLAUDE.md
mcpServers:
  vision:
    command: npx
    args: ["-y", "ai-vision-mcp"]
    env:
      GEMINI_API_KEY: "..."
```

### With CLI Support
```yaml
# Could be used in custom skills
skills:
  - name: analyze-image
    command: ai-vision-mcp analyze-image
    args: ["{{image_url}}", "--prompt", "{{prompt}}"]
```

**Verdict:** MCP is the native interface for Claude. CLI doesn't add significant value for Claude integration specifically.

---

## Recommendation

### Primary Recommendation: Option 2 (MCP + CLI)

**Rationale:**

1. **Testing Benefit**: The current E2E tests are complex due to MCP protocol overhead. CLI mode enables direct function testing without subprocess management.

2. **Debugging**: CLI mode allows developers to test tools directly without setting up an MCP client:
   ```bash
   ai-vision-mcp analyze-image ./test.jpg --prompt "describe"
   ```

3. **Scriptability**: Enables automation workflows without MCP infrastructure:
   ```bash
   for img in *.jpg; do
     ai-vision-mcp analyze-image "$img" --prompt "tag this image"
   done
   ```

4. **Low Complexity**: The tool implementations are already transport-agnostic. Only a thin CLI wrapper is needed.

5. **No Security Risk**: Unlike HTTP, CLI doesn't expose network attack surface.

### Implementation Approach: 2B (Separate CLI Entry Point)

```json
// package.json
"bin": {
  "ai-vision-mcp": "dist/index.js",
  "ai-vision": "dist/cli.js"
}
```

**Why separate binary:**
- Clear separation of concerns
- `ai-vision-mcp` remains MCP-only (backward compatible)
- `ai-vision` is the CLI tool
- No mode detection complexity

### Secondary Recommendation: Defer HTTP (Option 3)

HTTP/OpenAPI support should be **deferred until there's concrete demand** because:

1. **Security burden**: Requires authentication, rate limiting, input validation
2. **Deployment complexity**: Process management, SSL, reverse proxy
3. **Cost risk**: Exposed AI API endpoints can rack up costs
4. **Not aligned with MCP philosophy**: MCP is for AI assistants, not general API use

If HTTP is needed later, it can be added as a separate package (`ai-vision-http`) or a separate binary (`ai-vision-mcp --http`).

### Option 4 (All Three): Not Recommended

The complexity outweighs the benefits. Choose the primary interface (MCP + CLI) and add HTTP only if there's strong demand.

---

## Implementation Plan (If Proceeding with Option 2)

### Phase 1: Refactor for Reusability
1. Extract tool registration logic from `server.ts` to `tools/index.ts`
2. Ensure all tools are pure functions (already mostly true)
3. Create shared `createServices()` helper

### Phase 2: Add CLI Entry Point
1. Create `src/cli.ts` with argument parsing
2. Add `commander` dependency
3. Implement commands: `analyze-image`, `compare-images`, `detect-objects`, `analyze-video`
4. Handle output formatting (JSON default, optional human-readable)

### Phase 3: Update Package Configuration
1. Update `package.json` with new binary
2. Update documentation (README.md, SPEC.md)
3. Add CLI tests

### Phase 4: E2E Test Refactoring
1. Refactor E2E tests to use CLI mode where appropriate
2. Keep MCP protocol tests for protocol compliance
3. Add CLI-specific tests

### Estimated Effort
- Phase 1: 2-3 hours
- Phase 2: 4-6 hours
- Phase 3: 2-3 hours
- Phase 4: 3-4 hours
- **Total: 1-2 days of focused work**

---

## Conclusion

Adding CLI support (Option 2) provides significant testing and debugging benefits with minimal complexity. The tool implementations are already transport-agnostic, making this a low-effort, high-value addition.

HTTP/OpenAPI support (Option 3) should be deferred until there's concrete use case demand, as it introduces security and deployment complexities that are not justified for the current MCP-focused use case.

The recommended path is:
1. **Implement CLI mode as separate binary** (`ai-vision`)
2. **Keep MCP server as primary interface** (`ai-vision-mcp`)
3. **Defer HTTP** until strong demand exists
