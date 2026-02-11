# Dead Code Analysis Report

**Date:** 2026-02-11
**Project:** ai-vision-mcp
**Tools Used:** knip v5.83.1, depcheck v1.4.7, ts-prune v0.10.3

---

## Executive Summary

| Metric | Count | Severity |
|--------|-------|----------|
| Unused Dependencies | 1 | LOW |
| Unused DevDependencies | 11 | LOW |
| Unused Source Files | 7 | LOW |
| Unused Exports | 38+ | MEDIUM |
| Unused Types | 43+ | LOW |

**Recommendation:** Most flagged items are **index.ts barrel files** that are commonly used for clean imports, and **type exports** that provide public API flexibility. These are generally **safe to keep** for maintainability. The `mime-types` dependency and `src/utils/retry.ts` utility appear to be genuinely unused.

---

## 1. Unused Dependencies (CAUTION)

### Production Dependencies

| Package | Location | Status | Recommendation |
|---------|----------|--------|----------------|
| `mime-types` | package.json:64 | UNUSED | Verify before removal |

**Analysis:** The `mime-types` package is imported but may not be actively used. Check if any code imports from this package before removing.

### Development Dependencies

| Package | Status | Recommendation |
|---------|--------|----------------|
| `@types/html-to-text` | UNUSED | Safe to remove if not used |
| `@types/http-cache-semantics` | UNUSED | Safe to remove if not used |
| `@types/mime-types` | UNUSED | Safe to remove with mime-types |
| `@types/phoenix` | UNUSED | Safe to remove if not used |
| `@types/ws` | UNUSED | Safe to remove if not used |
| `@types/yauzl` | UNUSED | Safe to remove if not used |
| `@vitest/coverage-v8` | UNUSED | Keep for future coverage tests |
| `depcheck` | UNUSED (dev) | Keep for maintenance |
| `eslint-config-prettier` | UNUSED | Keep for ESLint configuration |
| `eslint-plugin-prettier` | UNUSED | Keep for ESLint configuration |
| `knip` | UNUSED (dev) | Keep for maintenance |
| `ts-prune` | UNUSED (dev) | Keep for maintenance |

**Note:** The devDependencies marked "UNUSED (dev)" were just installed for this analysis and should be kept. Type packages may be required transitively.

---

## 2. Unused Files (CAUTION)

### Source Files (Index/Barrel Files)

These are barrel files that provide clean import paths. They may be used for external consumers or future use.

| File | Purpose | Recommendation |
|------|---------|----------------|
| `src/providers/base/index.ts` | Barrel file for BaseVisionProvider | **KEEP** - Standard pattern |
| `src/providers/gemini/index.ts` | Barrel file for GeminiProvider | **KEEP** - Standard pattern |
| `src/providers/vertexai/index.ts` | Barrel file for VertexAIProvider | **KEEP** - Standard pattern |
| `src/storage/gcs/index.ts` | Barrel file for GCSStorage | **KEEP** - Standard pattern |
| `src/storage/index.ts` | Barrel file for storage exports | **KEEP** - Standard pattern |
| `src/types/index.ts` | Barrel file for types | **KEEP** - Standard pattern |
| `src/utils/index.ts` | Barrel file for utilities | **KEEP** - Standard pattern |

### Actual Unused Files

| File | Purpose | Recommendation |
|------|---------|----------------|
| `src/utils/retry.ts` | Retry utility implementation | **INVESTIGATE** - May be unused duplicate |
| `tests/e2e/setup.ts` | E2E test setup utilities | Used in tests, not production |
| `tests/mocks/gemini.ts` | Test mocks for Gemini | Used in tests, not production |
| `tests/types/Providers.ts` | Test type definitions | Used in tests, not production |
| `tmp/mcp-smoke-client.mjs` | Temporary test file | **SAFE TO REMOVE** |

---

## 3. Unused Exports (SAFE to CAUTION)

### 3.1 Function Name Constants (SAFE to Keep)

**File:** `src/constants/FunctionNames.ts`

| Export | Line | Note |
|--------|------|------|
| `IMAGE_FUNCTIONS` | 15 | Export for external use |
| `VIDEO_FUNCTIONS` | 21 | Export for external use |
| `ALL_FUNCTIONS` | 23 | Export for external use |

**Recommendation:** These are exported for programmatic access to function names. Keep for API completeness.

### 3.2 Error Classes (SAFE to Keep)

**File:** `src/types/Errors.ts`

| Export | Line | Note |
|--------|------|------|
| `RateLimitExceededError` | 101 | Public error type |
| `AuthenticationError` | 111 | Public error type |
| `AuthorizationError` | 118 | Public error type |
| `ValidationError` | 132 | Public error type |

**Recommendation:** These error classes are part of the public API for error handling. Keep even if not currently used internally.

### 3.3 Credential Utilities (INVESTIGATE)

**File:** `src/utils/credentialsParser.ts`

| Export | Line | Note |
|--------|------|------|
| `parseServiceAccountCredentials` | 27 | Used in module |
| `validateServiceAccountCredentials` | 102 | Currently unused? |

**Recommendation:** Verify if `validateServiceAccountCredentials` is needed or can be removed.

### 3.4 Validation Functions and Schemas (SAFE to Keep)

**File:** `src/utils/validation.ts`

| Export | Line | Type |
|--------|------|------|
| `ConfigSchema` | 45 | Zod Schema |
| `AnalysisOptionsSchema` | 188 | Zod Schema |
| `AnalyzeImageArgsSchema` | 200 | Zod Schema |
| `AnalyzeVideoArgsSchema` | 206 | Zod Schema |
| `FileValidationSchema` | 213 | Zod Schema |
| `UrlSchema` | 220 | Zod Schema |
| `Base64Schema` | 223 | Zod Schema |
| `ModelNameSchema` | 228 | Zod Schema |
| `ProviderInfoSchema` | 231 | Zod Schema |
| `HealthStatusSchema` | 243 | Zod Schema |
| `UsageMetadataSchema` | 251 | Zod Schema |
| `AnalysisResultSchema` | 258 | Zod Schema |
| `FileReferenceSchema` | 271 | Zod Schema |
| `validateAnalysisOptions` | 294 | Function |
| `validateAnalyzeImageArgs` | 298 | Function |
| `validateAnalyzeVideoArgs` | 302 | Function |
| `validateFile` | 306 | Function |
| `validateUrl` | 310 | Function |
| `validateBase64` | 314 | Function |
| `validateModelName` | 318 | Function |
| `validateHealthStatus` | 322 | Function |
| `validateAnalysisResult` | 326 | Function |
| `validateFileReference` | 330 | Function |
| `isValidUrl` | 335 | Function |
| `isValidBase64` | 339 | Function |
| `isImageFormat` | 343 | Function |
| `isVideoFormat` | 347 | Function |
| `isSupportedImageFormat` | 351 | Function |
| `isSupportedVideoFormat` | 359 | Function |

**Recommendation:** Most validation exports are part of the public API and provide runtime type checking. Keep for API completeness and future use.

---

## 4. Unused Type Exports (SAFE to Keep)

### 4.1 Function Name Types

**File:** `src/constants/FunctionNames.ts`

| Type | Line |
|------|------|
| `ImageFunctionName` | 26 |
| `VideoFunctionName` | 27 |
| `AllFunctionName` | 28 |

### 4.2 Service Types

**File:** `src/services/LoggerService.ts`

| Type | Line |
|------|------|
| `McpLogLevel` | 2 |

### 4.3 Tool Argument Types

**File:** `src/tools/analyze_image.ts`, `src/tools/analyze_video.ts`, etc.

| Type | File | Line |
|------|------|------|
| `AnalyzeImageArgs` | analyze_image.ts | 13 |
| `AnalyzeVideoArgs` | analyze_video.ts | 13 |
| `CompareImagesArgs` | compare_images.ts | 13 |
| `ObjectDetectionArgs` | detect_objects_in_image.ts | 122 |

### 4.4 Analysis Types

**File:** `src/types/Analysis.ts`

| Type | Line |
|------|------|
| `UsageMetadata` | 39 |

### 4.5 Config Types

**File:** `src/types/Config.ts`

| Type | Line |
|------|------|
| `FileUploadConfig` | 112 |

### 4.6 Error Types

**File:** `src/types/Errors.ts`

| Type | Line |
|------|------|
| `ErrorType` | 154 |
| `ErrorDetails` | 168 |

### 4.7 Object Detection Types

**File:** `src/types/ObjectDetection.ts`

| Type | Line |
|------|------|
| `ObjectDetectionResult` | 13 |

### 4.8 Provider Types (Public API)

**File:** `src/types/Providers.ts`

| Type | Line | Note |
|------|------|------|
| `ProviderConfig` | 79 | Public API |
| `ProviderFactory` | 90 | Public API |
| `GeminiGenerateContentRequest` | 117 | Public API |
| `GeminiContent` | 123 | Public API |
| `GeminiPart` | 128 | Public API |
| `GeminiGenerationConfig` | 133 | Public API |
| `GeminiSafetySetting` | 142 | Public API |
| `GeminiGenerateContentResponse` | 147 | Public API |
| `GeminiCandidate` | 156 | Public API |
| `GeminiSafetyRating` | 163 | Public API |
| `VertexAIGenerateContentRequest` | 179 | Public API |
| `VertexAIContent` | 185 | Public API |
| `VertexAIPart` | 190 | Public API |
| `VertexAIGenerationConfig` | 195 | Public API |
| `VertexAISafetySetting` | 204 | Public API |
| `VertexAIGenerateContentResponse` | 209 | Public API |
| `VertexAICandidate` | 219 | Public API |
| `VertexAISafetyRating` | 226 | Public API |

### 4.9 Storage Types (Public API)

**File:** `src/types/Storage.ts`

| Type | Line |
|------|------|
| `StorageConfig` | 29 |
| `UploadOptions` | 40 |
| `ListOptions` | 48 |
| `ListResult` | 54 |
| `SignedUrlOptions` | 61 |
| `StorageError` | 68 |

### 4.10 Utility Types

**File:** `src/utils/credentialsParser.ts`

| Type | Line |
|------|------|
| `ServiceAccountCredentials` | 8 |

**File:** `src/utils/imageAnnotator.ts`

| Type | Line |
|------|------|
| `AnnotationOptions` | 13 |

---

## 5. Duplicate/Overlapping Exports

### 5.1 Type Re-exports from Barrel Files

The following types are re-exported from multiple barrel files:

| Type | Exported From | Original Definition |
|------|---------------|---------------------|
| `AnalyzeImageArgs` | `src/tools/index.ts` | `src/tools/analyze_image.ts` |
| `AnalyzeVideoArgs` | `src/tools/index.ts` | `src/tools/analyze_video.ts` |
| `CompareImagesArgs` | `src/tools/index.ts` | `src/tools/compare_images.ts` |
| `ObjectDetectionArgs` | `src/tools/index.ts` | `src/tools/detect_objects_in_image.ts` |
| `StorageProvider` | `src/types/index.ts` | `src/storage/index.ts` |
| `StorageFile` | `src/types/index.ts` | `src/storage/index.ts` |
| `StorageConfig` | `src/types/index.ts` | `src/storage/index.ts` |

**Recommendation:** This is a standard pattern for clean imports. Consider if the barrel files are needed or if direct imports are preferred.

---

## 6. Recommendations by Severity

### 6.1 SAFE to Remove (No Risk)

| Item | Location | Action |
|------|----------|--------|
| `tmp/mcp-smoke-client.mjs` | `tmp/` | Delete temporary file |

### 6.2 LIKELY SAFE to Remove (Verify First)

| Item | Location | Action |
|------|----------|--------|
| `mime-types` dependency | `package.json` | Verify no imports before removal |
| `src/utils/retry.ts` | `src/utils/` | Check if duplicate of other retry logic |
| `@types/mime-types` | `package.json` | Remove with mime-types |

### 6.3 CAUTION - Keep but Review

| Item | Reason |
|------|--------|
| All barrel `index.ts` files | Standard pattern, used for clean imports |
| Validation functions | Public API, used for runtime checking |
| Type exports | Public API surface |
| Error classes | Public API for error handling |

### 6.4 KEEP - Required for API

| Item | Reason |
|------|--------|
| Test files | Required for testing |
| Type definitions | Public API surface |
| E2E test utilities | Required for testing |

---

## 7. Potential Improvements

### 7.1 Dependency Cleanup

```bash
# Verify mime-types is unused
grep -r "from 'mime-types'" src/
grep -r "import.*mime-types" src/

# If no results, remove:
npm uninstall mime-types
npm uninstall --save-dev @types/mime-types
```

### 7.2 Barrel File Strategy

Consider documenting the barrel file strategy in your README:

```typescript
// Option 1: Use barrel files (current)
import { GeminiProvider } from './providers/gemini';

// Option 2: Direct imports
import { GeminiProvider } from './providers/gemini/GeminiProvider';
```

### 7.3 knip Configuration

Create a `knip.json` configuration to properly handle the barrel files and exports:

```json
{
  "$schema": "https://unpkg.com/knip@5/schema.json",
  "entry": ["src/index.ts", "src/server.ts"],
  "project": ["src/**/*.ts"],
  "ignore": [
    "src/**/index.ts",
    "src/types/*.ts",
    "tests/**/*"
  ]
}
```

---

## 8. Commands to Reproduce

```bash
# Install tools
npm install --save-dev knip depcheck ts-prune

# Run knip (production mode)
npx knip --production

# Run depcheck
npx depcheck

# Run ts-prune
npx ts-prune
```

---

## Appendix: Complete Export List

### All Files Flagged by knip as "Unused Files"

**Source files:**
- `src/providers/base/index.ts`
- `src/providers/gemini/index.ts`
- `src/providers/vertexai/index.ts`
- `src/storage/gcs/index.ts`
- `src/storage/index.ts`
- `src/types/index.ts`
- `src/utils/index.ts`
- `src/utils/retry.ts`

**Test files:**
- `tests/e2e/setup.ts`
- `tests/mocks/gemini.ts`
- `tests/types/Providers.ts`

**Temporary files:**
- `tmp/mcp-smoke-client.mjs`

### All Exports Flagged by knip

See sections 3 and 4 for complete lists of exports flagged as unused.
