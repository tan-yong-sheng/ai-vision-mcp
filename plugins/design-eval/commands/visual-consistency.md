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
| `--userPrompt` | Optional user context to focus audit on specific concerns | `--userPrompt "Check spacing consistency"` |
| `--temperature` | AI response temperature (0.0–2.0, default: 0.0 for deterministic) | `--temperature 0.1` |
| `--top-p` | Top-p sampling (0.0–1.0) | `--top-p 0.9` |
| `--top-k` | Top-k sampling (1–100) | `--top-k 40` |
| `--max-tokens` | Maximum output tokens (default: 2000) | `--max-tokens 2500` |

## Examples

```bash
# Check visual consistency (infer tokens from usage)
/design-eval:visual-consistency --imageSource https://example.com/design.jpg

# With design system definition
/design-eval:visual-consistency --imageSource ./screenshots/design.png --design-system ./design-system.json

# With user focus
/design-eval:visual-consistency --imageSource https://example.com/design.jpg --userPrompt "Verify color palette consistency"

# With parameter tuning
/design-eval:visual-consistency --imageSource ./design.jpg --temperature 0.1 --max-tokens 2500
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
# --userPrompt is wrapped inside the prompt
# --temperature, --top-p, --top-k, --max-tokens control AI behavior

# Without design system definition (infer tokens from usage)
ai-vision audit-design "$IMAGESOURCE" \
  --prompt "Analyze visual consistency and design tokens. Extract and catalog: color palette (primary, secondary, neutral, semantic colors), typography (font families, sizes, weights, line heights), spacing (margin, padding, gap values), shape (border radius, shadows, strokes), motion (transition durations, easing). Identify inconsistencies and deviations from inferred patterns.
  
ADDITIONAL FOCUS: $USERPROMPT" \
  --temperature "$TEMPERATURE" \
  --top-p "$TOP_P" \
  --top-k "$TOP_K" \
  --max-tokens "$MAX_TOKENS" \
  --json

# With design system definition (validate against tokens)
ai-vision audit-design "$IMAGESOURCE" \
  --prompt "Validate visual consistency against design system tokens. Compare actual usage to expected values for: color palette tokens, typography tokens, spacing tokens, shape tokens, motion tokens. For each violation, provide: token name, expected value, actual value, affected elements, remediation guidance. Calculate overall consistency score.
  
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
- `--max-tokens`: 2000
- `--userPrompt`: (empty, no additional focus)

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
