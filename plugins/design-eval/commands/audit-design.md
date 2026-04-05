---
description: Full design audit across heuristics, accessibility, visual consistency, and design system
allowed-tools: Bash, Glob, Read
argument-hint: "--url <url> [--depth quick|standard|deep]"
---

# /design-eval:audit-design

Conduct a comprehensive design audit analyzing usability heuristics, accessibility compliance, visual consistency, and design system adherence.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--url` | URL or file path to design artifact (required) | `--url https://example.com` |
| `--depth` | Audit depth: quick (overview), standard (detailed), deep (comprehensive) | `--depth deep` |

## Examples

```bash
# Quick overview of design audit
/design-eval:audit-design --url https://example.com --depth quick

# Standard audit with detailed analysis
/design-eval:audit-design --url https://example.com --depth standard

# Deep comprehensive audit
/design-eval:audit-design --url https://example.com --depth deep
```

## Backend Execution

### Prerequisites
- ai-vision CLI installed: `npm install -g ai-vision-mcp`
- API credentials configured via environment variables (see README.md)

### Execution Steps

```bash
# Translate domain parameters to ai-vision CLI call
# --depth parameter determines prompt scope

# Quick depth: basic heuristics check
ai-vision audit-design "$SOURCE" \
  --prompt "Conduct a quick design audit focusing on Nielsen's 10 usability heuristics. Identify critical issues only." \
  --max-tokens 1000 \
  --json

# Standard depth: comprehensive audit (default)
ai-vision audit-design "$SOURCE" \
  --prompt "Conduct a comprehensive design audit analyzing: 1) Nielsen's 10 usability heuristics, 2) WCAG 2.1 accessibility compliance, 3) Visual consistency and design tokens, 4) Component reusability and patterns. Provide findings organized by category with severity levels." \
  --max-tokens 2000 \
  --json

# Deep depth: exhaustive analysis
ai-vision audit-design "$SOURCE" \
  --prompt "Conduct an exhaustive design audit analyzing: 1) Nielsen's 10 usability heuristics with detailed explanations, 2) WCAG 2.1 Level AA accessibility compliance with specific violations, 3) Visual consistency including color contrast ratios and typography, 4) Component reusability with duplication analysis, 5) Design system maturity assessment. Provide comprehensive findings with remediation guidance." \
  --max-tokens 3000 \
  --json
```

### Processing

1. Parse arguments: `--url` and `--depth` (default: standard)
2. Construct appropriate prompt based on depth parameter
3. Call ai-vision audit-design with translated prompt
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
