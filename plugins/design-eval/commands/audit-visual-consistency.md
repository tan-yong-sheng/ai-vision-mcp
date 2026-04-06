---
description: "Use this command to validate design token compliance (single image mode) or detect visual regressions (regression mode)"
context: fork
allowed-tools: Bash(node:*)
argument-hint: "--mode token-compliance|regression [--imageSource <source>] [--baseline <source> --current <source>] [--design-system <path>]"
---

# /design-eval:audit-visual-consistency

Validate design system token compliance on a single screenshot, or detect visual regressions by comparing baseline and current screenshots. Explicitly specify the analysis mode using `--mode`.

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--mode` | Analysis mode: `token-compliance` (single image) or `regression` (two images, baseline vs current). Default: token-compliance | `--mode token-compliance` |
| `--imageSource` | URL, file path, or base64 image to validate (token-compliance mode only) | `https://example.com/components.jpg` |
| `--baseline` | Path/URL to baseline screenshot (regression mode only) | `./screenshots/baseline-mobile.jpg` |
| `--current` | Path/URL to current screenshot (regression mode only, requires `--baseline`) | `./screenshots/current-mobile.jpg` |
| `--design-system` | Path to DESIGN.md file for design-aware analysis (optional, both modes) | `--design-system ./DESIGN.md` |
| `--userPrompt` | Additional focus areas or custom instructions (optional) | `--userPrompt "check button consistency"` |

## Mode 1: Token Compliance (Single Image)

Validate a single screenshot for design token compliance.

**Mode:** `--mode token-compliance` (default, can be omitted)

**Syntax:**
```
/design-eval:audit-visual-consistency --mode token-compliance --imageSource <source> [--design-system <path>]
```

**Examples:**
```bash
# Default token-compliance mode
/design-eval:audit-visual-consistency --imageSource https://example.com/components.jpg

# Explicit token-compliance with design system
/design-eval:audit-visual-consistency --mode token-compliance --imageSource ./ui-components.png --design-system ./DESIGN.md

# With custom focus
/design-eval:audit-visual-consistency --imageSource ./button.png --userPrompt "validate button color consistency"
```

## Mode 2: Visual Regression (Two Images)

Detect visual regressions by comparing baseline and current screenshots.

**Mode:** `--mode regression`

**Syntax:**
```
/design-eval:audit-visual-consistency --mode regression --baseline <source> --current <source> [--design-system <path>]
```

**Examples:**
```bash
# Basic regression detection
/design-eval:audit-visual-consistency --mode regression --baseline ./baseline-mobile.jpg --current ./current-mobile.jpg

# With design system alignment check
/design-eval:audit-visual-consistency --mode regression --baseline /tmp/baseline-desktop.jpg --current /tmp/current-desktop.jpg --design-system ./DESIGN.md

# With custom focus
/design-eval:audit-visual-consistency --mode regression --baseline ./before.png --current ./after.png --userPrompt "check for layout shifts"
```

## Workflow with Playwright Skill

```bash
# Step 1: Capture baseline screenshot (e.g., with playwright-cli-automation skill)
# outputs: /tmp/design-eval-baseline-mobile.jpg

# Step 2: After design changes, capture current state
# outputs: /tmp/design-eval-current-mobile.jpg

# Step 3: Compare baseline vs current using regression mode
/design-eval:audit-visual-consistency --mode regression --baseline /tmp/design-eval-baseline-mobile.jpg --current /tmp/design-eval-current-mobile.jpg
```

## Execution Instructions

Route this request to the `design-eval:visual-consistency-tester` subagent.
The final user-visible response must be the subagent's output verbatim.

Raw slash-command arguments:
`$ARGUMENTS`