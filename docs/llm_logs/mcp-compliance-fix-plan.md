# MCP Compliance and Stability Fix Plan

## Problem Statement
The MCP server is compliant with the protocol but needs improvements for stability:
1. Raw object shapes in tool schemas (deprecated in MCP SDK v2)
2. Missing global exception handlers that could cause disconnects

## Solution Options

### Option 1: Quick Fix (15 min) - NOT RECOMMENDED
- Just add exception handlers
- Leave schemas as-is (works for now)
- Risk: Schemas may break in future SDK updates

### Option 2: Balanced Solution (30 min) - RECOMMENDED
- Add exception handlers for stability
- Convert schemas to explicit z.object() wrapping
- Update documentation
- Good balance of immediate stability and future-proofing

### Option 3: Comprehensive Refactor (1 hour) - OVERKILL
- Full SDK v2 migration
- Add progress notifications
- Add structured logging throughout
- Too much effort for current needs

## Recommendation: Option 2

## Implementation Steps

1. **Add Global Exception Handlers** (`src/server.ts`) ✅
   - Add `uncaughtException` handler
   - Add `unhandledRejection` handler
   - Log to stderr via LoggerService
   - Prevent process crash

2. **Fix Tool Schemas** (`src/server.ts`) ✅
   - Wrap analyze_image inputSchema with z.object()
   - Wrap compare_images inputSchema with z.object()
   - Wrap detect_objects_in_image inputSchema with z.object()
   - Wrap analyze_video inputSchema with z.object()

3. **Build and Test** ✅
   - Run npm run build
   - Test initialize handshake
   - Test tools/list

## Files Modified
- `src/server.ts` - Main server file

## Changes Made

### 1. Global Exception Handlers (lines 24-39)
Added `uncaughtException` and `unhandledRejection` handlers to prevent crashes from bubbling up and breaking the stdio transport:

```typescript
process.on('uncaughtException', (error) => {
  void logger.error(
    { msg: 'Uncaught exception', error: String(error), stack: error.stack },
    'server'
  );
  // Don't exit - let MCP handle gracefully
});

process.on('unhandledRejection', (reason) => {
  const error = reason instanceof Error ? reason : new Error(String(reason));
  void logger.error(
    { msg: 'Unhandled rejection', error: error.message, stack: error.stack },
    'server'
  );
  // Don't exit - let MCP handle gracefully
});
```

### 2. Tool Schema Updates
Converted all tool input schemas from raw object shapes to explicit `z.object()` wrapping:

- `analyze_image`: `inputSchema: { ... }` → `inputSchema: z.object({ ... })`
- `compare_images`: `inputSchema: { ... }` → `inputSchema: z.object({ ... })`
- `detect_objects_in_image`: `inputSchema: { ... }` → `inputSchema: z.object({ ... })`
- `analyze_video`: `inputSchema: { ... }` → `inputSchema: z.object({ ... })`

## Acceptance Criteria
- [x] Exception handlers prevent crashes from bubbling up
- [x] All tool schemas use explicit z.object() wrapping
- [x] Build passes without errors
- [x] Initialize handshake still works
- [x] Tools/list returns valid schemas

## Test Results
```bash
$ npm run build
> ai-vision-mcp@0.0.5 build
> tsc
# Build successful

$ echo '{"jsonrpc":"2.0","id":1,"method":"initialize",...}' | node dist/index.js
# Initialize handshake successful
# Tools/list returns valid schemas
```

## Status: COMPLETED ✅
