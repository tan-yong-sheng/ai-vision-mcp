# Plan: Add Structured Output Support to Vertex AI Provider

**Date**: 2025-10-10
**Status**: Proposal
**Issue**: Vertex AI provider missing `responseSchema` and `systemInstruction` support, preventing object detection from working

---

## Problem Statement

The `detect_objects_in_image` MCP tool does not work with Vertex AI provider because:

1. VertexAIProvider's `analyzeImage()`, `compareImages()`, and `analyzeVideo()` methods **do not pass** `responseSchema` to the API
2. These methods **do not pass** `systemInstruction` to the API
3. The `@google/genai` SDK (v1.22.0) **does support** both features for Vertex AI

**Impact**: Object detection is completely broken for Vertex AI users, despite the tool appearing in the MCP interface.

---

## Research Findings

### SDK Compatibility ✅

From Context7 documentation for `@google/genai`:

```javascript
// Structured output is supported for both Gemini and Vertex AI
const response = await ai.models.generateContent({
   model: "gemini-2.5-flash",
   contents: "...",
   config: {
     responseMimeType: "application/json",
     responseSchema: {
        type: Type.ARRAY,
        items: { /* ... */ }
     },
   },
});
```

**Confirmation**: The `@google/genai` SDK uses the **same API format** for both Gemini and Vertex AI providers.

### Current Implementation Gap

**GeminiProvider** (lines 207-215):
```typescript
const config: any = {
  temperature: ...,
  topP: ...,
  topK: ...,
  maxOutputTokens: ...,
  candidateCount: 1,
};

// Add structured output configuration if responseSchema is provided
if (options?.responseSchema) {
  config.responseMimeType = 'application/json';
  config.responseSchema = options.responseSchema;
}

// Add system instruction if provided
if (options?.systemInstruction) {
  config.systemInstruction = options.systemInstruction;
}
```

**VertexAIProvider** (lines 84-106):
```typescript
config: {
  temperature: ...,
  topP: ...,
  topK: ...,
  maxOutputTokens: ...,
  candidateCount: 1,
},
// MISSING: No responseSchema support
// MISSING: No systemInstruction support
```

---

## Solution Options

### **Option 1: Direct Code Duplication (Simplest)**

**Approach**: Copy the exact code pattern from GeminiProvider into VertexAIProvider

**Files to Edit**:
- `src/providers/vertexai/VertexAIProvider.ts`

**Changes Required**:
1. Add `responseSchema` + `responseMimeType` support in `analyzeImage()` (after line 106)
2. Add `systemInstruction` support in `analyzeImage()` (after line 106)
3. Repeat for `compareImages()` (after line 201)
4. Repeat for `analyzeVideo()` (after line 304)

**Code Pattern to Add** (3 times):
```typescript
// Add structured output configuration if responseSchema is provided
if (options?.responseSchema) {
  config.responseMimeType = 'application/json';
  config.responseSchema = options.responseSchema;
}

// Add system instruction if provided
if (options?.systemInstruction) {
  config.systemInstruction = options.systemInstruction;
}
```

**Pros**:
- ✅ Minimal risk - exact same pattern as GeminiProvider
- ✅ Fast to implement (~10 minutes)
- ✅ Easy to test and verify

**Cons**:
- ❌ Code duplication (appears in 6 places total: 3 in Gemini, 3 in Vertex AI)
- ❌ Future maintenance burden if format changes

**Estimated Effort**: 15 minutes
**Risk Level**: Low
**Maintenance Burden**: Medium

---

### **Option 2: Extract to Base Provider Helper Method (DRY)**

**Approach**: Create a protected helper method in `BaseVisionProvider` to build config with structured output support

**Files to Edit**:
1. `src/providers/base/VisionProvider.ts` - Add helper method
2. `src/providers/vertexai/VertexAIProvider.ts` - Use helper method
3. `src/providers/gemini/GeminiProvider.ts` - Refactor to use helper method (optional)

**New Helper Method**:
```typescript
// In BaseVisionProvider
protected buildConfigWithOptions(
  taskType: TaskType,
  functionName: FunctionName | undefined,
  options?: AnalysisOptions
): any {
  const config: any = {
    temperature: this.resolveTemperatureForFunction(
      taskType,
      functionName,
      options?.temperature
    ),
    topP: this.resolveTopPForFunction(
      taskType,
      functionName,
      options?.topP
    ),
    topK: this.resolveTopKForFunction(
      taskType,
      functionName,
      options?.topK
    ),
    maxOutputTokens: this.resolveMaxTokensForFunction(
      taskType,
      functionName,
      options?.maxTokens
    ),
    candidateCount: 1,
  };

  // Add structured output configuration if responseSchema is provided
  if (options?.responseSchema) {
    config.responseMimeType = 'application/json';
    config.responseSchema = options.responseSchema;
  }

  // Add system instruction if provided
  if (options?.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }

  return config;
}
```

**Usage in Providers**:
```typescript
// Before: 15+ lines of config building
const config: any = {
  temperature: this.resolveTemperatureForFunction(...),
  topP: this.resolveTopPForFunction(...),
  topK: this.resolveTopKForFunction(...),
  maxOutputTokens: this.resolveMaxTokensForFunction(...),
  candidateCount: 1,
};
if (options?.responseSchema) { /* ... */ }
if (options?.systemInstruction) { /* ... */ }

// After: 1 line
const config = this.buildConfigWithOptions('image', options?.functionName, options);
```

**Pros**:
- ✅ DRY principle - single source of truth
- ✅ Easier to extend with new config options in the future
- ✅ Reduces provider code by ~12 lines per method (36 lines total)
- ✅ Consistent behavior across all providers

**Cons**:
- ❌ More invasive change (3 files instead of 1)
- ❌ Requires refactoring working Gemini code (optional but recommended)
- ❌ Slightly longer implementation time

**Estimated Effort**: 30 minutes
**Risk Level**: Low-Medium (requires testing both providers)
**Maintenance Burden**: Low

---

### **Option 3: Comprehensive Refactor with Config Builder Pattern (Over-engineered)**

**Approach**: Create a separate `ConfigBuilder` class with fluent API

**Files to Create**:
- `src/providers/base/ConfigBuilder.ts`

**Files to Edit**:
- `src/providers/vertexai/VertexAIProvider.ts`
- `src/providers/gemini/GeminiProvider.ts`

**Example API**:
```typescript
const config = new ConfigBuilder()
  .withTemperature(this.resolveTemperatureForFunction(...))
  .withTopP(this.resolveTopPForFunction(...))
  .withTopK(this.resolveTopKForFunction(...))
  .withMaxOutputTokens(this.resolveMaxTokensForFunction(...))
  .withStructuredOutput(options?.responseSchema)
  .withSystemInstruction(options?.systemInstruction)
  .build();
```

**Pros**:
- ✅ Most maintainable long-term
- ✅ Type-safe config building
- ✅ Easy to extend with validation

**Cons**:
- ❌ Over-engineered for current needs
- ❌ Requires significant refactoring
- ❌ More code to test and maintain
- ❌ Overkill for a simple feature addition

**Estimated Effort**: 1.5 hours
**Risk Level**: Medium
**Maintenance Burden**: Low (but high initial cost)

---

## Recommendation: **Option 2 (Extract to Base Provider)**

### Why Option 2?

1. **Balance of DRY and pragmatism**: Reduces duplication without over-engineering
2. **Future-proof**: Makes adding new config options trivial (e.g., `responseMimeType` variations, `safetySettings`, etc.)
3. **Moderate risk**: Only requires testing 3 methods × 2 providers = 6 test cases
4. **Cleaner codebase**: Reduces total lines of code by ~30-40 lines
5. **Aligns with existing patterns**: `BaseVisionProvider` already has many helper methods

### When to Use Option 1 Instead?

- Time pressure (need fix deployed in <30 minutes)
- Uncertainty about SDK format stability
- Want minimal risk for a hotfix

### When to Consider Option 3?

- Planning a major refactor of the provider system
- Adding 5+ new config options in near future
- Need strict type safety for config objects

---

## Implementation Plan (Option 2)

### Phase 1: Add Helper Method to Base Class

**File**: `src/providers/base/VisionProvider.ts`

**Location**: After line 345 (after `resolveMaxTokensForFunction`)

**Code**:
```typescript
/**
 * Build config object with all standard options including structured output support
 * @param taskType - 'image' or 'video'
 * @param functionName - Specific function being called (for function-specific config)
 * @param options - Analysis options from caller
 * @returns Config object ready for API call
 */
protected buildConfigWithOptions(
  taskType: TaskType,
  functionName: FunctionName | undefined,
  options?: AnalysisOptions
): any {
  const config: any = {
    temperature: this.resolveTemperatureForFunction(
      taskType,
      functionName,
      options?.temperature
    ),
    topP: this.resolveTopPForFunction(
      taskType,
      functionName,
      options?.topP
    ),
    topK: this.resolveTopKForFunction(
      taskType,
      functionName,
      options?.topK
    ),
    maxOutputTokens: this.resolveMaxTokensForFunction(
      taskType,
      functionName,
      options?.maxTokens
    ),
    candidateCount: 1,
  };

  // Add structured output configuration if responseSchema is provided
  if (options?.responseSchema) {
    config.responseMimeType = 'application/json';
    config.responseSchema = options.responseSchema;
  }

  // Add system instruction if provided
  if (options?.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }

  return config;
}
```

---

### Phase 2: Update VertexAIProvider to Use Helper

**File**: `src/providers/vertexai/VertexAIProvider.ts`

#### Change 1: `analyzeImage()` method (lines 84-106)

**Before**:
```typescript
config: {
  temperature: this.resolveTemperatureForFunction(
    'image',
    options?.functionName,
    options?.temperature
  ),
  topP: this.resolveTopPForFunction(
    'image',
    options?.functionName,
    options?.topP
  ),
  topK: this.resolveTopKForFunction(
    'image',
    options?.functionName,
    options?.topK
  ),
  maxOutputTokens: this.resolveMaxTokensForFunction(
    'image',
    options?.functionName,
    options?.maxTokens
  ),
  candidateCount: 1,
},
```

**After**:
```typescript
config: this.buildConfigWithOptions('image', options?.functionName, options),
```

#### Change 2: `compareImages()` method (lines 179-201)

**Before**: Same 23-line config block
**After**:
```typescript
config: this.buildConfigWithOptions('image', options?.functionName, options),
```

#### Change 3: `analyzeVideo()` method (lines 282-304)

**Before**: Same 23-line config block (with 'video' taskType)
**After**:
```typescript
config: this.buildConfigWithOptions('video', options?.functionName, options),
```

**Total Lines Removed**: ~66 lines
**Total Lines Added**: 3 lines (+ 42 lines in base class)
**Net Change**: -21 lines

---

### Phase 3: (Optional) Refactor GeminiProvider

**File**: `src/providers/gemini/GeminiProvider.ts`

Apply the same refactoring to:
- `analyzeImage()` lines 182-204 → line 182
- `compareImages()` lines 376-398 → line 376
- `analyzeVideo()` lines 527-549 → line 527

**Benefits**:
- Consistent codebase
- Reduces future maintenance
- Makes it obvious both providers use same format

**Risk**:
- Changes working code
- Requires full regression testing

**Recommendation**: Include in same PR to ensure consistency, but test thoroughly.

---

## Testing Strategy

### Unit Tests Required

**Test File**: `src/providers/vertexai/VertexAIProvider.test.ts` (create if doesn't exist)

**Test Cases**:
1. `analyzeImage()` with `responseSchema` → API call includes `responseMimeType` and `responseSchema`
2. `analyzeImage()` with `systemInstruction` → API call includes `systemInstruction`
3. `analyzeImage()` without options → API call has standard config only
4. `compareImages()` with structured output options
5. `analyzeVideo()` with structured output options

**Manual Testing**:
1. Run `detect_objects_in_image` with Vertex AI provider
2. Verify JSON output is properly structured
3. Check bounding box coordinates are returned
4. Test with Gemini provider to ensure no regression

### Integration Test

**Test Case**: End-to-end object detection with Vertex AI

```bash
# Set up Vertex AI environment
export IMAGE_PROVIDER=vertex_ai
export VERTEX_CREDENTIALS=/path/to/credentials.json
export GCS_BUCKET_NAME=my-test-bucket

# Run MCP server and call detect_objects_in_image
# Verify:
# 1. No errors about missing responseSchema
# 2. Returns valid JSON with detections array
# 3. Annotated image is generated correctly
```

---

## Documentation Updates Required

### 1. README.md

**Section**: "Object Detection Support"

**Add**:
```markdown
### Object Detection

The `detect_objects_in_image` tool now works with both Gemini and Vertex AI providers:

- **Gemini**: Works out of the box
- **Vertex AI**: Requires SDK version >= 1.0.0 (already satisfied)

Both providers support structured JSON output for bounding box coordinates.
```

### 2. docs/SPEC.md

**Section**: "Provider Capabilities"

**Update**:
```markdown
#### Structured Output Support

Both providers support structured JSON output via `responseSchema` option:

- **GeminiProvider**: Native support via `responseMimeType` + `responseSchema`
- **VertexAIProvider**: Native support via `responseMimeType` + `responseSchema`

This enables features like object detection with bounding box coordinates.
```

### 3. CLAUDE.md

**Section**: "Development Patterns"

**Add**:
```markdown
## Config Building Pattern

Use `buildConfigWithOptions()` helper from BaseVisionProvider for consistent config:

```typescript
// ✅ Correct - uses helper
const config = this.buildConfigWithOptions('image', options?.functionName, options);

// ❌ Incorrect - manual config building (duplicates code)
const config = {
  temperature: this.resolveTemperatureForFunction(...),
  // ... 20+ more lines
};
```

This ensures structured output and system instructions work across all providers.
```

---

## Rollback Plan

If issues are discovered after deployment:

### Immediate Rollback (Option 1 Fallback)

1. Revert `BaseVisionProvider.ts` changes
2. Apply Option 1 (direct duplication) to VertexAIProvider only
3. Leave GeminiProvider unchanged
4. Deploy hotfix

**Time to Rollback**: ~10 minutes

### Partial Rollback

1. Keep `buildConfigWithOptions()` in BaseVisionProvider
2. Revert VertexAIProvider to use old format
3. Investigate issue
4. Re-apply when fixed

**Time to Rollback**: ~5 minutes

---

## Risk Assessment

### Low Risk
- ✅ SDK already supports the features (confirmed by Context7 docs)
- ✅ No API version changes required
- ✅ No breaking changes to public interfaces
- ✅ Code pattern already proven in GeminiProvider

### Medium Risk
- ⚠️ Refactoring working GeminiProvider code (optional)
- ⚠️ Requires testing with actual Vertex AI credentials
- ⚠️ Potential for subtle config format differences between providers

### Mitigation Strategies
1. **Incremental deployment**: Add helper method first, test independently
2. **Feature flag**: Add environment variable `VERTEX_AI_STRUCTURED_OUTPUT_ENABLED` (optional)
3. **Comprehensive logging**: Log config objects before API calls for debugging
4. **Staged rollout**: Test with Vertex AI first, then apply to Gemini

---

## Success Criteria

### Must Have ✅
1. `detect_objects_in_image` works with Vertex AI provider
2. Returns structured JSON with bounding boxes
3. No regression in Gemini provider
4. All existing tests pass

### Nice to Have 🎯
1. Reduced code duplication (36+ lines removed)
2. Consistent config building across providers
3. Updated documentation
4. Unit tests for new functionality

### Stretch Goals 🚀
1. Add integration tests for object detection
2. Create example scripts for both providers
3. Performance benchmarking (ensure no slowdown)

---

## Timeline Estimate

**Option 2 (Recommended)**:
- Phase 1 (Base class helper): 15 minutes
- Phase 2 (VertexAI update): 10 minutes
- Phase 3 (Gemini refactor): 10 minutes
- Testing: 20 minutes
- Documentation: 15 minutes
- **Total: 70 minutes**

**Option 1 (Hotfix)**:
- Implementation: 10 minutes
- Testing: 10 minutes
- Documentation: 10 minutes
- **Total: 30 minutes**

---

## Decision: Proceed with Option 2

**Rationale**:
- Moderate effort (70 min) for long-term maintainability
- Aligns with existing codebase architecture
- Reduces technical debt by 30+ lines
- Makes future config additions trivial

**Next Steps**:
1. Create feature branch: `feat/vertex-ai-structured-output`
2. Implement Phase 1 → Test → Commit
3. Implement Phase 2 → Test → Commit
4. Implement Phase 3 → Test → Commit
5. Update documentation → Commit
6. Create PR with comprehensive testing notes
7. Merge after review

---

## Appendix: Alternative Implementations Considered

### A. Provider-Specific Config Interfaces

**Idea**: Create separate `GeminiConfig` and `VertexAIConfig` TypeScript interfaces

**Rejected Because**:
- SDK uses same format for both providers
- Would complicate the shared BaseVisionProvider
- No actual differences in config structure

### B. Middleware Pattern for Config Enhancement

**Idea**: Use middleware to inject `responseSchema` and `systemInstruction`

**Rejected Because**:
- Over-engineered for current needs
- Harder to debug config flow
- No clear benefit over direct helper method

### C. Runtime Provider Detection

**Idea**: Auto-detect if provider supports structured output at runtime

**Rejected Because**:
- Both providers DO support it (no detection needed)
- Would add unnecessary complexity
- Could mask real errors

---

## References

- [Context7: @google/genai SDK](https://github.com/googleapis/js-genai)
- [Structured Output Example](https://github.com/googleapis/js-genai/blob/main/codegen_instructions.md)
- [Vertex AI Configuration](https://github.com/googleapis/js-genai/blob/main/README.md#vertex-ai)
- Current codebase: `src/providers/gemini/GeminiProvider.ts` (working example)
