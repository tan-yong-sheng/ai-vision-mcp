---
description: Design system token validation and visual consistency check
allowed-tools: Bash, Glob, Read
argument-hint: "--imageSource <source> [--design-system <path>]"
---

# /design-eval:visual-consistency

Validate design system token compliance and check visual consistency across components.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | Image source: remote URL, local file, data URI, or GCS URI (required) | `--imageSource https://example.com/design.jpg` |
| `--design-system` | Path to design system definition (JSON or YAML) | `--design-system ./design-system.json` |

## Examples

```bash
# Check visual consistency with design system (remote image)
/design-eval:visual-consistency --imageSource https://example.com/design.jpg --design-system ./design-system.json

# Check visual consistency without explicit design system (local file)
/design-eval:visual-consistency --imageSource ./screenshots/design.png

# Check with data URI
/design-eval:visual-consistency --imageSource data:image/png;base64,...
```

## Backend Execution

### Prerequisites
- ai-vision CLI installed: `npm install -g ai-vision-mcp`
- API credentials configured via environment variables (see README.md)

### Parameter Translation

The `--imageSource` parameter from the design-eval command is translated directly to the positional argument for ai-vision CLI:
- User invokes: `/design-eval:visual-consistency --imageSource https://example.com/design.jpg`
- Plugin translates to: `ai-vision audit-design https://example.com/design.jpg --prompt "..."`

Supports all input formats:
- **URLs**: `https://example.com/image.jpg`
- **Local files**: `./path/to/image.jpg`
- **Data URIs**: `data:image/jpeg;base64,...`
- **GCS URIs**: `gs://bucket/path/to/image.jpg` (Vertex AI only)

### Execution Steps

```bash
# Translate domain parameters to ai-vision CLI call
# --design-system parameter determines validation scope

# Without design system definition (infer tokens from usage)
ai-vision audit-design "$IMAGESOURCE" \
  --prompt "Analyze visual consistency and design tokens. Extract and catalog: color palette (primary, secondary, neutral, semantic colors), typography (font families, sizes, weights, line heights), spacing (margin, padding, gap values), shape (border radius, shadows, strokes), motion (transition durations, easing). Identify inconsistencies and deviations from inferred patterns." \
  --max-tokens 2000 \
  --json

# With design system definition (validate against tokens)
ai-vision audit-design "$IMAGESOURCE" \
  --prompt "Validate visual consistency against design system tokens. Compare actual usage to expected values for: color palette tokens, typography tokens, spacing tokens, shape tokens, motion tokens. For each violation, provide: token name, expected value, actual value, affected elements, remediation guidance. Calculate overall consistency score." \
  --max-tokens 2500 \
  --json
```

### Processing

1. Parse arguments: `--imageSource` and `--design-system` (optional)
2. Construct appropriate prompt based on whether design system is provided
3. Call ai-vision audit-design with image source
4. ai-vision analyzes visual properties and design tokens
5. Claude reasoning layer:
   - Maps violations to specific design tokens
   - Calculates consistency score
   - Provides CSS remediation guidance
6. Return structured JSON report with token violations and consistency metrics

## Output Format

```json
{
  "audit_type": "visual_consistency",
  "url": "https://example.com",
  "design_system_provided": true,
  "design_system_path": "./design-system.json",
  "timestamp": "2026-04-06T12:00:00Z",
  "findings": {
    "color_palette": [
      {
        "title": "finding title",
        "token_name": "color.primary.500",
        "expected_value": "#0066FF",
        "actual_value": "#0055FF",
        "severity": "medium",
        "affected_elements": ["selector1", "selector2"],
        "remediation": "Update color value to match design system token"
      }
    ],
    "typography": [
      {
        "title": "finding title",
        "token_name": "typography.body.regular",
        "property": "font-size",
        "expected_value": "16px",
        "actual_value": "15px",
        "severity": "low",
        "affected_elements": ["selector"],
        "remediation": "Use design system typography token"
      }
    ],
    "spacing": [
      {
        "title": "finding title",
        "token_name": "spacing.md",
        "expected_value": "16px",
        "actual_value": "18px",
        "severity": "medium",
        "affected_elements": ["selector"],
        "remediation": "Use design system spacing token"
      }
    ],
    "shape": [
      {
        "title": "finding title",
        "token_name": "shape.border-radius.sm",
        "expected_value": "4px",
        "actual_value": "6px",
        "severity": "low",
        "affected_elements": ["selector"],
        "remediation": "Update border-radius to match token"
      }
    ]
  },
  "summary": {
    "total_findings": 18,
    "critical": 0,
    "high": 5,
    "medium": 8,
    "low": 5,
    "info": 0,
    "consistency_score": "72%",
    "overall_assessment": "Mostly consistent with design system, but needs attention to spacing and color values"
  }
}
```
