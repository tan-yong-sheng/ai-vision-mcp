---
description: Custom vs system component ratio analysis and design debt calculation
allowed-tools: Bash
argument-hint: "--imageSource <source> [--threshold <percent>]"
context: fork
---

# /design-eval:design-debt-report

Analyze custom component usage, design system adoption, and calculate design debt metrics.

Route this request to the design-eval router script.

Raw user request:
$ARGUMENTS

## Arguments

| Argument | Description | Example |
|----------|-------------|---------|
| `--imageSource` | Image source: remote URL, local file, data URI, or GCS URI (required) | `--imageSource https://example.com/design.jpg` |
| `--threshold` | Design debt threshold percentage (triggers warning) | `--threshold 30` |
| `--userPrompt` | Optional user context to focus audit on specific concerns | `--userPrompt "Identify high-impact custom components"` |
| `--temperature` | AI response temperature (0.0–2.0, default: 0.0 for deterministic) | `--temperature 0.1` |
| `--top-p` | Top-p sampling (0.0–1.0) | `--top-p 0.9` |
| `--top-k` | Top-k sampling (1–100) | `--top-k 40` |
| `--max-tokens` | Maximum output tokens (default: 2500) | `--max-tokens 3000` |

## Examples

```bash
# Generate design debt report with default threshold
/design-eval:design-debt-report --imageSource https://example.com/design.jpg

# With custom threshold and user focus
/design-eval:design-debt-report --imageSource ./screenshots/design.png --threshold 40 --userPrompt "Focus on button component duplication"

# With parameter tuning
/design-eval:design-debt-report --imageSource https://example.com/design.jpg --temperature 0.1 --max-tokens 3000
```

## Execution Instructions

Invoke the design-eval router script which will:

1. Parse command arguments (--imageSource, --threshold, --userPrompt, tuning parameters)
2. Select design debt report prompt template
3. Wrap user prompt (if provided) with "ADDITIONAL FOCUS:" prefix
4. Build ai-vision CLI arguments with all parameters
5. Invoke ai-vision analyze-image command
6. Return output verbatim to user

**Prerequisites:**
- `ai-vision-mcp` installed globally: `npm install -g ai-vision-mcp`
- Environment variables configured: GEMINI_API_KEY or VERTEX_* credentials
