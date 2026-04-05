---
description: Component reusability and pattern analysis
allowed-tools: Bash, Glob, Read
argument-hint: "--imageSource <source> [--scope src/components]"
---

# /design-eval:component-audit

Analyze component reusability, pattern consistency, and design debt across your component library.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | Image source: remote URL, local file, data URI, or GCS URI (required) | `--imageSource https://example.com/design.jpg` |
| `--scope` | Directory scope for component analysis (optional) | `--scope src/components` |

## Examples

```bash
# Analyze components in default scope (remote image)
/design-eval:component-audit --imageSource https://example.com/components.jpg

# Analyze components in specific directory (local file)
/design-eval:component-audit --imageSource ./screenshots/components.png --scope src/components

# Analyze components in nested scope
/design-eval:component-audit --imageSource ./screenshots/all-components.png --scope src/features/*/components
```

## Backend Execution

### Prerequisites
- ai-vision CLI installed: `npm install -g ai-vision-mcp`
- API credentials configured via environment variables (see README.md)

### Parameter Translation

The `--imageSource` parameter from the design-eval command is translated directly to the positional argument for ai-vision CLI:
- User invokes: `/design-eval:component-audit --imageSource https://example.com/components.jpg`
- Plugin translates to: `ai-vision analyze-image https://example.com/components.jpg --prompt "..."`

Supports all input formats:
- **URLs**: `https://example.com/image.jpg`
- **Local files**: `./path/to/image.jpg`
- **Data URIs**: `data:image/jpeg;base64,...`
- **GCS URIs**: `gs://bucket/path/to/image.jpg` (Vertex AI only)

### Execution Steps

```bash
# Translate domain parameters to ai-vision CLI call
# Component analysis prompt focuses on reusability and patterns

ai-vision analyze-image "$IMAGESOURCE" \
  --prompt "Analyze component reusability and patterns. Identify: 1) Duplicate or near-identical components, 2) Component nesting and composition patterns, 3) Prop/API consistency across similar components, 4) Naming conventions and clarity, 5) Component documentation completeness. For each finding provide: component names/selectors, issue description, reusability impact, consolidation opportunity. Calculate reusability metrics." \
  --max-tokens 2500 \
  --json
```

### Processing

1. Parse arguments: `--imageSource` and `--scope` (optional)
2. Construct prompt for component analysis
3. Call ai-vision analyze-image with image source
4. ai-vision analyzes component structure and patterns
5. Claude reasoning layer:
   - Assesses reusability metrics
   - Identifies consolidation opportunities
   - Provides refactoring recommendations
   - Prioritizes by impact
6. Return structured JSON report with reusability analysis

## Output Format

```json
{
  "audit_type": "component_audit",
  "url": "https://example.com",
  "scope": "src/components",
  "timestamp": "2026-04-06T12:00:00Z",
  "findings": {
    "duplication": [
      {
        "title": "Duplicate button components",
        "severity": "high",
        "components": ["Button.tsx", "PrimaryButton.tsx"],
        "description": "Two nearly identical button components with different names",
        "remediation": "Consolidate into single Button component with variant prop"
      }
    ],
    "composition": [
      {
        "title": "Deep component nesting",
        "severity": "medium",
        "component": "Form.tsx",
        "nesting_depth": 8,
        "description": "Component has excessive nesting depth",
        "remediation": "Extract nested components into separate files"
      }
    ],
    "api_consistency": [
      {
        "title": "Inconsistent prop naming",
        "severity": "medium",
        "components": ["Card.tsx", "Panel.tsx"],
        "description": "Similar components use different prop names (title vs heading)",
        "remediation": "Standardize prop names across similar components"
      }
    ],
    "naming": [
      {
        "title": "Unclear component naming",
        "severity": "low",
        "component": "Wrapper.tsx",
        "description": "Generic name doesn't convey component purpose",
        "remediation": "Rename to more descriptive name (e.g., LayoutWrapper)"
      }
    ]
  },
  "metrics": {
    "total_components": 42,
    "reusable_components": 28,
    "single_use_components": 14,
    "reusability_score": "67%",
    "duplication_ratio": "12%"
  },
  "summary": {
    "total_findings": 8,
    "critical": 0,
    "high": 2,
    "medium": 4,
    "low": 2,
    "overall_assessment": "Good component structure with opportunities for consolidation"
  }
}
```
