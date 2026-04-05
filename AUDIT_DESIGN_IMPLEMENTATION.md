# audit_design Tool Implementation

## Overview

Implemented a new `audit_design` tool for design compliance auditing with **pure TypeScript/JavaScript** pixel-level analysis and Gemini critique. **Zero native binaries** — all image processing uses WASM-bundled libraries.

## Architecture

### 3-Layer Design

```
┌─────────────────────────────────────────┐
│  MCP + CLI Layer (thin wrappers)        │
│  - src/server.ts                        │
│  - src/cli/commands/audit-design.ts     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Tool Function (pure, business logic)   │
│  - src/tools/audit_design.ts            │
│    • Pixel metric computation           │
│    • Issue extraction                   │
│    • Gemini critique generation         │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│  Pixel Analysis Utilities                │
│  - src/utils/pixelAnalysis.ts           │
│    • K-means color clustering           │
│    • Sobel edge detection               │
│    • Luminance computation              │
│    • WCAG contrast calculation          │
│  - src/types/DesignAudit.ts             │
│    • Type definitions                   │
└─────────────────────────────────────────┘
```

## Key Features

### 1. Pure JavaScript Dependencies
```json
{
  "imagescript": "^1.3.0",      // WASM-bundled image decoding
  "ml-kmeans": "^7.0.0"         // Pure TypeScript K-means
}
```

No `opencv`, no `libvips`, no `node-gyp`. Both libraries bundle their binaries (WASM) inside npm packages.

### 2. Pixel-Level Analysis (5 Steps)

#### Step 1: Image Loading
```typescript
loadImagePixels(buffer) → { width, height, rgba }
```
Uses imagescript's WASM decoder for PNG/JPEG/GIF/TIFF/BMP.

#### Step 2: Dominant Colors (K-means)
```typescript
extractDominantColors(rgba, totalPixels, nColors=5) → ColorCluster[]
```
- Samples every 8th pixel for speed
- Applies K-means++ initialization
- Returns top 5 colors + percentage
- Hex codes for quick reference

#### Step 3: Edge Detection (Sobel)
```typescript
analyzeEdges(rgba, width, height, threshold=80) → EdgeAnalysis
```
- Inline Sobel operator (~40 lines of pure math)
- Grayscale conversion (ITU-R BT.601)
- Gradient magnitude calculation
- 3-tier complexity: simple | moderate | complex
- Density metric: edgePixels / totalPixels

#### Step 4: Luminance Stats
```typescript
computeLuminance(rgba, sampleStep=4) → { mean, stdDev }
```
- Mean brightness: 0–255
- Std dev: contrast proxy
- Sampled for speed

#### Step 5: WCAG 2.1 Contrast
```typescript
checkWCAG(colors) → WCAGResult[]
```
- W3C relative luminance formula (linear RGB)
- Ratio = (L1 + 0.05) / (L2 + 0.05)
- Pass criteria:
  - **AA:** 4.5:1 (normal text), 3:1 (large/UI)
  - **AAA:** 7:1 (normal text), 4.5:1 (large)

### 3. Automated Issue Detection

Issues extracted from metrics before Gemini critique:

| Issue Type | Severity Thresholds |
|-----------|-------------------|
| **Contrast** | Critical: ratio < 3, Major: ratio < 4.5 |
| **Complexity** | Major: edge density > 0.14 (dense structure) |
| **Brightness** | Minor: mean < 50 (dark) or > 220 (bright) |
| **Visual Separation** | Minor: stdDev < 30 (low contrast) |

### 4. Gemini Critique

Sends structured prompt + actual image + computed metrics:

```
Pre-computed metrics:
- Dominant colors: [hex values + percentages]
- Edge complexity: [simple/moderate/complex]
- Brightness: [mean/255] (std dev: [value])
- WCAG contrast: [passing/failing pairs]
- Dimensions: [W×H]px

Audit criteria:
1. Color harmony
2. Visual hierarchy
3. Accessibility
4. Layout complexity
5. Actionable fixes (3 prioritized)
```

## File Structure

```
src/
├── tools/
│   ├── audit_design.ts          [Main tool function - 270 lines]
│   └── index.ts                 [Updated with audit_design export]
├── utils/
│   └── pixelAnalysis.ts         [Pixel analysis utilities - 200 lines]
├── types/
│   ├── DesignAudit.ts           [Type definitions - 60 lines]
│   └── index.ts                 [Updated with DesignAudit export]
├── cli/
│   ├── commands/
│   │   └── audit-design.ts      [CLI command handler - 70 lines]
│   └── index.ts                 [Updated: "audit-design" command]
└── server.ts                    [MCP registration - tool + handler]
```

## Type Definitions

### Input
```typescript
interface AuditDesignArgs {
  imageSource: string;           // URL, base64, or file path
  prompt?: string;               // Optional custom audit context
  options?: AnalysisOptions;     // Temperature, topP, topK, maxTokens
}
```

### Output
```typescript
interface DesignAuditResult {
  metrics: DesignMetrics;        // Pixel analysis results
  critique: string;              // Gemini response
  issues: DesignIssue[];         // Extracted problems
  severity: 'pass' | 'minor' | 'major' | 'critical';
}
```

### Metrics
```typescript
interface DesignMetrics {
  width: number;
  height: number;
  dominantColors: ColorCluster[];  // 5 colors
  edges: EdgeAnalysis;              // Complexity + density
  luminance: LuminanceStats;        // Mean + stdDev
  wcag: WCAGResult[];              // All color pairs
}
```

### Issues
```typescript
interface DesignIssue {
  type: 'contrast' | 'complexity' | 'brightness' | 'spacing' | 'other';
  severity: 'info' | 'minor' | 'major' | 'critical';
  title: string;
  description: string;
  recommendation?: string;
}
```

## Usage

### CLI
```bash
# Basic audit
ai-vision audit-design design.png

# With custom context
ai-vision audit-design design.png --prompt "Check accessibility for WCAG AA"

# JSON output
ai-vision audit-design design.png --json
```

### MCP (via Claude/other clients)
```json
{
  "tool": "audit_design",
  "arguments": {
    "imageSource": "https://example.com/design.png",
    "prompt": "Assess color accessibility",
    "options": {
      "maxTokens": 1500
    }
  }
}
```

## Response Structure

```json
{
  "severity": "major",
  "metrics": {
    "dimensions": "1280×720px",
    "colors": [
      { "hex": "#ffffff", "percentage": 45.3, "rgb": { "r": 255, "g": 255, "b": 255 } }
    ],
    "edges": {
      "complexity": "moderate",
      "density": "0.0742"
    },
    "luminance": {
      "mean": 180,
      "stdDev": 58
    },
    "wcagContrast": {
      "total": 10,
      "passing": 8,
      "failing": 2
    }
  },
  "issues": [
    {
      "type": "contrast",
      "severity": "major",
      "title": "Low contrast: #e8e8e8 ↔ #f5f5f5",
      "description": "Contrast ratio 1.85:1 fails WCAG AA (needs 4.5:1)",
      "recommendation": "Increase luminance difference between colors"
    }
  ],
  "critique": "[Gemini's detailed design audit...]"
}
```

## Performance Characteristics

| Metric | Value |
|--------|-------|
| Image decode | imagescript WASM (~100-500ms) |
| K-means (5 colors, sampled) | ~50-200ms |
| Sobel edge detection | ~100-300ms |
| Luminance stats | ~20-50ms |
| WCAG calculations | ~5-10ms |
| Gemini API call | 3-8s (network) |
| **Total (typical 1280×720)** | **~4-9s** |

## No Native Binaries

✅ **imagescript**: Bundles WASM inside npm package  
✅ **ml-kmeans**: Pure TypeScript (v7.0.0)  
✅ **Sobel operator**: Inline arithmetic (40 lines)  
✅ **WCAG contrast**: Inline math (W3C formula)  
✅ **Luminance**: Inline calculation  

**Zero dependencies on:**
- ❌ OpenCV (C++ bindings)
- ❌ libvips (C library)
- ❌ node-gyp
- ❌ Build tools

## Integration Patterns

Both **CLI and MCP use the same tool function** — no duplication:

```
CLI Command          MCP Handler
    ↓                    ↓
  parseArgs          validateSchema
    ↓                    ↓
  getServices        getServices
    ↓                    ↓
audit_design(args, config, provider, fileService)
    ↓                    ↓
formatOutput        JSON response
```

## Differences from Original Medium Article

| Aspect | Medium Article | Our Implementation |
|--------|---|---|
| Color extraction | K-means | ✅ K-means |
| Edge detection | OpenCV Canny | ✅ Sobel inline |
| Shape detection | OpenCV contours | Skipped (Gemini sees it) |
| SVM classifier | sklearn.SVC | Skipped (0% accuracy in article) |
| LLM critique | Qwen-2 (local GPU) | ✅ Gemini API (no GPU needed) |
| WCAG checks | Manual | ✅ W3C formula |
| Native binaries | Yes (OpenCV) | ✅ None |
| Language | Python | ✅ TypeScript |

## Configuration

Uses existing env vars from ConfigService:

```
TEMPERATURE_FOR_ANALYZE_IMAGE    (or TEMPERATURE_FOR_IMAGE or TEMPERATURE)
TOP_P_FOR_ANALYZE_IMAGE          (or TOP_P_FOR_IMAGE or TOP_P)
TOP_K_FOR_ANALYZE_IMAGE          (or TOP_K_FOR_IMAGE or TOP_K)
MAX_TOKENS_FOR_ANALYZE_IMAGE     (or MAX_TOKENS_FOR_IMAGE or MAX_TOKENS)
IMAGE_PROVIDER                   (gemini or vertexai)
```

## Testing Recommendations

### Unit Tests
```typescript
// pixelAnalysis.test.ts
- extractDominantColors(): returns exactly 5 clusters
- analyzeEdges(): density in range [0, 1]
- computeLuminance(): mean in [0, 255]
- checkWCAG(): ratios > 1.0, sorted ascending
- contrastRatio(): W3C formula validation
```

### E2E Tests
```typescript
// audit-design.e2e.test.ts
- CLI: audit-design [file] → JSON output
- MCP: audit_design tool → structured response
- Error cases: missing imageSource, invalid file
```

## Next Steps (Optional)

1. **Add tests** for pixel analysis (80%+ coverage)
2. **Visualize** design issues with annotated bounding boxes
3. **Store** audit history (trends over time)
4. **Batch audit** multiple designs in one call
5. **Configurable rules** (WCAG AA vs AAA, thresholds)
6. **Component drift detection** (compare variants of same design)
