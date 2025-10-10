# Plan: Fix Dynamic MAX_IMAGES_FOR_COMPARISON Schema Validation

## Problem Description

The `compare_images` MCP tool has inconsistent validation:
- **Schema validation** (server.ts): Hardcoded to max 4 images
- **Tool implementation** (compare_images.ts): Respects `MAX_IMAGES_FOR_COMPARISON` environment variable

This means users cannot use more than 4 images even if they configure `MAX_IMAGES_FOR_COMPARISON=6`.

## Root Cause

The MCP tool registration in `server.ts` uses a static Zod schema that's defined at module load time, before configuration is available:

```typescript
// Current - HARDCODED
imageSources: z
  .array(z.string())
  .min(2)
  .max(4)  // ← Static value, ignores config
```

## Solution Strategy

### Option 1: Lazy Schema Generation (Recommended)
Move the schema creation inside the tool handler where config is available.

### Option 2: Dynamic Schema Factory
Create a schema factory function that accepts max images parameter.

### Option 3: Configuration-based Registration
Register tools after configuration is loaded.

**Selected: Option 1** - Most straightforward and maintains existing patterns.

## Implementation Plan

1. **Modify server.ts**:
   - Move schema validation from registration to handler
   - Use manual validation with config values
   - Keep Zod for type safety but make limits dynamic

2. **Update validation logic**:
   - Read `MAX_IMAGES_FOR_COMPARISON` from config
   - Apply dynamic validation in handler
   - Maintain backward compatibility

3. **Preserve error consistency**:
   - Same error format as current Zod validation
   - Clear error messages for users

## Implementation Details

```typescript
// Before (hardcoded)
inputSchema: {
  imageSources: z.array(z.string()).min(2).max(4)
}

// After (dynamic)
inputSchema: {
  imageSources: z.array(z.string()).min(2)  // Remove max, validate in handler
}

// Handler validation:
const { config } = getServices();
const maxImages = config.MAX_IMAGES_FOR_COMPARISON || 4;
if (imageSources.length > maxImages) {
  throw new Error(`Maximum ${maxImages} images allowed`);
}
```

## Benefits

- ✅ Respects user configuration
- ✅ Consistent behavior across schema and implementation
- ✅ No breaking changes to existing API
- ✅ Maintains type safety

## Risk Assessment

- **Risk Level**: Low
- **Breaking Changes**: None
- **Backward Compatibility**: Full
- **Testing**: Can validate with different MAX_IMAGES_FOR_COMPARISON values

## Expected Outcome

After fix:
- `MAX_IMAGES_FOR_COMPARISON=6` → Users can compare up to 6 images
- `MAX_IMAGES_FOR_COMPARISON=2` → Users can compare up to 2 images
- Default behavior unchanged (max 4 images)