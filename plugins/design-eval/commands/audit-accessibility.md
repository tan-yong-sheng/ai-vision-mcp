---
description: "Use this command to verify WCAG 2.1/3.0 compliance with detailed remediation guidance and assistive technology assessment"
context: fork
allowed-tools: Bash(node:*)
argument-hint: "--imageSource <source> [--level A|AA|AAA] [--wcag-version 2.1|3.0]"
---

# /design-eval:audit-accessibility

Deep accessibility compliance review with WCAG 2.1 or WCAG 3.0 assessment.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | URL, file path, or base64 image to evaluate | `https://example.com/form.jpg` |
| `--level` | WCAG compliance level: A (minimum), AA (standard), AAA (enhanced) | `--level AA` |
| `--wcag-version` | WCAG standard: 2.1 (compliance-focused) or 3.0 (outcome-focused) | `--wcag-version 3.0` |
| `--design-system` | Path to DESIGN.md file for design-aware remediation (optional) | `--design-system ./DESIGN.md` |
| `--userPrompt` | Additional focus areas or custom instructions | `--userPrompt "check keyboard navigation for power users"` |

## Examples

```
/design-eval:audit-accessibility --imageSource https://example.com/form.jpg --level AA --wcag-version 2.1
/design-eval:audit-accessibility --imageSource ./modal.png --level AAA --wcag-version 3.0
/design-eval:audit-accessibility --imageSource https://example.com/form.jpg --level AA --wcag-version 2.1 --design-system ./DESIGN.md
```


## Execution Instructions

Route this request to the `design-eval:accessibility-tester` subagent.
The final user-visible response must be the subagent's output verbatim.

Raw slash-command arguments:
`$ARGUMENTS`
