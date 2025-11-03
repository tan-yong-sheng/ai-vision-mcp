# Plan: Fix Vertex AI Authentication Issue

## Problem Description

The VertexAI provider is failing with `aiplatform.endpoints.predict` permission denied errors because the GoogleGenAI client is not being initialized with proper authentication credentials.

## Root Cause Analysis

1. **Missing Authentication**: The `VertexAIProvider.ts` constructor initializes the GoogleGenAI client without any authentication configuration
2. **Credentials Available but Unused**: The `VertexAIConfig` includes a `credentials` field from `VERTEX_CREDENTIALS` environment variable, but it's not passed to the GoogleGenAI client
3. **No GoogleAuthOptions**: The client config lacks the required `googleAuthOptions` parameter

## Current Error Flow

```
Environment Variables → ConfigService → VertexAIConfig → VertexAIProvider Constructor
                                                           ↓
VERTEX_CREDENTIALS ✓  → credentials: "path/to/file.json" → NOT USED ✗
                                                           ↓
                                        GoogleGenAI client with NO AUTH → 403 Permission Denied
```

## Solution Options Analysis

### Option 1: Environment Variable (Simple)
- ✅ Quick implementation
- ❌ Modifies global process environment
- ❌ Not ideal for multiple concurrent instances

### Option 2: GoogleAuthOptions (Recommended) ⭐
- ✅ Explicit authentication configuration
- ✅ Clean separation of concerns
- ✅ Supports both file paths and credential objects
- ✅ No global environment modification

### Option 3: Credential Object Parsing (Complex)
- ✅ Most flexible
- ❌ Higher complexity
- ❌ Requires file system operations

## Selected Solution: Option 2 - GoogleAuthOptions

### Implementation Steps

1. **Modify VertexAI Provider Constructor**:
   - Add authentication logic before GoogleGenAI client initialization
   - Check if `config.credentials` is provided
   - Add `googleAuthOptions` to client configuration

2. **Support Multiple Credential Types**:
   - File path (most common from README examples)
   - JSON string (future flexibility)

3. **Maintain Backward Compatibility**:
   - Keep existing environment variable support
   - No breaking changes to public API

### Implementation Details

```typescript
// Before (current - broken)
const clientConfig: any = {
  vertexai: true,
  project: config.projectId,
  location: config.location,
};

// After (fixed)
const clientConfig: any = {
  vertexai: true,
  project: config.projectId,
  location: config.location,
};

// Add authentication if credentials are provided
if (config.credentials) {
  clientConfig.googleAuthOptions = {
    keyFile: config.credentials
  };
}
```

### Environment Variables Respected

From README.md requirements:
- ✅ `VERTEX_CREDENTIALS` - Path to service account JSON file
- ✅ `VERTEX_PROJECT_ID` - Auto-derived from credentials or explicit
- ✅ `VERTEX_LOCATION` - Defaults to 'us-central1'
- ✅ `VERTEX_ENDPOINT` - Defaults to 'https://aiplatform.googleapis.com'

### Testing Strategy

1. **Verify Current Error**: Confirm 403 permission denied
2. **Apply Fix**: Implement GoogleAuthOptions
3. **Test Authentication**: Verify successful API calls
4. **Test Edge Cases**: Missing credentials, invalid paths

### Risk Assessment

- **Risk Level**: Low
- **Rollback**: Simple revert if issues arise
- **Breaking Changes**: None
- **Dependencies**: No new dependencies required

### Expected Outcome

After implementation:
```
Environment Variables → ConfigService → VertexAIConfig → VertexAIProvider Constructor
                                                           ↓
VERTEX_CREDENTIALS ✓  → credentials: "path/to/file.json" → googleAuthOptions ✓
                                                           ↓
                                        GoogleGenAI client with AUTH → ✅ Success
```

## Recommendation: Option 2

**Rationale**: Provides the best balance of implementation simplicity, maintainability, and explicit configuration while respecting all environment variables outlined in the README.