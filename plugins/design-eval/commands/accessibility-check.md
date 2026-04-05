---
description: Deep WCAG 2.1/3.0 compliance review with remediation guidance
allowed-tools: Bash, Glob, Read
argument-hint: "--url <url> [--level A|AA|AAA] [--wcag-version 2.1|3.0]"
---

# /design-eval:accessibility-check

Conduct a deep accessibility compliance review against WCAG standards with detailed remediation guidance.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--url` | URL or file path to design artifact (required) | `--url https://example.com` |
| `--level` | WCAG compliance level: A (basic), AA (standard), AAA (enhanced) | `--level AA` |
| `--wcag-version` | WCAG version: 2.1 (compliance-focused), 3.0 (outcome-focused) | `--wcag-version 3.0` |

## Examples

```bash
# Check WCAG 2.1 AA compliance (standard)
/design-eval:accessibility-check --url https://example.com --level AA --wcag-version 2.1

# Check WCAG 3.0 AA compliance (outcome-focused)
/design-eval:accessibility-check --url https://example.com --level AA --wcag-version 3.0

# Deep AAA compliance check
/design-eval:accessibility-check --url https://example.com --level AAA --wcag-version 3.0
```

## Backend Execution

### Prerequisites
- ai-vision CLI installed: `npm install -g ai-vision-mcp`
- API credentials configured via environment variables (see README.md)

### Parameter Translation

The `--url` parameter from the design-eval command is translated to `$SOURCE` (positional argument) for ai-vision CLI:
- User invokes: `/design-eval:accessibility-check --url https://example.com --level AA`
- Plugin translates to: `ai-vision audit-design https://example.com --prompt "..."`

### Execution Steps

```bash
# Translate domain parameters to ai-vision CLI call
# --level and --wcag-version parameters determine prompt scope

# WCAG 2.1 Level A
ai-vision audit-design "$SOURCE" \
  --prompt "Conduct accessibility audit against WCAG 2.1 Level A standards. Check: color contrast ratios, keyboard navigation, semantic HTML structure, ARIA patterns, form accessibility, text alternatives. Provide specific violations and remediation guidance." \
  --max-tokens 2000 \
  --json

# WCAG 2.1 Level AA (standard)
ai-vision audit-design "$SOURCE" \
  --prompt "Conduct accessibility audit against WCAG 2.1 Level AA standards. Check: WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text), keyboard navigation with tab order and focus management, semantic HTML with proper heading hierarchy, ARIA patterns and landmarks, form field associations and error messages, prefers-reduced-motion compliance. Provide specific criterion violations and detailed remediation code examples." \
  --max-tokens 2500 \
  --json

# WCAG 3.0 Level AA (outcome-focused)
ai-vision audit-design "$SOURCE" \
  --prompt "Conduct accessibility audit against WCAG 3.0 Level AA outcome-focused standards. For each issue, explain: 1) Which user outcome is affected, 2) How users with disabilities are impacted, 3) Remediation to restore outcome, 4) How to verify outcome is achieved. Focus on outcomes, not compliance checkboxes. Cover: perceivable content, operable interfaces, understandable information, robust implementation." \
  --max-tokens 2500 \
  --json

# WCAG 3.0 Level AAA (enhanced)
ai-vision audit-design "$SOURCE" \
  --prompt "Conduct comprehensive accessibility audit against WCAG 3.0 Level AAA outcome-focused standards. Assess all accessibility dimensions with outcome focus: perceivable (visual, auditory, tactile), operable (keyboard, voice control, switch access), understandable (readability, navigability, predictability), robust (assistive technology compatibility). Provide specific outcome violations and interaction design remediation guidance." \
  --max-tokens 3000 \
  --json
```

### Processing

1. Parse arguments: `--url`, `--level` (default: AA), `--wcag-version` (default: 2.1)
2. Construct appropriate prompt based on level and version parameters
3. Call ai-vision audit-design with translated prompt
4. ai-vision analyzes accessibility dimensions
5. Claude reasoning layer:
   - Maps findings to specific WCAG criteria
   - Explains user impact for each violation
   - Provides detailed remediation code examples
   - Suggests testing steps for verification
6. Return structured JSON report with findings and remediation guidance

## Output Format

```json
{
  "audit_type": "accessibility_check",
  "wcag_version": "3.0",
  "compliance_level": "AA",
  "url": "https://example.com",
  "timestamp": "2026-04-06T12:00:00Z",
  "findings": [
    {
      "title": "finding title",
      "wcag_criterion": "WCAG 2.1 1.4.3 Contrast (Minimum)",
      "wcag_3_outcome": "Outcome name if WCAG 3.0",
      "severity": "critical|high|medium|low|info",
      "description": "detailed description of the issue",
      "affected_elements": ["selector1", "selector2"],
      "remediation": {
        "description": "how to fix this issue",
        "code_example": "HTML/CSS/JavaScript code example",
        "testing_steps": ["step 1", "step 2"]
      }
    }
  ],
  "summary": {
    "total_findings": 12,
    "critical": 2,
    "high": 4,
    "medium": 5,
    "low": 1,
    "info": 0,
    "compliance_status": "non-compliant|partial|compliant",
    "estimated_remediation_time": "2-3 hours"
  }
}
```
