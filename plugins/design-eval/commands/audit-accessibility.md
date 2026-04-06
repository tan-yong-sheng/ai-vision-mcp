---
description: "Use this command to verify WCAG 2.1/3.0 compliance with detailed remediation guidance and assistive technology assessment"
context: fork
allowed-tools: Bash(node:*)
argument-hint: "--imageSource <source> [--mode quick|deep] [--level A|AA|AAA] [--wcag-version 2.1|3.0]"
---

# /design-eval:audit-accessibility

Deep accessibility compliance review with WCAG 2.1 or WCAG 3.0 assessment. Supports two modes: automated axe-core scanning or combined axe-core + AI analysis.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | URL, file path, or base64 image to evaluate | `https://example.com/form.jpg` |
| `--mode` | Scan mode: `quick` (axe-core only) or `deep` (axe-core + AI analysis, default) | `--mode quick` |
| `--level` | WCAG compliance level: A (minimum), AA (standard), AAA (enhanced) | `--level AA` |
| `--wcag-version` | WCAG standard: 2.1 (compliance-focused) or 3.0 (outcome-focused) | `--wcag-version 3.0` |
| `--email` | Email for login (optional, if page requires authentication) | `--email user@example.com` |
| `--password` | Password for login (optional, if page requires authentication) | `--password MyPassword123` |
| `--design-system` | Path to DESIGN.md file for design-aware remediation (optional) | `--design-system ./DESIGN.md` |
| `--userPrompt` | Additional focus areas or custom instructions | `--userPrompt "check keyboard navigation for power users"` |

## Mode Options

**`--mode quick`** — Fast automated scanning
- Runs axe-core only (no API calls)
- Immediate results
- Catches low-hanging fruit (contrast, labels, semantic HTML)
- Output: Markdown report + JSON findings
- Best for: Quick feedback, CI/CD pipelines, catching obvious issues

**`--mode deep`** (default) — Comprehensive analysis
- Runs axe-core first (automated findings)
- Sends findings + screenshots to AI for deeper analysis
- AI provides context, remediation code, design patterns
- Output: Combined report (automated + AI insights)
- Best for: Full audits, design-aware fixes, actionable guidance

## Examples

```
# Quick axe-core scan only (no AI)
/design-eval:audit-accessibility --imageSource https://example.com --mode quick

# Deep analysis (axe-core + AI, default)
/design-eval:audit-accessibility --imageSource https://example.com --mode deep --level AA

# With authentication
/design-eval:audit-accessibility --imageSource https://example.com/dashboard --mode deep --email user@example.com --password &Test1234

# WCAG 3.0 with design system reference
/design-eval:audit-accessibility --imageSource ./form.png --wcag-version 3.0 --design-system ./DESIGN.md

# Quick scan with custom focus
/design-eval:audit-accessibility --imageSource https://example.com --mode quick --userPrompt "check keyboard navigation and skip links"
```


## Execution Instructions

Route this request to the `design-eval:accessibility-tester` subagent.
The final user-visible response must be the subagent's output verbatim.

Raw slash-command arguments:
`$ARGUMENTS`
