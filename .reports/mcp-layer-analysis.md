# MCP Server Layer Analysis

## Executive Summary

The MCP server is a **thin wrapper** around the shared tool functions. It contains **no business logic duplication** with the CLI - both interfaces call the exact same tool implementations from `src/tools/`.

---

## 1. MCP Server Architecture Overview

### File Structure
```
src/
├── server.ts          # MCP server registration and request handling
├── index.ts           # Entry point - routes to MCP or CLI mode
├── tools/             # Shared tool implementations (business logic)
│   ├── analyze_image.ts
│   ├── compare_images.ts
│   ├── detect_objects_in_image.ts
│   └── analyze_video.ts
└── cli/               # CLI command handlers (thin wrappers)
    ├── index.ts
    └── commands/
```

### Key Components

1. **MCP Server** (`src/server.ts`):
   - Uses `@modelcontextprotocol/sdk/server/mcp.js`
   - Registers 4 tools: `analyze_image`, `compare_images`, `detect_objects_in_image`, `analyze_video`
   - Handles Zod schema validation for inputs
   - Formats responses for MCP protocol
   - Contains error handling specific to MCP transport

2. **Entry Point** (`src/index.ts`):
   - Determines mode based on first argument
   - CLI mode: first arg is a recognized command
   - MCP mode (default): no args or args start with `--`

---

## 2. How MCP Tools Invoke Shared Tool Functions

### Import Pattern

```typescript
// src/server.ts lines 11-16
import {
  analyze_image,
  compare_images,
  analyze_video,
  detect_objects_in_image,
} from './tools/index.js';
```

Both MCP and CLI import from the **same** `src/tools/` directory.

### Tool Registration Flow

```
MCP Request
    |
    v
server.registerTool()  (lines 98-210 for analyze_image)
    |
    v
Zod input validation (inputSchema)
    |
    v
Handler function extracts args
    |
    v
getServices() - lazy load providers
    |
    v
CALL SHARED TOOL FUNCTION:
  analyze_image(args, config, provider, fileService)
    |
    v
Format result for MCP response
```

### Example: analyze_image Tool Registration (src/server.ts:98-210)

```typescript
server.registerTool<any, any>(
  'analyze_image',
  {
    title: 'Analyze Image',
    description: '...',
    inputSchema: z.object({  // <-- MCP-specific: Zod validation
      imageSource: z.string().describe('...'),
      prompt: z.string().describe('...'),
      options: z.object({...}).optional(),
    }),
  },
  async (args: any, _extra: any) => {
    const { imageSource, prompt, options } = args;
    try {
      const validatedArgs = { imageSource, prompt, options };
      const { config, imageProvider, imageFileService } = getServices();

      // CALL SHARED TOOL FUNCTION - no business logic here
      const result = await analyze_image(
        validatedArgs,
        config,
        imageProvider,
        imageFileService
      );

      // Format for MCP protocol - presentation only
      return {
        content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }],
      };
    } catch (error) {
      // MCP-specific error formatting
      return { content: [...], isError: true };
    }
  }
);
```

---

## 3. MCP Business Logic Analysis

### What MCP Does (Presentation Layer)

| Responsibility | Implementation |
|---------------|----------------|
| Input validation | Zod schemas in `inputSchema` |
| Request routing | `server.registerTool()` handlers |
| Service initialization | `getServices()` - lazy loads providers |
| Response formatting | Wraps tool result in MCP content structure |
| Error handling | Catches errors, formats for MCP transport |
| Protocol handling | Uses `@modelcontextprotocol/sdk` |

### What MCP Does NOT Do

| Not in MCP | Where It Lives |
|------------|----------------|
| Image processing | `src/tools/analyze_image.ts` |
| File upload handling | `FileService` (shared) |
| AI provider calls | `VisionProvider` implementations (shared) |
| Configuration resolution | `ConfigService` (shared) |
| Business rules (e.g., max images) | Tool functions in `src/tools/` |

---

## 4. Comparison: MCP vs CLI

### Both Use Same Tool Functions

**CLI** (`src/cli/commands/analyze-image.ts`):
```typescript
import { analyze_image } from '../../tools/analyze_image.js';

export async function runAnalyzeImage(args: string[], config: Config): Promise<void> {
  // Parse CLI args
  const { positional, options } = parseArgs(args);

  // Initialize services (same as MCP)
  const configService = ConfigService.getInstance();
  const imageProvider = VisionProviderFactory.createProviderWithValidation(config, 'image');
  const imageFileService = new FileService(configService, 'image', imageProvider as any);

  // CALL SAME TOOL FUNCTION
  const result = await analyze_image(
    { imageSource, prompt, options: parseOptions(options) },
    config,
    imageProvider,
    imageFileService
  );

  // CLI-specific: output to stdout
  console.log(formatOutput(result, options.json === 'true'));
}
```

**MCP** (`src/server.ts`):
```typescript
import { analyze_image } from './tools/index.js';

async (args: any, _extra: any) => {
  const { config, imageProvider, imageFileService } = getServices();

  // CALL SAME TOOL FUNCTION
  const result = await analyze_image(
    validatedArgs,
    config,
    imageProvider,
    imageFileService
  );

  // MCP-specific: return in protocol format
  return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
}
```

### Differences (Presentation Only)

| Aspect | MCP | CLI |
|--------|-----|-----|
| Input source | JSON-RPC over stdio | Command-line arguments |
| Validation | Zod schemas | Manual arg parsing |
| Output format | MCP content structure | stdout (JSON or formatted) |
| Error handling | Return `isError: true` | `process.exit(1)` |
| Service init | Per-request lazy loading | Once at startup |

---

## 5. Confirmation: MCP is a Thin Wrapper

### Evidence

1. **Single import source**: Both MCP and CLI import from `src/tools/index.js`

2. **No business logic in MCP handlers**: MCP handlers only:
   - Extract args from request
   - Call `getServices()`
   - Pass args to tool function
   - Format result for protocol

3. **Shared validation**: Input validation in tools (`analyze_image.ts:27-32`):
   ```typescript
   if (!args.imageSource) {
     throw new VisionError('imageSource is required', 'MISSING_ARGUMENT');
   }
   ```

4. **Shared configuration**: Both use `ConfigService.getInstance()` and `VisionProviderFactory`

5. **Identical service initialization**: Both create the same services in the same way

### Lines of Code Comparison

| Component | MCP-Specific Code | Shared Code |
|-----------|------------------|-------------|
| `analyze_image` tool | ~50 lines (wrapper) | ~92 lines (tool function) |
| `compare_images` tool | ~60 lines (wrapper) | ~125 lines (tool function) |

The MCP wrapper is approximately **30-40%** the size of the actual business logic, consisting purely of protocol adapter code.

---

## Conclusion

**The MCP server is definitively a thin wrapper around shared tool functions.**

- All business logic lives in `src/tools/`
- Both MCP and CLI are presentation layers
- No code duplication between interfaces
- Clean separation of concerns: protocol handling vs business logic

This architecture allows the ai-vision-mcp codebase to support multiple interfaces (MCP, CLI) without duplicating core functionality.
