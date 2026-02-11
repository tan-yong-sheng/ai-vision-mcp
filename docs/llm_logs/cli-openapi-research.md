# Research: Adding CLI and OpenAPI to ai-vision-mcp

## Executive Summary

This document explores whether to add CLI and/or OpenAPI interfaces to ai-vision-mcp, which currently only supports MCP (Model Context Protocol) over stdio.

## Current Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  MCP Client     │────▶│  ai-vision-mcp   │────▶│  Gemini API │
│  (Claude, etc)  │     │  (stdio server)  │     │             │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

**Current Interface:**
- Stdio transport only
- JSON-RPC protocol
- Requires MCP client to use

## Options Analysis

### Option 1: MCP Only (Status Quo)

**Architecture:**
```
User → MCP Client → ai-vision-mcp (stdio) → Gemini API
```

**Pros:**
- Simple, focused architecture
- Single code path to maintain
- Clear separation of concerns
- Already implemented

**Cons:**
- Requires MCP client for any usage
- Harder to test standalone
- No direct CLI access
- Limited discoverability

**E2E Testing:**
- Must use MCP SDK Client
- More complex test setup
- Indirect testing

---

### Option 2: MCP + CLI (Recommended)

**Architecture:**
```
# MCP Mode (default)
User → MCP Client → ai-vision-mcp (stdio) → Gemini API

# CLI Mode
User → ai-vision-mcp --analyze-image <url> → Gemini API
```

**Implementation Approach:**
```typescript
// index.ts
if (process.argv.length > 2 && process.argv[2].startsWith('--')) {
  // CLI mode
  await runCli(process.argv.slice(2));
} else {
  // MCP mode (default)
  await runMcpServer();
}
```

**CLI Commands:**
```bash
# Analyze image
ai-vision-mcp analyze-image <url> --prompt "describe this"

# Compare images
ai-vision-mcp compare-images <url1> <url2> --prompt "compare"

# Detect objects
ai-vision-mcp detect-objects <url> --prompt "find people"

# Analyze video
ai-vision-mcp analyze-video <url> --prompt "summarize"

# JSON output
ai-vision-mcp analyze-image <url> --prompt "describe" --json
```

**Pros:**
- ✅ Direct usage without MCP client
- ✅ Much easier E2E testing (direct invocation)
- ✅ Scriptable in shell scripts
- ✅ Better discoverability
- ✅ Can reuse same core logic
- ✅ Single binary, multiple modes

**Cons:**
- ⚠️ More code paths to maintain
- ⚠️ Need CLI argument parsing
- ⚠️ Output formatting differences

**E2E Testing Benefit:**
```bash
# Instead of complex MCP test setup:
echo '{"jsonrpc":"2.0",...}' | ai-vision-mcp

# Simple CLI test:
ai-vision-mcp analyze-image "https://example.com/img.jpg" --prompt "test"
```

---

### Option 3: MCP + HTTP/OpenAPI

**Architecture:**
```
# MCP Mode (default)
User → MCP Client → ai-vision-mcp (stdio)

# HTTP Mode
User → HTTP Client → ai-vision-mcp --http (server) → Gemini API
```

**Implementation:**
```bash
# Start HTTP server
ai-vision-mcp --http --port 3000

# Use via curl
curl -X POST http://localhost:3000/analyze-image \
  -H "Content-Type: application/json" \
  -d '{"imageSource": "url", "prompt": "describe"}'
```

**Pros:**
- HTTP is familiar to developers
- Works with curl/Postman
- Easy debugging
- Can add authentication

**Cons:**
- ❌ Server process management complexity
- ❌ Security concerns (exposing API)
- ❌ More infrastructure needed
- ❌ Overkill for current use case
- ❌ Duplicates what MCP already provides well

**Verdict:** Not recommended at this stage

---

### Option 4: All Three (MCP + CLI + HTTP)

**Pros:**
- Maximum flexibility
- Covers all use cases

**Cons:**
- ❌ High maintenance burden
- ❌ Complex codebase
- ❌ Confusing for users (which to use?)
- ❌ Over-engineered for current needs

**Verdict:** Not recommended

---

## Recommendation: Option 2 (MCP + CLI)

### Why CLI Makes Sense

1. **Testing**: Direct CLI invocation is much easier than MCP protocol
2. **Scripting**: Users can use in shell scripts without MCP client
3. **Debugging**: Easy to test functionality directly
4. **Reuse**: Same core logic, just different interface layer
5. **Claude Skills**: CLI can be called from Claude skills easily

### Architecture Design

```
src/
├── cli/                    # NEW: CLI interface
│   ├── index.ts           # CLI entry point
│   ├── commands/          # Command handlers
│   │   ├── analyze-image.ts
│   │   ├── compare-images.ts
│   │   ├── detect-objects.ts
│   │   └── analyze-video.ts
│   └── parser.ts          # Argument parsing
├── mcp/                   # EXISTING: MCP interface
│   └── server.ts          # Current server.ts content
├── core/                  # EXISTING: Core logic (refactored)
│   ├── analyze-image.ts
│   ├── compare-images.ts
│   ├── detect-objects.ts
│   └── analyze-video.ts
└── index.ts               # Router: MCP vs CLI mode
```

### Implementation Strategy

**Phase 1: Refactor Core Logic**
- Extract tool implementations from MCP-specific code
- Make core functions pure (input → output)
- Keep Gemini API calls in core layer

**Phase 2: Add CLI Layer**
- Add CLI argument parser (commander.js or native)
- Create CLI command handlers
- Format output for terminal (with --json option)

**Phase 3: Update Entry Point**
- Detect mode based on args
- Route to MCP or CLI

### CLI Design

```bash
# Global install
npm install -g ai-vision-mcp

# Usage
ai-vision-mcp <command> [options]

Commands:
  analyze-image <source>     Analyze an image
  compare-images <sources..> Compare multiple images
  detect-objects <source>    Detect objects in image
  analyze-video <source>     Analyze a video

Options:
  --prompt <text>           The analysis prompt (required)
  --output <path>           Output file path
  --json                    Output raw JSON
  --temperature <number>    Temperature (0-2)
  --max-tokens <number>     Max tokens
  --help                    Show help

Examples:
  # Analyze image
  ai-vision-mcp analyze-image https://example.com/img.jpg \
    --prompt "describe this image"

  # Compare images with JSON output
  ai-vision-mcp compare-images url1.jpg url2.jpg \
    --prompt "find differences" \
    --json

  # Detect objects
  ai-vision-mcp detect-objects photo.jpg \
    --prompt "find all cars" \
    --output annotated.jpg
```

### Benefits for E2E Testing

**Before (MCP only):**
```typescript
// Complex setup
const transport = new StdioClientTransport({...});
const client = new Client({...});
await client.connect(transport);
const result = await client.callTool('analyze_image', {...});
```

**After (CLI):**
```typescript
// Simple exec
const result = await execa('ai-vision-mcp', [
  'analyze-image', url,
  '--prompt', 'describe',
  '--json'
]);
const data = JSON.parse(result.stdout);
```

### Benefits for Claude Skills

Claude skills can easily call CLI:
```typescript
// In a Claude skill
const result = await $`ai-vision-mcp analyze-image ${imageUrl} --prompt "${prompt}" --json`;
const analysis = JSON.parse(result.stdout);
```

## Conclusion

**Recommendation: Add CLI interface (Option 2)**

1. **Keep MCP as primary interface** (it's the main use case)
2. **Add CLI as secondary interface** for:
   - Easier E2E testing
   - Direct usage without MCP client
   - Scripting
   - Claude skills integration
3. **Defer HTTP/OpenAPI** until there's a clear need

This gives the best balance of:
- Maintainability (single codebase, two thin interfaces)
- Usability (MCP for AI clients, CLI for humans/scripts)
- Testability (direct CLI invocation)
- Future flexibility (can add HTTP later if needed)
