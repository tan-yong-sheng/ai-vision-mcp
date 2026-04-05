---
description: Full design audit across heuristics, accessibility, visual consistency, and design system
allowed-tools: Bash, Glob, Read
argument-hint: "--imageSource <source> [--depth quick|standard|deep]"
---

# /design-eval:audit-design

Conduct a comprehensive design audit analyzing usability heuristics, accessibility compliance, visual consistency, and design system adherence.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | Image source: remote URL, local file, data URI, or GCS URI (required) | `--imageSource https://example.com/design.jpg` |
| `--depth` | Audit depth: quick (overview), standard (detailed), deep (comprehensive) | `--depth deep` |
| `--userPrompt` | Optional user context to focus audit on specific concerns | `--userPrompt "Focus on mobile responsiveness"` |
| `--temperature` | AI response temperature (0.0–2.0, default: 0.0 for deterministic) | `--temperature 0.1` |
| `--top-p` | Top-p sampling (0.0–1.0) | `--top-p 0.9` |
| `--top-k` | Top-k sampling (1–100) | `--top-k 40` |
| `--max-tokens` | Maximum output tokens (default: 2000) | `--max-tokens 3000` |

## Examples

```bash
# Standard audit
/design-eval:audit-design --imageSource https://example.com/design.jpg

# Deep audit with user focus
/design-eval:audit-design --imageSource ./screenshots/design.png --depth deep --userPrompt "Prioritize accessibility issues"

# With parameter tuning
/design-eval:audit-design --imageSource https://example.com/design.jpg --temperature 0.1 --max-tokens 2500

# All options
/design-eval:audit-design --imageSource ./design.jpg --depth standard --userPrompt "Mobile-first design" --temperature 0.2 --max-tokens 2000
```

## Backend Execution

### Prerequisites
- ai-vision CLI installed: `npm install -g ai-vision-mcp`
- API credentials configured via environment variables (see README.md)

### Parameter Translation

The `--imageSource` parameter from the design-eval command is translated directly to the positional argument for ai-vision CLI:
- User invokes: `/design-eval:audit-design --imageSource https://example.com/design.jpg`
- Plugin translates to: `ai-vision audit-design https://example.com/design.jpg`

Supports all input formats:
- **URLs**: `https://example.com/image.jpg`
- **Local files**: `./path/to/image.jpg` or `./screenshots/design.png`
- **Data URIs**: `data:image/jpeg;base64,...`
- **GCS URIs**: `gs://bucket/path/to/image.jpg` (Vertex AI only)

### Execution Steps

```bash
# Translate domain parameters to ai-vision CLI call
# --depth parameter determines prompt scope
# --userPrompt is wrapped inside the depth-based prompt
# --temperature, --top-p, --top-k, --max-tokens control AI behavior

# Quick depth: basic heuristics check
ai-vision audit-design "$IMAGESOURCE" \
  --prompt "Conduct a quick design audit focusing on Nielsen's 10 usability heuristics. Identify critical issues only.
  
ADDITIONAL FOCUS: $USERPROMPT" \
  --temperature "$TEMPERATURE" \
  --top-p "$TOP_P" \
  --top-k "$TOP_K" \
  --max-tokens "$MAX_TOKENS" \
  --json

# Standard depth: comprehensive audit (default)
ai-vision audit-design "$IMAGESOURCE" \
  --prompt "Conduct a comprehensive design audit analyzing: 1) Nielsen's 10 usability heuristics, 2) WCAG 2.1 accessibility compliance, 3) Visual consistency and design tokens, 4) Component reusability and patterns. Provide findings organized by category with severity levels.
  
ADDITIONAL FOCUS: $USERPROMPT" \
  --temperature "$TEMPERATURE" \
  --top-p "$TOP_P" \
  --top-k "$TOP_K" \
  --max-tokens "$MAX_TOKENS" \
  --json

# Deep depth: exhaustive analysis
ai-vision audit-design "$IMAGESOURCE" \
  --prompt "Conduct an exhaustive design audit analyzing: 1) Nielsen's 10 usability heuristics with detailed explanations, 2) WCAG 2.1 Level AA accessibility compliance with specific violations, 3) Visual consistency including color contrast ratios and typography, 4) Component reusability with duplication analysis, 5) Design system maturity assessment. Provide comprehensive findings with remediation guidance.
  
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
- `--max-tokens`: 2000 (quick), 2000 (standard), 3000 (deep)
- `--userPrompt`: (empty, no additional focus)

### Processing

1. Parse arguments: `--imageSource` and `--depth` (default: standard)
2. Construct appropriate prompt based on depth parameter
3. Call ai-vision audit-design with image source
4. ai-vision analyzes design and returns findings
5. Claude reasoning layer:
   - Synthesizes findings across dimensions
   - Prioritizes by severity and impact
   - Provides actionable recommendations
6. Return structured JSON report with findings and remediation roadmap

## Output Format

```json
{
  "audit_type": "full_design_audit",
  "depth": "standard",
  "url": "https://example.com",
  "timestamp": "2026-04-06T12:00:00Z",
  "findings": {
    "heuristics": [
      {
        "title": "finding title",
        "heuristic": "Nielsen heuristic number",
        "severity": "critical|high|medium|low|info",
        "description": "detailed description",
        "remediation": "actionable guidance with code examples"
      }
    ],
    "accessibility": [
      {
        "title": "finding title",
        "wcag_criterion": "WCAG criterion ID",
        "severity": "critical|high|medium|low|info",
        "description": "detailed description",
        "remediation": "actionable guidance"
      }
    ],
    "visual_consistency": [
      {
        "title": "finding title",
        "token_type": "color|typography|spacing|shape",
        "severity": "critical|high|medium|low|info",
        "description": "detailed description",
        "remediation": "actionable guidance"
      }
    ],
    "component_analysis": [
      {
        "title": "finding title",
        "component": "component name",
        "severity": "critical|high|medium|low|info",
        "description": "detailed description",
        "remediation": "actionable guidance"
      }
    ]
  },
  "summary": {
    "total_findings": 24,
    "critical": 3,
    "high": 8,
    "medium": 10,
    "low": 3,
    "info": 0,
    "overall_assessment": "text summary of audit results"
  }
}
```
