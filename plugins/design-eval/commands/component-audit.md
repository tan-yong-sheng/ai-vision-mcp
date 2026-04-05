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
| `--userPrompt` | Optional user context to focus audit on specific concerns | `--userPrompt "Identify high-impact duplicates"` |
| `--temperature` | AI response temperature (0.0–2.0, default: 0.0 for deterministic) | `--temperature 0.1` |
| `--top-p` | Top-p sampling (0.0–1.0) | `--top-p 0.9` |
| `--top-k` | Top-k sampling (1–100) | `--top-k 40` |
| `--max-tokens` | Maximum output tokens (default: 2500) | `--max-tokens 3000` |

## Examples

```bash
# Analyze all components
/design-eval:component-audit --imageSource https://example.com/components.jpg

# Analyze specific directory with user focus
/design-eval:component-audit --imageSource ./screenshots/components.png --scope src/components --userPrompt "Find button component variations"

# With parameter tuning
/design-eval:component-audit --imageSource https://example.com/components.jpg --temperature 0.1 --max-tokens 3000
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
# --userPrompt is wrapped inside the prompt
# --temperature, --top-p, --top-k, --max-tokens control AI behavior

ai-vision analyze-image "$IMAGESOURCE" \
  --prompt "Analyze component reusability and patterns. Identify: 1) Duplicate or near-identical components, 2) Component nesting and composition patterns, 3) Prop/API consistency across similar components, 4) Naming conventions and clarity, 5) Component documentation completeness. For each finding provide: component names/selectors, issue description, reusability impact, consolidation opportunity. Calculate reusability metrics.
  
ADDITIONAL FOCUS: $USERPROMPT" \
  --temperature "$TEMPERATURE" \
  --top-p "$TOP_P" \
  --top-k "$TOP_K" \
  --max-tokens "$MAX_TOKENS" \
  --json
```

### Parameter Defaults

If not provided by user:
- `--temperature`: 0.0 (deterministic, consistent findings)
- `--top-p`: 0.95
- `--top-k`: 30
- `--max-tokens`: 2500
- `--userPrompt`: (empty, no additional focus)

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
