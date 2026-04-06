---
description: "Use this command to analyze component reusability patterns and identify consolidation opportunities"
context: fork
allowed-tools: Bash(node:*)
argument-hint: "--imageSource <source> [--scope src/components] [--design-system <path>]"
---

# /design-eval:audit-components

Analyze component reusability and identify consolidation opportunities.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | URL, file path, or base64 image to analyze | `https://example.com/component-library.jpg` |
| `--scope` | Component scope or path to analyze (optional) | `--scope src/components` |
| `--design-system` | Path to DESIGN.md file for consolidation mapping (optional) | `--design-system ./DESIGN.md` |

## Examples

```
/design-eval:audit-components --imageSource https://example.com/component-library.jpg
/design-eval:audit-components --imageSource ./components.png --scope src/components --design-system ./DESIGN.md
```

## Execution Instructions

Route this request to the `design-eval:design-system-maturity-tester` subagent.
The final user-visible response must be the subagent's output verbatim.

Raw slash-command arguments:
`$ARGUMENTS`
