# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
Please always use context7 MCP, web search, or web fetch for additional information when fixing bugs or implementing new features.

## **CRITICAL: Documentation Maintenance Requirements**

**BEFORE starting any coding work:**
1. **ALWAYS create a plan document** in the `docs/llm_logs/` folder before writing any code
2. **ALWAYS update README.md** when introducing changes that affect:
   - New MCP tools or parameters
   - Environment variables
   - Configuration options
   - Installation instructions
   - Breaking changes
3. **ALWAYS update docs/SPEC.md** when introducing changes that affect:
   - Architecture modifications
   - New provider implementations
   - API interface changes
   - File handling logic
   - Error handling patterns

**Planning Process:**
- Create plan documents in `docs/llm_logs/` folder (e.g., `docs/llm_logs/feature-name-plan.md`)
- Include architecture decisions, implementation steps, and testing strategy
- Reference this plan in your commit messages
- Keep plan documents as documentation of implementation decisions

**Solution Planning Best Practices:**
- **ALWAYS present at least 3 options** when planning solutions to problems
- Analyze trade-offs: effort vs. benefit, maintainability vs. speed, risk vs. reward
- Provide clear recommendations with rationale (e.g., "Option 2 recommended because...")
- Consider: quick fixes, balanced approaches, and comprehensive solutions
- Include effort estimates, risk assessments, and rollback strategies for each option
- Use structured format: Option 1 (Simple), Option 2 (Balanced), Option 3 (Comprehensive)

**Example Planning Structure:**
```
## Plan: [Problem Description]

### Option 1: Quick Fix (15 min)
- ✅ Minimal change, fastest implementation
- ❌ Technical debt, not future-proof
- **When to use**: Urgent hotfixes, time pressure

### Option 2: Balanced Solution (45 min) - RECOMMENDED
- ✅ Good maintainability, moderate effort
- ✅ Addresses root cause, extensible
- ❌ Longer implementation time
- **When to use**: Most production scenarios

### Option 3: Comprehensive Refactor (2 hours)
- ✅ Perfect architecture, future-proof
- ❌ High effort, potential for new bugs
- **When to use**: Major feature additions, architectural improvements

### Recommendation: Option 2
**Rationale**: Balances immediate needs with long-term maintainability...
```

**Documentation Synchronization:**
- README.md is for **users** - installation, usage, and configuration
- docs/SPEC.md is for **developers** - technical specifications and architecture
- CLAUDE.md is for **AI assistants** - development patterns and constraints
- All three documents must stay consistent with the actual implementation

## Development Commands

### Building and Testing
- `npm run build` - Build TypeScript project to `dist/` directory
- `npm run dev` - Start development server with watch mode (tsc --watch)
- `npm start` - Start the built MCP server (node dist/index.js)

### Code Quality
- `npm run lint` - Run ESLint on all TypeScript files
- `npm run lint:fix` - Run ESLint with auto-fix
- `npm run format` - Format code with Prettier

### Publishing
- `npm run prepublishOnly` - Run lint before publish
- `npm run preversion` - Run lint before version bump
- `npm run version` - Format code and add to git before version
- `npm run prepare` - Build project automatically on install

## Architecture Overview

This is a Model Context Protocol (MCP) server that provides AI-powered image and video analysis using Google Gemini and Vertex AI models.

### Core Components

**Server Architecture** (`src/server.ts`):
- Main MCP server entry point using `@modelcontextprotocol/sdk`
- Lazy-loaded services initialized on first request via `getServices()` function
- Four primary tools: `analyze_image`, `compare_images`, `detect_objects_in_image`, and `analyze_video`
- Comprehensive error handling with custom `VisionError` types
- Graceful shutdown handling for SIGINT/SIGTERM

**Configuration Hierarchy System**:
The server implements a sophisticated 4-level configuration priority system:
1. **LLM-assigned values** - Parameters passed directly in tool calls (e.g., `{"temperature": 0.1}`)
2. **Function-specific variables** - `TEMPERATURE_FOR_ANALYZE_IMAGE`, `MAX_TOKENS_FOR_COMPARE_IMAGES`, etc.
3. **Task-specific variables** - `TEMPERATURE_FOR_IMAGE`, `MAX_TOKENS_FOR_VIDEO`, etc.
4. **Universal variables** - `TEMPERATURE`, `MAX_TOKENS`, etc.

**Provider Factory** (`src/providers/factory/ProviderFactory.ts`):
- Factory pattern for creating AI provider instances with validation
- Supports two providers: `google` (Gemini API) and `vertex_ai` (Vertex AI)
- Automatic provider detection from model names
- Configuration validation before provider creation
- Dynamic provider registration support

**Configuration Service** (`src/services/ConfigService.ts`):
- Singleton pattern for configuration management via `ConfigService.getInstance()`
- Environment variable validation with Zod schemas
- Provider-specific configuration methods
- Auto-derivation of related settings (e.g., project ID from credentials)
- Hierarchical configuration resolution

**Configuration Validation** (`src/types/Config.ts` and `src/utils/validation.ts`):
- `Config.ts` defines TypeScript interfaces for all configuration options
- `validation.ts` provides Zod schemas that validate environment variables against these interfaces
- These files must stay synchronized - any new config field in Config.ts requires corresponding validation rules in validation.ts

**Key Services**:
- `FileService` - Handles file uploads, validation, and processing with support for URLs, local files, and base64
- `ConfigService` - Manages environment variables and settings
- Vision providers in `src/providers/` - AI model implementations
- Storage strategies in `src/storage/` and `src/file-upload/` - File handling

### MCP Tools Implementation

**All tools follow consistent patterns:**
- Configuration hierarchy: function-specific → task-specific → universal variables
- File source support: URLs, local files, base64 data
- Error handling with custom `VisionError` types with provider context
- Provider-agnostic interface through factory pattern
- Structured output schemas for object detection

**Tool-specific behaviors:**
- `detect_objects_in_image`: Returns annotated images with bounding boxes, 3-step file handling (explicit path → temp file), uses structured JSON output with coordinates
- `compare_images`: Supports 2-4 images with mixed source types, batch processing optimization
- `analyze_image`: Special prompt handling for frontend code replication tasks, intelligent file processing based on size
- `analyze_video`: YouTube URL and local file support, GCS integration for Vertex AI, duration and size validation

### Provider Implementation

**Gemini Provider** (`src/providers/gemini/`):
- Direct Google Gemini API integration using `@google/genai`
- Files API for larger uploads (>10MB via `GEMINI_FILES_API_THRESHOLD`)
- Base64 encoding for smaller files
- Structured output support for object detection

**Vertex AI Provider** (`src/providers/vertexai/`):
- Google Cloud Vertex AI integration
- Requires GCS bucket for all file uploads (configured via `VERTEX_AI_FILES_API_THRESHOLD`)
- Service account authentication with auto project ID extraction
- Streaming support considerations

### File Processing Flow

1. **Input Validation**: File size, format, and duration checks using configurable limits
2. **Upload Strategy Selection**: Based on provider and file size thresholds
3. **File Processing**: MIME type detection, path resolution, cross-platform support (Windows/Unix)
4. **AI Analysis**: Provider-specific API calls with structured output schemas
5. **Response Processing**: Structured JSON responses with comprehensive error handling

## Critical Development Constraints

### Configuration Synchronization
- `src/types/Config.ts` and `src/utils/validation.ts` MUST stay synchronized
- Every new config field in Config.ts requires corresponding Zod validation in validation.ts
- Function-specific environment variables must follow the naming pattern: `TEMPERATURE_FOR_ANALYZE_IMAGE`, etc.
- When adding new configuration, always implement the 4-level hierarchy

### Error Handling Requirements
- Always use custom `VisionError` types with provider context
- Include error codes for proper client handling
- Implement retry logic for network failures
- Never expose sensitive credentials in error messages
- Provider-specific error context for debugging

### TypeScript Configuration
- ES2022 target with ESNext modules, strict type checking enabled
- Path mapping with `@/*` pointing to `src/*` for clean imports
- Declaration maps and source maps enabled for debugging
- No implicit any, returns, or this allowed (strict mode)

### File Organization
```
src/
├── providers/          # AI provider implementations
│   ├── gemini/        # Google Gemini provider
│   ├── vertexai/      # Vertex AI provider
│   └── factory/       # Provider factory
├── services/          # Core services
│   ├── ConfigService.ts
│   └── FileService.ts
├── storage/           # Storage implementations
├── file-upload/       # File upload strategies
├── types/            # TypeScript type definitions
├── utils/            # Utility functions
└── tools/            # MCP tool implementations
```

## Development Patterns

1. **Lazy Loading**: Services initialized on first request via `getServices()` function
2. **Factory Pattern**: Providers created through `VisionProviderFactory` with validation
3. **Singleton Pattern**: `ConfigService.getInstance()` ensures consistency
4. **Strategy Pattern**: File upload strategies selected based on provider and size
5. **Zod Validation**: All inputs validated with Zod schemas for runtime type safety
6. **Configuration Hierarchy**: Always implement 4-level priority: LLM-assigned → function-specific → task-specific → universal
7. **Error Context**: Always include provider information in errors for debugging
8. **Cross-Platform Support**: Handle both Windows and Unix file paths correctly
9. **Config Building Pattern**: Use `buildConfigWithOptions()` helper from BaseVisionProvider for consistent config generation

### Config Building Pattern (IMPORTANT)

When implementing provider methods that need AI configuration, **always use** the `buildConfigWithOptions()` helper:

```typescript
// ✅ Correct - uses helper method
const config = this.buildConfigWithOptions('image', options?.functionName, options);

await this.client.models.generateContent({
  model,
  contents,
  config,  // Automatically includes responseSchema and systemInstruction if provided
});

// ❌ Incorrect - manual config building (duplicates code)
const config = {
  temperature: this.resolveTemperatureForFunction(...),
  topP: this.resolveTopPForFunction(...),
  topK: this.resolveTopKForFunction(...),
  maxOutputTokens: this.resolveMaxTokensForFunction(...),
  candidateCount: 1,
};
if (options?.responseSchema) {
  config.responseMimeType = 'application/json';
  config.responseSchema = options.responseSchema;
}
if (options?.systemInstruction) {
  config.systemInstruction = options.systemInstruction;
}
// ... manual config building creates maintenance burden
```

**Why use `buildConfigWithOptions()`?**

1. **DRY Principle**: Single source of truth for config generation
2. **Automatic Structured Output**: Handles `responseSchema` and `systemInstruction` automatically
3. **Consistency**: Same config format across all providers (Gemini, Vertex AI)
4. **Maintainability**: Adding new config options only requires updating one method
5. **Type Safety**: Centralized TypeScript type checking

**This pattern is critical for:**
- Object detection (`detect_objects_in_image`) - requires structured JSON output
- Any future tools that need custom response schemas
- Maintaining consistency between Gemini and Vertex AI providers

**Reference Implementation:**
- Helper method: `src/providers/base/VisionProvider.ts:354-395`
- Usage in Gemini: `src/providers/gemini/GeminiProvider.ts:185-189, 348-352, 468-472`
- Usage in Vertex AI: `src/providers/vertexai/VertexAIProvider.ts:84-88, 161-165, 246-250`

## Environment Variables

**Required for Development:**
- `IMAGE_PROVIDER` and `VIDEO_PROVIDER`: Set to `google` or `vertex_ai`
- Provider-specific credentials (GEMINI_API_KEY or VERTEX_CREDENTIALS + GCS_BUCKET_NAME)

**Common Development Overrides:**
- `TEMPERATURE_FOR_DETECT_OBJECTS_IN_IMAGE=0` for deterministic object detection
- `LOG_LEVEL=debug` for verbose logging during development
- `NODE_ENV=development` for development-specific behavior

## Testing and Debugging

- Use `npm run dev` for development with automatic rebuilding
- Check console logs for detailed file processing information
- Verify configuration hierarchy by setting different levels of environment variables
- Test with multiple file sources (URLs, local files, base64) to ensure compatibility
- Use structured logging patterns for consistent debugging output