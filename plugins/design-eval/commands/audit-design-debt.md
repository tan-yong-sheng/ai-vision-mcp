---
description: "Use this command to calculate design debt ratio and assess design system maturity level"
context: fork
allowed-tools: Bash(node:*)
argument-hint: "--imageSource <source> [--threshold <percent>] [--design-system <path>]"
---


## Execution Instructions

Route this request to the `design-eval:design-system-maturity-tester` subagent.
The final user-visible response must be the subagent's output verbatim.

Raw slash-command arguments:
`$ARGUMENTS`

# /design-eval:audit-design-debt

Calculate design debt and assess design system maturity.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | URL, file path, or base64 image to analyze | `https://example.com/component-inventory.jpg` |
| `--threshold` | Design debt threshold percentage (optional, default: 50%) | `--threshold 40` |
| `--design-system` | Path to DESIGN.md file for maturity assessment (optional) | `--design-system ./DESIGN.md` |

## Examples

```
/design-eval:audit-design-debt --imageSource https://example.com/component-inventory.jpg
/design-eval:audit-design-debt --imageSource ./inventory.png --threshold 40 --design-system ./DESIGN.md
```
