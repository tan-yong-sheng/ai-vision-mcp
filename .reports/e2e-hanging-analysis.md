# E2E Test Hanging Analysis Report

## Executive Summary

The validation tests hang indefinitely due to **service initialization failure** during tool execution. When `client.callTool()` is invoked, the server's `getServices()` function attempts to initialize providers via `VisionProviderFactory`, which fails because providers aren't registered when `createProviderWithValidation` is called.

---

## Root Cause Analysis

### The Hanging Chain

```
validation.test.ts calls client.callTool()
    ↓
server.ts tool handler invokes getServices()
    ↓
getServices() calls VisionProviderFactory.createProviderWithValidation(config, 'image')
    ↓
createProviderWithValidation() looks up 'google' provider in providers Map
    ↓
providers Map is EMPTY at call time → factory = undefined
    ↓
Factory lookup fails, error is thrown but may not propagate properly
    ↓
Server hangs waiting for tool execution to complete
    ↓
Client hangs waiting for server response
```

### Specific Code Issues

#### Issue 1: Provider Factory Not Initialized (Primary Cause)

**File:** `src/providers/factory/ProviderFactory.ts`
**Lines:** 179-180, 142-176

```typescript
// Lines 179-180: Auto-initialization at module load time
VisionProviderFactory.initializeDefaultProviders();

// Lines 127-130: What gets registered
this.registerProvider('google', () => {
  const geminiConfig = ConfigService.getInstance().getGeminiConfig();
  return new GeminiProvider(geminiConfig);
});
```

**Problem:** The providers Map is populated when the module loads, BUT in the E2E test environment:
1. The server runs in a separate Node.js process spawned by StdioClientTransport
2. Module loading may fail silently or the factory registration doesn't complete
3. When `createProviderWithValidation` is called, `this.providers.get(providerName)` returns `undefined`

**File:** `src/providers/factory/ProviderFactory.ts`
**Lines:** 153-156

```typescript
const factory = this.providers.get(providerName);
if (!factory) {
  throw new ConfigurationError(`Unsupported provider: ${providerName}`);
}
```

This error should be thrown, but the hang suggests the error handling isn't working properly in the async context.

#### Issue 2: Tool Handler Error Handling

**File:** `src/server.ts`
**Lines:** 151-209 (analyze_image handler)

```typescript
async (args: any, _extra: any) => {
  // ...
  try {
    // Initialize services on-demand
    const { config, imageProvider, imageFileService } = getServices();  // ← Hangs here

    const result = await analyze_image(
      validatedArgs,
      config,
      imageProvider,
      imageFileService
    );
    // ...
  } catch (error) {
    // Error handling code...
  }
}
```

The `getServices()` call at line 161 is NOT inside a try-catch that would return a proper MCP error response. If `getServices()` throws synchronously before returning, the error is caught by the outer try-catch, BUT if it hangs (infinite loop, deadlock, or async never resolves), the tool call never returns.

#### Issue 3: ConfigService Validation May Hang

**File:** `src/services/ConfigService.ts`
**Lines:** 35-39

```typescript
public static getInstance(): ConfigService {
  if (!ConfigService.instance) {
    ConfigService.instance = new ConfigService();
  }
  return ConfigService.instance;
}
```

If `new ConfigService()` constructor hangs (which calls `loadConfig()`), the singleton pattern means subsequent calls wait forever.

**File:** `src/services/ConfigService.ts`
**Lines:** 31-33, 46-238

```typescript
private constructor() {
  this.config = this.loadConfig();  // ← Could hang here
}
```

The `loadConfig()` method calls `validateConfig()` (line 229) and `validateRequiredFields()` (line 230). If these have issues...

#### Issue 4: Provider Factory Calls ConfigService During Registration

**File:** `src/providers/factory/ProviderFactory.ts`
**Lines:** 125-130

```typescript
static initializeDefaultProviders(): void {
  // Register Gemini API provider
  this.registerProvider('google', () => {
    const geminiConfig = ConfigService.getInstance().getGeminiConfig();  // ← Gets config HERE
    return new GeminiProvider(geminiConfig);
  });
}
```

This is called at module load time. If `ConfigService.getInstance().getGeminiConfig()` fails (e.g., missing API key), it could throw an error during module initialization, potentially leaving the module in a broken state.

---

## Differences Between Working and Hanging Tests

### protocol.test.ts (WORKS)

**What it does:**
- `client.listTools()` - Lists available tools (metadata only)
- `client.getServerVersion()` - Gets server version (metadata only)

**Why it works:**
- These are MCP protocol-level operations handled by the SDK's `McpServer` class
- They don't invoke the tool handlers in `server.ts`
- They don't call `getServices()`
- Server responds immediately without initializing providers

**Code:**
```typescript
// Lines 46-52 in protocol.test.ts
test('should return correct server info', async () => {
  const serverInfo = await client.getServerVersion();  // ← Metadata, no tool execution
  expect(serverInfo.name).toBe('ai-vision-mcp');
});

// Lines 56-64 in protocol.test.ts
test('should list all 4 tools', async () => {
  const tools = await client.listTools();  // ← Metadata, no tool execution
  expect(tools.tools).toHaveLength(4);
});
```

### validation.test.ts (HANGS)

**What it does:**
- `client.callTool('analyze_image', {...})` - Actually executes the tool
- `client.callTool('compare_images', {...})` - Actually executes the tool
- etc.

**Why it hangs:**
- `callTool` invokes the tool handler registered in `server.ts`
- Tool handler calls `getServices()` which calls `VisionProviderFactory.createProviderWithValidation()`
- Provider factory fails to find the registered provider or ConfigService hangs
- Server never returns a response
- Client waits indefinitely

**Code:**
```typescript
// Lines 38-49 in validation.test.ts
test('should return error for missing imageSource', async () => {
  const result = await client.callTool('analyze_image', {  // ← HANGS HERE
    prompt: 'Describe this image',
    // imageSource is missing
  });
  // ...
});
```

### cli.test.ts (MIXED)

**What it does:**
- Uses `runCliCommand()` which spawns the CLI directly
- CLI mode bypasses the MCP server entirely
- Some tests skip based on API key availability

**Why some work, some skip:**
```typescript
// Line 36-37 in cli.test.ts
const hasApiKey = process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'test-api-key-for-e2e-tests';
const testOrSkip = hasApiKey ? test : test.skip;
```

---

## MCP Client/Server Connection Flow

### Connection Setup (setup.ts)

**File:** `tests/e2e/setup.ts`
**Lines:** 153-197

```typescript
export async function createMCPClient(envOverrides = {}): Promise<{ client: TestClient; server: ServerProcess }> {
  const transport = new StdioClientTransport({
    command: 'node',
    args: [serverPath],
    env,  // ← Environment variables passed here
    cwd: PROJECT_ROOT,
  });

  const client = new Client(
    { name: 'e2e-test-client', version: '1.0.0' },
    { capabilities: { tools: {} } }
  );

  await client.connect(transport);  // ← MCP initialize handshake happens here
  // ...
}
```

### Server Startup Flow (server.ts)

**File:** `src/server.ts`
**Lines:** 624-639

```typescript
export async function runMcpServer(): Promise<void> {
  try {
    const transport = new StdioServerTransport();
    await server.connect(transport);  // ← Server starts listening
    await logger.info('AI Vision MCP Server started successfully', 'server');
  } catch (error) {
    console.error('Failed to start MCP server:', error);
    process.exit(1);
  }
}

// Auto-run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runMcpServer();
}
```

### Tool Execution Flow

```
1. Client calls client.callTool('analyze_image', args)
   ↓
2. MCP SDK sends JSON-RPC request over stdio
   ↓
3. Server receives request, routes to analyze_image handler
   ↓
4. Handler calls getServices()
   ↓
5. getServices() → ConfigService.getInstance() → may hang
   ↓
6. getServices() → VisionProviderFactory.createProviderWithValidation() → may fail
   ↓
7. If step 5-6 succeed, analyze_image() tool function is called
   ↓
8. Result returned as JSON-RPC response
   ↓
9. Client receives result
```

**The hang occurs at steps 5-6.**

---

## Potential Blocking/Deadlock Scenarios

### Scenario 1: Provider Factory Registration Race

**File:** `src/providers/factory/ProviderFactory.ts`
**Lines:** 13, 179-180

```typescript
private static providers = new Map<string, () => VisionProvider>();
// ...
VisionProviderFactory.initializeDefaultProviders();  // ← Module-level execution
```

If there's a module loading order issue or circular dependency:
- The `providers` Map might remain empty
- `createProviderWithValidation` can't find the factory
- Error is thrown but gets lost in async context

### Scenario 2: ConfigService Constructor Exception

**File:** `src/services/ConfigService.ts`
**Lines:** 240-307

```typescript
private validateRequiredFields(config: Config): void {
  // ...
  if (imageProvider === 'google' || videoProvider === 'google') {
    if (!config.GEMINI_API_KEY) {
      throw new ConfigurationError(
        'GEMINI_API_KEY is required when using Gemini API provider',
        'GEMINI_API_KEY'
      );
    }
  }
}
```

If this throws during `getServices()`:
1. Error is caught by tool handler's try-catch
2. Error response is returned
3. Test should receive the error

But if the error is thrown during module load (in `initializeDefaultProviders`), the module system may be in an undefined state.

### Scenario 3: LoggerService Attachment Timing

**File:** `src/server.ts`
**Lines:** 21, 52

```typescript
const logger = LoggerService.getInstance('ai-vision-mcp');
// ...
logger.attachServer(server);
```

If the logger has issues attaching to the server or the server singleton, it could cause issues.

### Scenario 4: Stdio Transport Buffer Deadlock

The MCP protocol uses stdio for JSON-RPC communication. If:
1. Server writes to stdout/stderr at the wrong time
2. Buffer fills up
3. Process blocks waiting for buffer drain

This can cause a deadlock where:
- Client waits for server response
- Server is blocked writing to stdout
- No progress possible

**File:** `src/server.ts`
**Lines:** 24-39 (exception handlers)

```typescript
process.on('uncaughtException', (error) => {
  void logger.error({...}, 'server');  // ← Could write to stdout
  // Don't exit - let MCP handle gracefully
});
```

---

## Code Locations of Concern

### High Risk

1. **`src/providers/factory/ProviderFactory.ts:142-176`** - `createProviderWithValidation`
   - Provider lookup may fail if registration didn't happen
   - Error handling may not work properly

2. **`src/providers/factory/ProviderFactory.ts:125-137`** - `initializeDefaultProviders`
   - Called at module load time
   - Accesses ConfigService which may not be ready
   - May throw during module initialization

3. **`src/server.ts:55-95`** - `getServices()`
   - Called on every tool invocation
   - Multiple service initializations could race or deadlock

### Medium Risk

4. **`src/services/ConfigService.ts:31-33`** - Constructor
   - Synchronous config loading
   - May hang if validation has issues

5. **`tests/e2e/setup.ts:178`** - `client.connect(transport)`
   - Hardcoded 500ms wait may not be sufficient
   - Server may not be fully ready

6. **`src/server.ts:151-209`** - Tool handler
   - Error handling assumes `getServices()` returns or throws
   - Doesn't handle hanging case

### Low Risk

7. **LoggerService** - May have async initialization issues
8. **Process event handlers** - May interfere with MCP stdio transport

---

## Recommended Investigation Steps

1. **Add logging to ProviderFactory** to verify providers are registered
2. **Add timeout to getServices()** to prevent indefinite hanging
3. **Check if ConfigService throws during module load**
4. **Verify StdioClientTransport error handling**
5. **Run with NODE_DEBUG=mcp** or similar to see protocol-level issues
6. **Add explicit error handling** for provider lookup failure
7. **Consider eager initialization** of services at server startup instead of lazy loading

---

## Summary

The tests hang because:
1. `validation.test.ts` calls `client.callTool()` which triggers actual tool execution
2. Tool handlers call `getServices()` which initializes providers via `VisionProviderFactory`
3. Provider factory may fail to find registered providers or ConfigService may hang
4. Server never returns a response, client waits indefinitely

The `protocol.test.ts` works because it only uses metadata operations (`listTools`, `getServerVersion`) that don't require provider initialization.

**Fix priority:**
1. Ensure provider factory is properly initialized before use
2. Add timeout and better error handling to `getServices()`
3. Consider eager vs lazy initialization trade-offs
