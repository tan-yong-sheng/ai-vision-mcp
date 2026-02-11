# Tool Functions Architecture Analysis

## Summary

All tool functions in the ai-vision-mcp codebase are **pure functions** that can be shared between CLI and MCP without modification.

---

## Tool Functions List

### 1. `analyze_image`
**File:** `src/tools/analyze_image.ts`

**Function Signature:**
```typescript
export async function analyze_image(
  args: AnalyzeImageArgs,
  config: Config,
  imageProvider: VisionProvider,
  imageFileService: FileService
): Promise<AnalysisResult>
```

**Arguments Interface:**
```typescript
export interface AnalyzeImageArgs {
  imageSource: string;  // URL, base64 data, or local file path
  prompt: string;
  options?: AnalysisOptions;
}
```

**Pure Function Status:** YES
- All dependencies (`config`, `imageProvider`, `imageFileService`) are passed as parameters
- No direct imports of service instances or global state
- Uses only imported types and constants

---

### 2. `compare_images`
**File:** `src/tools/compare_images.ts`

**Function Signature:**
```typescript
export async function compare_images(
  args: CompareImagesArgs,
  config: Config,
  imageProvider: VisionProvider,
  imageFileService: FileService
): Promise<AnalysisResult>
```

**Arguments Interface:**
```typescript
export interface CompareImagesArgs {
  imageSources: string[];  // Array of image sources
  prompt: string;
  options?: AnalysisOptions;
}
```

**Pure Function Status:** YES
- All dependencies (`config`, `imageProvider`, `imageFileService`) are passed as parameters
- No direct imports of service instances or global state
- Uses only imported types and constants

---

### 3. `detect_objects_in_image`
**File:** `src/tools/detect_objects_in_image.ts`

**Function Signature:**
```typescript
export async function detect_objects_in_image(
  args: ObjectDetectionArgs,
  config: Config,
  imageProvider: VisionProvider,
  imageFileService: FileService
): Promise<ObjectDetectionResponse>
```

**Arguments Interface:**
```typescript
export interface ObjectDetectionArgs {
  imageSource: string;
  prompt: string;
  options?: AnalysisOptions;
  outputFilePath?: string;  // Optional explicit output path
}
```

**Pure Function Status:** YES
- All dependencies (`config`, `imageProvider`, `imageFileService`) are passed as parameters
- Helper functions (`suggestCSSSelectors`, `generateDetectionSummary`, `createDetectionSchema`) are internal utilities that don't rely on global state
- Uses only imported types and constants
- Contains complex logic for structured output and annotations but maintains purity

---

### 4. `analyze_video`
**File:** `src/tools/analyze_video.ts`

**Function Signature:**
```typescript
export async function analyze_video(
  args: AnalyzeVideoArgs,
  config: Config,
  videoProvider: VisionProvider,
  videoFileService: FileService
): Promise<AnalysisResult>
```

**Arguments Interface:**
```typescript
export interface AnalyzeVideoArgs {
  videoSource: string;  // URL or local file path
  prompt: string;
  options?: AnalysisOptions;
}
```

**Pure Function Status:** YES
- All dependencies (`config`, `videoProvider`, `videoFileService`) are passed as parameters
- No direct imports of service instances or global state
- Uses only imported types and constants

---

## Pattern Analysis

### Common Function Signature Pattern
All tool functions follow the same consistent pattern:

```typescript
async function tool_name(
  args: ToolSpecificArgs,           // Tool-specific arguments
  config: Config,                   // Configuration object
  provider: VisionProvider,         // AI provider instance
  fileService: FileService          // File service instance
): Promise<ToolSpecificResult>
```

### Dependencies Passed as Parameters
| Dependency | Purpose |
|------------|---------|
| `config: Config` | Environment variables, thresholds, API keys |
| `provider: VisionProvider` | AI model interaction (Gemini, Vertex AI) |
| `fileService: FileService` | File upload, download, and processing |

### Imports Used (Types Only)
All tool functions import only:
- **Types** from `../types/*.js` - TypeScript type definitions
- **Constants** from `../constants/FunctionNames.js` - Function name strings
- **Utility Classes** (only in detect_objects_in_image) - `ImageAnnotator` for image annotation

---

## CLI and MCP Sharing Confirmation

### YES - All tool functions can be shared between CLI and MCP

**Evidence:**
1. **No MCP-specific code** - Tool functions have no dependencies on MCP SDK
2. **No CLI-specific code** - Tool functions have no dependencies on CLI frameworks
3. **Dependency injection pattern** - All external dependencies injected as parameters
4. **Pure functions** - Same inputs always produce same outputs, no side effects beyond expected file operations

### How CLI and MCP Use These Functions

**MCP Server Usage (current):**
```typescript
// In src/server.ts - services instantiated once at startup
const config = ConfigService.getInstance().getConfig();
const provider = ProviderFactory.createProviderWithValidation(config);
const fileService = new FileService();

// Tool called with injected dependencies
const result = await analyze_image(args, config, provider, fileService);
```

**CLI Usage (proposed):**
```typescript
// CLI can instantiate same services or mocks
const config = ConfigService.getInstance().getConfig();
const provider = ProviderFactory.createProviderWithValidation(config);
const fileService = new FileService();

// Same tool function called identically
const result = await analyze_image(args, config, provider, fileService);
```

---

## Conclusion

All four tool functions are **architecturally ready for sharing** between CLI and MCP:

| Tool | Pure Function | Shareable |
|------|---------------|-----------|
| `analyze_image` | YES | YES |
| `compare_images` | YES | YES |
| `detect_objects_in_image` | YES | YES |
| `analyze_video` | YES | YES |

The consistent dependency injection pattern allows both CLI and MCP to:
1. Use the same business logic
2. Provide different configuration sources
3. Use mock providers/services for testing
4. Maintain consistent behavior across interfaces
