# AI Vision MCP - Agent Architecture Guide

## Overview

This document explains the codebase architecture for AI assistants working on the ai-vision-mcp project. It clarifies how CLI and MCP modes share the same business logic.

## Architecture Pattern: Shared Tool Functions

### Core Principle

**CLI and MCP do NOT duplicate business logic.** Both are thin wrappers that call the same pure tool functions in `src/tools/`.

```
┌─────────────────┐     ┌─────────────────┐
│   CLI Mode      │     │   MCP Mode      │
│   (src/cli/)    │     │   (src/server.ts)│
└────────┬────────┘     └────────┬────────┘
         │                       │
         │   Both call the same  │
         │   tool functions      │
         ▼                       ▼
┌──────────────────────────────────────┐
│     Tool Functions (src/tools/)      │
│  • analyze_image()                   │
│  • compare_images()                  │
│  • detect_objects_in_image()         │
│  • analyze_video()                   │
└──────────────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│     Services (src/services/)         │
│  • ConfigService (singleton)         │
│  • FileService                       │
│  • VisionProviderFactory             │
└──────────────────────────────────────┘
```

### Tool Functions Are Pure Functions

All tool functions in `src/tools/` follow this pattern:

```typescript
export async function analyze_image(
  args: AnalyzeImageArgs,        // Input arguments
  config: Config,                // Configuration
  imageProvider: VisionProvider, // Provider instance
  imageFileService: FileService  // File service
): Promise<AnalysisResult>
```

**Key characteristics:**
1. All dependencies are passed as parameters (not imported)
2. No side effects (pure functions)
3. Can be called from CLI, MCP, or tests without modification
4. Contain ALL business logic

### CLI Layer (Thin Wrapper)

**Location:** `src/cli/`

**Responsibilities:**
- Parse command-line arguments
- Initialize services (ConfigService, FileService, providers)
- Call tool functions with parsed arguments
- Format and display output

**Example flow:**
```typescript
// src/cli/commands/analyze-image.ts
import { analyze_image } from '../../tools/analyze_image.js';

export async function runAnalyzeImage(args: string[], config: Config) {
  // 1. Parse CLI args
  const { positional, options } = parseArgs(args);
  const imageSource = positional[0];
  const prompt = options.prompt;

  // 2. Initialize services
  const imageProvider = VisionProviderFactory.createProviderWithValidation(config, 'image');
  const imageFileService = new FileService(configService, 'image', imageProvider);

  // 3. Call shared tool function
  const result = await analyze_image(
    { imageSource, prompt, options: parseOptions(options) },
    config,
    imageProvider,
    imageFileService
  );

  // 4. Format output
  console.log(formatOutput(result, options.json));
}
```

### MCP Layer (Thin Wrapper)

**Location:** `src/server.ts`

**Responsibilities:**
- Register MCP tools
- Validate input with Zod schemas
- Initialize services on-demand
- Call tool functions with validated arguments
- Format responses as MCP content

**Example flow:**
```typescript
// src/server.ts
import { analyze_image } from './tools/analyze_image.js';

server.registerTool('analyze_image', {
  // 1. Define input schema (Zod)
  inputSchema: z.object({
    imageSource: z.string(),
    prompt: z.string(),
    options: z.object({...}).optional(),
  }),
}, async (args) => {
  // 2. Initialize services (lazy loading)
  const { config, imageProvider, imageFileService } = getServices();

  // 3. Call shared tool function (SAME as CLI!)
  const result = await analyze_image(
    validatedArgs,
    config,
    imageProvider,
    imageFileService
  );

  // 4. Format as MCP response
  return { content: [{ type: 'text', text: JSON.stringify(result) }] };
});
```

## File Organization

```
src/
├── index.ts              # Entry point: detects CLI vs MCP mode
├── server.ts             # MCP server setup (thin wrapper)
├── cli/                  # CLI layer (thin wrapper)
│   ├── index.ts          # CLI router
│   ├── utils.ts          # CLI utilities (parsing, formatting)
│   └── commands/         # CLI command handlers
│       ├── analyze-image.ts
│       ├── compare-images.ts
│       ├── detect-objects.ts
│       └── analyze-video.ts
├── tools/                # SHARED business logic
│   ├── analyze_image.ts  # Pure function
│   ├── compare_images.ts # Pure function
│   ├── detect_objects_in_image.ts
│   ├── analyze_video.ts
│   └── index.ts          # Tool exports
├── services/             # Services (used by both CLI and MCP)
│   ├── ConfigService.ts
│   ├── FileService.ts
│   └── LoggerService.ts
├── providers/            # AI provider implementations
│   ├── gemini/
│   ├── vertexai/
│   └── factory/
└── types/                # TypeScript types
```

## Key Insight: No Logic Duplication

**When adding a new feature:**

1. **Modify ONLY the tool function** in `src/tools/`
2. Both CLI and MCP automatically get the new behavior
3. No need to update CLI commands or MCP handlers

**Example:**
```typescript
// To add a new parameter to analyze_image:
// 1. Update src/tools/analyze_image.ts (ONCE)
// 2. Both CLI and MCP automatically support it!

// src/tools/analyze_image.ts
export interface AnalyzeImageArgs {
  imageSource: string;
  prompt: string;
  options?: AnalysisOptions;
  newFeature?: string;  // <-- Add here
}
```

## Benefits of This Architecture

1. **Single Source of Truth**: Business logic exists in one place
2. **DRY (Don't Repeat Yourself)**: No code duplication
3. **Testable**: Tool functions can be unit tested in isolation
4. **Maintainable**: Changes apply to both CLI and MCP automatically
5. **Flexible**: Can add new interfaces (REST API, WebSocket) by wrapping same tool functions

## Common Tasks for Agents

### Adding a New Tool

1. Create tool function in `src/tools/new_tool.ts`
2. Export from `src/tools/index.ts`
3. Add CLI command in `src/cli/commands/new-tool.ts`
4. Register CLI command in `src/cli/index.ts`
5. Register MCP tool in `src/server.ts`

### Modifying Existing Tool Logic

1. **Only modify** `src/tools/<tool_name>.ts`
2. Both CLI and MCP get the change automatically
3. No need to touch `src/cli/` or `src/server.ts`

### Adding Configuration Options

1. Add to `src/types/Config.ts`
2. Add validation to `src/utils/validation.ts`
3. Use in tool function via `config.PARAMETER_NAME`
4. Document in README.md

## Anti-Patterns to Avoid

❌ **DON'T** add business logic in CLI commands
```typescript
// BAD: CLI command doing analysis
export async function runAnalyzeImage(args: string[]) {
  // Don't implement analysis logic here!
  const result = await fetch('https://api...');
  // ... complex processing ...
}
```

✅ **DO** keep CLI as thin wrapper
```typescript
// GOOD: CLI just calls tool function
export async function runAnalyzeImage(args: string[]) {
  const result = await analyze_image(args, config, provider, fileService);
}
```

❌ **DON'T** duplicate logic between CLI and MCP
```typescript
// BAD: Same logic in two places
// In CLI: await processImage(source);
// In MCP: await processImage(source); // Duplicated!
```

✅ **DO** put logic in tool functions
```typescript
// GOOD: Logic in one place
// In tools/analyze_image.ts: await processImage(source);
// Both CLI and MCP call this function
```

## Verification Checklist

Before submitting changes, verify:

- [ ] Tool functions remain pure (dependencies as parameters)
- [ ] No business logic added to CLI commands
- [ ] No business logic added to MCP handlers
- [ ] Both CLI and MCP use same tool function imports
- [ ] Tests pass for both modes

## GitHub Actions Workflow Guide

This section documents how to trigger and use the CI/CD workflows for this project.

### Workflow Overview

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **CI** | `ci.yml` | Push/PR to main | Lint, build, verify |
| **E2E Tests (No API)** | `e2e-tests.yml` | Push/PR to main | Fast tests without API calls |
| **E2E Integration** | `e2e-integration.yml` | Manual/Label | Tests with real API calls |
| **Publish Dev** | `publish-to-npm-dev.yml` | Tag with `-dev` | Publish dev version to npm |
| **Publish Beta** | `publish-to-npm-beta-on-tag.yml` | Tag with `-beta` | Publish beta version to npm |
| **Publish Latest** | `publish-to-npm-latest-on-release.yml` | GitHub Release | Publish production version |
| **Publish Manual** | `publish-to-npm-manual.yml` | Manual trigger | Manual publish with tag selection |

### 1. CI Workflow (Lint & Build)

**File:** `.github/workflows/ci.yml`

**Automatic Trigger:**
- Every push to `main` branch
- Every pull request to `main` branch

**What it does:**
1. Installs dependencies
2. Runs ESLint (`npm run lint`)
3. Builds TypeScript (`npm run build`)
4. Verifies package can be imported

**Duration:** ~2 minutes

**Required Secrets:** None

---

### 2. E2E Tests (No API)

**File:** `.github/workflows/e2e-tests.yml`

**Automatic Trigger:**
- Every push to `main` or `develop` branch
- Every pull request to `main` branch

**What it does:**
- Runs protocol tests (MCP compliance)
- Runs validation tests (input validation)
- **No API calls required** - fast and reliable

**Duration:** ~2 minutes

**Required Secrets:** None (uses dummy API key)

---

### 3. E2E Integration Tests (With API)

**File:** `.github/workflows/e2e-integration.yml`

**Trigger Options:**

#### Option A: Manual Trigger (Recommended for testing)
```bash
# Go to GitHub → Actions → E2E Integration Tests → Run workflow
# Select test type: all, cli, or integration
```

#### Option B: PR Label
```bash
# Add label to PR
gh pr edit <PR_NUMBER> --add-label "e2e-integration"

# Remove label to skip
gh pr edit <PR_NUMBER> --remove-label "e2e-integration"
```

**What it does:**
- Runs CLI E2E tests with real API calls
- Runs integration tests with real API calls
- Tests actual image/video analysis

**Duration:** ~10-15 minutes

**Required Secrets:**
- `GEMINI_API_KEY` - Your Gemini API key
- `GEMINI_BASE_URL` - Custom proxy URL (optional)
- `IMAGE_MODEL` - Model for images (optional, default: gemini-2.5-flash-lite)
- `VIDEO_MODEL` - Model for video (optional, default: gemini-2.5-flash)

**Local dev note (API tests):**
- When running integration/CLI E2E tests locally, ensure both `GEMINI_API_KEY` and `GEMINI_BASE_URL` are set in your environment.
- Never commit actual secret values.

---

### 4. NPM Publishing Workflows

#### Publish Dev Version

**File:** `.github/workflows/publish-to-npm-dev.yml`

**Trigger:** Push tag with `-dev` suffix
```bash
# Create and push dev tag
git tag v0.0.5-dev.1
git push origin v0.0.5-dev.1
```

**Or manual trigger:**
```bash
# Go to GitHub → Actions → Publish to npm (dev) → Run workflow
```

**Result:** Publishes to npm with `dev` tag
```bash
npm install ai-vision-mcp@dev
```

---

#### Publish Beta Version

**File:** `.github/workflows/publish-to-npm-beta-on-tag.yml`

**Trigger:** Push tag with `-beta` suffix
```bash
# Create and push beta tag
git tag v0.0.5-beta.1
git push origin v0.0.5-beta.1
```

**Result:** Publishes to npm with `beta` tag
```bash
npm install ai-vision-mcp@beta
```

---

#### Publish Production (Latest)

**File:** `.github/workflows/publish-to-npm-latest-on-release.yml`

**Trigger:** Create GitHub Release
```bash
# Go to GitHub → Releases → Draft new release
# Create tag (e.g., v0.0.6) and publish release
```

**Result:** Publishes to npm with `latest` tag
```bash
npm install ai-vision-mcp
# or
npm install ai-vision-mcp@latest
```

---

#### Publish Manual

**File:** `.github/workflows/publish-to-npm-manual.yml`

**Trigger:** Manual only
```bash
# Go to GitHub → Actions → Publish to npm (manual) → Run workflow
# Select tag: dev, beta, or latest
```

---

### Publishing Checklist

#### For Development Testing:
```bash
# 1. Make changes and commit
git add .
git commit -m "feat: my feature"
git push

# 2. Wait for CI to pass (green checkmark)

# 3. Create dev tag
git tag v0.0.5-dev.1
git push origin v0.0.5-dev.1

# 4. Check Actions tab for publish status

# 5. Install and test
npm install ai-vision-mcp@dev
```

#### For Beta Release:
```bash
# 1. Create beta tag
git tag v0.0.5-beta.1
git push origin v0.0.5-beta.1

# 2. Users install with
npm install ai-vision-mcp@beta
```

#### For Production Release:
```bash
# 1. Go to GitHub → Releases → Draft new release
# 2. Click "Choose a tag" and type new version (e.g., v0.0.6)
# 3. Click "Create new tag: v0.0.6 on publish"
# 4. Add release title and description
# 5. Click "Publish release"
# 6. Workflow auto-publishes to npm
```

---

### Required Secrets

Configure these in GitHub → Settings → Secrets and variables → Actions:

| Secret | Required For | Description |
|--------|--------------|-------------|
| `NPM_TOKEN` | Publishing | NPM authentication token |
| `GEMINI_API_KEY` | E2E Integration | Gemini API key for tests |
| `GEMINI_BASE_URL` | E2E Integration | Custom proxy (optional) |
| `IMAGE_MODEL` | E2E Integration | Image model (optional) |
| `VIDEO_MODEL` | E2E Integration | Video model (optional) |

---

## Summary

**The CLI and MCP share ALL business logic through pure tool functions in `src/tools/`.**

When working on this codebase:
1. Tool functions = Business logic
2. CLI = Argument parsing + output formatting
3. MCP = Input validation + response formatting

This is a well-designed, DRY architecture that minimizes maintenance overhead.
