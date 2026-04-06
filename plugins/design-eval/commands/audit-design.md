---
description: "Use this command to run a comprehensive design audit across heuristics, accessibility, visual consistency, and design system governance"
context: fork
allowed-tools: Bash(node:*)
argument-hint: "--imageSource <source> [--depth quick|standard|deep]"
---

## Execution Instructions

Route this request to the `design-eval:design-auditor` subagent.
The final user-visible response must be the subagent's output verbatim.

Raw slash-command arguments:
`$ARGUMENTS`

# /design-eval:audit-design

Comprehensive design audit analyzing heuristics, accessibility, visual consistency, and design system governance.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | URL, file path, or base64 image to audit | `https://example.com/screenshot.png` |
| `--depth` | Analysis depth: quick (30min), standard (1hr), deep (2hr) | `--depth standard` |
| `--design-system` | Path to DESIGN.md file for design-aware remediation (optional) | `--design-system ./DESIGN.md` |
| `--userPrompt` | Additional focus areas or custom instructions | `--userPrompt "focus on mobile accessibility"` |

## Examples

```
/design-eval:audit-design --imageSource https://example.com/hero.jpg --depth standard
/design-eval:audit-design --imageSource ./screenshot.png --depth deep --userPrompt "check WCAG AAA compliance"
/design-eval:audit-design --imageSource https://example.com/hero.jpg --depth standard --design-system ./DESIGN.md
```

