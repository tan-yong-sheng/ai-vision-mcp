# CLI Layer Architecture Analysis

## 1. CLI Architecture Overview

The CLI layer in `ai-vision-mcp` follows a **thin wrapper pattern** around the shared tool functions. It provides a command-line interface that directly delegates to the same business logic used by the MCP server.

### Directory Structure

```
src/cli/
├── index.ts                 # Entry point, command routing
├── utils.ts                 # Shared utilities (arg parsing, formatting)
└── commands/
    ├── analyze-image.ts     # analyze_image wrapper
    ├── compare-images.ts    # compare_images wrapper
    ├── detect-objects.ts    # detect_objects_in_image wrapper
    └── analyze-video.ts     # analyze_video wrapper
```

## 2. How CLI Commands Invoke Tool Functions

### Import Pattern

All CLI commands import tool functions directly from `src/tools/`:

```typescript
// src/cli/commands/analyze-image.ts
import { analyze_image } from '../../tools/analyze_image.js';

// src/cli/commands/compare-images.ts
import { compare_images } from '../../tools/compare_images.js';

// src/cli/commands/detect-objects.ts
import { detect_objects_in_image } from '../../tools/detect_objects_in_image.js';

// src/cli/commands/analyze-video.ts
import { analyze_video } from '../../tools/analyze_video.js';
```

### Execution Flow

**CLI args -> parse -> initialize services -> call tool function -> format output**

#### Step-by-Step Flow:

1. **Parse Arguments** (`parseArgs()` in `utils.ts`):
   - Splits positional args from `--key value` options
   - Returns `{ positional: string[], options: Record<string, string> }`

2. **Validate Required Args** (in command file):
   - Check minimum positional args (e.g., 1 image source)
   - Check required options (e.g., `--prompt`)

3. **Initialize Services** (same pattern across all commands):
   ```typescript
   const configService = ConfigService.getInstance();
   const imageProvider = VisionProviderFactory.createProviderWithValidation(config, 'image');
   const imageFileService = new FileService(configService, 'image', imageProvider as any);
   ```

4. **Call Tool Function** (direct pass-through):
   ```typescript
   const result = await analyze_image(
     { imageSource, prompt, options: parseOptions(options) },
     config,
     imageProvider,
     imageFileService
   );
   ```

5. **Format and Output** (`formatOutput()` in `utils.ts`):
   - JSON mode: `JSON.stringify(result, null, 2)`
   - Human mode: Extract `result.text` or `result.summary`

## 3. Business Logic Distribution

### What CLI Contains (Thin Layer)

| Responsibility | Location |
|----------------|----------|
| Argument parsing | `cli/utils.ts:parseArgs()` |
| CLI-specific validation | Each command file (arg count, required flags) |
| Service initialization | Each command file (providers, file services) |
| Output formatting | `cli/utils.ts:formatOutput()` |
| Error handling | `cli/utils.ts:handleError()` |
| Option type conversion | `cli/utils.ts:parseOptions()` |

### What CLI Does NOT Contain

| Responsibility | Location |
|----------------|----------|
| AI provider calls | `src/tools/*.ts` |
| File processing | `src/services/FileService.ts` |
| Configuration hierarchy | `src/services/ConfigService.ts` |
| Response schema handling | `src/providers/*.ts` |
| Image annotation | `src/utils/imageAnnotator.ts` |
| Business validation | `src/tools/*.ts` (e.g., min/max image counts) |

## 4. Confirmation: CLI is a Thin Wrapper

### Evidence:

1. **Direct tool imports**: All commands import from `../../tools/*.js`

2. **No business logic in CLI**: CLI files are ~45 lines each, containing only:
   - Arg parsing (5-10 lines)
   - Service initialization (3 lines)
   - Tool call with parameters (5 lines)
   - Output formatting (1 line)

3. **Shared services**: CLI initializes the same `ConfigService`, `FileService`, and providers as MCP mode

4. **Identical function signatures**: CLI passes `config`, `provider`, and `fileService` to tools, just like MCP would

5. **Configuration reuse**: CLI uses `configService.getConfig()` to get the same configuration MCP uses

### Comparison Table

| Aspect | MCP Mode | CLI Mode |
|--------|----------|----------|
| Entry point | `src/server.ts` | `src/cli/index.ts` |
| Arg source | JSON-RPC `arguments` | `process.argv` |
| Config source | `ConfigService.getInstance()` | `ConfigService.getInstance()` |
| Tool calls | Direct function call | Direct function call |
| Provider creation | `VisionProviderFactory` | `VisionProviderFactory` |
| File service | `new FileService(...)` | `new FileService(...)` |
| Business logic | In `src/tools/*.ts` | In `src/tools/*.ts` |

## 5. No Duplication Detected

The CLI layer has **zero business logic duplication** with MCP. The only code that exists in CLI is:

- **Argument parsing** (converting CLI args to structured objects)
- **Output formatting** (converting tool results to console-friendly output)
- **CLI-specific error handling** (exiting with `process.exit(1)`)

All actual business logic (file handling, AI calls, response processing) is in shared modules:
- `src/tools/*.ts` - Tool implementations
- `src/services/*.ts` - Services
- `src/providers/*.ts` - AI providers
- `src/utils/*.ts` - Utilities

## Summary

The CLI layer is architected as a **pure adapter** that:
1. Accepts command-line arguments
2. Converts them to the same format MCP would use
3. Calls the identical tool functions
4. Formats output for terminal display

There is no business logic in the CLI layer. It is a true thin wrapper around the shared tool functions.
