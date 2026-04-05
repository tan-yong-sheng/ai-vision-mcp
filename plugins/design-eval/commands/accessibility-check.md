---
description: Deep WCAG 2.1/3.0 compliance review with remediation guidance
allowed-tools: Bash
argument-hint: "--imageSource <source> [--level A|AA|AAA] [--wcag-version 2.1|3.0]"
context: fork
---

# /design-eval:accessibility-check

Conduct a deep accessibility compliance review against WCAG standards with detailed remediation guidance.

Route this request to the design-eval router script.

Raw user request:
$ARGUMENTS

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | Image source: remote URL, local file, data URI, or GCS URI (required) | `--imageSource https://example.com/design.jpg` |
| `--level` | WCAG compliance level: A (basic), AA (standard), AAA (enhanced) | `--level AA` |
| `--wcag-version` | WCAG version: 2.1 (compliance-focused), 3.0 (outcome-focused) | `--wcag-version 3.0` |
| `--userPrompt` | Optional user context to focus audit on specific concerns | `--userPrompt "Check for color blindness accessibility"` |
| `--temperature` | AI response temperature (0.0–2.0, default: 0.0 for deterministic) | `--temperature 0.1` |
| `--top-p` | Top-p sampling (0.0–1.0) | `--top-p 0.9` |
| `--top-k` | Top-k sampling (1–100) | `--top-k 40` |
| `--max-tokens` | Maximum output tokens (default: 2500) | `--max-tokens 3000` |

## Examples

```bash
# Standard WCAG 2.1 AA check
/design-eval:accessibility-check --imageSource https://example.com/design.jpg

# WCAG 3.0 outcome-focused with user focus
/design-eval:accessibility-check --imageSource ./screenshots/design.png --level AA --wcag-version 3.0 --userPrompt "Prioritize screen reader compatibility"

# With parameter tuning
/design-eval:accessibility-check --imageSource https://example.com/design.jpg --temperature 0.1 --max-tokens 3000

# All options
/design-eval:accessibility-check --imageSource ./design.jpg --level AAA --wcag-version 3.0 --userPrompt "Focus on keyboard navigation" --temperature 0.2
```

## Execution Instructions

Invoke the design-eval router script which will:

1. Parse command arguments (--imageSource, --level, --wcag-version, --userPrompt, tuning parameters)
2. Select appropriate WCAG prompt template based on version and level
3. Wrap user prompt (if provided) with "ADDITIONAL FOCUS:" prefix
4. Build ai-vision CLI arguments with all parameters
5. Invoke ai-vision audit-design command
6. Return output verbatim to user

**Prerequisites:**
- `ai-vision-mcp` installed globally: `npm install -g ai-vision-mcp`
- Environment variables configured: GEMINI_API_KEY or VERTEX_* credentials
