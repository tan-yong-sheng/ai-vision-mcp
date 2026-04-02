# Implementation Plan: extract_layout_tree Tool

## Overview

Add a new MCP tool `extract_layout_tree` that converts screenshots/videos into hierarchical JSON layout trees optimized for LLM design reasoning. This tool bridges UI detection and design analysis by providing structured layout information that helps LLMs understand page structure, spatial relationships, and semantic hierarchy.

## Problem Statement

Current `detect_objects_in_image` returns flat lists of detected objects with bounding boxes. This format is insufficient for design reasoning because:
- No parent-child relationships (hierarchy)
- No semantic role information (button vs container vs heading)
- No layout flow information (flex/grid)
- Difficult for LLMs to reason about overall page structure
- Loses context about which elements are related

## Solution: Hierarchical Layout Tree

Extract layout as a nested JSON tree with:
- Element hierarchy (parent-child relationships)
- Bounding boxes (x, y, width, height in pixels and normalized 0-1000)
- Semantic roles (button, heading, container, etc.)
- Text content and ARIA labels
- Visual properties (colors, spacing, typography)
- Layout information (flex/grid)
- Viewport metadata

## Architecture

### Input
- Screenshot (image file, URL, or base64)
- Optional: Playwright page object (for accessibility tree)
- Optional: Custom extraction options

### Processing Pipeline

```
Screenshot
    ↓
[1] Element Detection (UIED/UI-DETR)
    ↓ (bounding boxes + element types)
    ↓
[2] Accessibility Tree Extraction (Playwright)
    ↓ (semantic roles, text, ARIA)
    ↓
[3] Merge & Hierarchy Building
    ↓ (combine detection + semantics)
    ↓
[4] Spatial Analysis
    ↓ (calculate relationships, layout flow)
    ↓
Hierarchical JSON Layout Tree
```

### Output Format

```typescript
interface LayoutTree {
  root: LayoutNode
  metadata: {
    viewport: {
      width: number
      height: number
    }
    imageMetadata: {
      width: number
      height: number
      format: string
      size_bytes: number
    }
    extractionMethod: 'vision' | 'accessibility' | 'hybrid'
    processingTime: number
    model?: string
    provider?: string
  }
}

interface LayoutNode {
  id: string
  type: string                    // 'button', 'heading', 'container', etc.
  role?: string                   // ARIA role
  text?: string                   // Text content
  ariaLabel?: string
  bounds: {
    x: number                     // Pixels
    y: number
    width: number
    height: number
    normalized: {
      x: number                   // 0-1000 scale
      y: number
      width: number
      height: number
    }
  }
  children: LayoutNode[]
  properties?: {
    color?: string
    backgroundColor?: string
    fontSize?: number
    fontWeight?: string
    padding?: number
    margin?: number
    display?: string              // 'flex', 'grid', 'block', etc.
  }
}
```

## Implementation Phases

### Phase 1: Core Tool Function (src/tools/extract_layout_tree.ts)
- [ ] Create pure tool function following architecture pattern
- [ ] Accept image source (file, URL, base64)
- [ ] Implement element detection via vision model
- [ ] Build hierarchical structure from flat detections
- [ ] Return hierarchical JSON layout tree
- [ ] Include viewport and image metadata

### Phase 2: Type Definitions (src/types/LayoutTree.ts)
- [ ] Define LayoutTree interface
- [ ] Define LayoutNode interface
- [ ] Define extraction options
- [ ] Define response types

### Phase 3: CLI Integration (src/cli/commands/extract-layout-tree.ts)
- [ ] Create CLI command handler
- [ ] Parse arguments (image source, options)
- [ ] Call tool function
- [ ] Format output (JSON, pretty-print, etc.)
- [ ] Handle file output

### Phase 4: MCP Server Integration (src/server.ts)
- [ ] Register MCP tool with Zod schema
- [ ] Validate input
- [ ] Call tool function
- [ ] Return MCP response

### Phase 5: Tests
- [ ] Unit tests for hierarchy building
- [ ] Integration tests with real screenshots
- [ ] E2E tests with Playwright recordings
- [ ] Test coverage: 80%+

## Key Design Decisions

### 1. Coordinate Systems
- **Pixels**: Absolute coordinates for direct use
- **Normalized (0-1000)**: For provider compatibility and consistency with `detect_objects_in_image`
- Both included in response for flexibility

### 2. Hierarchy Building Strategy
- Use bounding box containment to determine parent-child relationships
- Smallest containing element = parent
- Handle overlapping elements gracefully
- Preserve semantic hierarchy from accessibility tree

### 3. Element Type Classification
- HTML semantic elements (button, heading, nav, etc.)
- Generic containers (div, section, article)
- Interactive elements (input, select, textarea)
- Text elements (p, span, label)
- Media elements (img, video)

### 4. Viewport Metadata
- Include original image dimensions
- Include viewport dimensions (if available from Playwright)
- Enable coordinate conversion and scaling

## Dependencies

### New Dependencies (if needed)
- UIED or UI-DETR for element detection (evaluate in Phase 1)
- Existing: Playwright, vision providers, ImageScript

### Reuse Existing
- VisionProvider interface (existing)
- FileService (existing)
- ConfigService (existing)
- ImageAnnotator utilities (existing)

## Integration Points

### With detect_objects_in_image
- Reuse element detection logic
- Reuse coordinate normalization
- Reuse image handling (URL, file, base64)

### With Playwright
- Optional: Accept Playwright page for accessibility tree
- Extract semantic structure from accessibility tree
- Combine with vision-based detection

### With CLI/MCP
- Follow existing pattern: pure tool function + thin wrappers
- Consistent error handling
- Consistent metadata structure

## Success Criteria

- [ ] Tool extracts hierarchical layout from screenshots
- [ ] Bounding boxes accurate (within 5% of visual elements)
- [ ] Hierarchy correctly represents parent-child relationships
- [ ] Semantic roles properly assigned
- [ ] JSON output valid and parseable
- [ ] Works with Playwright recordings
- [ ] 80%+ test coverage
- [ ] Documented with examples
- [ ] Performance: <5s for typical screenshot

## Future Enhancements

1. **Design Token Extraction**: Extract colors, spacing, typography
2. **Layout Analysis**: Detect grid/flex layouts, alignment
3. **Accessibility Analysis**: WCAG compliance checking
4. **Design System Mapping**: Match elements to design system tokens
5. **Multi-frame Analysis**: Extract layout changes from video sequences
6. **CSS Generation**: Generate CSS from layout tree

## Related Work

- `detect_objects_in_image`: Flat object detection (for web navigation)
- `analyze_image`: General image analysis
- `compare_images`: Image comparison
- Playwright accessibility snapshots: Semantic structure extraction

## Implementation Priority & Roadmap

### Phase 1: Build extract_layout_tree (This Plan)
**Why first:**
- New tool, no backwards compatibility concerns
- Can iterate freely on hierarchical JSON design
- Proves the approach works for LLM design reasoning
- Learnings inform improvements to `detect_objects_in_image`

**Use case:** LLM design analysis and layout understanding

### Phase 2: Improve detect_objects_in_image (Future)
**Why after:** 
- Focused improvements to existing tool for web navigation
- Can be done incrementally without breaking changes
- Experience from `extract_layout_tree` guides the improvements

**Use case:** LLM web navigation and element clicking

**Improvements needed:** See [GAPS_ANALYSIS.md](./GAPS_ANALYSIS.md) for detailed gaps analysis and priority ranking:
- High priority: Confidence scores, viewport metadata, coordinate scale documentation
- Medium priority: Knowledge Graph MID, detection method metadata
- Low priority: Polygon bounding boxes, coordinate conversion utilities

## Notes

- `extract_layout_tree` is designed to improve LLM reasoning about UI/UX design
- Hierarchical format is proven better for LLM layout understanding (research 2024-2026)
- Complements existing tools without replacing them
- Enables new use cases: design feedback, layout replication, accessibility analysis
- After completing this tool, refer to GAPS_ANALYSIS.md for prioritized improvements to `detect_objects_in_image`
