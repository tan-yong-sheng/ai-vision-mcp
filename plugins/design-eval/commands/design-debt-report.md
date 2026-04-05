---
description: Custom vs system component ratio analysis and design debt calculation
allowed-tools: Bash, Glob, Read
argument-hint: "--imageSource <source> [--threshold <percent>]"
---

# /design-eval:design-debt-report

Analyze custom component usage, design system adoption, and calculate design debt metrics.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | Image source: remote URL, local file, data URI, or GCS URI (required) | `--imageSource https://example.com/design.jpg` |
| `--threshold` | Design debt threshold percentage (triggers warning) | `--threshold 30` |

## Examples

```bash
# Generate design debt report with default threshold (remote image)
/design-eval:design-debt-report --imageSource https://example.com/design.jpg

# Generate report with custom 40% threshold (local file)
/design-eval:design-debt-report --imageSource ./screenshots/design.png --threshold 40

# Generate report with data URI
/design-eval:design-debt-report --imageSource data:image/png;base64,...
```

## Backend Execution

### Prerequisites
- ai-vision CLI installed: `npm install -g ai-vision-mcp`
- API credentials configured via environment variables (see README.md)

### Parameter Translation

The `--imageSource` parameter from the design-eval command is translated directly to the positional argument for ai-vision CLI:
- User invokes: `/design-eval:design-debt-report --imageSource https://example.com/design.jpg`
- Plugin translates to: `ai-vision analyze-image https://example.com/design.jpg --prompt "..."`

Supports all input formats:
- **URLs**: `https://example.com/image.jpg`
- **Local files**: `./path/to/image.jpg`
- **Data URIs**: `data:image/jpeg;base64,...`
- **GCS URIs**: `gs://bucket/path/to/image.jpg` (Vertex AI only)

### Execution Steps

```bash
# Translate domain parameters to ai-vision CLI call
# Design debt analysis focuses on custom vs system component ratio

ai-vision analyze-image "$IMAGESOURCE" \
  --prompt "Analyze design system adoption and design debt. Identify: 1) Custom vs system component ratio, 2) Component adoption metrics, 3) Design system maturity level (1-4), 4) Debt drivers and root causes, 5) Governance health assessment. For each custom component, explain why it was created instead of using system components. Calculate design debt score and provide strategic recommendations for improvement." \
  --max-tokens 2500 \
  --json
```

### Processing

1. Parse arguments: `--url` and `--threshold` (default: 30%)
2. Construct prompt for design debt analysis
3. Call ai-vision analyze-image with translated prompt
4. ai-vision analyzes component adoption and debt
5. Claude reasoning layer:
   - Calculates design debt score
   - Identifies debt drivers
   - Assesses governance health
   - Analyzes trends and growth rates
   - Provides strategic recommendations
6. Return structured JSON report with debt metrics and improvement roadmap

## Output Format

```json
{
  "audit_type": "design_debt_report",
  "url": "https://example.com",
  "threshold": 30,
  "timestamp": "2026-04-06T12:00:00Z",
  "adoption_metrics": {
    "total_components": 87,
    "system_components": 52,
    "custom_components": 35,
    "adoption_ratio": "60%",
    "custom_ratio": "40%",
    "debt_status": "warning"
  },
  "design_system_maturity": {
    "level": 2,
    "description": "Inconsistent adoption - some teams use system, others build custom",
    "characteristics": [
      "Design tokens defined but not enforced",
      "Component library exists but adoption is spotty",
      "Documentation is incomplete",
      "Governance process is informal"
    ]
  },
  "debt_drivers": [
    {
      "component": "Modal",
      "type": "duplication",
      "custom_variants": 5,
      "system_variants": 2,
      "description": "Teams created custom modals instead of using system component",
      "debt_impact": "high",
      "remediation": "Audit custom variants, consolidate into system component"
    },
    {
      "component": "Button",
      "type": "inconsistency",
      "custom_variants": 3,
      "system_variants": 8,
      "description": "Custom button styles don't follow design system",
      "debt_impact": "medium",
      "remediation": "Migrate custom buttons to system variants"
    }
  ],
  "governance_health": {
    "component_request_process": "informal",
    "design_review_required": false,
    "enforcement_level": "weak",
    "recommendations": [
      "Establish formal component request process",
      "Require design review for new components",
      "Enforce design system token usage in CI"
    ]
  },
  "trend_analysis": {
    "custom_components_created_last_quarter": 8,
    "custom_components_created_this_quarter": 12,
    "trend": "increasing",
    "concern": "Growing custom component count suggests adoption issues"
  },
  "summary": {
    "debt_score": "40/100",
    "recommendation": "Medium priority - address adoption barriers and consolidate custom components",
    "estimated_remediation_effort": "3-4 weeks",
    "next_steps": [
      "Conduct team interviews to understand adoption barriers",
      "Create migration plan for high-impact custom components",
      "Establish governance process for component requests"
    ]
  }
}
```
